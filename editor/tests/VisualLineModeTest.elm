module VisualLineModeTest exposing (..)

import Editor
import Editor.Keys exposing (update)
import Editor.Lib exposing (renderableLinesToContents)
import Editor.Msg exposing (Mode(..), NormalBuffer, Selection)
import Editor.RawKeyboard exposing (Msg(..), RawKey)
import Expect exposing (Expectation)
import Test exposing (..)
import TestCase exposing (initModel)


down : { code : String, shift : Bool } -> Editor.RawKeyboard.Msg
down { code, shift } =
    Down
        { key = ""
        , code = code
        , shiftKey = shift
        , altKey = False
        , ctrlKey = False
        , metaKey = False
        }


shiftV : Editor.RawKeyboard.Msg
shiftV =
    down { code = "KeyV", shift = True }


pressJ : Editor.RawKeyboard.Msg
pressJ =
    down { code = "KeyJ", shift = False }


pressK : Editor.RawKeyboard.Msg
pressK =
    down { code = "KeyK", shift = False }


pressY : Editor.RawKeyboard.Msg
pressY =
    down { code = "KeyY", shift = False }


pressD : Editor.RawKeyboard.Msg
pressD =
    down { code = "KeyD", shift = False }


pressEsc : Editor.RawKeyboard.Msg
pressEsc =
    down { code = "Escape", shift = False }


threeLineModel : Editor.Msg.Model
threeLineModel =
    let
        m =
            initModel "alpha\nbeta\ngamma" Editor.initialConfig
    in
    { m | mode = Normal }


positionCursorOnLine : Int -> Editor.Msg.Model -> Editor.Msg.Model
positionCursorOnLine y model =
    let
        prev =
            model.travelable
    in
    { model | travelable = { prev | cursorPosition = { x = 0, y = y } } }


