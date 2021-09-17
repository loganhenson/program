module ScrollRegion exposing (..)

import Editor.Lib
import Expect exposing (Expectation)
import Json.Encode
import Terminal exposing (getBuffer, update)
import Terminal.Types exposing (Msg(..))
import Test exposing (..)
import TestCase exposing (initModel)


numberedLines : List Json.Encode.Value
numberedLines =
    [ Json.Encode.string "1"
    , Json.Encode.object
        [ ( "command", Json.Encode.string "[B" )
        , ( "argument", Json.Encode.int 1 )
        ]
    , Json.Encode.object
        [ ( "command", Json.Encode.string "\u{000D}" )
        ]
    , Json.Encode.string "2"
    , Json.Encode.object
        [ ( "command", Json.Encode.string "[B" )
        , ( "argument", Json.Encode.int 1 )
        ]
    , Json.Encode.object
        [ ( "command", Json.Encode.string "\u{000D}" )
        ]
    , Json.Encode.string "3"
    , Json.Encode.object
        [ ( "command", Json.Encode.string "[B" )
        , ( "argument", Json.Encode.int 1 )
        ]
    , Json.Encode.object
        [ ( "command", Json.Encode.string "\u{000D}" )
        ]
    , Json.Encode.string "4"
    , Json.Encode.object
        [ ( "command", Json.Encode.string "[H" )
        , ( "argument1", Json.Encode.int 1 )
        , ( "argument2", Json.Encode.int 1 )
        ]
    ]


suite : Test
suite =
    describe "handles scroll regions correctly"
        [ test "scroll from vim baseline pretest" <|
            \_ ->
                let
                    startingModel =
                        initModel

                    ( afterInput, _ ) =
                        update
                            (ReceivedTerminalOutput
                                (Json.Encode.list identity
                                    numberedLines
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
                                ("1                                                                               \n"
                                    ++ "2                                                                               \n"
                                    ++ "3                                                                               \n"
                                    ++ "4                                                                               "
                                )
                        ]
        ]
