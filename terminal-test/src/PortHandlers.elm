module PortHandlers exposing (..)

import Editor.Msg
import Json.Encode
import Ports
import Terminal.Types


terminalPorts : String -> Terminal.Types.Ports
terminalPorts cwd =
    { requestPasteTerminal = Ports.requestPasteTerminal
    , requestRunTerminal =
        \code ->
            Ports.requestRunTerminal <|
                Json.Encode.object
                    [ ( "cwd", Json.Encode.string cwd )
                    , ( "contents", Json.Encode.string code )
                    ]
    , requestCopyTerminal =
        \_ ->
            Cmd.none
    , requestQuit =
        \_ ->
            Cmd.none
    }


editorPorts : String -> Editor.Msg.Ports
editorPorts cwd =
    { requestPaste = Ports.requestPaste
    , requestRun =
        \code ->
            Cmd.none
    , requestCopy = Ports.requestCopy
    , requestCompletion =
        \completionRequest ->
            Cmd.none
    , requestChange =
        \code ->
            Cmd.none
    , requestSave =
        \code ->
            Cmd.none
    }
