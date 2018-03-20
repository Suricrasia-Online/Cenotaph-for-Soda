#define GL_GLEXT_PROTOTYPES why
#include<stdio.h>
#include<stdbool.h>
#include<stdlib.h>
#include<stdint.h>
#include<X11/X.h>
#include<X11/Xlib.h>
#include<X11/extensions/Xrandr.h>
#include<GL/gl.h>
#include<GL/glx.h>
#include<GL/glu.h>
#include<cairo/cairo.h>

#include "cairo-private.h"

#include "shader.h"
// #define DEBUG true

#define CANVAS_WIDTH 1920
#define CANVAS_HEIGHT 1080

struct _textloc {
  char* text;
  char* font;
  cairo_matrix_t matrix;
  float origin_x;
  float origin_y;
}; 

static unsigned char fbdata[4 * CANVAS_HEIGHT * CANVAS_WIDTH];

__attribute__((force_align_arg_pointer))
void _start() {
  //initialize the window
  Display* dpy = XOpenDisplay(NULL);

  Window root = DefaultRootWindow(dpy);

  int num_sizes;
  XRRScreenSize* sizes = XRRSizes(dpy, 0, &num_sizes);
  for (int i = 0; i < num_sizes; i++) {
    if (sizes[i].width == 1920 && sizes[i].height == 1080) {
      XRRScreenConfiguration* conf = XRRGetScreenInfo(dpy, root);
      XRRSetScreenConfig(dpy, conf, root, i, RR_Rotate_0, CurrentTime);
      break;
    }
  }

  GLint att[] = { GLX_RGBA, None };
  XVisualInfo* vi = glXChooseVisual(dpy, 0, att);

  //I really hate this and I wish this call was unneeded. it feels useless
  Colormap cmap = XCreateColormap(dpy, root, vi->visual, AllocNone);

  //hide cursor
  // static char csr_bits[] = {0x00};
  XColor xcolor;
  Pixmap csr= XCreatePixmap(dpy,root,1,1,1);
  Cursor cursor= XCreatePixmapCursor(dpy,csr,csr,&xcolor,&xcolor,1,1); 

  //this enables things like events, fullscreen, and sets the invisible cursor
  XSetWindowAttributes swa;
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
  // glViewport(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
  // typedef void (*voidWithNoParams)();
  // voidWithNoParams glClearColorArbitrary = (voidWithNoParams)glClearColor;
  // (*glClearColorArbitrary)();
  // glClearColor(0.0,0.0,0.0,0.0);
  glClear(GL_COLOR_BUFFER_BIT);
  // glFinish();

  //oh yeah grab the keyboard
  XGrabKeyboard(dpy, win, true, GrabModeAsync, GrabModeAsync, CurrentTime);

  //initialize the render with some text
  cairo_surface_t* cairoSurf = cairo_image_surface_create_for_data(fbdata, CAIRO_FORMAT_ARGB32, CANVAS_WIDTH, CANVAS_HEIGHT, 4 * CANVAS_WIDTH);
  cairo_t* cairoCtx = cairo_create(cairoSurf);

  // cairo_set_font_matrix(cairoCtx, &matrix);
  // printf("xx: %f, xy: %f, yy: %f, yx: %f, x0: %f, y0: %f\n", matrix.xx, matrix.xy, matrix.yy, matrix.yx, matrix.x0, matrix.y0);

  const static struct _textloc texts[8] = {
    { 
      .text = "rip lol",
      .font = "FreeSans",
      .matrix = {.xx = 50, .xy = -10, .yy = -50, .yx = 20, .x0 = 0, .y0 = 0},
      .origin_x = 190,
      .origin_y = 550,
    },
    { 
      .text = "gg no re",
      .font = "FreeSans",
      .matrix = {.xx = 35, .xy = -6, .yy = -35, .yx = 15, .x0 = 0, .y0 = 0},
      .origin_x = 640,
      .origin_y = 760,
    },
    { 
      .text = "how do i",
      .font = "FreeSans",
      .matrix = {.xx = 25, .xy = 0, .yy = -25, .yx = 0, .x0 = 0, .y0 = 0},
      .origin_x = 985,
      .origin_y = 975,
    },
    { 
      .text = "rotate text",
      .font = "FreeSans",
      .matrix = {.xx = 25, .xy = 0, .yy = -25, .yx = 0, .x0 = 0, .y0 = 0},
      .origin_x = 985,
      .origin_y = 950,
    },
    { 
      .text = "in ms paint",
      .font = "FreeSans",
      .matrix = {.xx = 25, .xy = 0, .yy = -25, .yx = 0, .x0 = 0, .y0 = 0},
      .origin_x = 985,
      .origin_y = 925,
    },
    { 
      .text = "In Commemoration of All",
      .font = "URW Chancery L",
      .matrix = {.xx = 70, .xy = 0, .yy = -70, .yx = 0, .x0 = 0, .y0 = 0},
      .origin_x = 1200,
      .origin_y = 220,
    },
    { 
      .text = "the Soda that I Consumed",
      .font = "URW Chancery L",
      .matrix = {.xx = 70, .xy = 0, .yy = -70, .yx = 0, .x0 = 0, .y0 = 0},
      .origin_x = 1150,
      .origin_y = 160,
    },
    { 
      .text = "in the Making of this Demo",
      .font = "URW Chancery L",
      .matrix = {.xx = 70, .xy = 0, .yy = -70, .yx = 0, .x0 = 0, .y0 = 0},
      .origin_x = 1100,
      .origin_y = 100,
    }
  };

  cairoCtx->backend->set_source_rgba(cairoCtx, 0.5, 0.5, 0.5, 1.0);
  for (int i = 0; i < 8; i++) {
    // printf("%f, %f, %s\n", texts[i].origin_x, texts[i].origin_y, texts[i].text);
    cairo_select_font_face(cairoCtx, texts[i].font, CAIRO_FONT_SLANT_NORMAL, CAIRO_FONT_WEIGHT_NORMAL);
    cairoCtx->backend->set_font_matrix(cairoCtx, &texts[i].matrix);
    cairoCtx->backend->move_to(cairoCtx, texts[i].origin_x, texts[i].origin_y);
    cairo_show_text(cairoCtx, texts[i].text);
  }

  // //make this not shitty?
  // for (int i = 0; i < 4 * CANVAS_HEIGHT * CANVAS_WIDTH; i++) {
  //   data[i] = 0xFF - data[i];
  // }

  //create a floating point backing texture for a framebuffer
  GLuint textureA;
  glEnable(GL_TEXTURE_2D);
  glGenTextures(1, &textureA);
  glBindTexture(GL_TEXTURE_2D, textureA);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
  glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA32F, CANVAS_WIDTH, CANVAS_HEIGHT, 0, GL_BGRA, GL_UNSIGNED_BYTE, fbdata);

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
  // glBlendEquationSeparate( GL_FUNC_SUBTRACT, GL_FUNC_ADD);
  glBlendFuncSeparate( GL_ONE, GL_ONE, GL_ONE, GL_ONE);

  // glFinish();
  for (int x = 0; x < 9; x++) {
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
      //blackle mori no likey AT&T
      asm volatile(".intel_syntax noprefix");
      asm volatile("push 60");
      asm volatile("pop rax");
      asm volatile("xor edi, edi");
      asm volatile("syscall");
      asm volatile(".att_syntax prefix");
      __builtin_unreachable();
    }
  }
}
