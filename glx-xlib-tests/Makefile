
all : main_packed

shader.frag.min : shader.frag curvedist.frag Makefile
	cp shader.frag shader.frag.min
	cp curvedist.frag shader.frag.min
	sed -i 's/m_origin/o/g' shader.frag.min
	sed -i 's/m_direction/d/g' shader.frag.min
	sed -i 's/m_point/k/g' shader.frag.min
	sed -i 's/m_intersected/i/g' shader.frag.min
	sed -i 's/m_color/c/g' shader.frag.min
	sed -i 's/m_mat/m/g' shader.frag.min
	sed -i 's/m_cumdist/y/g' shader.frag.min

	sed -i 's/m_diffuse/o/g' shader.frag.min
	sed -i 's/m_specular/d/g' shader.frag.min
	sed -i 's/m_spec_exp/k/g' shader.frag.min
	sed -i 's/m_reflectance/i/g' shader.frag.min
	sed -i 's/m_transparency/c/g' shader.frag.min

shader.h : shader.frag.min Makefile
	mono ~/Downloads/shader_minifier.exe --preserve-externals shader.frag.min -o shader.h

main : main.c shader.h Makefile
	gcc -o main main.c -lX11 -lGL -lGLU -O0 -std=gnu11 -nostartfiles
	strip main
	strip -R .note -R .comment -R .eh_frame -R .eh_frame_hdr -R .note.gnu.build-id main
	truncate --size=-1072 main
	wc -c main

main_packed : main ../packer/header Makefile
	gzip --no-name -9 -c main | wc -c
	zopfli --gzip --i500 -c main > main.gz
	wc -c main.gz
	cat ../packer/header main.gz > main_packed
	chmod +x main_packed
	wc -c main_packed