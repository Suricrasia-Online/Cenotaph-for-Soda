
all: cenotaph cenotaph_backup

.PHONY: main
.PHONY: packer

main:
	make -C main main.xz

packer:
	make -C packer header

cenotaph : main packer Makefile
	cat ./packer/header ./main/main.xz > cenotaph
	chmod +x cenotaph
	wc -c cenotaph

cenotaph_backup : main packer Makefile
	cat ./packer/backup_packer.sh ./main/main.xz > cenotaph_backup
	chmod +x cenotaph_backup
	wc -c cenotaph_backup
