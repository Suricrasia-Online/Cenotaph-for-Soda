#version 450
uniform float time;
out vec4 fragColor;

//http://www.reedbeta.com/blog/quick-and-easy-gpu-random-numbers-in-d3d11/
void stepState(inout uint state)
{
    state = (state ^ 61u) ^ (state >> 16u);
    state *= 9u;
    state = state ^ (state >> 4u);
    state *= 0x27d4eb2du;
    state = state ^ (state >> 15u);
}

void feed(inout uint state, float value)
{
    stepState(state);
    state ^= uint(floatBitsToInt(value));
}

float getFloat(inout uint state) {
    stepState(state);
    return uintBitsToFloat( (state & 0x007FFFFFu) | 0x3F800000u ) - 1.0;
}

struct Ray
{
  vec3 m_origin;
  vec3 m_direction;
  vec3 m_point;
  bool m_intersected;
  int m_mat;
  vec3 m_color;
  vec3 m_attenuation;
  float m_cumdist;
};
    
struct Mat
{
    vec3 m_diffuse;
    vec3 m_specular;
    float m_spec_exp;
    vec3 m_reflectance;
    vec3 m_transparency;
};

Mat mats[4] = Mat[4](
    Mat(vec3(0.6, 0.5, 0.1), vec3(0.5), 5.0, vec3(0.1), vec3(0.1)), //label
    Mat(vec3(0.4, 0.5, 0.5), vec3(0.5), 25.0, vec3(0.4), vec3(0.4, 0.5, 0.5)), //bottle
    Mat(vec3(0.9, 0.9, 0.9), vec3(0.5), 10.0, vec3(0.1), vec3(0.0)), //cap
    Mat(vec3(0.8, 0.9, 0.9), vec3(0.5), 15.0, vec3(0.1), vec3(0.95)) //outer plastic
);

//choose good positions...
vec3 lightdirs[4] = vec3[4](
    vec3(-0.3, -1.0, -1.0),
    vec3(-1.0, -0.3, -1.0),
    vec3(-1.0, -1.0, -0.3),
    vec3(1.0, 1.0, 1.0)
);

vec3 lightcols[4] = vec3[4](
    vec3(2.0, 2.0, 1.0),
    vec3(1.0, 0.5, 1.0),
    vec3(0.5, 1.0, 1.0),
    vec3(1.0, 1.0, 1.0)
);

float curve(float x) {
    return 0.1*sin(x + 0.2) - 0.05*sin(2.0*x) - 0.05*sin(3.0*x);
}

float curvedx(float x) {
    return 0.1*cos(x + 0.2) - 0.1*cos(2.0*x) - 0.15*cos(3.0*x);
}

// float curvemax() {
//     float val = 0.0;
//     for (int n = 0; n < 3; n++) {
//         val += cmpxabs(params[n]);
//     }
//     return val;
// }

float distanceToCurve(vec2 point) {
    // float maximum = curvemax();
    // float buffer = 0.08;
    // if (abs(point.y) > maximum + buffer) {
    //     return sign(point.y)*(abs(point.y) - maximum);
    // }

    float scale = 2.5;
    float fx = curve(point.x*scale);
    float dfx = scale*curvedx(point.x*scale);
    //float ddfx = curveddx(point.x*);
    
    return (point.y-fx)/sqrt(dfx*dfx + 1.0);

}

float smin( float a, float b, float k )
{
    if (k == 0.0) return min(a,b);
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
}

float rectangle(vec3 point, float w, float l, float h, float s) {
    vec3 ptabs = abs(point);
    return -smin(smin(w - ptabs.x, l - ptabs.y, s), h - ptabs.z, s);
}

float tombstone(vec3 point, float w, float l, float h, float s, float s2) {
    vec3 ptabs = abs(point);
    return -smin(smin(w - ptabs.x, h - ptabs.z, s2), l - ptabs.y, s);
}

