port module Ports exposing (..)

import Json.Encode



-- Requesting


port requestRun : Json.Encode.Value -> Cmd msg


port requestSave : Json.Encode.Value -> Cmd msg


port requestCopy : String -> Cmd msg


port requestPaste : () -> Cmd msg


port requestChange : String -> Cmd msg


port requestCharacterWidth : () -> Cmd msg


port requestActivateFile : String -> Cmd msg



-- Receiving


port receiveChange : (String -> msg) -> Sub msg


port receiveCharacterWidth : (Float -> msg) -> Sub msg


port receivePaste : (String -> msg) -> Sub msg


port receiveSave : (Json.Encode.Value -> msg) -> Sub msg


port receiveActivatedFile : (Json.Encode.Value -> msg) -> Sub msg


port receiveErrors : (Json.Encode.Value -> msg) -> Sub msg
