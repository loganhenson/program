module CountTest exposing (suite)

{-| A count before a movement: `40j` moves forty lines.
-}

import Editor
import Editor.Msg exposing (Msg(..))
import Editor.RawKeyboard exposing (Msg(..))
import Expect
import Test exposing (..)
import TestCase exposing (initModel)


press : String -> String -> Editor.Msg.Model -> Editor.Msg.Model
press code key model =
    Tuple.first
        (Editor.update
            (RawKeyboardMsg (Down { key = key, code = code, shiftKey = False, altKey = False, ctrlKey = False, metaKey = False }))
            model
        )


open : Editor.Msg.Model
open =
    initModel (String.join "\n" (List.map (\n -> "    line " ++ String.fromInt n) (List.range 1 200))) Editor.initialConfig


suite : Test
suite =
    describe "counts"
        [ test "a zero after another digit is part of the count" <|
            \_ ->
                open
                    |> press "Digit4" "4"
                    |> press "Digit0" "0"
                    |> press "KeyJ" "j"
                    |> (\model -> model.travelable.cursorPosition.y)
                    |> Expect.equal 40
        , test "and so are two of them" <|
            \_ ->
                open
                    |> press "Digit1" "1"
                    |> press "Digit0" "0"
                    |> press "Digit0" "0"
                    |> press "KeyJ" "j"
                    |> press "Digit1" "1"
                    |> press "Digit0" "0"
                    |> press "KeyK" "k"
                    |> (\model -> model.travelable.cursorPosition.y)
                    |> Expect.equal 90
        , test "a zero on its own goes to the start of the line" <|
            \_ ->
                open
                    |> press "KeyL" "l"
                    |> press "KeyL" "l"
                    |> press "KeyL" "l"
                    |> press "Digit0" "0"
                    |> (\model -> model.travelable.cursorPosition)
                    |> Expect.equal { x = 0, y = 0 }
        , test "and still does after a counted movement" <|
            \_ ->
                open
                    |> press "Digit2" "2"
                    |> press "Digit0" "0"
                    |> press "KeyJ" "j"
                    |> press "KeyL" "l"
                    |> press "KeyL" "l"
                    |> press "Digit0" "0"
                    |> (\model -> model.travelable.cursorPosition)
                    |> Expect.equal { x = 0, y = 20 }
        ]
