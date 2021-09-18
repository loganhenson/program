module PortHandlers exposing (..)

import Editor.Msg
import Editor exposing (initialPorts)
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
    { initialPorts | requestPaste = Ports.requestPaste
    , requestCopy = Ports.requestCopy
    }
