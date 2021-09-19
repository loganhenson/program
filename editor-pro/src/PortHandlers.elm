module PortHandlers exposing (..)

import Editor exposing (initialPorts)
import Editor.Msg
import Json.Encode
import Ports
import Terminal.Types


editorPorts : Editor.Msg.Ports
editorPorts =
    { requestPaste = Ports.requestPaste
    , requestRun =
        \code ->
            Ports.requestRun <|
                Json.Encode.object
                    [ ( "contents", Json.Encode.string code )
                    ]
    , requestCopy = Ports.requestCopy
    , requestCompletion =
        \completionRequest ->
            Ports.requestCompletion <|
                Json.Encode.object
                    [ ( "line", Json.Encode.int completionRequest.line )
                    , ( "character", Json.Encode.int completionRequest.character )
                    , ( "token", Json.Encode.string completionRequest.token )
                    ]
    , requestChange =
        \code ->
            Ports.requestChange code
    , requestSave =
        \code ->
            Ports.requestSave <|
                Json.Encode.string code
    , requestCharacterWidth = Ports.requestCharacterWidth
    , receiveCharacterWidth = Ports.receiveCharacterWidth
    }


terminalPorts : String -> Terminal.Types.Ports
terminalPorts cwd =
    { requestPasteTerminal = Ports.requestPasteTerminal
    , requestCopyTerminal = Ports.requestCopyTerminal
    , requestQuit = \_ -> Cmd.none
    , requestRunTerminal =
        \code ->
            Ports.requestRunTerminal <|
                Json.Encode.object
                    [ ( "cwd", Json.Encode.string cwd )
                    , ( "contents", Json.Encode.string code )
                    ]
    }


terminalBufferPorts : Editor.Msg.Ports
terminalBufferPorts =
    { initialPorts
        | requestCopy = Ports.requestCopy
    }