// float unitSquareFrame(vec3 point) {
//     vec2 mult = vec2(0.9, 1.05);
//     float sqmain = unitSquare(point);
//     float sq1 = unitSquare(point * mult.xyy);
//     float sq2 = unitSquare(point * mult.yxy);
//     float sq3 = unitSquare(point * mult.yyx);
//     float inner = min(min(sq1, sq2), sq3);
//     return max(sqmain,-inner);
// }

float cylinder(vec3 point, float r, float h, float s) {
    return -smin(-(distance(point.xy, vec2(0.0)) - r), -(abs(point.z) - h), s);
}

vec2 matUnion(vec2 a, vec2 b) {
    return (a.x < b.x) ? a : b;
}
vec2 smatUnion(vec2 a, vec2 b, float k) {
    return vec2(smin(a.x, b.x, k), matUnion(a, b).y);
}

vec2 bottle(vec3 point) {
    
    float bound = cylinder(point, 0.4, 1.0, 0.0);
    if (bound > 0.1) {
        return vec2(bound, 0.0);
    }
    
    //blackle were you raised in a barn? fix this shit!
    vec3 origin = vec3(0.0);
    float dist = distance(point.xy, origin.xy);
    float top = point.z;

    float tops = abs(top-0.05) - 0.95;
    float curve = distanceToCurve(vec2(top, dist - 0.3));
    curve += min(sin(atan(point.y/point.x)*16.0), 0.0)*0.001;
    
    float shell = -smin(-tops, -curve, 0.2);
    
    for (int i = 0; i < 3; i++) {
        vec2 angle = vec2(cos(3.14/3.0*float(i)), sin(3.14/3.0*float(i)));
        //note, make this a call to cylinder
        float cut = distance(vec2(dot(point.xy, angle), point.z), vec2(dot(origin.xy, angle), 0.95)) - 0.06;
        shell = -smin(-shell, cut, 0.1);
    }
    
    float lid = cylinder(point+vec3(0.0,0.0,0.89), 0.14, 0.10, 0.02);
    lid += abs(sin(atan(point.y/point.x)*32.0))*0.0005 * (1.0 - clamp(abs(dist - 0.14)*32.0, 0.0, 1.0));
    lid = min(lid, cylinder(point+vec3(0.0,0.0,0.77), 0.14, 0.02, 0.02));
    
    float lip = cylinder(point+vec3(0.0,0.0,0.73), 0.15, 0.01, 0.01);
    shell = min(lip, shell);
    
    float label = cylinder(point*3.1 + vec3(0.0,0.0,-0.75), 1.0, 1.0, 0.1) / 2.9;
    
    vec2 uni = vec2(shell, 1.0);
    uni = smatUnion(uni, vec2(label, 0.0), 0.02);
    uni = smatUnion(uni, vec2(lid, 2.0), 0.02);
    return uni;
    //to get interior
    //return max(shell, -shell - 0.01)*0.95 + 0.003;
}

vec2 scene(vec3 point) {

    // return bottle(p4b);
    vec3 offset = point.x > 1.0
        ? vec3(2.0, 0.0, 0.0)
        : (point.x < -1.0
            ? vec3(-2.0, 0.0, 0.0)
            : vec3(0.0));


    vec3 p = point;// - offset;
    float grave = -smin(-p.z, rectangle(p, 0.6 + p.z*0.1, 1.2 + p.z*0.1, 1.5, 0.1), 0.1);
    float stone = tombstone(p + vec3(0.0, 1.5, 0.0), 0.5 - p.z*0.01, 0.1 - p.z*0.01, 1.2, 0.05, 0.5);
    vec3 p4b = (p - vec3(0.0, 0.0, -1.0)).zxy;

    // return bottle(p4b);
    return matUnion(vec2(smin(stone, grave, 0.05), 1.0), bottle(p4b));
}

vec3 sceneGrad(vec3 point) {
    float t = scene(point).x;
    float x = (t - scene(point + vec3(0.001,0.0,0.0)).x);
    float y = (t - scene(point + vec3(0.0,0.001,0.0)).x);
    float z = (t - scene(point + vec3(0.0,0.0,0.001)).x);
    return normalize(vec3(x,y,z));
}

