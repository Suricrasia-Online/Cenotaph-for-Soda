#define GL_GLEXT_PROTOTYPES why
#include<stdio.h>
#include<stdbool.h>
#include<stdlib.h>
#include<stdint.h>
#include<X11/X.h>
#include<X11/Xlib.h>
#include<GL/gl.h>
#include<GL/glx.h>
#include<GL/glu.h>
#include<pango/pangocairo.h>

#include "cairo-private.h"

#include "shader.h"
#define DEBUG true

#define CANVAS_WIDTH 1920
#define CANVAS_HEIGHT 1080


__attribute__((force_align_arg_pointer))
void _start() {
  //initialize the window
  Display* dpy = XOpenDisplay(NULL);

  Window root = DefaultRootWindow(dpy);
  GLint att[] = { GLX_RGBA, None };
  XVisualInfo* vi = glXChooseVisual(dpy, 0, att);

  //I really hate this and I wish this call was unneeded. it feels useless
  Colormap cmap = XCreateColormap(dpy, root, vi->visual, AllocNone);

  //hide cursor
  static char csr_bits[] = {0x00};
  XColor xcolor;
  Pixmap csr= XCreateBitmapFromData(dpy,root,csr_bits,1,1);
  Cursor cursor= XCreatePixmapCursor(dpy,csr,csr,&xcolor,&xcolor,1,1); 

  //this enables things like events, fullscreen, and sets the invisible cursor
  XSetWindowAttributes    swa;
  swa.colormap = cmap;
  swa.override_redirect = 1;
  swa.event_mask = ExposureMask | KeyPressMask;
  swa.cursor = cursor;
  Window win = XCreateWindow(dpy, root, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0, vi->depth, InputOutput, vi->visual, CWColormap | CWEventMask | CWOverrideRedirect | CWCursor, &swa);

  // XStoreName(dpy, win, "POLYETHYLENE CENOTAPH");

  //this actually opens the window
  XMapWindow(dpy, win);

  //now we can do opengl calls!!!!
  GLXContext glc = glXCreateContext(dpy, vi, NULL, 1);

  #ifdef DEBUG
    if (glc == NULL) {
      return;
    }
  #endif

  glXMakeCurrent(dpy, win, glc);

  //clear to black and use glfinish to make sure it propagates to the screen before we start shader compilation
  glViewport(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
  glClearColor(0.0,0.0,0.0,0.0);
  glClear(GL_COLOR_BUFFER_BIT);
  glFinish();

  //oh yeah grab the keyboard
  XGrabKeyboard(dpy, win, true, GrabModeAsync, GrabModeAsync, CurrentTime);

  //initialize the render with some text
  unsigned char data[4 * CANVAS_HEIGHT * CANVAS_WIDTH];

  //make this not shitty?
  for (int i = 0; i < 4 * CANVAS_HEIGHT * CANVAS_WIDTH; i++) {
    data[i] = 0xFF;
  }

  cairo_surface_t* cairoSurf = cairo_image_surface_create_for_data(data, CAIRO_FORMAT_ARGB32, CANVAS_WIDTH, CANVAS_HEIGHT, 4 * CANVAS_WIDTH);
  cairo_t* cairoCtx = cairo_create(cairoSurf);

  cairo_select_font_face(cairoCtx, "Ubuntu Condensed", CAIRO_FONT_SLANT_NORMAL, CAIRO_FONT_WEIGHT_NORMAL);
  cairo_matrix_t matrix = {.xx = 40, .xy = -10, .yy = -80, .yx = -10, .x0 = 1300, .y0 = 900};
  // cairo_set_font_matrix(cairoCtx, &matrix);
  cairoCtx->backend->set_font_matrix(cairoCtx, &matrix);
  // printf("xx: %f, xy: %f, yy: %f, yx: %f, x0: %f, y0: %f\n", matrix.xx, matrix.xy, matrix.yy, matrix.yx, matrix.x0, matrix.y0);

  char *text[5] = {
    "Suricrasia Online Presents:",
    "A \"Polyethylene Cenotaph\"",
    "in Commemoration of All the",
    "Soda That Blackle Drank in",
    "the Making of This Demo"};
  for (int i = 0; i < 5; i++) {
    cairoCtx->backend->move_to(cairoCtx, i%2 ? 10 : 0, -120.0*i);
    // cairo_move_to(cairoCtx, );
    cairo_show_text(cairoCtx, text[i]);
  }

  //make this not shitty?
  for (int i = 0; i < 4 * CANVAS_HEIGHT * CANVAS_WIDTH; i++) {
    data[i] = 0xFF - data[i];
  }

  //create a floating point backing texture for a framebuffer
  GLuint textureA;
  glEnable(GL_TEXTURE_2D);
  glGenTextures(1, &textureA);
  glBindTexture(GL_TEXTURE_2D, textureA);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
  glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA32F, CANVAS_WIDTH, CANVAS_HEIGHT, 0, GL_BGRA, GL_UNSIGNED_BYTE, data);

  //create a framebuffer we can render everything to
  GLuint fboA;
  glGenFramebuffers(1, &fboA);
  glBindFramebuffer(GL_FRAMEBUFFER, fboA);
  glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0,
    GL_TEXTURE_2D, textureA, 0);

  //compile shader
  GLuint f = glCreateShader(GL_FRAGMENT_SHADER);
  glShaderSource(f, 1, &shader_frag_min, NULL);
  glCompileShader(f);

  #ifdef DEBUG
    GLint isCompiled = 0;
    glGetShaderiv(f, GL_COMPILE_STATUS, &isCompiled);
    if(isCompiled == GL_FALSE) {
      GLint maxLength = 0;
      glGetShaderiv(f, GL_INFO_LOG_LENGTH, &maxLength);

      char* error = malloc(maxLength);
      glGetShaderInfoLog(f, maxLength, &maxLength, error);
      printf("%s\n", error);

      exit(-10);
    }
  #endif

  //link shader
  GLuint p = glCreateProgram();
  glAttachShader(p,f);
  glLinkProgram(p);

  #ifdef DEBUG
    GLint isLinked = 0;
    glGetProgramiv(p, GL_LINK_STATUS, (int *)&isLinked);
    if (isLinked == GL_FALSE) {
      GLint maxLength = 0;
      glGetProgramiv(p, GL_INFO_LOG_LENGTH, &maxLength);

      char* error = malloc(maxLength);
      glGetProgramInfoLog(p, maxLength, &maxLength,error);
      printf("%s\n", error);

      exit(-10);
    }
  #endif

  glUseProgram(p);

  //switch to using our framebuffer
  glBindFramebuffer(GL_FRAMEBUFFER, fboA);

  //clear it
  // glClear(GL_COLOR_BUFFER_BIT);

  //enable additive blending so we don't have to do so in the shader
  glEnable(GL_BLEND);
  glBlendEquationSeparate(GL_FUNC_ADD, GL_FUNC_ADD);
  glBlendFuncSeparate(GL_ONE, GL_ONE, GL_ONE, GL_ONE);

  glFinish();

  //begin collecting samples, using the shader as the renderer
  for (int x = 0; x < 1; x++) {
    glUniform1f(0, x);
    glRecti(-1,-1,1,1);
    glFinish();
  }

  //blit our framebuffer to the screen
  glBindFramebuffer(GL_DRAW_FRAMEBUFFER, 0);
  glBindFramebuffer(GL_READ_FRAMEBUFFER, fboA);
  glBlitFramebuffer(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, GL_COLOR_BUFFER_BIT, GL_NEAREST);

  while(1) {
    XEvent xev;
    XNextEvent(dpy, &xev);

    //wait for escape key, then exit without glib :3
    if(xev.type == KeyPress && xev.xkey.keycode == 0x09) {
      asm volatile(".intel_syntax noprefix");
      asm volatile("mov rax, 60");
      asm volatile("syscall");
      asm volatile(".att_syntax prefix");
    }
  }
}
