port module Ports exposing (..)

import Json.Encode



-- Requesting Editor


port requestCopy : String -> Cmd msg


port requestPaste : () -> Cmd msg



-- Receiving Editor


port receivePaste : (String -> msg) -> Sub msg



-- Requesting Terminal


port requestRunTerminal : Json.Encode.Value -> Cmd msg


port requestPasteTerminal : () -> Cmd msg


port requestSetupTerminalResizeObserver : () -> Cmd msg



-- Receiving Terminal


port receiveTerminalOutput : (Json.Encode.Value -> msg) -> Sub msg


port receiveTerminalResized : (Json.Encode.Value -> msg) -> Sub msg
