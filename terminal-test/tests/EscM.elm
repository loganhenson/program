module EscM exposing (..)

import Editor.Lib
import Expect exposing (Expectation)
import Json.Encode
import Terminal exposing (getBuffer, update)
import Terminal.Types exposing (Msg(..))
import Test exposing (..)
import TestCase exposing (initModel)


suite : Test
suite =
    describe "handled ESC M correctly"
        [ test "ESC M once at the top puts the previous content to the top" <|
            \_ ->
                let
                    startingModel =
                        initModel

                    ( afterInput, _ ) =
                        update
                            (ReceivedTerminalOutput
                                (Json.Encode.list identity
                                    [ Json.Encode.object
                                        [ ( "command", Json.Encode.string "M" )
                                        ]
                                    , Json.Encode.string "12345"
                                    ]
                                )
                            )
                            startingModel
                in
                afterInput.terminal
                    |> getBuffer
                    |> Tuple.first
                    |> .travelable
                    |> .renderableLines
                    |> Editor.Lib.renderableLinesToContents
                    |> Expect.all
                        [ \content ->
                            Expect.equal
                                "12345"
                                (String.trimRight content)
                        ]
        , test "ESC M, then some text, then another ESC M moves that text down and leaves the top blank" <|
            \_ ->
                let
                    startingModel =
                        initModel

                    ( afterInput, _ ) =
                        update
                            (ReceivedTerminalOutput
                                (Json.Encode.list identity
                                    [ Json.Encode.object
                                        [ ( "command", Json.Encode.string "M" )
                                        ]
                                    , Json.Encode.string "12345"
                                    , Json.Encode.object
                                        [ ( "command", Json.Encode.string "M" )
                                        ]
                                    ]
                                )
                            )
                            startingModel
                in
                afterInput.terminal
                    |> getBuffer
                    |> Tuple.first
                    |> .travelable
                    |> .renderableLines
                    |> Editor.Lib.renderableLinesToContents
                    |> Expect.all
                        [ \content ->
                            -- Reverse index on the top line scrolls the screen down:
                            -- the text moves to the second line and the top line is blank
                            Expect.equal
                                (String.repeat 80 " " ++ "\n12345")
                                (String.trimRight content)
                        ]
        , test "some text on the first line, then ESC M 2 times moves it down two lines" <|
            \_ ->
                let
                    startingModel =
                        initModel

                    ( afterInput, _ ) =
                        update
                            (ReceivedTerminalOutput
                                (Json.Encode.list identity
                                    [ Json.Encode.string "test"
                                    , Json.Encode.object
                                        [ ( "command", Json.Encode.string "M" )
                                        ]
                                    , Json.Encode.object
                                        [ ( "command", Json.Encode.string "M" )
                                        ]
                                    ]
                                )
                            )
                            startingModel
                in
                afterInput.terminal
                    |> getBuffer
                    |> Tuple.first
                    |> .travelable
                    |> .renderableLines
                    |> Editor.Lib.renderableLinesToContents
                    |> Expect.all
                        [ \content ->
                            -- scrolled down twice: two blank lines, then the text
                            Expect.equal
                                (String.repeat 80 " " ++ "\n" ++ String.repeat 80 " " ++ "\ntest")
                                (String.trimRight content)
                        ]
        ]
