module PortHandlers exposing (..)

import Editor exposing (initialPorts)
import Editor.Msg
import Json.Encode
import Ports
import Terminal.Types


terminalPorts : String -> Terminal.Types.Ports
terminalPorts cwd =
    { requestPasteTerminal = Ports.requestPasteTerminal
    , requestCopyTerminal = Ports.requestCopyTerminal
    , requestQuit = Ports.requestQuit
    , requestRunTerminal =
        \code ->
            Ports.requestRunTerminal <|
                Json.Encode.object
                    [ ( "cwd", Json.Encode.string cwd )
                    , ( "contents", Json.Encode.string code )
                    ]
    }


editorPorts : String -> Editor.Msg.Ports
editorPorts cwd =
    { initialPorts
        | requestPaste = Ports.requestPaste
        , requestCopy = Ports.requestCopy
        , requestCharacterWidth = Ports.requestCharacterWidth
        , receiveCharacterWidth = Ports.receiveCharacterWidth
    }
