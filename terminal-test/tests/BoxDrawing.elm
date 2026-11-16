module BoxDrawing exposing (suite)

import Array
import Expect
import Support exposing (..)
import Terminal.BoxDrawing exposing (isDrawn, layers, styles)
import Terminal.Screen as Screen
import Test exposing (..)


char : Char -> Int
char =
    Char.toCode


{-| The size and position of every layer: "width height @ x y".
-}
shape : Char -> List String
shape character =
    layers (char character)
        |> List.map (\layer -> layer.width ++ " " ++ layer.height ++ " @ " ++ layer.x ++ " " ++ layer.y)


suite : Test
suite =
    describe "Box drawing and block elements are drawn by the terminal"
        [ test "every character of both Unicode blocks is drawn" <|
            \_ ->
                List.range 0x2500 0x259F
                    |> List.filter (\code -> not (isDrawn code) || List.isEmpty (layers code))
                    |> Expect.equal []
        , test "every character has its rule in the style sheet" <|
            \_ ->
                List.range 0x2500 0x259F
                    |> List.filter (\code -> not (String.contains (".bx-" ++ String.fromInt code ++ "::before{") styles))
                    |> Expect.equal []
        , test "nothing outside the two blocks is drawn" <|
            \_ ->
                [ 0x24FF, 0x25A0, char 'a', char '日', 0xE0B0 ]
                    |> List.map isDrawn
                    |> Expect.equal [ False, False, False, False, False ]
        , test "a horizontal line runs from edge to edge through the middle" <|
            \_ ->
                shape '─'
                    |> Expect.equal [ "calc(50% + 0px) 1px @ 0 calc(50% + 0px)", "calc(50% + 0px) 1px @ 100% calc(50% + 0px)" ]
        , test "a vertical line runs from the top of the cell to the bottom" <|
            -- this is what makes borders connect from one row to the next
            \_ ->
                shape '│'
                    |> Expect.equal [ "1px calc(50% + 0px) @ calc(50% + 0px) 0", "1px calc(50% + 0px) @ calc(50% + 0px) 100%" ]
        , test "the arms of a corner overlap in the middle so the corner is closed" <|
            \_ ->
                shape '┌'
                    |> Expect.equal [ "1px calc(50% + 0.5px) @ calc(50% + 0px) 100%", "calc(50% + 0.5px) 1px @ 100% calc(50% + 0px)" ]
        , test "heavy lines are three pixels and light lines reach past them" <|
            \_ ->
                shape '┿'
                    |> Expect.equal
                        [ "1px calc(50% + 1.5px) @ calc(50% + 0px) 0"
                        , "1px calc(50% + 1.5px) @ calc(50% + 0px) 100%"
                        , "calc(50% + 0.5px) 3px @ 0 calc(50% + 0px)"
                        , "calc(50% + 0.5px) 3px @ 100% calc(50% + 0px)"
                        ]
        , test "each character has an arm exactly where its neighbours expect one" <|
            -- up, right, down, left
            \_ ->
                [ '─', '│', '┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼', '╴', '╵', '╶', '╷', '━', '┃', '╋', '═', '║', '╔', '╗', '╚', '╝', '╠', '╣', '╦', '╩', '╬' ]
                    |> List.map (\character -> ( character, sides character ))
                    |> Expect.equal
                        [ ( '─', "-R-L" ), ( '│', "U-D-" ), ( '┌', "-RD-" ), ( '┐', "--DL" ), ( '└', "UR--" ), ( '┘', "U--L" ), ( '├', "URD-" ), ( '┤', "U-DL" ), ( '┬', "-RDL" ), ( '┴', "UR-L" ), ( '┼', "URDL" ), ( '╴', "---L" ), ( '╵', "U---" ), ( '╶', "-R--" ), ( '╷', "--D-" ), ( '━', "-R-L" ), ( '┃', "U-D-" ), ( '╋', "URDL" ), ( '═', "-R-L" ), ( '║', "U-D-" ), ( '╔', "-RD-" ), ( '╗', "--DL" ), ( '╚', "UR--" ), ( '╝', "U--L" ), ( '╠', "URD-" ), ( '╣', "U-DL" ), ( '╦', "-RDL" ), ( '╩', "UR-L" ), ( '╬', "URDL" ) ]
        , test "a double line is two lines one pixel either side of the middle" <|
            \_ ->
                shape '═'
                    |> Expect.equal
                        [ "calc(50% + 0px) 1px @ 0 calc(50% + -1px)"
                        , "calc(50% + 0px) 1px @ 0 calc(50% + 1px)"
                        , "calc(50% + 0px) 1px @ 100% calc(50% + -1px)"
                        , "calc(50% + 0px) 1px @ 100% calc(50% + 1px)"
                        ]
        , test "in a double corner the outer line goes round the outside and the inner one stops short" <|
            \_ ->
                shape '╔'
                    |> Expect.equal
                        [ "1px calc(50% + 1.5px) @ calc(50% + -1px) 100%"
                        , "1px calc(50% + -0.5px) @ calc(50% + 1px) 100%"
                        , "calc(50% + 1.5px) 1px @ 100% calc(50% + -1px)"
                        , "calc(50% + -0.5px) 1px @ 100% calc(50% + 1px)"
                        ]
        , test "where two double lines cross, no line crosses the gap" <|
            \_ ->
                layers (char '╬')
                    |> List.filter (\layer -> String.contains "calc(50% + -0.5px)" (layer.width ++ layer.height))
                    |> List.length
                    |> Expect.equal 8
        , test "a single line ends on a double line it meets, crosses one it crosses, and rounds a corner with one" <|
            \_ ->
                -- the single arm of each: down, down (with up), right
                [ shape '╤' |> List.head, shape '╪' |> List.drop 1 |> List.head, shape '╓' |> List.reverse |> List.head ]
                    |> Expect.equal
                        [ Just "1px calc(50% + -0.5px) @ calc(50% + 0px) 100%"
                        , Just "1px calc(50% + 0px) @ calc(50% + 0px) 100%"
                        , Just "calc(50% + 1.5px) 1px @ 100% calc(50% + 0px)"
                        ]
        , test "block elements fill their part of the cell" <|
            \_ ->
                [ shape '█', shape '▀', shape '▄', shape '▌', shape '▐', shape '▁', shape '▏' ]
                    |> Expect.equal
                        [ [ "100% 100% @ 0 100%" ]
                        , [ "100% 50% @ 0 0" ]
                        , [ "100% 50% @ 0 100%" ]
                        , [ "50% 100% @ 0 0" ]
                        , [ "50% 100% @ 100% 0" ]
                        , [ "100% 12.5% @ 0 100%" ]
                        , [ "12.5% 100% @ 0 0" ]
                        ]
        , test "quadrants" <|
            \_ ->
                [ '▖', '▗', '▘', '▝', '▚', '▞', '▙', '▛', '▜', '▟' ]
                    |> List.map (\character -> List.map (\layer -> layer.x ++ " " ++ layer.y) (layers (char character)))
                    |> Expect.equal
                        [ [ "0 100%" ]
                        , [ "100% 100%" ]
                        , [ "0 0" ]
                        , [ "100% 0" ]
                        , [ "0 0", "100% 100%" ]
                        , [ "100% 0", "0 100%" ]
                        , [ "0 0", "0 100%", "100% 100%" ]
                        , [ "0 0", "100% 0", "0 100%" ]
                        , [ "0 0", "100% 0", "100% 100%" ]
                        , [ "100% 0", "0 100%", "100% 100%" ]
                        ]
        , test "rounded corners, dashes and diagonals are drawn too" <|
            \_ ->
                [ '╭', '╮', '╯', '╰', '┄', '┆', '╌', '╱', '╲', '╳' ]
                    |> List.map (\character -> List.length (layers (char character)))
                    |> Expect.equal [ 2, 2, 2, 2, 1, 1, 1, 1, 1, 2 ]
        , test "a drawn character is a cell of its own, with its text kept for copying" <|
            \_ ->
                run 1 10 [ txt "a──b" ]
                    |> (\terminal -> cellAt 0 0 terminal |> Maybe.map (\_ -> terminal))
                    |> Maybe.map (\terminal -> Screen.lineSpans (Screen.activeScreen terminal |> .lines |> arrayHead))
                    |> Maybe.withDefault []
                    |> List.map (\span -> ( span.text, span.fixed ))
                    |> Expect.equal [ ( "a", False ), ( "─", True ), ( "─", True ), ( "b", False ) ]
        ]


arrayHead : Array.Array { cells : Array.Array a, wrapped : Bool } -> { cells : Array.Array a, wrapped : Bool }
arrayHead lines =
    Array.get 0 lines
        |> Maybe.withDefault { cells = Array.empty, wrapped = False }


{-| Which sides of the cell the character reaches: U, R, D, L or - for none.
An arm is a layer that starts at that edge.
-}
sides : Char -> String
sides character =
    let
        drawn =
            layers (char character)

        vertical layer =
            String.endsWith "px" layer.width

        reaches side =
            List.any
                (\layer ->
                    case side of
                        'U' ->
                            vertical layer && layer.y == "0"

                        'D' ->
                            vertical layer && layer.y == "100%"

                        'L' ->
                            not (vertical layer) && layer.x == "0"

                        _ ->
                            not (vertical layer) && layer.x == "100%"
                )
                drawn
    in
    [ 'U', 'R', 'D', 'L' ]
        |> List.map
            (\side ->
                if reaches side then
                    side

                else
                    '-'
            )
        |> String.fromList
