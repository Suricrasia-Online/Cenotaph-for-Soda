
all : main

shader.h : shader.frag Makefile
	mono ~/Downloads/shader_minifier.exe shader.frag -o shader.h

main : main.c shader.h Makefile
	gcc -o main main.c -lX11 -lGL -lGLU -O0 -std=gnu11 -nostartfiles -nostdlib
	strip main
	strip -R .note -R .comment -R .eh_frame -R .eh_frame_hdr -R .note.gnu.build-id main
	wc -c main
	gzip -c main | wc -c