#version 450
uniform sampler2D canvas;
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
};
    
struct Mat
{
    vec3 m_diffuse;
    vec3 m_specular;
    float m_spec_exp;
    vec3 m_reflectance;
    vec3 m_transparency;
};

Mat mats[3] = Mat[3](
    Mat(vec3(0.6, 0.5, 0.1), vec3(0.5), 5.0, vec3(0.1), vec3(0.1)),
    Mat(vec3(0.4, 0.5, 0.5), vec3(0.5), 25.0, vec3(0.4), vec3(0.4, 0.5, 0.5)),
    Mat(vec3(0.8, 0.8, 0.8), vec3(0.5), 10.0, vec3(0.1), vec3(0.01))
);


#define NUMPARAMS 4
vec2 params[5] = vec2[5](
    vec2(0.0,0.0), vec2(0.02,0.1), vec2(0.0,-0.05), vec2(0.0,-0.05), vec2(-0.01,-0.0)//,
    //vec2(-0.01,0.0), vec2(-0.01,0.005), vec2(0.0,0.005), vec2(0.0,-0.005), vec2(-0.0,0.005)
);

vec2 cmpxi = vec2(0.0, 1.0);
vec2 cmpxcnj(vec2 c) {
    return vec2(c.x, -c.y);
}

vec2 cmpxmul(vec2 a, vec2 b) {
    return vec2(dot(cmpxcnj(a), cmpxcnj(b)), dot(a, b.yx));
}

vec2 cmpxexp(vec2 c) {
    return exp(c.x) * vec2(cos(c.y), sin(c.y));
}
float cmpxabs(vec2 c) {
    return distance(vec2(0.0), c);
}

float curve(float x) {
    vec2 val = vec2(0.0);
    for (int n = 0; n < NUMPARAMS; n++) {
        val += cmpxmul(params[n], cmpxexp(cmpxi*float(n)*x));
    }
    return val.x;
}

float curvedx(float x) {
    vec2 val = vec2(0.0);
    for (int n = 0; n < NUMPARAMS; n++) {
        val += cmpxmul(cmpxmul(cmpxi, params[n] * float(n)), cmpxexp(cmpxi*float(n)*x));
    }
    return val.x;
}

float curveddx(float x) {
    vec2 val = vec2(0.0);
    for (int n = 0; n < NUMPARAMS; n++) {
        val += cmpxmul(params[n] * float(n*n), -cmpxexp(cmpxi*float(n)*x));
    }
    return val.x;
}

float curvemax() {
    float val = 0.0;
    for (int n = 0; n < NUMPARAMS; n++) {
        val += cmpxabs(params[n]);
    }
    return val;
}

float distanceToCurve(vec2 point) {
    float maximum = curvemax();
    float buffer = 0.08;
    if (abs(point.y) > maximum + buffer) {
        return sign(point.y)*(abs(point.y) - maximum);
    }

    float scale = 2.5;
    float fx = curve(point.x*scale);
    float dfx = scale*curvedx(point.x*scale);
    //float ddfx = curveddx(point.x*);
    
    float firstOrder = (point.y-fx)/sqrt(dfx*dfx + 1.0);
    return firstOrder;
    
    /*
    float a = ddfx/2.0;
    float b = dfx;
    float c = fx;
    
    float al = 2.0*a*a;
    float be = 3.0*b*a;
    float ga = b*b + 2.0*c*a - 2.0*a*point.y + 1.0;
    float de = c*b - b*point.y;
    
    float p = (3.0*al*ga - be*be)/(3.0*al*al);
    float q = (2.0*be*be*be - 9.0 *al*be*ga + 27.0*al*al*de)/(27.0*al*al*al);
    
    float pi = 3.14159;
    float secondOrder = firstOrder;
    for (int k = 0; k < 3; k++) {
        float r = 2.0*sqrt(-p/3.0) * cos(1.0/3.0 * acos( (3.0*q)/(2.0*p) * sqrt(-3.0/p) ) - 2.0*pi*float(k)/3.0 );
        float x = r - be/(3.0*al);
    
        float y = a*x*x + b*x + c;
        float dist = distance(vec2(x,y), vec2(0.0, point.y));
        if (!isnan(x) && dist < abs(secondOrder)) {
           secondOrder = dist*sign(firstOrder);
        }
    }
    return secondOrder;*/
}

float maxx(float a, float b, float c) {
    return max(max(a, b), c);
}

float minn(float a, float b, float c) {
    return min(min(a, b), c);
}

float smin( float a, float b, float k )
{
    if (k == 0.0) return min(a,b);
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
}

float unitSquare(vec3 point) {
    vec3 ptabs = abs(point);
    return maxx(ptabs.x, ptabs.y, ptabs.z) - 1.0;
}

