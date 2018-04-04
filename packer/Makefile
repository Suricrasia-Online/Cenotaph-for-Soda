
header_test-32: header-32 Makefile
	lzma --format=lzma -9 --extreme --lzma1=preset=9,lc=1,lp=0,pb=0 --keep --stdout /bin/ls > ls.xz
	cat header-32 ls.xz > header_test-32
	chmod +x header_test-32
	wc -c header_test-32

header-32 : header-32.asm Makefile
	nasm -f bin -o header-32 header-32.asm -l header-32.list
	chmod +x header-32
	wc -c header-32

header_test: header Makefile
	lzma --format=lzma -9 --extreme --lzma1=preset=9,lc=1,lp=0,pb=0 --keep --stdout /bin/ls > ls.xz
	cat header ls.xz > header_test
	chmod +x header_test
	wc -c header_test

header : header.asm Makefile
	nasm -f bin -o header header.asm -l header.list
	chmod +x header
	wc -c header
