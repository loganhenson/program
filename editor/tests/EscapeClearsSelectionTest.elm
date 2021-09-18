module EscapeClearsSelectionTest exposing (..)

import Editor
import Editor.Keys exposing (update)
import Editor.Msg exposing (Mode(..), Selection)
import Editor.RawKeyboard exposing (Msg(..), RawKey)
import Expect exposing (Expectation)
import Test exposing (..)
import TestCase exposing (initModel)


suite : Test
suite =
    describe "Escape clears selection"
        [ describe "Escape"
            [ test "Escape clears selection in insert mode" <|
                \_ ->
                    let
                        startingModel =
                            initModel "test"
                                Editor.initialConfig

                        key =
                            Down
                                { key = "Escape"
                                , code = "Escape"
                                , shiftKey = False
                                , altKey = False
                                , ctrlKey = False
                                , metaKey = False
                                }

                        ( afterInput, _ ) =
                            update key
                                { startingModel
                                    | mode = Insert
                                    , selection = Just ( { x = 0, y = 0 }, { x = 3, y = 0 } )
                                }
                    in
                    afterInput
                        |> Expect.all
                            [ \model ->
                                Expect.equal
                                    model.selection
                                    Nothing
                            ]
            , test "Escape clears selection in normal mode" <|
                \_ ->
                    let
                        startingModel =
                            initModel "test"
                                Editor.initialConfig

                        key =
                            Down
                                { key = "Escape"
                                , code = "Escape"
                                , shiftKey = False
                                , altKey = False
                                , ctrlKey = False
                                , metaKey = False
                                }

                        ( afterInput, _ ) =
                            update key
                                { startingModel
                                    | mode = Normal
                                    , selection = Just ( { x = 0, y = 0 }, { x = 3, y = 0 } )
                                }
                    in
                    afterInput
                        |> Expect.all
                            [ \model ->
                                Expect.equal
                                    model.selection
                                    Nothing
                            ]
            ]
        ]
