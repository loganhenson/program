module Msg exposing (..)

import Editor.RawKeyboard as RawKeyboard
import Terminal.Types


type Msg
    = TerminalMsg Terminal.Types.Msg
    | RawKeyboardMsg RawKeyboard.Msg
