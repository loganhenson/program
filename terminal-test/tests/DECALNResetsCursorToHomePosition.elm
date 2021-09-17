module DECALNResetsCursorToHomePosition exposing (..)

import Expect exposing (Expectation)
import Json.Encode
import Terminal exposing (getBuffer, update)
import Terminal.Types exposing (Msg(..))
import Test exposing (..)
import TestCase exposing (initModel)


suite : Test
suite =
    describe "DECALN (Fill with E)"
        [ test "#8 resets cursor position to home" <|
            \_ ->
                let
                    startingModel =
                        initModel

                    ( afterInput, _ ) =
                        update
                            (ReceivedTerminalOutput
                                (Json.Encode.list identity
                                    [ Json.Encode.object
                                        [ ( "command", Json.Encode.string "[B" )
                                        , ( "argument", Json.Encode.int 1 )
                                        ]
                                    , Json.Encode.object
                                        [ ( "command", Json.Encode.string "#8" )
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
                    |> .cursorPosition
                    |> .y
                    |> Expect.equal 0
        ]
