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

	float width = getFloat(state);
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
  vec3 m_origin;
  vec3 m_direction;
  vec3 m_point;
  bool m_intersected;
  vec3 m_color;
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
	vec3 rep = point;
	rep.z = mod(rep.z, 3.0) - 1.9;
	rep.y = mod(rep.y, 3.5) - 1.6;
	return min(smin(smin(
	ball(rep, vec3(0.0,0.8,0.3), 0.7),
	ball(rep, vec3(0.0,-0.8,0.3), 0.7), 0.1),
	ball(rep, vec3(0.0, 0.0, -0.7), 1.0), 0.1),
	point.x + 1.0);
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

void castRay(inout Ray ray) {
	// Cast ray from origin into scene

	for (int i = 0; i < 50; i++) {
		if (distance(ray.m_point, ray.m_origin) > 50.0) {
			break;
		}

		float dist = scene(ray.m_point);

		if (abs(dist) < EPSI) {
			ray.m_intersected = true;
			break;
		}

		ray.m_point += dist * ray.m_direction;
	}
}

vec3 shadeRay(inout Ray ray) {
	castRay(ray);
	if (ray.m_intersected) {
		vec3 normal = -sceneGrad(ray.m_point);
		Ray shadow = newRay(ray.m_point + normal*EPSI*4.0, VECTOR_X);
		castRay(shadow);
		if (!shadow.m_intersected) {
			float diffuse = max(dot(normal, VECTOR_X),0.0);
			vec3 reflected = reflect(ray.m_direction, normal);
			float specular = pow(max(dot(reflected, VECTOR_X), 0.0), 10.0);
			return vec3(diffuse * 0.5 + specular * 0.5);
		}
	}
	return vec3(0.0);
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
	vec3 cameraOrigin = vec3(16.0, 0.0, 0.0);
	vec3 cameraDirection = normalize(vec3(-1.0, 0.0, 0.0));

	// Generate plate axes with Z-up. will break if pointed straight up
	// may be converted to constants in the final version...
	vec3 up = vec3(0.0, 0.0, 1.0);
	vec3 plateXAxis = normalize(cross(cameraDirection, up));
	vec3 plateYAxis = normalize(cross(cameraDirection, plateXAxis));

	float fov = radians(70.0);
	vec2 plateCoords = (uv * 2.0 - 1.0) * vec2(1.0, 1080.0/1920.0) + vec2(randomX, randomY) * 2.0/1080.0;
	vec3 platePoint = (plateXAxis * plateCoords.x + plateYAxis * -plateCoords.y) * tan(fov /2.0);

	vec3 rayDirection = normalize(platePoint + cameraDirection);

	Ray ray = newRay(cameraOrigin, rayDirection);

	vec3 color = ORIGIN;
	color += shadeRay(ray);
	// if (ray.m_intersected) {
	// 	// color = circleTexture(ray.m_point.yz *5.);
	// 	color += clamp(abs(sceneGrad(ray.m_point).x + sceneGrad(ray.m_point).z)/2.0, 0.0, 1.0);
	// }
	fragColor = vec4(color,1.0)*0.02;
	// fragColor = vec4(uv,0.0,1.0);

	fragColor += texture2D(canvas, uv);
}