suite : Test
suite =
    describe "Visual line mode"
        [ describe "Shift+V enters VisualLine and selects current line"
            [ test "selects entire line at cursor when entering" <|
                \_ ->
                    let
                        ( afterShiftV, _ ) =
                            update shiftV (positionCursorOnLine 1 threeLineModel)
                    in
                    afterShiftV
                        |> Expect.all
                            [ \m -> Expect.equal m.mode VisualLine
                            , \m -> Expect.equal m.visualLineAnchor (Just 1)
                            , \m ->
                                -- "beta" is 4 chars long, last char index = 3
                                Expect.equal m.selection
                                    (Just ( { x = 0, y = 1 }, { x = 3, y = 1 } ))
                            ]
            , test "Shift+V on an empty line still selects it" <|
                \_ ->
                    let
                        emptyLineModel =
                            initModel "alpha\n\ngamma" Editor.initialConfig
                                |> (\m -> { m | mode = Normal })
                                |> positionCursorOnLine 1

                        ( afterShiftV, _ ) =
                            update shiftV emptyLineModel
                    in
                    afterShiftV
                        |> Expect.all
                            [ \m -> Expect.equal m.mode VisualLine
                            , \m ->
                                -- empty line has length 0, endX = 0
                                Expect.equal m.selection
                                    (Just ( { x = 0, y = 1 }, { x = 0, y = 1 } ))
                            ]
            ]
        , describe "j/k extend selection"
            [ test "j extends selection downward" <|
                \_ ->
                    let
                        ( m1, _ ) =
                            update shiftV (positionCursorOnLine 0 threeLineModel)

                        ( m2, _ ) =
                            update pressJ m1
                    in
                    m2
                        |> Expect.all
                            [ \m -> Expect.equal m.mode VisualLine
                            , \m -> Expect.equal m.visualLineAnchor (Just 0)
                            , \m ->
                                -- anchor on line 0, cursor on line 1 ("beta", endX=3)
                                Expect.equal m.selection
                                    (Just ( { x = 0, y = 0 }, { x = 3, y = 1 } ))
                            , \m -> Expect.equal m.travelable.cursorPosition.y 1
                            ]
            , test "j is clamped at the last line" <|
                \_ ->
                    let
                        ( m1, _ ) =
                            update shiftV (positionCursorOnLine 2 threeLineModel)

                        ( m2, _ ) =
                            update pressJ m1
                    in
                    m2
                        |> Expect.all
                            [ \m -> Expect.equal m.travelable.cursorPosition.y 2
                            , \m -> Expect.equal m.mode VisualLine
                            ]
            , test "k extends selection upward (backward selection)" <|
                \_ ->
                    let
                        ( m1, _ ) =
                            update shiftV (positionCursorOnLine 2 threeLineModel)

                        ( m2, _ ) =
                            update pressK m1
                    in
                    m2
                        |> Expect.all
                            [ \m -> Expect.equal m.visualLineAnchor (Just 2)
                            , \m ->
                                -- backward selection: start at end-of-anchor-line, end at start-of-cursor-line.
                                -- "gamma" length 5 → endX 4; cursor on line 1 → x 0
                                Expect.equal m.selection
                                    (Just ( { x = 4, y = 2 }, { x = 0, y = 1 } ))
                            , \m -> Expect.equal m.travelable.cursorPosition.y 1
                            ]
            , test "k is clamped at line 0" <|
                \_ ->
                    let
                        ( m1, _ ) =
                            update shiftV (positionCursorOnLine 0 threeLineModel)

                        ( m2, _ ) =
                            update pressK m1
                    in
                    m2
                        |> \m -> Expect.equal m.travelable.cursorPosition.y 0
            , test "j then k returns to original line and shrinks back to single line" <|
                \_ ->
                    let
                        ( m1, _ ) =
                            update shiftV (positionCursorOnLine 0 threeLineModel)

                        ( m2, _ ) =
                            update pressJ m1

                        ( m3, _ ) =
                            update pressK m2
                    in
                    m3
                        |> Expect.all
                            [ \m -> Expect.equal m.travelable.cursorPosition.y 0
                            , \m -> Expect.equal m.visualLineAnchor (Just 0)
                            , \m ->
                                -- back to forward, single-line selection on line 0 ("alpha", endX 4)
                                Expect.equal m.selection
                                    (Just ( { x = 0, y = 0 }, { x = 4, y = 0 } ))
                            ]
            ]
        , describe "Yank (y)"
            [ test "y over a single line copies that line and exits to Normal" <|
                \_ ->
                    let
                        ( m1, _ ) =
                            update shiftV (positionCursorOnLine 1 threeLineModel)

                        ( m2, _ ) =
                            update pressY m1
                    in
                    m2
                        |> Expect.all
                            [ \m -> Expect.equal m.mode Normal
                            , \m -> Expect.equal m.visualLineAnchor Nothing
                            , \m -> Expect.equal m.selection Nothing
                            , \m -> Expect.equal m.normalBuffer.clipboard "beta\n"
                            ]
            , test "y over multiple lines (downward) copies all lines including newline at end" <|
                \_ ->
                    let
                        ( m1, _ ) =
                            update shiftV (positionCursorOnLine 0 threeLineModel)

                        ( m2, _ ) =
                            update pressJ m1

                        ( m3, _ ) =
                            update pressY m2
                    in
                    m3.normalBuffer.clipboard
                        |> Expect.equal "alpha\nbeta\n"
            , test "y over multiple lines (upward) copies in document order, not selection order" <|
                \_ ->
                    let
                        ( m1, _ ) =
                            update shiftV (positionCursorOnLine 2 threeLineModel)

                        ( m2, _ ) =
                            update pressK m1

                        ( m3, _ ) =
                            update pressY m2
                    in
                    m3.normalBuffer.clipboard
                        |> Expect.equal "beta\ngamma\n"
            ]
        , describe "Delete (d)"
            [ test "d over a single line removes that line and exits to Normal" <|
                \_ ->
                    let
                        ( m1, _ ) =
                            update shiftV (positionCursorOnLine 1 threeLineModel)

                        ( m2, _ ) =
                            update pressD m1
                    in
                    m2
                        |> Expect.all
                            [ \m -> Expect.equal m.mode Normal
                            , \m -> Expect.equal m.visualLineAnchor Nothing
                            , \m -> Expect.equal m.selection Nothing
                            , \m ->
                                Expect.equal
                                    (renderableLinesToContents m.travelable.renderableLines)
                                    "alpha\ngamma"
                            , \m -> Expect.equal m.normalBuffer.clipboard "beta\n"
                            , \m -> Expect.equal m.travelable.cursorPosition.y 1
                            ]
            , test "d over multiple lines removes all selected lines" <|
                \_ ->
                    let
                        ( m1, _ ) =
                            update shiftV (positionCursorOnLine 0 threeLineModel)

                        ( m2, _ ) =
                            update pressJ m1

                        ( m3, _ ) =
                            update pressD m2
                    in
                    m3
                        |> Expect.all
                            [ \m ->
                                Expect.equal
                                    (renderableLinesToContents m.travelable.renderableLines)
                                    "gamma"
                            , \m -> Expect.equal m.normalBuffer.clipboard "alpha\nbeta\n"
                            , \m -> Expect.equal m.travelable.cursorPosition.y 0
                            ]
            , test "d on the only remaining line leaves a single empty line, not an empty buffer" <|
                \_ ->
                    let
                        oneLine =
                            initModel "only" Editor.initialConfig
                                |> (\m -> { m | mode = Normal })

                        ( m1, _ ) =
                            update shiftV oneLine

                        ( m2, _ ) =
                            update pressD m1
                    in
                    m2
                        |> Expect.all
                            [ \m -> Expect.equal (List.length m.travelable.renderableLines) 1
                            , \m ->
                                Expect.equal
                                    (renderableLinesToContents m.travelable.renderableLines)
                                    ""
                            , \m -> Expect.equal m.mode Normal
                            ]
            ]
        , describe "Escape exits VisualLine mode"
            [ test "Escape returns to Normal and clears selection + anchor" <|
                \_ ->
                    let
                        ( m1, _ ) =
                            update shiftV (positionCursorOnLine 1 threeLineModel)

                        ( m2, _ ) =
                            update pressEsc m1
                    in
                    m2
                        |> Expect.all
                            [ \m -> Expect.equal m.mode Normal
                            , \m -> Expect.equal m.visualLineAnchor Nothing
                            , \m -> Expect.equal m.selection Nothing
                            ]
            ]
        ]
