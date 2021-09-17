module MetaPressedWithInsertModeTest exposing (..)

import Editor.Keys exposing (update)
import Editor.Lib exposing (renderableLinesToContents)
import Editor.Msg exposing (Mode(..), Selection)
import Editor.RawKeyboard exposing (Msg(..), RawKey)
import Expect exposing (Expectation)
import Test exposing (..)
import TestCase exposing (initModel)


suite : Test
suite =
    describe "Meta interactions with insert mode"
        [ describe "Meta and number keys"
            [ test "Pressing Meta with number key does not insert a that number into the content" <|
                \_ ->
                    let
                        startingModel =
                            initModel "test"
                                { vimMode = True
                                , showLineNumbers = True
                                , padBottom = True
                                , padRight = True
                                , showCursor = True
                                }

                        key =
                            Down
                                { key = "5"
                                , code = "Digit5"
                                , shiftKey = False
                                , altKey = False
                                , ctrlKey = False
                                , metaKey = True
                                }

                        ( afterInput, _ ) =
                            update key { startingModel | mode = Insert }
                    in
                    Expect.equal
                        (renderableLinesToContents afterInput.travelable.renderableLines)
                        "test"
            , test "Pressing Meta+a selects all contents" <|
                \_ ->
                    let
                        startingModel =
                            initModel "test"
                                { vimMode = True
                                , showLineNumbers = True
                                , padBottom = True
                                , padRight = True
                                , showCursor = True
                                }

                        key =
                            Down
                                { key = "a"
                                , code = "KeyA"
                                , shiftKey = False
                                , altKey = False
                                , ctrlKey = False
                                , metaKey = True
                                }

                        ( afterInput, _ ) =
                            update key { startingModel | mode = Insert }
                    in
                    afterInput
                        |> Expect.all
                            [ \model ->
                                Expect.equal
                                    model.selection
                                    (Just ( { x = 0, y = 0 }, { x = 3, y = 0 } ))
                            , \model ->
                                Expect.equal
                                    (renderableLinesToContents model.travelable.renderableLines)
                                    "test"
                            ]
            ]
        ]
