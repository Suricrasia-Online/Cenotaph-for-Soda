; ==========================================
; ========= MACROS AND BOILERPLATE =========
; ==========================================

BITS 32

org 0x08048000

%include "syscalls-32.asm"

; ==============================
; ========= ELF HEADER =========
; ==============================

ehdr: ; Elf64_Ehdr
e_ident:
	db 0x7F, "ELF", 1, 1, 1, 0

e_padding:
	; times 8 db 0
	mov ax, 356
	mov ebx, esp
	jmp e_shoff

e_type:
	dw 2
e_machine:
	dw 3
e_version:
	dd 1
e_entry:
	dd e_padding
e_phoff:
	dd phdr - $$
e_shoff:
e_flags:
	int 0x80

	mov al, sys_fork
	pop ebp
	int 0x80
e_ehsize: ;begins halfway into jmp
	jmp p_paddr
	db 0
	; dd 0
	; dd 0
	; dw ehdrsize
e_phentsize:
	dw phdrsize
; e_phnum:
; 	dw 1
; e_shentsize:
; 	dw 0
; e_shnum:
; 	dw 0
; e_shstrndx:
; 	dw 0

ehdrsize      equ     $ - ehdr

; ==================================
; ========= PROGRAM HEADER =========
; ==================================

phdr: ; Elf32_Phdr

p_type:
	dd 1
p_offset:
	dd 0
p_vaddr:
	dd $$
p_paddr:
	test eax, eax
	jz _child
	; dd $$
p_filesz:
	jmp _parent
	dw 0
	; dd filesize
p_memsz:
	jmp _parent+4
	dw 0
	; dd filesize
p_flags:
	dd 5
p_align:
	dd 0x1000

phdrsize      equ     $ - phdr

; ===========================
; ========= CODE!!! =========
; ===========================

_start:

	; mov ax, 356
	; mov ebx, esp
	; int 0x80

	; mov al, sys_fork
	; pop ecx
	; int 0x80
	; test eax, eax
	; jz _child

_parent:

	xor ebx, ebx
	mov ax, sys_waitid
	mov si, 4
	int 0x80

	; gets pointer to __memfd from stack
	mov ebx, __memfd
	; get environ pointer from stack into rdx
	; assume argc == 1
	mov dl, 16+8
	add edx, esp

	; execve demo 
	mov eax, sys_execve
	mov ecx, esp ;use our args as args
	int 0x80

_child:
	; open self 
	mov ebx, __self
	mov al, sys_open ;open
	int 0x80

	;fd1
	push eax

	;seek
	mov al, sys_lseek ;lseek
	pop ebx
	push ebx
	mov cl, filesize
	int 0x80

	;dup2 demo->stdout
	mov al, sys_dup2
	dec ebx
	mov cl, 1 ;1 = stdout
	int 0x80

	;dup2 self->stdin
	mov al, sys_dup2
	pop ebx
	dec ecx ; 1 minus 1 equals zero!
	int 0x80

	;execve
	mov al, sys_execve
	; mov	edi, __gzip
	push 0
	push __gzip
	pop ebx
	push ebx
	; use our arguments
	mov	ecx, esp
	; xor rdx, rdx ;empty environ
	int 0x80




; ; ===========================
; ; ========= STRINGS =========
; ; ===========================

__gzip:
	db '/usr/bin/xzcat',0,
__self:
	db '/proc/self/exe',0
__memfd:
	db '/dev/fd/3',0


filesize	equ	 $ - $$