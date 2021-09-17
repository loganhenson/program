module ClipboardTest exposing (..)

import Editor.Clipboard
import Editor.Lib exposing (renderableLinesToContents)
import Editor.Msg exposing (Selection)
import Expect exposing (Expectation)
import Test exposing (..)
import TestCase exposing (initModel)


suite : Test
suite =
    describe "The Clipboard module"
        [ describe "cut"
            [ test "can cut multiline selection in the middle of line" <|
                \_ ->
                    let
                        startingModel =
                            initModel "first line\nsecond line"
                                { vimMode = True
                                , showLineNumbers = True
                                , padBottom = True
                                , padRight = True
                                , showCursor = True
                                }

                        ( _, afterCutTravelable ) =
                            Editor.Clipboard.cut { startingModel | selection = Just ( { x = 6, y = 0 }, { x = 6, y = 1 } ) }
                    in
                    Expect.equal
                        { cursorPosition = afterCutTravelable.cursorPosition
                        , contents = renderableLinesToContents afterCutTravelable.renderableLines
                        }
                        { cursorPosition = { x = 6, y = 0 }
                        , contents = "first line"
                        }
            ]
        , describe "paste"
            [ test "can paste over selection when selection is from left to right" <|
                \_ ->
                    let
                        startingModel =
                            initModel "undefined"
                                { vimMode = True
                                , showLineNumbers = True
                                , padBottom = True
                                , padRight = True
                                , showCursor = True
                                }

                        afterPaste =
                            Editor.Clipboard.paste { startingModel | selection = Just ( { x = 1, y = 0 }, { x = 7, y = 0 } ) } " "
                    in
                    Expect.equal
                        { cursorPosition = afterPaste.travelable.cursorPosition
                        , contents = renderableLinesToContents afterPaste.travelable.renderableLines
                        }
                        { cursorPosition = { x = 2, y = 0 }
                        , contents = "u d"
                        }
            ]
        , test "can paste over selection when selection is from right to left" <|
            \_ ->
                let
                    startingModel =
                        initModel "undefined"
                            { vimMode = True
                            , showLineNumbers = True
                            , padBottom = True
                            , padRight = True
                            , showCursor = True
                            }

                    afterPaste =
                        Editor.Clipboard.paste { startingModel | selection = Just ( { x = 7, y = 0 }, { x = 1, y = 0 } ) } " "
                in
                Expect.equal
                    { cursorPosition = afterPaste.travelable.cursorPosition
                    , contents = renderableLinesToContents afterPaste.travelable.renderableLines
                    }
                    { cursorPosition = { x = 2, y = 0 }
                    , contents = "u d"
                    }
        ]
