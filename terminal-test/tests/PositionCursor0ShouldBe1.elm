module PositionCursor0ShouldBe1 exposing (..)

import Expect exposing (Expectation)
import Json.Encode
import Terminal exposing (getBuffer, update)
import Terminal.Types exposing (Msg(..))
import Test exposing (..)
import TestCase exposing (initModel)


suite : Test
suite =
    describe "Cursor Positioning 0 is 1"
        [ test "[0C" <|
            \_ ->
                let
                    startingModel =
                        initModel

                    ( afterInput, _ ) =
                        update
                            (ReceivedTerminalOutput
                                (Json.Encode.list identity
                                    [ Json.Encode.object
                                        [ ( "command", Json.Encode.string "[C" )
                                        , ( "argument", Json.Encode.int 0 )
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
                    |> .x
                    |> Expect.equal 1
        , test "[0D" <|
            \_ ->
                let
                    startingModel =
                        initModel

                    ( afterInput, _ ) =
                        update
                            (ReceivedTerminalOutput
                                (Json.Encode.list identity
                                    [ Json.Encode.object
                                        [ ( "command", Json.Encode.string "[C" )
                                        , ( "argument", Json.Encode.int 1 )
                                        ]
                                    , Json.Encode.object
                                        [ ( "command", Json.Encode.string "[D" )
                                        , ( "argument", Json.Encode.int 0 )
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
                    |> .x
                    |> Expect.equal 0
        , test "[0B" <|
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
                                        , ( "argument", Json.Encode.int 0 )
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
                    |> Expect.equal 1
        , test "[0A" <|
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
                                        [ ( "command", Json.Encode.string "[A" )
                                        , ( "argument", Json.Encode.int 0 )
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
        , test "[0E" <|
            \_ ->
                let
                    startingModel =
                        initModel

                    ( afterInput, _ ) =
                        update
                            (ReceivedTerminalOutput
                                (Json.Encode.list identity
                                    [ Json.Encode.object
                                        [ ( "command", Json.Encode.string "[E" )
                                        , ( "argument", Json.Encode.int 0 )
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
                    |> Expect.equal 1
        , test "[0F" <|
            \_ ->
                let
                    startingModel =
                        initModel

                    ( afterInput, _ ) =
                        update
                            (ReceivedTerminalOutput
                                (Json.Encode.list identity
                                    [ Json.Encode.object
                                        [ ( "command", Json.Encode.string "[E" )
                                        , ( "argument", Json.Encode.int 1 )
                                        ]
                                    , Json.Encode.object
                                        [ ( "command", Json.Encode.string "[F" )
                                        , ( "argument", Json.Encode.int 0 )
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
        , test "[0G" <|
            \_ ->
                let
                    startingModel =
                        initModel

                    ( afterInput, _ ) =
                        update
                            (ReceivedTerminalOutput
                                (Json.Encode.list identity
                                    [ Json.Encode.object
                                        [ ( "command", Json.Encode.string "[G" )
                                        , ( "argument", Json.Encode.int 0 )
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
                    |> .x
                    |> Expect.equal 0
        , test "[0d" <|
            \_ ->
                let
                    startingModel =
                        initModel

                    ( afterInput, _ ) =
                        update
                            (ReceivedTerminalOutput
                                (Json.Encode.list identity
                                    [ Json.Encode.object
                                        [ ( "command", Json.Encode.string "[d" )
                                        , ( "argument", Json.Encode.int 0 )
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
