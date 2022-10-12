export default class AnimationCover {

    canvas;
    gl;
    program;
    lastFrame;
    thisFrame;
    timeHandle;
    widthHandle;
    heightHandle;
    // Time
    time = 0.0;
    // 指向动画
    animationFrameCallback;
    // 标记是否已经开始动画
    isAnimationing = false;

    //************** Shader sources **************

    vertexSource = `
attribute vec2 position;
void main() {
	gl_Position = vec4(position, 0.0, 1.0);
}
`;

    fragmentSource = `
precision highp float;

uniform float width;
uniform float height;
vec2 resolution = vec2(width, height);

uniform float time;

#define POINT_COUNT 8

vec2 points[POINT_COUNT];
const float speed = -0.5;
const float len = 0.25;
float intensity = 1.3;
float radius = 0.008;

//https://www.shadertoy.com/view/MlKcDD
//Signed distance to a quadratic bezier
float sdBezier(vec2 pos, vec2 A, vec2 B, vec2 C){    
	vec2 a = B - A;
	vec2 b = A - 2.0*B + C;
	vec2 c = a * 2.0;
	vec2 d = A - pos;

	float kk = 1.0 / dot(b,b);
	float kx = kk * dot(a,b);
	float ky = kk * (2.0*dot(a,a)+dot(d,b)) / 3.0;
	float kz = kk * dot(d,a);      

	float res = 0.0;

	float p = ky - kx*kx;
	float p3 = p*p*p;
	float q = kx*(2.0*kx*kx - 3.0*ky) + kz;
	float h = q*q + 4.0*p3;

	if(h >= 0.0){ 
		h = sqrt(h);
		vec2 x = (vec2(h, -h) - q) / 2.0;
		vec2 uv = sign(x)*pow(abs(x), vec2(1.0/3.0));
		float t = uv.x + uv.y - kx;
		t = clamp( t, 0.0, 1.0 );

		// 1 root
		vec2 qos = d + (c + b*t)*t;
		res = length(qos);
	}else{
		float z = sqrt(-p);
		float v = acos( q/(p*z*2.0) ) / 3.0;
		float m = cos(v);
		float n = sin(v)*1.732050808;
		vec3 t = vec3(m + m, -n - m, n - m) * z - kx;
		t = clamp( t, 0.0, 1.0 );

		// 3 roots
		vec2 qos = d + (c + b*t.x)*t.x;
		float dis = dot(qos,qos);
        
		res = dis;

		qos = d + (c + b*t.y)*t.y;
		dis = dot(qos,qos);
		res = min(res,dis);
		
		qos = d + (c + b*t.z)*t.z;
		dis = dot(qos,qos);
		res = min(res,dis);

		res = sqrt( res );
	}
    
	return res;
}


//http://mathworld.wolfram.com/HeartCurve.html
vec2 getHeartPosition(float t){
	return vec2(16.0 * sin(t) * sin(t) * sin(t),
							-(13.0 * cos(t) - 5.0 * cos(2.0*t)
							- 2.0 * cos(3.0*t) - cos(4.0*t)));
}

//https://www.shadertoy.com/view/3s3GDn
float getGlow(float dist, float radius, float intensity){
	return pow(radius/dist, intensity);
}

float getSegment(float t, vec2 pos, float offset, float scale){
	for(int i = 0; i < POINT_COUNT; i++){
		points[i] = getHeartPosition(offset + float(i)*len + fract(speed * t) * 6.28);
	}
    
	vec2 c = (points[0] + points[1]) / 2.0;
	vec2 c_prev;
	float dist = 10000.0;
    
	for(int i = 0; i < POINT_COUNT-1; i++){
		//https://tinyurl.com/y2htbwkm
		c_prev = c;
		c = (points[i] + points[i+1]) / 2.0;
		dist = min(dist, sdBezier(pos, scale * c_prev, scale * points[i], scale * c));
	}
	return max(0.0, dist);
}

void main(){
	vec2 uv = gl_FragCoord.xy/resolution.xy;
	float widthHeightRatio = resolution.x/resolution.y;
	vec2 centre = vec2(0.5, 0.5);
	vec2 pos = centre - uv;
	pos.y /= widthHeightRatio;
	//Shift upwards to centre heart
	pos.y += 0.02;
    // 动画尺寸比例
	float scale = 0.025;
	
	float t = time;
    
	//Get first segment
  float dist = getSegment(t, pos, 0.0, scale);
  float glow = getGlow(dist, radius, intensity);
  
  vec3 col = vec3(0.0);

	//White core
  col += 10.0*vec3(smoothstep(0.003, 0.001, dist));
  //Pink glow
  col += glow * vec3(1.0,0.05,0.3);
  
  //Get second segment
  dist = getSegment(t, pos, 3.4, scale);
  glow = getGlow(dist, radius, intensity);
  
  //White core
  col += 10.0*vec3(smoothstep(0.003, 0.001, dist));
  //Blue glow
  col += glow * vec3(0.1,0.4,1.0);
        
	//Tone mapping
	col = 1.0 - exp(-col);

	//Gamma
	col = pow(col, vec3(0.4545));

	// Output to screen
    // 0.01 是背景透明度, 不能设为 0, 为 0 就啥都没了
 	gl_FragColor = vec4(col, 0.01);
}
`;

    constructor() {
        console.log('constructor()');
        this.canvas = document.getElementById('map-animation-cover-view');
        this.gl = this.canvas.getContext('webgl');
        this.program = this.gl.createProgram();
        // Initialize the GL context

        if (!this.gl) {
            console.error("Unable to initialize WebGL.");
        }

        //************** Create shaders **************

        // Create vertex and fragment shaders
        var vertexShader = this.compileShader(this.vertexSource, this.gl.VERTEX_SHADER);
        var fragmentShader = this.compileShader(this.fragmentSource, this.gl.FRAGMENT_SHADER);

        // Create shader programs
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);
        this.gl.useProgram(this.program);

        // Set up rectangle covering entire canvas 
        var vertexData = new Float32Array([
            -1.0, 1.0, 	// top left
            -1.0, -1.0, 	// bottom left
            1.0, 1.0, 	// top right
            1.0, -1.0, 	// bottom right
        ]);

        // Create vertex buffer
        var vertexDataBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexDataBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertexData, this.gl.STATIC_DRAW);

        // Layout of our data in the vertex buffer
        var positionHandle = this.getAttribLocation(this.program, 'position');

        this.gl.enableVertexAttribArray(positionHandle);
        this.gl.vertexAttribPointer(positionHandle,
            2, 				// position is a vec2 (2 values per component)
            this.gl.FLOAT, // each component is a float
            false, 		// don't normalize values
            2 * 4, 		// two 4 byte float components per vertex (32 bit float is 4 bytes)
            0 				// how many bytes inside the buffer to start from
        );

        // Set uniform handle
        this.timeHandle = this.getUniformLocation(this.program, 'time');
        this.widthHandle = this.getUniformLocation(this.program, 'width');
        this.heightHandle = this.getUniformLocation(this.program, 'height');

        console.log('this.canvas.size:', this.canvas.width, this.canvas.height);
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.uniform1f(this.widthHandle, this.canvas.width);
        this.gl.uniform1f(this.heightHandle, this.canvas.height);

        this.lastFrame = Date.now();
        this.thisFrame = Date.now();
    }

    //************** Utility functions **************

    resize() {
        console.log('resize():', this.canvas.width, this.canvas.height);
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.uniform1f(this.widthHandle, this.canvas.width);
        this.gl.uniform1f(this.heightHandle, this.canvas.height);
    }

    //Compile shader and combine with source
    compileShader(shaderSource, shaderType) {
        var shader = this.gl.createShader(shaderType);
        this.gl.shaderSource(shader, shaderSource);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            throw "Shader compile failed with: " + this.gl.getShaderInfoLog(shader);
        }
        return shader;
    }

    //From https://codepen.io/jlfwong/pen/GqmroZ
    //Utility to complain loudly if we fail to find the attribute/uniform
    getAttribLocation(program, name) {
        var attributeLocation = this.gl.getAttribLocation(program, name);
        if (attributeLocation === -1) {
            throw 'Cannot find attribute ' + name + '.';
        }
        return attributeLocation;
    }

    getUniformLocation(program, name) {
        var attributeLocation = this.gl.getUniformLocation(program, name);
        if (attributeLocation === -1) {
            throw 'Cannot find uniform ' + name + '.';
        }
        return attributeLocation;
    }

    draw() {
        console.log('draw()');
        // Update time
        this.thisFrame = Date.now();
        this.time += (this.thisFrame - this.lastFrame) / 1000;
        this.lastFrame = this.thisFrame;

        // Send uniforms to program
        this.gl.uniform1f(this.timeHandle, this.time);
        //Draw a triangle strip connecting vertices 0-4
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

        this.animationFrameCallback = requestAnimationFrame(() => this.draw());
    }

    startAnimation() {
        if (this.isAnimationing) {
            return;
        }
        this.animationFrameCallback = requestAnimationFrame(() => this.draw());
        this.isAnimationing = true;
    }

    stopAnimation() {
        cancelAnimationFrame(this.animationFrameCallback);
        this.isAnimationing = false;
    }
}