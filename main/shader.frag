#version 450
uniform float Te;
out vec4 Fr;

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
    vec3 m_reflectance;
    vec3 m_transparency;
};

Mat mats[2] = Mat[2](
    Mat(vec3(0.8, 0.2, 0.1), vec3(0.2), vec3(0.1)), //label / cap
    Mat(vec3(1.0), vec3(0.8), vec3(0.7)) //bottle / grave
);

//choose good positions...
vec3 lightdirs[3] = vec3[3](
    vec3(0.0, 0.5, -1.0),
    vec3(1.0, -0.5, -1.0),
    vec3(-1.0, -0.25, -1.0)
);

vec3 lightcols[3] = vec3[3](
    vec3(1.0, 1.0, 0.1),
    vec3(1.0, 0.1, 1.0),
    vec3(0.1, 1.0, 1.0)
);

float smin( float a, float b, float k )
{
    // if (k == 0.0) return min(a,b);
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
}

float distanceToBottleCurve(vec2 point) {
    return point.y-0.1*sin(point.x*2.5 + 0.6) + 0.05*sin(5.0*point.x) + 0.04*sin(7.5*point.x);
}

float tombstone(vec3 point, float w, float l, float h, float s, float s2) {
    vec3 ptabs = abs(point);
    return -smin(smin(w - ptabs.x, h - ptabs.z, s2), l - ptabs.y, s);
}

float cylinder(vec3 point, float r, float h, float s) {
    return -smin(-(length(point.xy) - r), -(abs(point.z) - h), s);
}

vec2 smatUnion(vec2 a, vec2 b, float k) {
    return vec2(smin(a.x, b.x, k), (a.x < b.x) ? a.y : b.y);
}

vec2 bottle(vec3 point) {

    //blackle were you raised in a barn? fix this shit!
    float dist = length(point.xy);

    float curve = distanceToBottleCurve(vec2(point.z, dist - 0.29)) + min(sin(atan(point.y,point.x)*16.0), 0.0)*0.001;
    
    float shell = -smin(0.95-abs(point.z-0.05), -curve, 0.2);
    
    for (int i = 0; i < 3; i++) {
        vec2 angle = vec2(cos(3.14/3.0*float(i)), sin(3.14/3.0*float(i)));
        //note, make this a call to cylinder
        float cut = length(vec2(dot(point.xy, angle), point.z) - vec2(dot(vec2(0.0), angle), 0.95)) - 0.06;
        shell = -smin(-shell, cut, 0.1);
    }

    shell = min(cylinder(point+vec3(0.0,0.0,0.73), 0.15, 0.01, 0.01), shell);

    return smatUnion(smatUnion(
        vec2(shell, 1.0),
        vec2(cylinder(point*3.1 + vec3(0.0,0.0,-0.75), 1.05, 1.0, 0.1) / 2.9, 0.0), 0.02),
        vec2(min(cylinder(point+vec3(0.0,0.0,0.89), 0.14, 0.10, 0.02) + abs(sin(atan(point.y,point.x)*32.0))*0.0005 * (1.0 - clamp(abs(dist - 0.14)*32.0, 0.0, 1.0)), cylinder(point+vec3(0.0,0.0,0.77), 0.14, 0.02, 0.02)), 0.0), 0.02);
    // return uni;
}

vec2 scene(vec3 point) {

    // return bottle(p4b);
    vec3 offset = point.x > 1.0
        ? vec3(2.0, 0.0, 0.0)
        : (point.x < -1.0
            ? vec3(-2.0, 0.0, 0.0)
            : vec3(0.0));


    vec3 p = point - offset;
    vec3 p4b = (p - vec3(0.0, 0.0, -0.25)).zxy;

    // return bottle(p4b);
    return smatUnion(vec2(cos(point.z)*cos(point.y*5.0)*cos(point.x*5.0)*0.01 + smin(tombstone(p + vec3(0.0, 1.5, 0.0), 0.5 - p.z*0.01, 0.12 - p.z*0.01, 1.2, 0.1, 0.5), -smin(-p.z, tombstone(p, 0.6 + p.z*0.2, 1.2 + p.z*0.2, 0.75, 0.1, 0.1), 0.1), 0.1), 1.0), bottle(p4b), 0.0);
}

vec3 sceneGrad(vec3 point) {
    float t = scene(point).x;
    return normalize(vec3(
        t - scene(point + vec3(0.001,0.0,0.0)).x,
        t - scene(point + vec3(0.0,0.001,0.0)).x,
        t - scene(point + vec3(0.0,0.0,0.001)).x));
}

Ray newRay(vec3 origin, vec3 direction, vec3 attenuation, float cumdist) {
    // Create a default ray
    return Ray(origin, direction, origin, false, -1, vec3(0.0), attenuation, cumdist);
}

void castRay(inout Ray ray) {
    // Cast ray from origin into scene
    float sgn = sign(scene(ray.m_origin).x);
    for (int i = 0; i < 100; i++) {
        float dist = length(ray.m_point - ray.m_origin) + ray.m_cumdist;
        if (dist > 20.0) {
            break;
        }

        vec2 smpl = scene(ray.m_point);
        float res = smpl.x;
        
        if (abs(res) < 0.0001) {
            ray.m_intersected = true;
            ray.m_mat = int(smpl.y);
            ray.m_cumdist = dist;
            break;
        }
        
        ray.m_point += res * ray.m_direction * sgn;
    }
}

