port module Ports exposing (..)

import Json.Encode



-- Requesting Editor


port requestCopy : String -> Cmd msg


port requestPaste : () -> Cmd msg


port requestCharacterWidth : () -> Cmd msg



-- Receiving Editor


port receivePaste : (String -> msg) -> Sub msg


port receiveCharacterWidth : (Float -> msg) -> Sub msg



-- Requesting Terminal


port requestRunTerminal : Json.Encode.Value -> Cmd msg


port requestPasteTerminal : () -> Cmd msg


port requestCopyTerminal : () -> Cmd msg


port requestQuit : () -> Cmd msg


port requestWriteClipboard : String -> Cmd msg


port requestBell : () -> Cmd msg


port requestNotify : String -> Cmd msg


port requestSetupTerminalResizeObserver : () -> Cmd msg


port requestOpenTerminal : Json.Encode.Value -> Cmd msg


port requestCloseTerminal : Json.Encode.Value -> Cmd msg


port setActiveContext : Json.Encode.Value -> Cmd msg



-- Receiving Terminal


port receiveTerminalOutput : (Json.Encode.Value -> msg) -> Sub msg


port receiveTerminalResized : (Json.Encode.Value -> msg) -> Sub msg


port receiveTerminalPaste : (String -> msg) -> Sub msg


port receiveTerminalFocus : (Bool -> msg) -> Sub msg
