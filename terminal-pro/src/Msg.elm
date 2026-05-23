module Msg exposing (..)

import Editor.RawKeyboard as RawKeyboard
import Terminal.Types


type Msg
    = TerminalMsg Terminal.Types.Msg
    | TerminalMsgFor String Terminal.Types.Msg
    | RawKeyboardMsg RawKeyboard.Msg
    | OpenTerminal
    | SelectTerminal Int
    | CloseTerminalRequested Int
    | CloseTerminalConfirmed Int
    | DisarmCloseTick
    | NoOp
