module DeleteLine exposing (..)

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
    describe "Deletes lines correctly"
        [ test "[M" <|
            \_ ->
                let
                    startingModel =
                        initModel

                    ( afterInput, _ ) =
                        update
                            (ReceivedTerminalOutput
                                (Json.Encode.list identity
                                    (numberedLines
                                        ++ [ Json.Encode.object
                                                [ ( "command", Json.Encode.string "[M" )
                                                ]
                                           ]
                                    )
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
                                ("2                                                                               \n"
                                    ++ "3                                                                               \n"
                                    ++ "4                                                                               \n"
                                    ++ "                                                                                "
                                )
                                content
                        ]
        , test "[2M" <|
            \_ ->
                let
                    startingModel =
                        initModel

                    ( afterInput, _ ) =
                        update
                            (ReceivedTerminalOutput
                                (Json.Encode.list identity
                                    (numberedLines
                                        ++ [ Json.Encode.object
                                                [ ( "command", Json.Encode.string "[M" )
                                                , ( "argument", Json.Encode.int 2 )
                                                ]
                                           ]
                                    )
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
                                ("3                                                                               \n"
                                    ++ "4                                                                               \n"
                                    ++ "                                                                                \n"
                                    ++ "                                                                                "
                                )
                                content
                        ]
        , test "[2M with a specific scrollBuffer" <|
            \_ ->
                let
                    startingModel =
                        initModel

                    ( afterInput, _ ) =
                        update
                            (ReceivedTerminalOutput
                                (Json.Encode.list identity
                                    (numberedLines
                                        ++ [ Json.Encode.object
                                                [ ( "command", Json.Encode.string "[r" )
                                                , ( "argument1", Json.Encode.int 1 )
                                                , ( "argument2", Json.Encode.int 3 )
                                                ]
                                           , Json.Encode.object
                                                [ ( "command", Json.Encode.string "[M" )
                                                , ( "argument", Json.Encode.int 2 )
                                                ]
                                           ]
                                    )
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
                                ("3                                                                               \n"
                                    ++ "                                                                                \n"
                                    ++ "                                                                                \n"
                                    ++ "4                                                                               "
                                )
                                content
                        ]
        ]
