
all : main

shader.frag.min : shader.frag Makefile
	cp shader.frag shader.frag.min
	sed -i 's/m_origin/o/g' shader.frag.min
	sed -i 's/m_direction/d/g' shader.frag.min
	sed -i 's/m_point/k/g' shader.frag.min
	sed -i 's/m_intersected/i/g' shader.frag.min
	sed -i 's/m_color/c/g' shader.frag.min
	sed -i 's/m_mat/m/g' shader.frag.min
	sed -i 's/m_cumdist/y/g' shader.frag.min
	sed -i 's/m_attenuation/l/g' shader.frag.min

	sed -i 's/m_diffuse/o/g' shader.frag.min
	sed -i 's/m_specular/d/g' shader.frag.min
	sed -i 's/m_spec_exp/k/g' shader.frag.min
	sed -i 's/m_reflectance/i/g' shader.frag.min
	sed -i 's/m_transparency/c/g' shader.frag.min

	sed -i 's/\bRay\b/Ra/g' shader.frag.min
	sed -i 's/\bMat\b/Ma/g' shader.frag.min

shader.h : shader.frag.min Makefile
	mono ~/Downloads/shader_minifier.exe --preserve-externals shader.frag.min -o shader.h

main : main.c shader.h Makefile
	gcc -o main main.c -lX11 -lGL -lcairo -lXrandr -O1 -fno-tree-ch -std=gnu11 -nostartfiles -nostdlib
	strip main
	strip -R .note -R .comment -R .eh_frame -R .eh_frame_hdr -R .note.gnu.build-id main
	#remove section header
	truncate --size=-1152 main
	#clear out useless bits
	sed -i 's/_edata/\x00\x00\x00\x00\x00\x00/g' main;
	sed -i 's/__bss_start/\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00/g' main;
	sed -i 's/_end/\x00\x00\x00\x00/g' main;
	#clear out parts referring to section header
	#e_shoff
	dd if=/dev/zero of=main bs=1 seek=40 count=8 conv=notrunc
	#e_shentsize
	dd if=/dev/zero of=main bs=1 seek=58 count=2 conv=notrunc
	#e_shnum
	dd if=/dev/zero of=main bs=1 seek=60 count=2 conv=notrunc
	#e_shstrndx
	dd if=/dev/zero of=main bs=1 seek=62 count=2 conv=notrunc
	#put in my name do not steal
	# printf 'blackle' | dd of=main bs=1 seek=8 count=7 conv=notrunc
	wc -c main

main_packed : main ../packer/header Makefile
	gzip --no-name -9 -c main | wc -c
	zopfli --gzip --i10000 -c main > main.gz
	wc -c main.gz
	cat ../packer/header main.gz > main_packed
	chmod +x main_packed
	wc -c main_packed