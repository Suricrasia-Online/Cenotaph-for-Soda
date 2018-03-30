#!/bin/sh
sed '1d;2d' $0 | zcat > /tmp/exe; chmod +x /tmp/exe; exec /tmp/exe;
