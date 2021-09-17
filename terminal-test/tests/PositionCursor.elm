module PositionCursor exposing (..)

import Editor.Lib
import Expect exposing (Expectation)
import Json.Encode
import Terminal exposing (getBuffer, update)
import Terminal.Types exposing (Msg(..))
import Test exposing (..)
import TestCase exposing (initModel)


suite : Test
suite =
    describe "Positions cursor correctly"
        [ test "[G" <|
            \_ ->
                let
                    startingModel =
                        initModel

                    ( afterInput, _ ) =
                        update
                            (ReceivedTerminalOutput
                                (Json.Encode.list identity
                                    [ Json.Encode.string "abcd"
                                    , Json.Encode.object
                                        [ ( "command", Json.Encode.string "[G" )
                                        ]
                                    , Json.Encode.string "Z"
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
                                ("Zbcd                                                                            \n"
                                    ++ "                                                                                \n"
                                    ++ "                                                                                \n"
                                    ++ "                                                                                "
                                )
                                content
                        ]
        , test "[2G" <|
            \_ ->
                let
                    startingModel =
                        initModel

                    ( afterInput, _ ) =
                        update
                            (ReceivedTerminalOutput
                                (Json.Encode.list identity
                                    [ Json.Encode.string "abcd"
                                    , Json.Encode.object
                                        [ ( "command", Json.Encode.string "[G" )
                                        , ( "argument", Json.Encode.int 2 )
                                        ]
                                    , Json.Encode.string "Z"
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
                                ("aZcd                                                                            \n"
                                    ++ "                                                                                \n"
                                    ++ "                                                                                \n"
                                    ++ "                                                                                "
                                )
                                content
                        ]
        ]
