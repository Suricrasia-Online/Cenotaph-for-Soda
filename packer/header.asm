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
;works best between registers, for constants not so much
%macro minimov 2
	push %2
	pop %1
%endmacro

; ==============================
; ========= ELF HEADER =========
; ==============================

ehdr: ; Elf64_Ehdr

e_ident:
	db 0x7F, "ELF", 2, 1, 1

e_padding:
	; here we are setting the values for the memfd_create syscall
	; passing "rsp" as the name to the kernel. the name doesn't matter but it cannot be null
	; any address in the current space is probably fine
	mov ax, sys_memfd_create
	minimov rdi, rsp
	jmp p_flags
	nop

e_type:
	dw 2
e_machine:
	dw 0x3e
e_version: ;kernel is asleep! post assembly!
	mov al, sys_fork
	jmp p_paddr
e_entry:
	dq e_padding
e_phoff:
	dq phdr - $$

e_shoff:
e_flags:
e_ehsize:
 ;e_shoff and e_flags are 12 bytes and can be nonsense
	db 'blackle mori!',0

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
	jmp e_version

p_offset:
	dq 0
p_vaddr:
	dq $$

p_paddr: ;apparently p_paddr can be nonsense
	pop rcx ;this is just so we can forget about argc and have rsp point to the start of argv
	push __memfd ;both processes need this pointer so let's put it on the stack so they can get it with a single byte

	syscall

p_filesz:
	; this stuff can have code but it can't be bigger than about 4 bytes
	test eax, eax
	jmp _start
	db 0,0,0,0
p_memsz:
	; must be equal to p_filesz
	test eax, eax
	jmp _start + 8
	db 0,0,0,0
p_align: ;align can be nonsense too apparently!!
	; dq 0x10

phdrsize equ $ - phdr + 0x8


; ===========================
; ========= CODE!!! =========
; ===========================

_start:
	; NOTICE: execution begain in e_padding, follow jumps from there to here

	jz _child

_parent:
	; wait for child
	xor edi, edi
	mov ax, sys_waitid
	mov r10b, 4
	syscall

%ifdef CLOSE_ON_EXEC
	mov al, sys_fcntl
	mov dil, 3
	mov sil, 2
	inc edx
	syscall
%endif

	; gets pointer to __memfd from stack
	pop rdi
	; get environ pointer from stack into rdx
	; assume argc == 1
	mov dl, 16+8
	add rdx,rsp

	; execve demo 
	mov al, sys_execve
	minimov	rsi, rsp ;use our args as args
	syscall

_child:

	; Rock'n'rollin' 'til the break of dawn!
	; Hey, where's Tommy? Someone find Tommy!
	mov edi, `exe\x00`
	mov [rel __hi_were_the_replacements], edi

	; open self 
	pop rdi
	
	mov al, sys_open ;open
	syscall

	;fd1
	push rax

	;seek
	mov al, sys_lseek ;lseek
	pop rdi
	push rdi
	mov sil, filesize
	syscall

	;dup2 demo->stdout
	mov al, sys_dup2
	dec edi
	mov sil, 1 ;1 = stdout
	syscall

	;dup2 self->stdin
	mov al, sys_dup2
	pop rdi
	dec esi ; 1 minus 1 equals zero!
	syscall

	;execve
	mov al, sys_execve
	; mov	edi, __gzip
	push 0
	push __gzip
	pop rdi
	push rdi
	; use our arguments
	minimov	rsi, rsp
	; xor rdx, rdx ;empty environ
	syscall


; ===========================
; ========= STRINGS =========
; ===========================

__gzip:
 ;e_shoff and e_flags are 12 bytes and can be nonsense
	db '/usr/bin/xzcat',0,

;replacing the "fd/3" with "exe\0" on the fly saves... 4 bytes
;its actually good we did this because the __memfd load into register 
;can be done before fork so that both processes get it
__memfd:
	db '/proc/self/'
__hi_were_the_replacements:
	db 'fd/3',0


filesize	equ	 $ - $$