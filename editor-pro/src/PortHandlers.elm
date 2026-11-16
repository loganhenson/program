module PortHandlers exposing (..)

import Editor exposing (initialPorts)
import Editor.Msg
import Json.Encode
import Ports
import Terminal
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


{-| Everything a terminal writes back (keys, pastes, replies to queries)
carries the ids of its own PTY, so a terminal in a background tab or
workspace answers its own shell rather than the active one.
-}
terminalPorts : String -> String -> String -> Terminal.Types.Ports
terminalPorts workspaceId terminalId cwd =
    let
        ports =
            Terminal.initialPorts
    in
    { ports
        | requestPasteTerminal = Ports.requestPasteTerminal
        , requestCopyTerminal = Ports.requestCopyTerminal
        , requestWriteClipboard = Ports.requestCopy
        , requestRunTerminal =
            \code ->
                Ports.requestRunTerminal <|
                    Json.Encode.object
                        [ ( "workspaceId", Json.Encode.string workspaceId )
                        , ( "terminalId", Json.Encode.string terminalId )
                        , ( "cwd", Json.Encode.string cwd )
                        , ( "contents", Json.Encode.string code )
                        ]
    }


terminalBufferPorts : Editor.Msg.Ports
terminalBufferPorts =
    { initialPorts
        | requestCopy = Ports.requestCopy
    }
