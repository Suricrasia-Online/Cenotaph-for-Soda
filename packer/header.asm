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
	; here we are setting the values for the memfd_create syscall
	; passing "rsp" as the name to the kernel. the name doesn't matter but it cannot be null
	; any address in the current space is probably fine
	mov ax, sys_memfd_create
	minimov rdi, rsp
	jmp p_flags

e_type:
	dw 2
e_machine:
	dw 0x3e
e_version: ;this might be nonsense too
	dd 1
e_entry:
	dq e_padding
e_phoff:
	dq phdr - $$
e_shoff: ;this might be nonsense too
	dq 0
e_flags: ;this might be nonsense too
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
	;p_flags is supposed to be 0x0f, and syscall is 0x0f05;
	;the kernel only looks at the bottom byte, so I can put code here!
	syscall
	jmp p_paddr

p_offset:
	dq 0
p_vaddr:
	dq $$

p_paddr: ;apparently p_paddr can be nonsense
	mov al, sys_fork
	syscall
	test eax,eax
	jmp _start

p_filesz:
	dq filesize
p_memsz:
	dq filesize
p_align: ;align can be nonsense too apparently!!
	; dq 0x10

phdrsize equ $ - phdr + 0x8

; ===========================
; ========= STRINGS =========
; ===========================

; the repeated "/proc/self/" makes me a sad shark
__exe:
	db '/proc/self/exe',0
__memfd:
	db '/proc/self/'
__hi_were_the_replacements:
	db 'fd/3',0
__gzip:
	db '/bin/zcat',0

; ===========================
; ========= CODE!!! =========
; ===========================

_start:
	; NOTICE: execution begain in e_padding, follow jumps from there to here

	; forget about argc so rsp points to argv array
	pop rdx

	; move to child or parent
	jz _child

_parent:
	; can be edi, will be smaller, but scary...
	xor rdi, rdi
	mov ax, sys_waitid
	add r10, 4 
	syscall

	; get environ pointer from stack into rdx
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
	; Rock'n'rollin' 'til the break of dawn!
	; Hey, where's Tommy? Someone find Tommy!
	; mov qword [__hi_were_the_replacements], `exe\x00`

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

	;execve
	minimov rax, sys_execve
	minimov	rdi, __gzip
	; use our arguments
	minimov	rsi, rsp
	xor rdx, rdx ;empty environ
	syscall


filesize	equ	 $ - $$