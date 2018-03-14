
struct Ray
{
  vec3 origin;
  vec3 direction;
  vec3 point;
  bool intersected;
  vec3 color;
};

#define NUMPARAMS 10
vec2 params[NUMPARAMS] = vec2[](
    vec2(0.0,0.0), vec2(0.02,0.1), vec2(0.02,-0.05), vec2(0.0,-0.05), vec2(0.0,-0.0),
    vec2(-0.01,0.0), vec2(-0.01,0.0), vec2(0.0,0.0), vec2(0.0,-0.00), vec2(-0.0,0.0)
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

float smin( float a, float b, float k )
{
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
}

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
}


float scene(vec3 point) {
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
    
    //return shell;
    //to get interior
    return max(shell, -shell - 0.01)*0.95;
}

#define EPSI 0.001
vec3 sceneGrad(vec3 point) {
  float x = (scene(point) - scene(point + vec3(EPSI,0.0,0.0)));
  float y = (scene(point) - scene(point + vec3(0.0,EPSI,0.0)));
  float z = (scene(point) - scene(point + vec3(0.0,0.0,EPSI)));
  return normalize(vec3(x,y,z));
}

Ray newRay(vec3 origin, vec3 direction) {
    // Create a default ray
  return Ray(origin, direction, origin, false, vec3(0.0,0.0,0.0));
}

Ray castRay(Ray ray) {
    // Cast ray from origin into scene
    for (int i = 0; i < 100; i++) {
        if (distance(ray.point, ray.origin) > 20.0) {
            break;
        }

        float dist = scene(ray.point);

        
        if (abs(dist) < EPSI) {
            ray.intersected = true;
            break;
        }
        
        ray.point += dist * ray.direction;
    }
    return ray;
}


void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    // Normalized pixel coordinates (from -1 to 1)
    vec2 uv = (fragCoord/iResolution.xy)*2.0 - vec2(1.0,1.0);
    uv.y *= iResolution.y/iResolution.x;

    // Camera parameters
    vec3 cameraOrigin = vec3(-7.0, 0.0, 5.0);
    vec3 cameraDirection = normalize(vec3(1.0, 0.0, -0.69));
    
    // Generate plate axes with Z-up. will break if pointed straight up
    // may be converted to constants in the final version...
    vec3 up = vec3(0.0,0.0,1.0);
    vec3 plateXAxis = normalize(cross(cameraDirection, up));
    vec3 plateYAxis = normalize(cross(cameraDirection, plateXAxis));
    
    float fov = radians(30.0);
    vec3 platePoint = (plateXAxis * uv.x + plateYAxis * uv.y) * tan(fov /2.0);
    
    vec3 rayDirection = normalize(platePoint + cameraDirection);
    
    Ray ray = newRay(cameraOrigin, rayDirection);
    ray = castRay(ray);
    
    float val = 0.0;
    if (ray.intersected) {
        float val = max(dot(sceneGrad(ray.point), cameraDirection), 0.0);
        fragColor = vec4(val);
    } else {
        fragColor = vec4(shadeDistance(distanceToCurve(uv)), 1.0);
    }
}