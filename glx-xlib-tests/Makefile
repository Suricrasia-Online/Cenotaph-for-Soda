
all : main_packed

shader.frag.min : shader.frag Makefile
	cp shader.frag shader.frag.min
	sed -i 's/m_origin/o/' shader.frag.min
	sed -i 's/m_direction/d/' shader.frag.min
	sed -i 's/m_point/k/' shader.frag.min
	sed -i 's/m_intersected/i/' shader.frag.min
	sed -i 's/m_color/c/' shader.frag.min

shader.h : shader.frag.min Makefile
	mono ~/Downloads/shader_minifier.exe --preserve-externals shader.frag.min -o shader.h

main : main.c shader.h Makefile
	gcc -o main main.c -lX11 -lGL -lGLU -O0 -std=gnu11 -nostartfiles
	strip main
	strip -R .note -R .comment -R .eh_frame -R .eh_frame_hdr -R .note.gnu.build-id main
	wc -c main

main_packed : main ../packer/header Makefile
	gzip --no-name -9 -c main | wc -c
	zopfli --gzip --i50 -c main > main.gz
	wc -c main.gz
	cat ../packer/header main.gz > main_packed
	chmod +x main_packed
	wc -c main_packed