float unitSquareFrame(vec3 point) {
    vec2 mult = vec2(0.9, 1.05);
    float sqmain = unitSquare(point);
    float sq1 = unitSquare(point * mult.xyy);
    float sq2 = unitSquare(point * mult.yxy);
    float sq3 = unitSquare(point * mult.yyx);
    float inner = minn(sq1, sq2, sq3);
    return max(sqmain,-inner);
}

float unitCylinder(vec3 point, float r, float h, float s) {
    return -smin(-(distance(point.xy, vec2(0.0)) - r), -(abs(point.z) - h), s);
}

/*
vec3 shadeDistance(float d) {
    float dist = d*500.0;
    float banding = max(sin(dist), 0.0);
    float strength = sqrt(clamp(log(abs(d)+1.0)*2.0, 0.0, 1.0));
    float pattern = mix(strength, banding, (0.6-abs(strength-0.5))*0.3);
    
    vec3 color = vec3(pattern);
    
    if (d < 0.0) {
        //red tint
        color *= vec3(1.1,0.75,0.7);
    } else {
        //blue tint
        color *= vec3(0.7,1.0,1.1);
        
    }
    return color;
}*/


vec2 matUnion(vec2 a, vec2 b) {
    return (a.x < b.x) ? a : b;
}
vec2 smatUnion(vec2 a, vec2 b, float k) {
    return vec2(smin(a.x, b.x, k), matUnion(a, b).y);
}

vec2 bottle(vec3 point) {
    
    float bound = unitCylinder(point, 0.4, 1.0, 0.0);
    if (bound > 0.1) {
        return vec2(bound, 0.0);
    }
    
    //blackle were you raised in a barn? fix this shit!
    vec3 origin = vec3(0.0,0.0,0.0);
    float dist = distance(point.xy, origin.xy);
    float top = point.z;

    float tops = abs(top-0.05) - 0.95;
    float curve = distanceToCurve(vec2(top, dist - 0.3));
    curve += min(sin(atan(point.y/point.x)*16.0), 0.0)*0.001;
    
    float shell = -smin(-tops, -curve, 0.2);
    
    for (int i = 0; i < 3; i++) {
        vec2 angle = cmpxexp(cmpxi*(3.14/3.0*float(i)));
        float cut = distance(vec2(dot(point.xy, angle), point.z), vec2(dot(origin.xy, angle), 0.95)) - 0.06;
        shell = -smin(-shell, cut, 0.1);
    }
    
    float lid = unitCylinder(point+vec3(0.0,0.0,0.89), 0.14, 0.10, 0.02);
    lid += abs(sin(atan(point.y/point.x)*32.0))*0.0005 * (1.0 - clamp(abs(dist - 0.14)*32.0, 0.0, 1.0));
    lid = min(lid, unitCylinder(point+vec3(0.0,0.0,0.77), 0.14, 0.02, 0.02));
    
    float lip = unitCylinder(point+vec3(0.0,0.0,0.73), 0.15, 0.01, 0.01);
    shell = min(lip, shell);
    
    float label = unitCylinder(point*3.1 + vec3(0.0,0.0,-0.75), 1.0, 1.0, 0.1) / 2.9;
    
    vec2 uni = vec2(shell, 1.0);
    uni = smatUnion(uni, vec2(label, 0.0), 0.02);
    uni = smatUnion(uni, vec2(lid, 2.0), 0.02);
    return uni;
    //to get interior
    //return max(shell, -shell - 0.01)*0.95 + 0.003;
}

vec2 scene(vec3 point) {
    vec3 repeated = vec3(mod(point.xy, vec2(2.0, 2.0)) - vec2(1.0, 1.0), point.z);
    vec2 s = bottle(repeated);
    return s;//matUnion(vec2(unitSquareFrame(point), 2.0), s);
}

#define EPSI 0.001
vec3 sceneGrad(vec3 point) {
  float x = (scene(point).x - scene(point + vec3(EPSI,0.0,0.0)).x);
  float y = (scene(point).x - scene(point + vec3(0.0,EPSI,0.0)).x);
  float z = (scene(point).x - scene(point + vec3(0.0,0.0,EPSI)).x);
  return normalize(vec3(x,y,z));
}

Ray newRay(vec3 origin, vec3 direction) {
    // Create a default ray
  return Ray(origin, direction, origin, false, -1, vec3(0.0,0.0,0.0));
}

