module PortHandlers exposing (..)

import Editor exposing (initialPorts)
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
    { initialPorts
        | requestPaste = Ports.requestPaste
        , requestRun =
            \code ->
                Cmd.none
        , requestCopy = Ports.requestCopy
        , requestCharacterWidth = Ports.requestCharacterWidth
        , receiveCharacterWidth = Ports.receiveCharacterWidth
    }
