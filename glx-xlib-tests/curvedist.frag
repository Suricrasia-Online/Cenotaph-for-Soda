
struct Ray
{
  vec3 origin;
  vec3 direction;
  vec3 point;
  bool intersected;
  int mat;
  vec3 color;
};
    
struct Mat
{
    vec3 diffuse;
    vec3 specular;
    float spec_exp;
    vec3 reflection;
};

Mat mats[2] = Mat[](
    Mat(vec3(0.6, 0.5, 0.1), vec3(0.5), 5.0, vec3(0.1)),
    Mat(vec3(0.1, 0.6, 0.5), vec3(0.5), 25.0, vec3(0.5))
);


#define NUMPARAMS 5
vec2 params[NUMPARAMS] = vec2[](
    vec2(0.0,0.0), vec2(0.02,0.09), vec2(0.01,-0.05), vec2(0.0,-0.05), vec2(-0.01,-0.0)//,
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

    float fx = curve(point.x);
    float dfx = curvedx(point.x);
    float ddfx = curveddx(point.x);
    
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

float unitCylinder(vec3 point, float h) {
    return max(distance(point.xy, vec2(0.0)) - 1.0, abs(point.z) - h);
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
    //blackle were you raised in a barn? fix this shit!
    vec3 origin = vec3(0.0,0.0,0.0);
    float dist = distance(point.xy, origin.xy) - 0.3;
    float top = point.z*2.0;

    float tops = abs(top) - 2.2;
    float curve = distanceToCurve(vec2(top, dist));
    
    float shell = -smin(-tops, -curve, 0.2);
    
    for (int i = 0; i < 3; i++) {
        vec2 angle = cmpxexp(cmpxi*(3.14/3.0*float(i)));
        float cut = distance(vec2(dot(point.xy, angle), point.z), vec2(dot(origin.xy, angle), 1.05)) - 0.05;
        shell = -smin(-shell, cut, 0.1);
    }
    
    float lid = unitCylinder(point*6.3 + vec3(0.0,0.0,6.2), 0.7) / 6.3;
    
    float label = unitCylinder(point*3.1 + vec3(0.0,0.0,-0.75), 1.0) / 2.9;
    
    return smatUnion(vec2(shell, 1.0), vec2(min(label, lid), 0.0), 0.02);
    //to get interior
    //return max(shell, -shell - 0.01)*0.95 + 0.003;
}

vec2 scene(vec3 point) {
    return matUnion(vec2(unitSquareFrame(point), 0.0), bottle(point));
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
        if (distance(ray.point, ray.origin) > 20.0) {
            break;
        }

        vec2 smpl = scene(ray.point);
        float dist = smpl.x;
        
        if (abs(dist) < EPSI) {
            ray.intersected = true;
            ray.mat = int(smpl.y);
            break;
        }
        
        ray.point += dist * ray.direction;
    }
}

void phongShadeRay(inout Ray ray) {
    if (ray.intersected) {
        Mat mat = mats[ray.mat];

        vec3 lightDirection = vec3(-1.0,0.0,0.0);
        vec3 normal = -sceneGrad(ray.point);
        vec3 reflected = reflect(lightDirection, normal);
        float diffuse = max(dot(lightDirection, normal), 0.0);
        float specular = pow(max(dot(ray.direction, reflected), 0.0), mat.spec_exp);
        if (diffuse == 0.0) specular = 0.0;    
        
        ray.color = mat.diffuse * (diffuse + 0.1) + mat.specular * specular;
    } else {
        ray.color = vec3(pow(max(cos(ray.direction.z*1.0)*cos(ray.direction.x*4.0)*cos(ray.direction.y*4.0), 0.0),4.0))*0.1;
    }
}

void recursiveShadeRay(inout Ray ray) {
    phongShadeRay(ray);

    if (ray.intersected) {
        Mat mat = mats[ray.mat];

        vec3 normal = -sceneGrad(ray.point);
        vec3 reflected = reflect(ray.direction, normal);

        Ray bounce = newRay(ray.point + normal*0.01, reflected);
        castRay(bounce);
        phongShadeRay(bounce);
        ray.color += bounce.color * mat.reflection;
    }
}


void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    // Normalized pixel coordinates (from -1 to 1)
    vec2 uv = (fragCoord/iResolution.xy)*2.0 - vec2(1.0,1.0);
    uv.y *= iResolution.y/iResolution.x;
    
    vec2 mouse = (iMouse.xy/iResolution.xy)*2.0 - vec2(1.0);
    mouse.x *= 3.1415*2.0;

    // Camera parameters
    vec3 cameraOrigin = vec3(-7.0*cos(mouse.x), -7.0*sin(mouse.x), mouse.y*5.0);
    vec3 cameraDirection = normalize(vec3(0.0)-cameraOrigin);
    
    // Generate plate axes with Z-up. will break if pointed straight up
    // may be converted to constants in the final version...
    vec3 up = vec3(0.0,0.0,1.0);
    vec3 plateXAxis = normalize(cross(cameraDirection, up));
    vec3 plateYAxis = normalize(cross(cameraDirection, plateXAxis));
    
    float fov = radians(40.0);
    vec3 platePoint = (plateXAxis * uv.x + plateYAxis * uv.y) * tan(fov /2.0);
    
    vec3 rayDirection = normalize(platePoint + cameraDirection);
    
    Ray ray = newRay(cameraOrigin, rayDirection);
    castRay(ray);
    phongShadeRay(ray);
    
    fragColor = vec4(ray.color, 1.0);
}