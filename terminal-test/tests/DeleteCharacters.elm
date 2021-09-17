module DeleteCharacters exposing (..)

import Editor.Lib
import Expect exposing (Expectation)
import Json.Encode
import Terminal exposing (getBuffer, update)
import Terminal.Types exposing (Msg(..))
import Test exposing (..)
import TestCase exposing (initModel)


suite : Test
suite =
    describe "Deletes characters correctly"
        [ test "[P" <|
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
                                    , Json.Encode.object
                                        [ ( "command", Json.Encode.string "[P" )
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
                                ("aZd                                                                            \n"
                                    ++ "                                                                                \n"
                                    ++ "                                                                                \n"
                                    ++ "                                                                                "
                                )
                                content
                        ]
        , test "[2P" <|
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
                                    , Json.Encode.object
                                        [ ( "command", Json.Encode.string "[P" )
                                        , ( "argument", Json.Encode.int 2 )
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
                                ("aZ                                                                            \n"
                                    ++ "                                                                                \n"
                                    ++ "                                                                                \n"
                                    ++ "                                                                                "
                                )
                                content
                        ]
        ]
