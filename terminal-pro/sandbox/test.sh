#!/bin/bash
# Paste console logs from the parser here.
#
# Then, use `./test-clean.sh` & `test-unclean.sh`
# for reproducing errant behavior
#

echo -e -n "\e[?1l\e>"
echo -e -n "\e[?2004l\r\r\n"
echo -e -n "\e]2;ls -G\a\e]1;ls\a"
echo -e -n "test.js test.md\r\n"
echo -e -n "\e[1m\e[7m%\e[27m\e[1m\e[0m                                                                                             \r \r"
echo -e -n "\e]2;loganhenson@Logans-MacBook-Pro:~/test\a\e]1;~/test\a"
echo -e -n "\r\e[0m\e[27m\e[24m\e[J\e[01;32m➜  \e[36mtest\e[00m "
echo -e -n "\e[K\e[?1h\e=\e[?2004h"

echo -e -n "\e[?1l\e>"
echo -e -n "\e[?2004l\r\r\n"
echo -e -n "\e]2;ls -G\a"
echo -e -n "\e]1;ls\a"
echo -e -n "test.js test.md\r\n"
echo -e -n "\e[1m\e[7m%\e[27m\e[1m\e[0m                                                                                             \r \r"
echo -e -n "\e]2;loganhenson@Logans-MacBook-Pro:~/test\a"
echo -e -n "\e]1;~/test\a"
echo -e -n "\r\e[0m\e[27m\e[24m\e[J\e[01;32m➜  \e[36mtest\e[00m "
echo -e -n "\e[K\e[?1h\e=\e[?2004h"