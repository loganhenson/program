module Modes exposing (suite)

import Expect
import Support exposing (..)
import Terminal.Screen
import Terminal.Types exposing (..)
import Test exposing (..)


suite : Test
suite =
    describe "Modes, margins and screens"
        [ test "the cursor can be hidden and shown" <|
            \_ ->
                Expect.equal
                    [ (run 2 10 []).modes.cursorVisible
                    , (run 2 10 [ seq "[?25l" ]).modes.cursorVisible
                    , (run 2 10 [ seq "[?25l", seq "[?25h" ]).modes.cursorVisible
                    ]
                    [ True, False, True ]
        , test "the alternate screen starts empty and the primary screen comes back untouched" <|
            \_ ->
                let
                    inside =
                        run 3 10 [ txt "shell", seq "[?1049h", two "[H" 1 1, txt "editor" ]

                    after =
                        run 3 10 [ txt "shell", seq "[?1049h", two "[H" 1 1, txt "editor", seq "[?1049l" ]
                in
                Expect.equal
                    [ ( inside.activeBuffer, screen inside, cursor inside )
                    , ( after.activeBuffer, screen after, cursor after )
                    ]
                    [ ( Alternate, "editor", ( 6, 0 ) )
                    , ( Primary, "shell", ( 5, 0 ) )
                    ]
        , test "the alternate screen has no scrollback" <|
            \_ ->
                run 2 10 [ seq "[?1049h", txt "1", seq "\n", txt "2", seq "\n", txt "3", seq "\n", seq "[?1049l" ]
                    |> .scrollback
                    |> .current
                    |> .count
                    |> Expect.equal 0
        , test "a scroll region scrolls only its own lines" <|
            \_ ->
                run 5 5 [ txt "1", seq "\u{000D}", seq "\n", txt "2", seq "\u{000D}", seq "\n", txt "3", seq "\u{000D}", seq "\n", txt "4", seq "\u{000D}", seq "\n", txt "5", two "[r" 2 4, two "[H" 4 1, seq "\n" ]
                    |> rows
                    |> Expect.equal [ "1", "3", "4", "", "5" ]
        , test "reverse index at the top of a scroll region scrolls it down" <|
            \_ ->
                run 5 5 [ txt "1", seq "\u{000D}", seq "\n", txt "2", seq "\u{000D}", seq "\n", txt "3", seq "\u{000D}", seq "\n", txt "4", seq "\u{000D}", seq "\n", txt "5", two "[r" 2 4, two "[H" 2 1, seq "M" ]
                    |> rows
                    |> Expect.equal [ "1", "", "2", "3", "5" ]
        , test "setting a scroll region moves the cursor home, resetting it restores the full screen" <|
            \_ ->
                let
                    region =
                        run 5 5 [ two "[H" 3 3, two "[r" 2 4 ]

                    reset =
                        run 5 5 [ two "[r" 2 4, seq "[r", two "[H" 5 1, txt "a", seq "\n", txt "b" ]
                in
                Expect.equal ( cursor region, rows reset ) ( ( 0, 0 ), [ "", "", "", "a", " b" ] )
        , test "an invalid scroll region is ignored" <|
            \_ ->
                run 5 5 [ two "[H" 3 3, two "[r" 4 2 ]
                    |> cursor
                    |> Expect.equal ( 2, 2 )
        , test "insert and delete line work at the cursor row, inside the scroll region" <|
            \_ ->
                Expect.equal
                    [ rows (run 4 3 [ txt "1", seq "E", txt "2", seq "E", txt "3", seq "E", txt "4", two "[H" 2 1, seq "[L" ])
                    , rows (run 4 3 [ txt "1", seq "E", txt "2", seq "E", txt "3", seq "E", txt "4", two "[H" 2 1, seq "[M" ])
                    , rows (run 4 3 [ txt "1", seq "E", txt "2", seq "E", txt "3", seq "E", txt "4", two "[r" 1 3, two "[H" 2 1, one "[L" 5 ])
                    ]
                    [ [ "1", "", "2", "3" ]
                    , [ "1", "3", "4", "" ]
                    , [ "1", "", "", "4" ]
                    ]
        , test "origin mode addresses the cursor relative to the scroll region and keeps it inside" <|
            \_ ->
                Expect.equal
                    [ cursor (run 10 10 [ two "[r" 3 6, seq "[?6h" ])
                    , cursor (run 10 10 [ two "[r" 3 6, seq "[?6h", two "[H" 2 5 ])
                    , cursor (run 10 10 [ two "[r" 3 6, seq "[?6h", two "[H" 99 1 ])
                    , cursor (run 10 10 [ two "[r" 3 6, seq "[?6h", two "[H" 2 1, one "[A" 9 ])
                    , cursor (run 10 10 [ two "[r" 3 6, seq "[?6h", seq "[?6l", two "[H" 2 5 ])
                    ]
                    [ ( 0, 2 ), ( 4, 3 ), ( 0, 5 ), ( 0, 2 ), ( 4, 1 ) ]
        , test "without auto wrap text stays on the line and overwrites the last column" <|
            \_ ->
                let
                    terminal =
                        run 2 5 [ seq "[?7l", txt "abcdefgh" ]
                in
                Expect.equal ( rows terminal, cursor terminal ) ( [ "abcdh", "" ], ( 5, 0 ) )
        , test "with auto wrap the cursor waits past the last column until the next character" <|
            \_ ->
                Expect.equal
                    [ ( cursor (run 2 5 [ txt "abcde" ]), rows (run 2 5 [ txt "abcde" ]) )
                    , ( cursor (run 2 5 [ txt "abcdef" ]), rows (run 2 5 [ txt "abcdef" ]) )

                    -- a carriage return in between cancels the wrap
                    , ( cursor (run 2 5 [ txt "abcde", seq "\u{000D}", txt "x" ]), rows (run 2 5 [ txt "abcde", seq "\u{000D}", txt "x" ]) )
                    ]
                    [ ( ( 5, 0 ), [ "abcde", "" ] )
                    , ( ( 1, 1 ), [ "abcde", "f" ] )
                    , ( ( 1, 0 ), [ "xbcde", "" ] )
                    ]
        , test "clearing to the end of a full line keeps its last character" <|
            -- `ls` and `git diff` clear to the end of the line after every colored word
            \_ ->
                rows (run 2 5 [ txt "abcde", seq "[K" ])
                    |> Expect.equal [ "abcde", "" ]
        , test "insert mode pushes the rest of the line to the right" <|
            \_ ->
                rows (run 1 6 [ txt "abcd", two "[H" 1 2, seq "[4h", txt "XY", seq "[4l", txt "Z" ])
                    |> Expect.equal [ "aXYZcd" ]
        , test "save and restore cursor bring back the position and the colors" <|
            \_ ->
                let
                    terminal =
                        run 3 10 [ two "[H" 2 3, one "[m" 31, seq "7", two "[H" 1 1, one "[m" 0, seq "8", txt "x" ]
                in
                Expect.equal ( cursor terminal, (styleAt 2 1 terminal).foreground ) ( ( 3, 1 ), IndexedColor 1 )
        , test "tab stops: default every 8 columns, set, clear, and back tab" <|
            \_ ->
                Expect.equal
                    [ cursor (run 1 40 [ txt "a", seq "\t", seq "\t" ])
                    , cursor (run 1 40 [ two "[H" 1 5, seq "H", two "[H" 1 1, seq "\t" ])
                    , cursor (run 1 40 [ one "[g" 3, seq "\t" ])
                    , cursor (run 1 40 [ two "[H" 1 20, seq "[Z" ])
                    , cursor (run 1 40 [ one "[I" 3 ])
                    ]
                    [ ( 16, 0 ), ( 4, 0 ), ( 39, 0 ), ( 16, 0 ), ( 24, 0 ) ]
        , test "a full reset clears the screen, the modes and the colors" <|
            \_ ->
                let
                    terminal =
                        run 2 10 [ one "[m" 31, txt "text", seq "[?25l", seq "[?2004h", two "[r" 1 1, seq "c", txt "x" ]
                in
                Expect.equal
                    ( screen terminal, terminal.modes.cursorVisible, ( terminal.modes.bracketedPaste, styleAt 0 0 terminal == defaultStyle ) )
                    ( "x", True, ( False, True ) )
        , test "resizing keeps the text, the cursor on screen, and moves lines that no longer fit to the scrollback" <|
            \_ ->
                let
                    terminal =
                        run 4 10 [ txt "1", seq "E", txt "2", seq "E", txt "3", seq "E", txt "4" ]
                            |> Terminal.Screen.resize { height = 2, width = 5 }
                in
                Expect.equal
                    ( rows terminal, cursor terminal, Terminal.Screen.scrollbackText terminal )
                    ( [ "3", "4" ], ( 1, 1 ), [ "1", "2" ] )
        , test "growing the screen adds empty lines at the bottom" <|
            \_ ->
                run 2 5 [ txt "ab" ]
                    |> Terminal.Screen.resize { height = 4, width = 8 }
                    |> (\terminal -> ( rows terminal, List.length (Terminal.Screen.screenText terminal), Maybe.map String.length (List.head (Terminal.Screen.screenText terminal)) ))
                    |> Expect.equal ( [ "ab", "", "", "" ], 4, Just 8 )
        ]


defaultStyle : Style
defaultStyle =
    Terminal.Screen.defaultStyle
