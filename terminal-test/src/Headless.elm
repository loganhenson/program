port module Headless exposing (main)

{-| The terminal without a view, for driving it from Node.

Messages in (`headlessIn`):

    { "output": [commands] }   output from the parser
    { "resize": { "height": 24, "width": 80 } }
    { "key": { "key": "a", "code": "KeyA", "shiftKey": false, ... } }
    { "paste": "text" }
    { "focus": true }
    { "dump": false }          ask for the state of the screen
    { "dump": true }           the same, including the scrollback

Messages out (`headlessOut`): `{ "run": "bytes for the program" }`, the other
port requests (`title`, `bell`, `notify`, `clipboard`, `exited`) and, in
reply to `dump`, the screen.

-}

import Array
import Editor
import Editor.RawKeyboard
import Json.Decode as Decode
import Json.Encode as Encode
import Terminal
import Terminal.Keybindings
import Terminal.Screen as Screen
import Terminal.Types exposing (..)


port headlessIn : (Decode.Value -> msg) -> Sub msg


port headlessOut : Encode.Value -> Cmd msg


type Msg
    = Received Decode.Value
    | TerminalMsg Terminal.Types.Msg


main : Program () Model Msg
main =
    Platform.worker
        { init = \_ -> ( Terminal.init "" Editor.initialPorts ports, Cmd.none )
        , update = update
        , subscriptions = \_ -> headlessIn Received
        }


ports : Ports
ports =
    let
        out name value =
            headlessOut (Encode.object [ ( name, value ) ])
    in
    { requestRunTerminal = \bytes -> out "run" (Encode.string bytes)
    , requestPasteTerminal = \_ -> out "paste-requested" Encode.null
    , requestCopyTerminal = \_ -> out "copy-requested" Encode.null
    , requestQuit = \_ -> out "quit" Encode.null
    , requestSetTitle = \title -> out "title" (Encode.string title)
    , requestBell = \_ -> out "bell" Encode.null
    , requestNotify = \message -> out "notify" (Encode.string message)
    , requestWriteClipboard = \contents -> out "clipboard" (Encode.string contents)
    , requestExited = \_ -> out "exited" Encode.null
    }


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        TerminalMsg terminalMsg ->
            Terminal.update terminalMsg model
                |> Tuple.mapSecond (Cmd.map TerminalMsg)

        Received value ->
            let
                field name decoder =
                    Decode.decodeValue (Decode.field name decoder) value
                        |> Result.toMaybe

                forward terminalMsg =
                    Terminal.update terminalMsg model
                        |> Tuple.mapSecond (Cmd.map TerminalMsg)
            in
            case field "output" Decode.value of
                Just output ->
                    forward (ReceivedTerminalOutput output)

                Nothing ->
                    case field "resize" Decode.value of
                        Just size ->
                            forward (ReceivedTerminalResized size)

                        Nothing ->
                            case field "key" Editor.RawKeyboard.decoder of
                                Just key ->
                                    Terminal.Keybindings.handleKeybindings key model
                                        |> Tuple.mapSecond (Cmd.map TerminalMsg)

                                Nothing ->
                                    case field "paste" Decode.string of
                                        Just text ->
                                            forward (ReceivedPaste text)

                                        Nothing ->
                                            case field "focus" Decode.bool of
                                                Just focused ->
                                                    forward (ReceivedFocus focused)

                                                Nothing ->
                                                    ( model
                                                    , headlessOut
                                                        (dump (field "dump" Decode.bool == Just True) model.terminal)
                                                    )


dump : Bool -> Terminal -> Encode.Value
dump withScrollback terminal =
    let
        screen =
            Screen.activeScreen terminal
    in
    Encode.object
        [ ( "dump"
          , Encode.object
                [ ( "height", Encode.int terminal.size.height )
                , ( "width", Encode.int terminal.size.width )
                , ( "cursor"
                  , Encode.object
                        [ ( "x", Encode.int screen.cursor.x )
                        , ( "y", Encode.int screen.cursor.y )
                        , ( "visible", Encode.bool terminal.modes.cursorVisible )
                        ]
                  )
                , ( "alternate", Encode.bool (terminal.activeBuffer == Alternate) )
                , ( "title", Encode.string terminal.title )
                , ( "lines", Encode.array encodeLine screen.lines )
                , ( "scrollback"
                  , if withScrollback then
                        Encode.list Encode.string (Screen.scrollbackText terminal)

                    else
                        Encode.null
                  )

                -- the newest scrollback line continues on the first row of the screen
                , ( "scrollbackContinues"
                  , Screen.scrollbackLines terminal.scrollback
                        |> List.reverse
                        |> List.head
                        |> Maybe.map .wrapped
                        |> Maybe.withDefault False
                        |> Encode.bool
                  )
                ]
          )
        ]


encodeLine : Line -> Encode.Value
encodeLine line =
    Encode.object
        [ ( "wrapped", Encode.bool line.wrapped )
        , ( "cells", Encode.array encodeCell line.cells )
        ]


encodeCell : Cell -> Encode.Value
encodeCell cell =
    Encode.object
        [ ( "char", Encode.string cell.char )
        , ( "width", Encode.int cell.width )
        , ( "fg", encodeColor cell.style.foreground )
        , ( "bg", encodeColor cell.style.background )
        , ( "attributes", Encode.int cell.style.attributes )
        , ( "link", Encode.string cell.style.link )
        ]


encodeColor : Color -> Encode.Value
encodeColor color =
    case color of
        DefaultColor ->
            Encode.string "default"

        IndexedColor index ->
            Encode.string ("p" ++ String.fromInt index)

        RgbColor r g b ->
            Encode.string ("rgb" ++ String.fromInt r ++ "," ++ String.fromInt g ++ "," ++ String.fromInt b)
