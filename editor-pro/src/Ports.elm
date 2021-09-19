port module Ports exposing (..)

import Json.Encode



-- Requesting Terminal


port requestRunTerminal : Json.Encode.Value -> Cmd msg


port requestPasteTerminal : () -> Cmd msg


port requestCopyTerminal : () -> Cmd msg


port requestSetupTerminalResizeObserver : () -> Cmd msg



-- Requesting


port requestOpenProject : String -> Cmd msg


port requestRefreshDirectory : String -> Cmd msg


port requestFuzzyFindProjects : String -> Cmd msg


port requestFuzzyFindInProjectFileOrDirectory : String -> Cmd msg


port requestRun : Json.Encode.Value -> Cmd msg


port requestSave : Json.Encode.Value -> Cmd msg


port requestCompletion : Json.Encode.Value -> Cmd msg


port requestChange : String -> Cmd msg


port requestCopy : String -> Cmd msg


port requestCreateFile : String -> Cmd msg


port requestCreateDirectory : String -> Cmd msg


port requestDelete : Json.Encode.Value -> Cmd msg


port requestPaste : () -> Cmd msg


port requestAddToHistory : Json.Encode.Value -> Cmd msg


port requestGetFromHistory : () -> Cmd msg


port requestGetFromRedoHistory : () -> Cmd msg


port requestActivateFileOrDirectory : String -> Cmd msg


port requestFocusEvent : String -> Cmd msg


port requestScrollIntoView : String -> Cmd msg


port requestCharacterWidth : () -> Cmd msg



-- Receiving Terminal


port receiveTerminalOutput : (Json.Encode.Value -> msg) -> Sub msg


port receiveTerminalResized : (Json.Encode.Value -> msg) -> Sub msg



-- Receiving


port receivePaste : (String -> msg) -> Sub msg


port receiveSave : (Json.Encode.Value -> msg) -> Sub msg


port receiveCompletions : (Json.Encode.Value -> msg) -> Sub msg


port receiveNotification : (Json.Encode.Value -> msg) -> Sub msg


port receiveSymbols : (Json.Encode.Value -> msg) -> Sub msg


port receiveGetFromHistory : (Json.Encode.Value -> msg) -> Sub msg


port receiveActivatedFile : (Json.Encode.Value -> msg) -> Sub msg


port receiveErrors : (Json.Encode.Value -> msg) -> Sub msg


port receiveFuzzyFindResults : (List String -> msg) -> Sub msg


port receiveFileTree : (Json.Encode.Value -> msg) -> Sub msg


port receiveActivatedDirectory : (String -> msg) -> Sub msg


port receiveVideError : (Json.Encode.Value -> msg) -> Sub msg


port receiveCharacterWidth : (Float -> msg) -> Sub msg
