#define _GNU_SOURCE
#include <unistd.h>
#include <sys/syscall.h>
#include <sys/stat.h>
#include <stdio.h>
#include <string.h>

int main (int argc, char *argv[]) {
	int fd = syscall(319, "d", 0);
	const char* payload = "#!/bin/bash\necho \"hello Im fucking hormsting\"\n";
	write(fd, payload, strlen(payload));
	execvp("/proc/self/fd/3", argv);
}