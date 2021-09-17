#!/bin/zsh
# Converts test.sh back into rusty escapes
sd -s '\e' '\u{1b}' ./sandbox/test.sh
sd -s '\a' '\u{7}' ./sandbox/test.sh
sd -s '\b' '\u{8}' ./sandbox/test.sh
