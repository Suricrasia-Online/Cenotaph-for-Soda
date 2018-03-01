#define GL_GLEXT_PROTOTYPES why
#include<stdio.h>
#include<stdlib.h>
#include<X11/X.h>
#include<X11/Xlib.h>
#include<GL/gl.h>
#include<GL/glx.h>
#include<GL/glu.h>

#include "shader.h"

void swap(GLuint* t1, GLuint* t2) {
    GLuint temp = *t1;
    *t1 = *t2;
    *t2 = temp;
}

#define CANVAS_WIDTH 1920
#define CANVAS_HEIGHT 1080

void render(GLuint fb, GLuint tex, int time) {
glBindFramebuffer(GL_FRAMEBUFFER, fb);
glViewport(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);

glActiveTexture(GL_TEXTURE0);
glBindTexture(GL_TEXTURE_2D, tex);
glUniform1i(0, 0);
glUniform1i(1, time);

glRecti(-1,-1,1,1);
}

void main(int argc, char *argv[]) {

Display* dpy = XOpenDisplay(NULL);
 
Window root = DefaultRootWindow(dpy);
GLint att[] = { GLX_RGBA, GLX_DEPTH_SIZE, 24, GLX_DOUBLEBUFFER, None };
XVisualInfo* vi = glXChooseVisual(dpy, 0, att);


Colormap cmap = XCreateColormap(dpy, root, vi->visual, AllocNone);

XSetWindowAttributes    swa;
swa.colormap = cmap;
 swa.event_mask = ExposureMask | KeyPressMask;

// Window win = XCreateWindow(dpy, root, 0, 0, 600, 600, 0, vi->depth, InputOutput, vi->visual, CWColormap | CWEventMask, &swa);

 // XMapWindow(dpy, win);

// XStoreName(dpy, win, "VERY SIMPLE APPLICATION");
GLXContext glc = glXCreateContext(dpy, vi, NULL, 1);
if (glc == NULL) {
  return;
}
glXMakeCurrent(dpy, root, glc);

GLuint textureA;
glEnable(GL_TEXTURE_2D);
glGenTextures(1, &textureA);
glBindTexture(GL_TEXTURE_2D, textureA);
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
// glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
// glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA16F, CANVAS_WIDTH, CANVAS_HEIGHT, 0, GL_RGBA,
  GL_FLOAT, NULL);

GLuint fboA;
glGenFramebuffers(1, &fboA);
glBindFramebuffer(GL_FRAMEBUFFER, fboA);
glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0,
  GL_TEXTURE_2D, textureA, 0);

GLuint textureB;
glEnable(GL_TEXTURE_2D);
glGenTextures(1, &textureB);
glBindTexture(GL_TEXTURE_2D, textureB);
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
// glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
// glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA16F, CANVAS_WIDTH, CANVAS_HEIGHT, 0, GL_RGBA,
  GL_FLOAT, NULL);

GLuint fboB;
glGenFramebuffers(1, &fboB);
glBindFramebuffer(GL_FRAMEBUFFER, fboB);
glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0,
  GL_TEXTURE_2D, textureB, 0);

   // printf("OpenGL version is (%s)\n", glGetString(GL_VERSION));
    GLuint f = glCreateShader(GL_FRAGMENT_SHADER);
    // const char *fs = "uniform sampler2D canvas;uniform int time;\nvoid main(){ if((gl_FragCoord.x < time * 10) || (gl_FragCoord.x > time * 10 + 2)) { gl_FragColor = texture2D(canvas, gl_FragCoord/500.0); } else { gl_FragColor = vec4(250.0,250.0,250.0,250.0);} }";
    const char *fs = _shader;
    glShaderSource(f, 1, &fs, NULL);
    glCompileShader(f);
GLint isCompiled = 0;
glGetShaderiv(f, GL_COMPILE_STATUS, &isCompiled);
if(isCompiled == GL_FALSE) {

  GLint maxLength = 0;
  glGetShaderiv(f, GL_INFO_LOG_LENGTH, &maxLength);
  printf("fuck: %d\n", maxLength);

  // The maxLength includes the NULL character
  char* error = malloc(maxLength);
  glGetShaderInfoLog(f, maxLength, &maxLength, error);
  printf("%s\n", error);

  // Provide the infolog in whatever manor you deem best.
  // Exit with failure.
  // glDeleteShader(shader); // Don't leak the shader.

return;

}
 
  GLuint p = glCreateProgram();
  glAttachShader(p,f);
 
  glLinkProgram(p);
  GLint isLinked = 0;
glGetProgramiv(p, GL_LINK_STATUS, (int *)&isLinked);
if (isLinked == GL_FALSE)
{
  GLint maxLength = 0;
  glGetProgramiv(p, GL_INFO_LOG_LENGTH, &maxLength);

  // The maxLength includes the NULL character
  char* error = malloc(maxLength);
  glGetProgramInfoLog(p, maxLength, &maxLength,error);
  printf("%s\n", error);

  // Use the infoLog as you see fit.
  
  // In this simple program, we'll just leave

return;
}

glUseProgram(p);

glBindFramebuffer(GL_FRAMEBUFFER, fboA);
glViewport(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);

glClearColor(0.0,0.0,0.0,0.0);
glClear(GL_COLOR_BUFFER_BIT);

glBindFramebuffer(GL_FRAMEBUFFER, fboB);
glViewport(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);

glClearColor(0.0,0.0,0.0,0.0);
glClear(GL_COLOR_BUFFER_BIT);


// glActiveTexture(GL_TEXTURE0);
// glBindTexture(GL_TEXTURE_2D, textureB);
// glUniform1i(0, 0);

// glRecti(-1,-1,1,1);

// glUseProgram(0);
// glBindFramebuffer(GL_FRAMEBUFFER, 0);
// glBindFramebuffer(GL_FRAMEBUFFER, fboA);

for (int x = 0; x < 90; x++) {
  render(fboA, textureB, x);
  swap(&fboA, &fboB);
  swap(&textureA, &textureB);
}



GLfloat* data = malloc(sizeof(GLfloat) * CANVAS_WIDTH * CANVAS_HEIGHT * 3);
glReadPixels(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, GL_RGB, GL_FLOAT, data);




printf("P3\n");
printf("%d %d\n", CANVAS_WIDTH, CANVAS_HEIGHT);
printf("%d\n", 255);

for (int x = 0; x < CANVAS_WIDTH; x++) {

for (int y = 0; y < CANVAS_HEIGHT; y++) {
 
for (int z = 0; z < 3; z++) {
  
  int val = (int)(data[x * CANVAS_HEIGHT * 3 + y * 3 + z]) % 255;
  if (val < 0) val = 0;
  printf("%d ", val);
} 
// printf("\n");
}  
printf("\n");
}


exit(0);

// int running=1;
// while(running) {
//         XNextEvent(dpy, &xev);

//         if(xev.type == Expose) {
//                 // XGetWindowAttributes(dpy, win, &gwa);
//                 // glViewport(0, 0, gwa.width, gwa.height);
//                 // DrawAQuad(); 
//                 // glXSwapBuffers(dpy, win);
//         }

//         else if(xev.type == KeyPress) {
// 		running=0;
//         }
//     } /* this closes while(1) { */
} /* this is the } which closes int main(int argc, char *argv[]) { */