Ray newRay(vec3 origin, vec3 direction, vec3 attenuation, float cumdist) {
    // Create a default ray
    return Ray(origin, direction, origin, false, -1, vec3(0.0), attenuation, cumdist);
}

float eps4dist(float dist) {
    return 0.0005*dist;
}

void castRay(inout Ray ray) {
    // Cast ray from origin into scene
    float sgn = sign(scene(ray.m_origin).x);
    for (int i = 0; i < 100; i++) {
        float dist = distance(ray.m_point, ray.m_origin) + ray.m_cumdist;
        if (dist > 50.0) {
            break;
        }

        vec2 smpl = scene(ray.m_point);
        float res = smpl.x;
        
        if (abs(res) < eps4dist(dist)) {
            ray.m_intersected = true;
            ray.m_mat = int(smpl.y);
            ray.m_cumdist = dist;
            break;
        }
        
        ray.m_point += res * ray.m_direction * sgn;
    }
}

void phongShadeRay(inout Ray ray) {

    for (int i = 0; i < 4; i++) {
        vec3 lightDirection = normalize(lightdirs[i]);
        if (ray.m_intersected) {
            Mat mat = mats[ray.m_mat];

            vec3 normal = -sceneGrad(ray.m_point);

            vec3 reflected = reflect(lightDirection, normal);
            float diffuse = max(dot(lightDirection, normal), 0.0);
            float specular = pow(max(dot(ray.m_direction, reflected), 0.0), mat.m_spec_exp);
      
            //oh god blackle clean this up
            ray.m_color += (mat.m_diffuse * (diffuse + 0.1) + mat.m_specular * specular)*lightcols[i] * (vec3(1.0)-mat.m_transparency);
        } else {
            ray.m_color += vec3(pow(max(dot(lightDirection, ray.m_direction), 0.0), 25.0))*lightcols[i];
        }
    }
}

// void reflectiveShadeRay(inout Ray ray, float sgn) {
//     phongShadeRay(ray);

//     if (ray.m_intersected) {
//         Mat mat = mats[ray.m_mat];
//         vec3 normal = -sceneGrad(ray.m_point);
//         float frensel = abs(dot(ray.m_direction, normal));
//         vec3 reflected = reflect(ray.m_direction, normal);

//         Ray bounce = newRay(ray.m_point + normal*eps4dist(ray.m_cumdist)*4.0*sgn, reflected, ray.m_cumdist);
//         castRay(bounce);
//         phongShadeRay(bounce);

//         ray.m_color += bounce.m_color * mat.m_reflectance * (1.0 - frensel*0.98);
//     }
// }

// void recursiveShadeRay(inout Ray ray) {
//     reflectiveShadeRay(ray, 1.0);

//     if (ray.m_intersected) {
//         Mat mat = mats[ray.m_mat];

//         vec3 normal = -sceneGrad(ray.m_point);
//         float frensel = abs(dot(ray.m_direction, normal));

//         Ray trans = newRay(ray.m_point - normal*eps4dist(ray.m_cumdist)*4.0, -ray.m_direction, ray.m_cumdist);
//         castRay(trans);
//         reflectiveShadeRay(trans, -1.0);
        
//         Mat matt = mats[trans.m_mat];
        
//         vec3 normal2 = -sceneGrad(trans.m_point);
//         float frensel2 = abs(dot(ray.m_direction, normal2));

//         Ray trans2 = newRay(trans.m_point + ray.m_direction*eps4dist(trans.m_cumdist)*4.0, ray.m_direction, trans.m_cumdist);
//         castRay(trans2);
//         reflectiveShadeRay(trans2, 1.0);
        
        
//         trans.m_color += trans2.m_color * matt.m_transparency * frensel2;
//         ray.m_color += trans.m_color * mat.m_transparency * frensel;
//     }
// }

Ray reflectionForRay(Ray ray) {
    Mat mat = mats[ray.m_mat];
    float sgn = sign(scene(ray.m_origin).x);
    vec3 normal = -sceneGrad(ray.m_point);
    float frensel = abs(dot(ray.m_direction, normal));
    vec3 atten = ray.m_attenuation * mat.m_reflectance * (1.0 - frensel*0.98);
    vec3 reflected = reflect(ray.m_direction, normal);

    return newRay(ray.m_point + normal*eps4dist(ray.m_cumdist)*4.0*sgn, reflected, atten, ray.m_cumdist);
}

