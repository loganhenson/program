#!/usr/bin/env bash

if [[ $# -eq 0 ]]
    then open -a vterm.app --args "$HOME"
    else open -a vterm.app --args "$(realpath "$@")"
fi
