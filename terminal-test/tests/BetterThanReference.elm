module BetterThanReference exposing (suite)

{-| The end to end tests compare the terminal with xterm.js. That comparison
finds our mistakes, but xterm.js has quirks of its own, and where it does the
terminal keeps the correct behaviour instead of copying it. Those behaviours
are left out of the comparison (see `e2e/fuzz.js`), so they are pinned here.
-}

import Expect
import Support exposing (..)
import Terminal.Screen as Screen
import Terminal.Types exposing (..)
import Test exposing (..)


full : TerminalCommand
full =
    txt "abcde"


suite : Test
suite =
    describe "Where the terminal deliberately differs from xterm.js"
        [ test "a restored cursor that was waiting past the last column waits there again" <|
            -- xterm.js puts it on the last column, so the next character
            -- overwrites instead of wrapping
            \_ ->
                let
                    terminal =
                        run 3 5 [ full, seq "7", two "[H" 3 1, seq "8", txt "f" ]
                in
                Expect.equal ( rows terminal, cursor terminal ) ( [ "abcde", "f", "" ], ( 1, 1 ) )
        , test "a restored cursor returns to the row it was saved on, however much has scrolled since" <|
            -- xterm.js moves it up by the number of lines that scrolled away
            \_ ->
                run 3 5 [ two "[H" 3 2, seq "7", seq "\n", seq "\n", two "[H" 1 1, seq "8" ]
                    |> cursor
                    |> Expect.equal ( 1, 2 )
        , test "restoring the cursor restores origin mode and auto wrap as they were saved" <|
            \_ ->
                let
                    terminal =
                        run 6 5 [ seq "7", two "[r" 2 4, seq "[?6h", seq "[?7l", seq "8" ]
                in
                Expect.equal ( terminal.modes.origin, terminal.modes.autoWrap ) ( False, True )
        , test "relative cursor movement in origin mode stays where it should" <|
            -- xterm.js adds the top margin a second time
            \_ ->
                Expect.equal
                    [ cursor (run 10 10 [ two "[r" 3 8, seq "[?6h", two "[H" 3 1, one "[A" 1 ])
                    , cursor (run 10 10 [ two "[r" 3 8, seq "[?6h", two "[H" 3 1, one "[B" 2 ])
                    , cursor (run 10 10 [ two "[r" 3 8, seq "[?6h", two "[H" 3 4, one "[C" 2 ])
                    ]
                    [ ( 0, 3 ), ( 0, 6 ), ( 5, 4 ) ]
        , test "the alignment pattern is plain, whatever colors are selected, and resets the margins" <|
            \_ ->
                let
                    terminal =
                        run 4 5 [ one "[m" 41, one "[m" 1, two "[r" 2 3, seq "#8" ]
                in
                Expect.equal
                    ( rows terminal, styleAt 0 0 terminal == Screen.defaultStyle, Screen.activeScreen terminal |> (\s -> ( s.scrollTop, s.scrollBottom )) )
                    ( [ "EEEEE", "EEEEE", "EEEEE", "EEEEE" ], True, ( 0, 3 ) )
        , test "insert and delete line outside the scroll region change nothing, not even the cursor" <|
            \_ ->
                let
                    before =
                        run 5 5 [ two "[r" 3 4, two "[H" 1 1, full ]

                    after =
                        Screen.applyAll [ one "[L" 2, one "[M" 2 ] before |> Tuple.first
                in
                Expect.equal ( rows after, cursor after ) ( rows before, ( 5, 0 ) )
        , test "back tab works from the last column while the cursor waits past it" <|
            \_ ->
                cursor (run 2 20 [ txt (String.repeat 20 "x"), seq "[Z" ])
                    |> Expect.equal ( 16, 0 )
        , test "scrolling down fills the new lines with the current background, like scrolling up" <|
            \_ ->
                let
                    terminal =
                        run 3 5 [ txt "a", one "[m" 44, one "[T" 1 ]
                in
                Expect.equal
                    ( rows terminal, (styleAt 0 0 terminal).background )
                    ( [ "", "a", "" ], IndexedColor 4 )
        , test "a full reset also turns automatic newline mode off" <|
            \_ ->
                (run 2 5 [ seq "[20h", seq "c" ]).modes.newLine
                    |> Expect.equal False
        , test "inserting blanks in the middle of a wide character leaves no half character behind" <|
            \_ ->
                let
                    terminal =
                        run 1 8 [ txt "x本", seq "\u{0008}", one "[@" 2 ]
                in
                Expect.equal
                    ( rows terminal
                    , List.range 0 7 |> List.filterMap (\x -> cellAt x 0 terminal) |> List.map .width
                    )
                    ( [ "x" ], [ 1, 1, 1, 1, 1, 1, 1, 1 ] )
        ]
