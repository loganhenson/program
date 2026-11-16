module Reflow exposing (suite)

import Expect
import Support exposing (..)
import Terminal.Screen as Screen
import Terminal.Types exposing (..)
import Test exposing (..)


resize : Int -> Int -> Terminal -> Terminal
resize height width =
    Screen.resize { height = height, width = width }


numbered : Int -> List TerminalCommand
numbered count =
    List.range 1 count
        |> List.concatMap (\n -> [ txt (String.fromInt n), seq "\u{000D}", seq "\n" ])


suite : Test
suite =
    describe "Resizing rearranges the text to fit the new width"
        [ test "a line too long for the new width wraps, and joins up again when there is room" <|
            \_ ->
                let
                    narrow =
                        run 3 10 [ txt "abcdefgh" ] |> resize 3 4

                    wide =
                        resize 3 10 narrow
                in
                Expect.equal
                    [ ( rows narrow, cursor narrow ), ( rows wide, cursor wide ) ]
                    [ ( [ "abcd", "efgh", "" ], ( 4, 1 ) ), ( [ "abcdefgh", "", "" ], ( 8, 0 ) ) ]
        , test "the cursor stays on the character it was on" <|
            \_ ->
                let
                    terminal =
                        run 4 20 [ txt "hello world", two "[H" 1 7 ] |> resize 4 4
                in
                Expect.equal ( rows terminal, cursor terminal ) ( [ "hell", "o wo", "rld", "" ], ( 2, 1 ) )
        , test "lines that were separate stay separate" <|
            \_ ->
                run 4 10 [ txt "abcdef", seq "E", txt "123456" ]
                    |> resize 6 4
                    |> rows
                    |> Expect.equal [ "abcd", "ef", "1234", "56", "", "" ]
        , test "rows that no longer fit move to the scrollback, and come back when there is room again" <|
            \_ ->
                let
                    narrow =
                        run 2 8 [ txt "abcdefgh", seq "E", txt "12" ] |> resize 2 4

                    wide =
                        resize 2 8 narrow
                in
                Expect.equal
                    [ ( rows narrow, cursor narrow, Screen.scrollbackText narrow )
                    , ( rows wide, cursor wide, Screen.scrollbackText wide )
                    ]
                    [ ( [ "efgh", "12" ], ( 2, 1 ), [ "abcd" ] )
                    , ( [ "abcdefgh", "12" ], ( 2, 1 ), [] )
                    ]
        , test "a taller window shows more of the history when the screen was full" <|
            \_ ->
                let
                    terminal =
                        run 3 10 (numbered 5) |> resize 5 10
                in
                Expect.equal
                    ( rows terminal, cursor terminal, Screen.scrollbackText terminal )
                    ( [ "2", "3", "4", "5", "" ], ( 0, 4 ), [ "1" ] )
        , test "a taller window does not drag history back onto a screen that was cleared" <|
            \_ ->
                let
                    terminal =
                        run 3 10 (numbered 5 ++ [ seq "[2J", seq "[H", txt "x" ]) |> resize 5 10
                in
                Expect.equal
                    ( rows terminal, cursor terminal, Screen.scrollbackText terminal )
                    ( [ "x", "", "", "", "" ], ( 1, 0 ), [ "1", "2", "3" ] )
        , test "a shorter window scrolls the top away, not the line being typed" <|
            \_ ->
                let
                    terminal =
                        run 4 10 [ txt "1", seq "E", txt "2", seq "E", txt "3", seq "E", txt "$ " ] |> resize 2 10
                in
                Expect.equal
                    ( rows terminal, cursor terminal, Screen.scrollbackText terminal )
                    ( [ "3", "$" ], ( 2, 1 ), [ "1", "2" ] )
        , test "a wide character is never split across two rows" <|
            \_ ->
                run 3 6 [ txt "ab日本" ]
                    |> resize 3 3
                    |> rows
                    |> Expect.equal [ "ab", "日", "本" ]
        , test "the column a wide character left empty when it wrapped is not text" <|
            -- "abc" + a wide character on 4 columns leaves the 4th column of
            -- the first row empty; joined back together there is no gap
            \_ ->
                let
                    narrow =
                        run 3 4 [ txt "abc日x" ]

                    wide =
                        Screen.resize { height = 3, width = 10 } narrow
                in
                Expect.equal ( rows narrow, rows wide ) ( [ "abc", "日x", "" ], [ "abc日x", "", "" ] )
        , test "wide characters printed side by side stay side by side" <|
            \_ ->
                run 3 10 [ txt "a日本語b" ]
                    |> resize 4 4
                    |> resize 3 10
                    |> rows
                    |> Expect.equal [ "a日本語b", "", "" ]
        , test "the unfinished line the cursor is on is rearranged like any other" <|
            \_ ->
                let
                    terminal =
                        run 4 12 [ txt "$ git commit" ] |> resize 4 6 |> resize 4 20
                in
                Expect.equal ( rows terminal, cursor terminal ) ( [ "$ git commit", "", "", "" ], ( 12, 0 ) )
        , test "colors survive being rearranged" <|
            \_ ->
                let
                    terminal =
                        run 3 8 [ txt "abc", one "[m" 31, txt "def" ] |> resize 3 4
                in
                Expect.equal
                    ( rows terminal, (styleAt 2 0 terminal).foreground, ( (styleAt 3 0 terminal).foreground, (styleAt 1 1 terminal).foreground ) )
                    ( [ "abcd", "ef", "" ], DefaultColor, ( IndexedColor 1, IndexedColor 1 ) )
        , test "every row is exactly as wide as the screen afterwards" <|
            \_ ->
                run 4 10 [ txt "abcdefghijklmnopqrstuvwxyz" ]
                    |> resize 5 7
                    |> Screen.screenText
                    |> List.map String.length
                    |> Expect.equal [ 7, 7, 7, 7, 7 ]
        , test "a full screen program on the alternate screen is not rearranged, and the shell behind it is" <|
            \_ ->
                let
                    inside =
                        run 3 8 [ txt "abcdefgh", seq "[?1049h", two "[H" 1 1, txt "12345678" ] |> resize 3 4

                    back =
                        Screen.applyAll [ seq "[?1049l" ] inside |> Tuple.first
                in
                Expect.equal ( rows inside, rows back ) ( [ "1234", "", "" ], [ "abcd", "efgh", "" ] )
        , test "the same size changes nothing" <|
            \_ ->
                let
                    terminal =
                        run 3 8 [ txt "abcdefghij", two "[H" 1 3 ]
                in
                resize 3 8 terminal
                    |> Expect.equal terminal
        ]
