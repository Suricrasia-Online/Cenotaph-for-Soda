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
	state ^= floatBitsToInt(value);
}

float getFloat(inout uint state) {
	stepState(state);
	return uintBitsToFloat( (state & 0x007FFFFFu) | 0x3F800000u ) - 1.0;
}

float EPSI = 0.0001;
vec3 ORIGIN = vec3(0.0,0.0,0.0);
vec3 VECTOR_X = vec3(1.0,0.0,0.0);
vec3 VECTOR_Y = vec3(0.0,1.0,0.0);
vec3 VECTOR_Z = vec3(0.0,0.0,1.0);

vec3 circleTextureComponent(vec2 point, vec2 grid) {
	uint state = 0u;
	feed(state, grid.x);
	feed(state, grid.y);

	float width = getFloat(state)+1.0;
	float x_offset = getFloat(state);
	float y_offset = getFloat(state);
	vec2 midpoint = grid + vec2(x_offset, y_offset);
	
	float feather = clamp((width*0.5 - distance(point, midpoint))*20.0, 0.0, 1.0);
	
	float rotation = getFloat(state);
	float projection = dot(point-midpoint,vec2(cos(rotation*60.),sin(rotation*60.)));
	float normalized = projection*0.5+0.5;
	normalized /= getFloat(state)+1.0;

	float colorrand = getFloat(state);
	float red = abs(cos((normalized+colorrand)*3.14));
	float green = abs(cos((normalized+colorrand-0.9/3.)*3.14));
	float blue = abs(cos((normalized+colorrand-2.2/3.)*3.14));

	return vec3(red, green, blue) * feather;
}

vec3 circleTexture(vec2 point) {
	vec2 grid = floor(point);
	vec3 color = vec3(0.0,0.0,0.0);
	for (int i = -1; i <= 1; i++) {
		for (int j = -1; j <= 1; j++) {
			color += circleTextureComponent(point, grid + vec2(i,j));
		}
	}
	// color += circleTextureComponent(point, grid);
	return color;
}

//note to self: the shader minifier doesn't minify struct members
struct Ray
{
  vec3 origin;
  vec3 direction;
  vec3 point;
  bool intersected;
  vec3 color;
};

float smin( float a, float b, float k )
{
	float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
	return mix( b, a, h ) - k*h*(1.0-h);
}

float ball(vec3 point, vec3 origin, float radius) {
	return distance(point, origin) - radius;
}

float scene(vec3 point) {
	return smin(smin(
	ball(point, vec3(0.0,0.8,0.3), 0.7),
	ball(point, vec3(0.0,-0.8,0.3), 0.7), 0.1),
	ball(point, vec3(0.0, 0.0, -0.7), 1.0), 0.1);
}

vec3 sceneGrad(vec3 point) {
	float x = scene(point) - scene(point + VECTOR_X*EPSI);
	float y = scene(point) - scene(point + VECTOR_Y*EPSI);
	float z = scene(point) - scene(point + VECTOR_Z*EPSI);
	return normalize(vec3(x,y,z));
}

Ray newRay(vec3 origin, vec3 direction) {
	// Create a default ray
 	return Ray(origin, direction, origin, false, ORIGIN);
}

Ray castRay(Ray ray) {
	// Cast ray from origin into scene
#if 0
	float relaxation = 1.4;
	float lastDist = 0.0;
	vec3 fallback = ray.point;
#endif
	for (int i = 0; i < 100; i++) {
		float dist = scene(ray.point);

#if 0
		if (relaxation > 1.0 && dist + lastDist < lastDist * relaxation) {
			ray.point = fallback;
			dist = lastDist;
			relaxation = 1.0;
		}
#endif
		
		if (abs(dist) < EPSI) {
			ray.intersected = true;
			break;
		}

		if (distance(ray.point, ray.origin) > 10.0) {
			break;
		}

#if 0
		lastDist = dist;
		fallback = ray.point;
		ray.point += relaxation * dist * ray.direction;
#else
		ray.point += dist * ray.direction;
#endif
	}
	return ray;
}

void main() {
	// Normalized pixel coordinates (from -1 to 1)
	vec2 uv = gl_FragCoord.xy/vec2(1920.0, 1080.0);

	uint state = 0u;
	feed(state, uv.x);
	feed(state, uv.y);
	feed(state, time);

	float randomX = getFloat(state);
	float randomY = getFloat(state);

	// Camera parameters
	vec3 cameraOrigin = vec3(8.0, 0.0, 0.0);
	vec3 cameraDirection = normalize(vec3(-1.0, 0.0, 0.0));

	// Generate plate axes with Z-up. will break if pointed straight up
	// may be converted to constants in the final version...
	vec3 plateXAxis = normalize(cross(cameraDirection, vec3(0.0,0.0,1.0)));
	vec3 plateYAxis = normalize(cross(cameraDirection, plateXAxis));

	float fov = radians(60.0);
	vec2 plateCoords = (uv * 2.0 - 1.0) * vec2(1.0, 1080.0/1920.0) + vec2(randomX, randomY) * 2.0/1080.0;
	vec3 platePoint = (plateXAxis * plateCoords.x + plateYAxis * -plateCoords.y) * tan(fov /2.0);

	vec3 rayDirection = normalize(platePoint + cameraDirection);

	Ray ray = newRay(cameraOrigin, rayDirection);
	ray = castRay(ray);

	vec3 color = ORIGIN;
	if (ray.intersected) {
		color = circleTexture(ray.point.yz *5.);
		// color += clamp(-(sceneGrad(ray.point).x + sceneGrad(ray.point).z)/2.0, 0.0, 1.0);
	}
	fragColor = vec4(color,1.0)*0.01;
	// fragColor = vec4(uv,0.0,1.0);

	fragColor += texture2D(canvas, uv);
}