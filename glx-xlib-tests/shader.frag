uniform sampler2D canvas;
uniform int time;

vec4 mycolor(float rot, float off) {
	vec2 canvasCoords = vec2(gl_FragCoord.x / 1920.0, gl_FragCoord.y / 1080.0);

	// float rot = 0.05;
	canvasCoords = canvasCoords * mat2(cos(rot), sin(rot), -sin(rot), cos(rot));

	if ((gl_FragCoord.x + off < time * 20) || (gl_FragCoord.x + off > time * 20 + 2)) {
		return texture2D(canvas, canvasCoords);
	} else {
		return vec4(250.0,250.0,250.0,250.0);
	}
}

void main() {
	gl_FragColor.x = mycolor(0.05, 0.0).x;
	gl_FragColor.y = mycolor(0.05015, 1.0).y;
	gl_FragColor.z = mycolor(0.0503, 2.0).z;
	// gl_FragColor.w = mycolor(0.0503).w;
}
