#!/bin/bash
# Converts test.sh from copied console output into `echo -e` commands
sd -s '[start]' 'echo -e -n' ./sandbox/test.sh
sd -s '\u{1b}' '\e' ./sandbox/test.sh
sd -s '\u{7}' '\a' ./sandbox/test.sh
sd -s '\u{8}' '\b' ./sandbox/test.sh