Ray transmissionForRay(Ray ray) {
    Mat mat = mats[ray.m_mat];
    float sgn = sign(scene(ray.m_origin).x);
    vec3 normal = -sceneGrad(ray.m_point);
    float frensel = sqrt(abs(dot(ray.m_direction, normal)));
    vec3 atten = ray.m_attenuation * mat.m_transparency;
    if (mat.m_transparency.x < 0.5) atten *= frensel;

    return newRay(ray.m_point - normal*eps4dist(ray.m_cumdist)*4.0*sgn, ray.m_direction, atten, ray.m_cumdist);
}

#define QUEUELEN 20
Ray rayQueue[QUEUELEN];
int raynum;
void addToQueue(Ray ray) {
    if (raynum >= QUEUELEN) return;
    rayQueue[raynum] = ray;
    raynum++;
}

void recursivelyRender(inout Ray ray) {
    // if (ray.m_intersected) {
    rayQueue[0] = ray;
    raynum = 1;

    for (int i = 0; i < QUEUELEN; i++) {
        if (i >= raynum) break;

        castRay(rayQueue[i]);
        phongShadeRay(rayQueue[i]);
        if (rayQueue[i].m_intersected) {
            if(raynum < 10) addToQueue(reflectionForRay(rayQueue[i]));
            addToQueue(transmissionForRay(rayQueue[i]));
        }
    }
    for (int i = 0; i < raynum; i++) {
        ray.m_color += rayQueue[i].m_color * rayQueue[i].m_attenuation;
    }
}

float grade(float val) {
    float x = clamp(val, 0.0, 1.0);
    return -2.56 * x*x*x + 4.63 * x*x - 1.19 * x + 0.125;
}

void main() {
    // Normalized pixel coordinates (from -1 to 1)
    vec2 uv = gl_FragCoord.xy/vec2(1920.0, 1080.0);

    uint state = 0u;
    feed(state, uv.x);
    feed(state, uv.y);
    feed(state, time);

    // Camera parameters
    vec3 cameraOrigin = vec3(4.0, 4.0, 4.5)*1.75;
    vec3 cameraDirection = normalize(vec3(0.0,-1.0,-1.0)-cameraOrigin);
    
    // Generate plate axes with Z-up. will break if pointed straight up
    // may be converted to constants in the final version...
    vec3 up = vec3(0.0,0.0,1.0);
    vec3 plateXAxis = normalize(cross(cameraDirection, up));
    vec3 plateYAxis = normalize(cross(cameraDirection, plateXAxis));

    //DOF with focal point at origin
    // vec2 blur = (vec2(getFloat(state)+getFloat(state), getFloat(state)+getFloat(state)) - vec2(1.0))*0.025 * vec2(1.0, 1080.0/1920.0);
    // cameraOrigin += plateXAxis*blur.x + plateYAxis*blur.y;
    // cameraDirection = normalize(vec3(0.0)-cameraOrigin);
    // plateXAxis = normalize(cross(cameraDirection, up));
    // plateYAxis = normalize(cross(cameraDirection, plateXAxis));
    
    float fov = radians(30.0);
    vec2 plateCoords = (uv * 2.0 - 1.0) * vec2(1.0, 1080.0/1920.0) + vec2(0.6, 0.075);// + vec2(getFloat(state), getFloat(state)) * 2.0/1080.0;
    vec3 platePoint = (plateXAxis * plateCoords.x + plateYAxis * -plateCoords.y) * tan(fov /2.0);

    vec3 rayDirection = normalize(platePoint + cameraDirection);

    Ray ray = newRay(cameraOrigin, rayDirection, vec3(1.0), 0.0);
    recursivelyRender(ray);
    
    // ray.m_color = vec3(grade(ray.m_color.x),grade(ray.m_color.y),grade(ray.m_color.z));
    fragColor = vec4(ray.m_color, 1.0)*(1./1.);
}