void castRay(inout Ray ray) {
    // Cast ray from origin into scene
    for (int i = 0; i < 100; i++) {
        if (distance(ray.m_point, ray.m_origin) > 20.0) {
            break;
        }

        vec2 smpl = scene(ray.m_point);
        float dist = smpl.x;
        
        if (abs(dist) < EPSI) {
            ray.m_intersected = true;
            ray.m_mat = int(smpl.y);
            break;
        }
        
        ray.m_point += dist * ray.m_direction;
    }
}

void phongShadeRay(inout Ray ray) {
    if (ray.m_intersected) {
        Mat mat = mats[ray.m_mat];

        vec3 lightDirection = vec3(-1.0,0.0,0.0);
        vec3 normal = -sceneGrad(ray.m_point);
        vec3 reflected = reflect(lightDirection, normal);
        float diffuse = max(dot(lightDirection, normal), 0.0);
        float specular = pow(max(dot(ray.m_direction, reflected), 0.0), mat.m_spec_exp);
  
        
        ray.m_color = mat.m_diffuse * (diffuse + 0.1) + mat.m_specular * specular;
    }
}

void reflectiveShadeRay(inout Ray ray, float sgn) {
    phongShadeRay(ray);

    if (ray.m_intersected) {
        Mat mat = mats[ray.m_mat];
        vec3 normal = -sceneGrad(ray.m_point);
        float frensel = abs(dot(ray.m_direction, normal));
        vec3 reflected = reflect(ray.m_direction, normal);

        Ray bounce = newRay(ray.m_point + normal*0.01*sgn, reflected);
        castRay(bounce);
        phongShadeRay(bounce);

        ray.m_color += bounce.m_color * mat.m_reflectance * (1.0 - frensel*0.98);
    }
}

void recursiveShadeRay(inout Ray ray) {
    reflectiveShadeRay(ray, 1.0);

    if (ray.m_intersected) {
        Mat mat = mats[ray.m_mat];

        vec3 normal = -sceneGrad(ray.m_point);
        float frensel = abs(dot(ray.m_direction, normal));

        Ray trans = newRay(ray.m_point - normal*0.01, -ray.m_direction);
        castRay(trans);
        reflectiveShadeRay(trans, -1.0);
        
        Ray trans2 = newRay(trans.m_point + ray.m_direction*0.01, ray.m_direction);
        castRay(trans2);
        reflectiveShadeRay(trans2, 1.0);
        
        Mat matt = mats[trans.m_mat];
        
        vec3 normal2 = -sceneGrad(trans.m_point);
        float frensel2 = abs(dot(ray.m_direction, normal2));
        
        trans.m_color += trans2.m_color * matt.m_transparency * frensel2;
        ray.m_color += trans.m_color * mat.m_transparency * frensel;
    }
}

void main() {
    // Normalized pixel coordinates (from -1 to 1)
    vec2 uv = gl_FragCoord.xy/vec2(1920.0, 1080.0);

    uint state = 0u;
    feed(state, uv.x);
    feed(state, uv.y);
    feed(state, time);

    // Camera parameters
    vec3 cameraOrigin = vec3(4.0, 6.0, -2.0)*0.9;
    vec3 cameraDirection = normalize(vec3(0.0)-cameraOrigin);
    
    // Generate plate axes with Z-up. will break if pointed straight up
    // may be converted to constants in the final version...
    vec3 up = vec3(0.0,0.0,-1.0);
    vec3 plateXAxis = normalize(cross(cameraDirection, up));
    vec3 plateYAxis = normalize(cross(cameraDirection, plateXAxis));

    //DOF with focal point at origin
    vec2 blur = (vec2(getFloat(state)+getFloat(state), getFloat(state)+getFloat(state)) - vec2(1.0))*0.05 * vec2(1.0, 1080.0/1920.0);
    cameraOrigin += plateXAxis*blur.x + plateYAxis*blur.y;
    cameraDirection = normalize(vec3(0.0)-cameraOrigin);
    plateXAxis = normalize(cross(cameraDirection, up));
    plateYAxis = normalize(cross(cameraDirection, plateXAxis));
    
    float fov = radians(40.0);
    vec2 plateCoords = (uv * 2.0 - 1.0) * vec2(1.0, 1080.0/1920.0) + vec2(getFloat(state), getFloat(state)) * 2.0/1080.0;
    vec3 platePoint = (plateXAxis * plateCoords.x + plateYAxis * -plateCoords.y) * tan(fov /2.0);

    vec3 rayDirection = normalize(platePoint + cameraDirection);

    Ray ray = newRay(cameraOrigin, rayDirection);

    Ray ray = newRay(cameraOrigin, rayDirection);
    castRay(ray);
    recursiveShadeRay(ray);
    
    fragColor = vec4(ray.m_color, 1.0)*0.05;

    fragColor += texture2D(canvas, uv);
}