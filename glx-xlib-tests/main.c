#define GL_GLEXT_PROTOTYPES why
#include<stdio.h>
#include<stdbool.h>
#include<stdlib.h>
#include<stdint.h>
#include<X11/X.h>
#include<X11/Xlib.h>
#include <X11/Xatom.h>
#include<GL/gl.h>
#include<GL/glx.h>
#include<GL/glu.h>

#include "shader.h"
// #define DEBUG true

static inline void swap(GLuint* t1, GLuint* t2) {
    GLuint temp = *t1;
    *t1 = *t2;
    *t2 = temp;
}

#define CANVAS_WIDTH 1920
#define CANVAS_HEIGHT 1080

static inline void render(GLuint fb, GLuint tex, int time) {
glBindFramebuffer(GL_FRAMEBUFFER, fb);
glViewport(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);

glActiveTexture(GL_TEXTURE0);
glBindTexture(GL_TEXTURE_2D, tex);
glUniform1i(0, 0);
glUniform1i(1, time);

glRecti(-1,-1,1,1);
}

__attribute__((force_align_arg_pointer))
void glLinkProgram__ALIGNED(GLuint p) {
    glLinkProgram(p);
}

void _start() {

Display* dpy = XOpenDisplay(NULL);
 
Window root = DefaultRootWindow(dpy);
GLint att[] = { GLX_RGBA, GLX_DEPTH_SIZE, 24, GLX_DOUBLEBUFFER, None };
XVisualInfo* vi = glXChooseVisual(dpy, 0, att);


Colormap cmap = XCreateColormap(dpy, root, vi->visual, AllocNone);

XSetWindowAttributes    swa;
swa.colormap = cmap;
// swa.override_redirect = 1;    
swa.event_mask = ExposureMask | KeyPressMask;                                                   
Window win = XCreateWindow(dpy, root, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0, vi->depth, InputOutput, vi->visual, CWColormap | CWEventMask /*| CWOverrideRedirect*/, &swa);


 Atom atoms[2] = { XInternAtom(dpy, "_NET_WM_STATE_FULLSCREEN", false), None };
  XChangeProperty(
      dpy, 
      win, 
      XInternAtom(dpy, "_NET_WM_STATE", false),
      XA_ATOM, 32, PropModeReplace, atoms, 1
  );
 XMapWindow(dpy, win);
// XStoreName(dpy, win, "VERY SIMPLE APPLICATION");
GLXContext glc = glXCreateContext(dpy, vi, NULL, 1);
if (glc == NULL) {
  return;
}
glXMakeCurrent(dpy, win, glc);

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

GLuint f = glCreateShader(GL_FRAGMENT_SHADER);
glShaderSource(f, 1, &shader_frag, NULL);
glCompileShader(f);

#ifdef DEBUG
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

exit(-10);

}
#endif
 
  GLuint p = glCreateProgram();
  glAttachShader(p,f);
 
  glLinkProgram__ALIGNED(p);

#ifdef DEBUG
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

exit(-10);
}
#endif

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


#if 0
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

// exit(0);
#endif 

int running=1;
while(running) {
  XEvent xev;
        XNextEvent(dpy, &xev);

        if(xev.type == Expose) {
              glBindFramebuffer(GL_FRAMEBUFFER, 0);
              glViewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
              glActiveTexture(GL_TEXTURE0);
              glBindTexture(GL_TEXTURE_2D, textureB);
              glUniform1i(0, 0);
              glUniform1i(1, 0);

              glRecti(-1,-1,1,1);
              glXSwapBuffers(dpy, win);

        }

        else if(xev.type == KeyPress) {
          asm(".intel_syntax noprefix");
          asm("mov rax, 60");
      		asm("syscall");
          asm(".att_syntax prefix");
        }
    } /* this closes while(1) { */
} /* this is the } which closes int main(int argc, char *argv[]) { */