void texture(vec3 point, vec3 normal, inout Mat mat) {
    float angle = atan(normal.x, normal.z);
    if (abs(point.y) < 0.5 ) {
        vec2 uv = vec2(angle, point.y)*vec2(2.5,7.0)+vec2(0.0,-1.5);
        float ang = atan(uv.y, uv.x);
        float len = floor(length(uv)*10.0);
        bool val = len == 2. || len == 6. || len == 9.;
        if (len == 3. || len == 4. || len == 5. || len == 8. || len == 10.) {
            val = distanceToBottleCurve(vec2(ang+len,0.0))*8.11 > cos(len*8.11);
        }
        if(val) {
            mat = mats[1];
        }
    }
}

void phongShadeRay(inout Ray ray) {

    if (ray.m_intersected) {
        for (int i = 0; i < 3; i++) {
            vec3 lightDirection = normalize(lightdirs[i]);
            Mat mat = mats[ray.m_mat];

            vec3 normal = -sceneGrad(ray.m_point);

            vec3 reflected = reflect(lightDirection, normal);
            float diffuse = abs(dot(lightDirection, normal));
            float specular = pow(abs(dot(ray.m_direction, reflected)), 20.0);

            if (ray.m_mat == 0) {
                if (ray.m_point.x > 1.0) {
                    mat.m_diffuse = mat.m_diffuse.zyx;
                } else if (ray.m_point.x < -1.0) {
                    mat.m_diffuse = mat.m_diffuse.yxz*0.7;
                }
            }
            texture(ray.m_point, normal, mat);
      
            //oh god blackle clean this up
            ray.m_color += (mat.m_diffuse * diffuse * (- mat.m_transparency + 1.0) + specular)*lightcols[i];
        }
    } else {
        ray.m_color += 1.0-ray.m_direction*ray.m_direction;//vec3(pow(abs(dot(lightDirection, ray.m_direction)), 25.0))*lightcols[i];
    }
}

Ray reflectionForRay(Ray ray) {
    Mat mat = mats[ray.m_mat];
    float sgn = sign(scene(ray.m_origin).x);
    vec3 normal = -sceneGrad(ray.m_point);
    texture(ray.m_point, normal, mat);
    float frensel = abs(dot(ray.m_direction, normal));
    vec3 atten = ray.m_attenuation * mat.m_reflectance * (1.0 - frensel*0.98);
    vec3 reflected = reflect(ray.m_direction, normal);

    return newRay(ray.m_point + normal*0.0001*4.0*sgn, reflected, atten, ray.m_cumdist);
}

Ray transmissionForRay(Ray ray) {
    Mat mat = mats[ray.m_mat];
    float sgn = sign(scene(ray.m_origin).x);
    vec3 normal = -sceneGrad(ray.m_point);
    texture(ray.m_point, normal, mat);
    // float frensel = sqrt(abs(dot(ray.m_direction, normal)));
    vec3 atten = ray.m_attenuation * mat.m_transparency;// * frensel;

    return newRay(ray.m_point - normal*0.0001*4.0*sgn, ray.m_direction, atten, ray.m_cumdist);
}

// #define 18 18
Ray rayQueue[MAXDEPTH];
int raynum = 1;
void addToQueue(Ray ray) {
    if (raynum >= MAXDEPTH) return;
    rayQueue[raynum] = ray;
    raynum++;
}

void recursivelyRender(inout Ray ray) {
    rayQueue[0] = ray;

    for (int i = 0; i < MAXDEPTH; i++) {
        if (i >= raynum) break;

        castRay(rayQueue[i]);
        phongShadeRay(rayQueue[i]);
        if (rayQueue[i].m_intersected) {
            addToQueue(reflectionForRay(rayQueue[i]));
            addToQueue(transmissionForRay(rayQueue[i]));
        }
    }
    for (int i = 0; i < raynum; i++) {
        ray.m_color += rayQueue[i].m_color * rayQueue[i].m_attenuation;
    }
    // if (raynum == 1) {
    //     ray.m_color = vec3(2.0);
    // }
}

void main() {
    // Normalized pixel coordinates (from -1 to 1)
    vec2 uv = (gl_FragCoord.xy + vec2(mod(Te, 3.0), floor(Te/3.0))/3.0 - vec2(960.0, 540.0))/vec2(960.0, 960.0);


    // Camera parameters
    vec3 cameraOrigin = vec3(5.0);
    vec3 cameraDirection = vec3(-1.41,-1.41,-1.41);
    vec3 platePoint = (vec3(-0.71,0.71,0.0) * uv.x + vec3(0.41, 0.41, -0.82) * -uv.y);

    Ray ray = newRay(cameraOrigin, normalize(platePoint + cameraDirection), vec3(1.0), 0.0);
    recursivelyRender(ray);

    ray.m_color *= 1.0 - pow(length(uv)*0.85, 3.0);

    Fr = vec4(pow(log(ray.m_color+1)*0.15, vec3(1.3)), 1.0);
}