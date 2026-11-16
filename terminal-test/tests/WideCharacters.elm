module WideCharacters exposing (suite)

import Expect
import Support exposing (..)
import Terminal.Types
import Test exposing (..)


widths : Int -> Int -> Terminal.Types.Terminal -> List Int
widths from to terminal =
    List.range from to
        |> List.filterMap (\x -> cellAt x 0 terminal)
        |> List.map .width


suite : Test
suite =
    describe "Wide and combining characters"
        [ test "a CJK character takes two columns" <|
            \_ ->
                let
                    terminal =
                        run 2 10 [ txt "a日b" ]
                in
                Expect.equal ( cursor terminal, widths 0 3 terminal ) ( ( 4, 0 ), [ 1, 2, 0, 1 ] )
        , test "an emoji takes two columns" <|
            \_ ->
                cursor (run 2 10 [ txt "🎉x" ])
                    |> Expect.equal ( 3, 0 )
        , test "a combining accent joins the character before it" <|
            \_ ->
                let
                    terminal =
                        run 2 10 [ txt "e\u{0301}x" ]
                in
                Expect.equal
                    ( cursor terminal, Maybe.map .char (cellAt 0 0 terminal) )
                    ( ( 2, 0 ), Just "e\u{0301}" )
        , test "the emoji presentation selector widens a symbol to two columns" <|
            \_ ->
                let
                    terminal =
                        run 2 10 [ txt "⚠\u{FE0F}x" ]
                in
                Expect.equal ( cursor terminal, widths 0 2 terminal ) ( ( 3, 0 ), [ 2, 0, 1 ] )
        , test "a wide character that does not fit wraps as a whole" <|
            \_ ->
                rows (run 3 5 [ txt "abcd日" ])
                    |> Expect.equal [ "abcd", "日", "" ]
        , test "overwriting half of a wide character removes the other half" <|
            \_ ->
                Expect.equal
                    [ rows (run 1 6 [ txt "日本", two "[H" 1 1, txt "x" ])
                    , rows (run 1 6 [ txt "日本", two "[H" 1 2, txt "x" ])
                    ]
                    [ [ "x 本" ], [ " x本" ] ]
        , test "erasing half of a wide character removes the other half" <|
            \_ ->
                rows (run 1 6 [ txt "日本", two "[H" 1 2, seq "[X" ])
                    |> Expect.equal [ "  本" ]
        , test "deleting a character before wide characters keeps them intact" <|
            \_ ->
                rows (run 1 8 [ txt "a日本b", two "[H" 1 1, seq "[P" ])
                    |> Expect.equal [ "日本b" ]
        , test "every row stays exactly as wide as the screen" <|
            \_ ->
                run 2 6 [ txt "日本語日本語日本語" ]
                    |> (\terminal -> List.range 0 5 |> List.filterMap (\x -> cellAt x 1 terminal) |> List.map .width |> List.sum)
                    |> Expect.equal 6
        ]
