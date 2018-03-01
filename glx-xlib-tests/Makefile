
all : main

shader.h : shader.frag Makefile
	/bin/echo -en '\x00' > null.txt
	cat shader.frag | sed '/^[ \t]*\/\//d' | tr -d '\n' | sed 's/[ \t]\+/ /g;s/$$/\n/' > shader.frag.min
	cat shader.frag.min null.txt | xxd -i /dev/stdin | sed 's/_dev_stdin/_shader/' > shader.h
	rm shader.frag.min null.txt

main : main.c shader.h Makefile
	gcc -o main main.c -lX11 -lGL -lGLU -std=gnu11
	strip main
	wc -c main
	gzip -c main | wc -c