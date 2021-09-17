module TabCompletionsRenderCorrectly exposing (..)

import Editor.Lib
import Expect exposing (Expectation)
import Json.Encode
import Terminal exposing (getBuffer, update)
import Terminal.Types exposing (Msg(..))
import Test exposing (..)
import TestCase exposing (initModel)


suite : Test
suite =
    describe "Tab completions render correctly"
        [ test "Tab completions render on the next line" <|
            \_ ->
                let
                    startingModel =
                        initModel

                    ( afterInput, _ ) =
                        update
                            (ReceivedTerminalOutput
                                (Json.Encode.list identity
                                    [ Json.Encode.object
                                        [ ( "command", Json.Encode.string "\u{000D}" )
                                        ]
                                    , Json.Encode.object
                                        [ ( "command", Json.Encode.string "\n" )
                                        ]
                                    , Json.Encode.object
                                        [ ( "command", Json.Encode.string "[J" )
                                        ]
                                    , Json.Encode.string "Desktop"
                                    , Json.Encode.string "/    "
                                    , Json.Encode.object
                                        [ ( "command", Json.Encode.string "[J" )
                                        ]
                                    , Json.Encode.string "Documents"
                                    , Json.Encode.string "/  "
                                    , Json.Encode.object
                                        [ ( "command", Json.Encode.string "[J" )
                                        ]
                                    , Json.Encode.string "Downloads"
                                    , Json.Encode.string "/"
                                    , Json.Encode.object
                                        [ ( "command", Json.Encode.string "[J" )
                                        ]
                                    , Json.Encode.object
                                        [ ( "command", Json.Encode.string "[A" )
                                        ]
                                    , Json.Encode.string "\u{000D}"
                                    , Json.Encode.object
                                        [ ( "command", Json.Encode.string "[C" )
                                        , ( "argument", Json.Encode.int 5 )
                                        ]
                                    , Json.Encode.string "cd D"
                                    , Json.Encode.string "esktop"
                                    , Json.Encode.object
                                        [ ( "command", Json.Encode.string "[K" )
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
                            Expect.equal
                                content
                                ("                                  \u{000D}     cd Desktop                              \n"
                                    ++ "Desktop/    Documents/  Downloads/                                              \n"
                                    ++ "                                                                                \n"
                                    ++ "                                                                                "
                                )
                        ]
        ]
