
header_test: header Makefile
	-rm ./o
	gzip -c /bin/ls > ls.gz
	cat header ls.gz > header_test
	chmod +x header_test
	wc -c header_test

header : header.s Makefile
	nasm -f bin -o header header.s -l header.list
	chmod +x header
	wc -c header
