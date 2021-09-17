module EscDKeepsSameColumn exposing (..)

import Editor.Lib
import Expect exposing (Expectation)
import Json.Encode
import Terminal exposing (getBuffer, update)
import Terminal.Types exposing (Msg(..))
import Test exposing (..)
import TestCase exposing (initModel)


suite : Test
suite =
    describe "handled ESC D correctly"
        [ test "ESC D" <|
            \_ ->
                let
                    startingModel =
                        initModel

                    ( afterInput, _ ) =
                        update
                            (ReceivedTerminalOutput
                                (Json.Encode.list identity
                                    [ Json.Encode.object
                                        [ ( "command", Json.Encode.string "[H" )
                                        , ( "argument1", Json.Encode.int 2 )
                                        , ( "argument2", Json.Encode.int 2 )
                                        ]
                                    , Json.Encode.string "+"
                                    , Json.Encode.object
                                        [ ( "command", Json.Encode.string "[D" )
                                        , ( "argument1", Json.Encode.int 1 )
                                        ]
                                    , Json.Encode.object
                                        [ ( "command", Json.Encode.string "D" )
                                        ]
                                    , Json.Encode.string "+"
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
                                ("                                                                                \n"
                                    ++ " +                                                                              \n"
                                    ++ " +"
                                )
                                (String.trimRight content)
                        ]
        ]
