module PortHandlers exposing (..)

import Editor exposing (initialPorts)
import Editor.Msg
import Json.Encode
import Ports
import Terminal
import Terminal.Types


{-| Everything a terminal writes back (keys, pastes, replies to queries)
carries the id of its own PTY, so a tab in the background answers its own
shell rather than the one that happens to be active.
-}
terminalPorts : String -> String -> Terminal.Types.Ports
terminalPorts terminalId cwd =
    let
        ports =
            Terminal.initialPorts
    in
    { ports
        | requestPasteTerminal = Ports.requestPasteTerminal
        , requestCopyTerminal = Ports.requestCopyTerminal
        , requestQuit = Ports.requestQuit
        , requestWriteClipboard = Ports.requestWriteClipboard
        , requestBell = Ports.requestBell
        , requestNotify = Ports.requestNotify
        , requestRunTerminal =
            \code ->
                Ports.requestRunTerminal <|
                    Json.Encode.object
                        [ ( "terminalId", Json.Encode.string terminalId )
                        , ( "cwd", Json.Encode.string cwd )
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
