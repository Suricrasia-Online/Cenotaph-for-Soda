; ==========================================
; ========= MACROS AND BOILERPLATE =========
; ==========================================

;WHEN I SAY BITS, YOU SAY 64!
BITS 64

;the address offset for x86-64
org 0x00400000

;a bunch of definitions so I don't have to memorize syscall numbers
%include "syscalls.asm"

;this is a hack that's 2 bytes smaller than mov!
%macro minimov 2
	push %2
	pop %1
%endmacro

; ==============================
; ========= ELF HEADER =========
; ==============================

ehdr: ; Elf64_Ehdr

e_ident:
	db 0x7F, "ELF", 2, 1, 1, 0

e_padding:
	mov	edi, __memfd
	jmp p_paddr
	db 0

e_type:
	dw 2
e_machine:
	dw 0x3e
e_version:
	dd 1
e_entry:
	dq e_padding
e_phoff:
	dq phdr - $$
e_shoff:
	dq 0
e_flags:
	dd 0
e_ehsize:
	dw ehdrsize
e_phentsize:
	dw phdrsize

; the program header starts inside of the elf header
; shamelessly adapted from the 32-bit version at
; http://www.muppetlabs.com/~breadbox/software/tiny/teensy.html

ehdrsize equ $ - ehdr

; ==================================
; ========= PROGRAM HEADER =========
; ==================================

phdr: ; Elf64_Phdr

p_type:
	dd 1

p_flags:
	dd 0xf

p_offset:
	dq 0
p_vaddr:
	dq $$

p_paddr: ;apparently p_paddr can be nonsense?
	mov ax, sys_memfd_create
	syscall
	jmp _start

p_filesz:
	dq filesize
p_memsz:
	dq filesize
p_align:
	dq 0x10

phdrsize equ $ - phdr


__exe:
	db '/proc/self/exe',0
__memfd:
	db '/proc/self/fd/3',0
__gzip:
	db '/bin/zcat',0

_start:

	; mov ax, sys_memfd_create
	; mov	edi, __memfd
	; syscall

	minimov rax, sys_fork
	syscall

	; move to child or parent
	test eax,eax
	jz _child

_parent:
	; can be edi, will be smaller, but scary...
	xor rdi, rdi
	mov ax, sys_waitid
	add r10, 4 
	syscall

	; get environ pointer from stack into rdx
	pop rdx ;argc
	; assume argc == 1
	mov dl, 16+8
	add rdx,rsp

	; execve demo 
	minimov rax, sys_execve
	minimov	rdi, __memfd
	minimov	rsi, rsp ;use our args as args
	syscall

	; minimov rax, sys_exit
	; minimov rdi, 420
	; syscall


_child:
	; open self 
	minimov	rdi, __exe
	mov al, sys_open ;open
	;these are initialized to zero on start
	; xor rsi, rsi
	; xor rdx, rdx
	syscall

	;fd1
	push rax

	;seek
	minimov rax, sys_lseek ;lseek
	pop rdi
	push rdi
	minimov rsi, filesize
	;these are initialized to zero on start
	; xor rdx, rdx
	syscall

	;dup2 demo->stdout
	minimov rax, sys_dup2
	minimov rdi, 3
	minimov rsi, 1 ;1 = stdout
	syscall

	;dup2 self->stdin
	minimov rax, sys_dup2
	pop rdi
	xor rsi, rsi ;0 = stdin
	syscall

	;setup arguments to gzip
	push 0
	push __gzip

	;execve
	minimov rax, sys_execve
	minimov	rdi, __gzip
	minimov	rsi, rsp
	xor rdx, rdx ;empty environ
	syscall


filesize	equ	 $ - $$