#!/bin/sh
sed '1d;2d' $0 | xzcat > /tmp/exe; chmod +x /tmp/exe; exec /tmp/exe;
