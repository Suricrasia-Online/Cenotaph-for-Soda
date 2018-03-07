
header_test: header Makefile
	gzip -c /bin/ls > ls.gz
	cat header ls.gz > header_test
	chmod +x header_test
	wc -c header_test

header : header.asm Makefile
	nasm -f bin -o header header.asm -l header.list
	chmod +x header
	wc -c header
