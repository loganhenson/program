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


{-| Finish the line, so the text before it is output and the cursor sits on a
new line of its own, the way it does at a prompt.
-}
done : TerminalCommand
done =
    seq "E"


suite : Test
suite =
    describe "Resizing rearranges the text to fit the new width"
        [ test "a line too long for the new width wraps, and joins up again when there is room" <|
            \_ ->
                let
                    narrow =
                        run 4 10 [ txt "abcdefgh", done ] |> resize 4 4

                    wide =
                        resize 4 10 narrow
                in
                Expect.equal
                    [ ( rows narrow, cursor narrow ), ( rows wide, cursor wide ) ]
                    [ ( [ "abcd", "efgh", "", "" ], ( 0, 2 ) ), ( [ "abcdefgh", "", "", "" ], ( 0, 1 ) ) ]
        , test "lines that were separate stay separate" <|
            \_ ->
                run 4 10 [ txt "abcdef", done, txt "123456", done ]
                    |> resize 6 4
                    |> rows
                    |> Expect.equal [ "abcd", "ef", "1234", "56", "", "" ]
        , test "rows that no longer fit move to the scrollback, and come back when there is room again" <|
            \_ ->
                let
                    narrow =
                        run 2 8 [ txt "abcdefgh", done, txt "12" ] |> resize 2 4

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
                        run 4 10 [ txt "1", done, txt "2", done, txt "3", done, txt "$ " ] |> resize 2 10
                in
                Expect.equal
                    ( rows terminal, cursor terminal, Screen.scrollbackText terminal )
                    ( [ "3", "$" ], ( 2, 1 ), [ "1", "2" ] )
        , test "a wide character is never split across two rows" <|
            \_ ->
                run 4 6 [ txt "ab日本", done ]
                    |> resize 4 3
                    |> rows
                    |> Expect.equal [ "ab", "日", "本", "" ]
        , test "the column a wide character left empty when it wrapped is not text" <|
            -- "abc" + a wide character on 4 columns leaves the 4th column of
            -- the first row empty; joined back together there is no gap
            \_ ->
                let
                    narrow =
                        run 3 4 [ txt "abc日x", done ]

                    wide =
                        resize 3 10 narrow
                in
                Expect.equal ( rows narrow, rows wide ) ( [ "abc", "日x", "" ], [ "abc日x", "", "" ] )
        , test "wide characters printed side by side stay side by side" <|
            \_ ->
                run 3 10 [ txt "a日本語b", done ]
                    |> resize 4 4
                    |> resize 3 10
                    |> rows
                    |> Expect.equal [ "a日本語b", "", "" ]
        , test "colors survive being rearranged" <|
            \_ ->
                let
                    terminal =
                        run 3 8 [ txt "abc", one "[m" 31, txt "def", one "[m" 0, done ] |> resize 3 4
                in
                Expect.equal
                    ( rows terminal, (styleAt 2 0 terminal).foreground, ( (styleAt 3 0 terminal).foreground, (styleAt 1 1 terminal).foreground ) )
                    ( [ "abcd", "ef", "" ], DefaultColor, ( IndexedColor 1, IndexedColor 1 ) )
        , test "every row is exactly as wide as the screen afterwards" <|
            \_ ->
                run 4 10 [ txt "abcdefghijklmnopqrstuvwxyz", done, txt "0123456789abcdef" ]
                    |> resize 6 7
                    |> Screen.screenText
                    |> List.map String.length
                    |> Expect.equal [ 7, 7, 7, 7, 7, 7 ]
        , describe "the line the cursor is on belongs to the running program and keeps its rows"
            -- A shell redraws its prompt after a resize by moving up as many
            -- rows as the line took before. Rearranging those rows under it
            -- leaves a second copy of the prompt behind (narrower) or makes
            -- it overwrite the output above (wider).
            [ test "narrower: the rows are cut, not wrapped into more rows" <|
                \_ ->
                    let
                        terminal =
                            run 4 12 [ txt "out", done, txt "$ git commit -m hello" ] |> resize 4 6
                    in
                    Expect.equal
                        ( rows terminal, cursor terminal )
                        ( [ "out", "$ git", " -m he", "" ], ( 6, 2 ) )
            , test "wider: the rows are not joined into fewer rows" <|
                \_ ->
                    let
                        terminal =
                            run 4 12 [ txt "out", done, txt "$ git commit -m hello" ] |> resize 4 30
                    in
                    Expect.equal
                        ( rows terminal, cursor terminal )
                        ( [ "out", "$ git commit", " -m hello", "" ], ( 9, 2 ) )
            , test "the output above it is still rearranged" <|
                \_ ->
                    run 5 12 [ txt "0123456789ab", txt "cdef", done, txt "$ ls" ]
                        |> resize 5 16
                        |> rows
                        |> Expect.equal [ "0123456789abcdef", "$ ls", "", "", "" ]
            , test "a prompt that fits on one row is unaffected either way" <|
                \_ ->
                    let
                        terminal =
                            run 3 20 [ txt "$ ls -la" ]
                    in
                    Expect.equal
                        [ ( rows (resize 3 10 terminal), cursor (resize 3 10 terminal) )
                        , ( rows (resize 3 40 terminal), cursor (resize 3 40 terminal) )
                        ]
                        [ ( [ "$ ls -la", "", "" ], ( 8, 0 ) ), ( [ "$ ls -la", "", "" ], ( 8, 0 ) ) ]
            , test "the start of the cursor's line in the scrollback is left there" <|
                \_ ->
                    let
                        terminal =
                            run 2 4 [ txt "abcdefghij" ] |> resize 2 8
                    in
                    Expect.equal
                        ( rows terminal, Screen.scrollbackText terminal )
                        ( [ "efgh", "ij" ], [ "abcd" ] )
            ]
        , test "a full screen program on the alternate screen is not rearranged, and the shell behind it is" <|
            \_ ->
                let
                    inside =
                        run 3 8 [ txt "abcdefgh", done, seq "[?1049h", two "[H" 1 1, txt "12345678" ] |> resize 3 4

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
