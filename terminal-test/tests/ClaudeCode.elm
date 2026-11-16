module ClaudeCode exposing (suite)

{-| What Claude Code (and other programs built the same way) does to a
terminal while it runs, replayed as the commands the parser produces.
-}

import Expect
import Support exposing (..)
import Terminal.Input
import Terminal.Screen as Screen
import Terminal.Types exposing (..)
import Test exposing (..)


{-| Erase the last `count` lines, bottom up, the way an in-place redraw does.
-}
eraseLines : Int -> List TerminalCommand
eraseLines count =
    List.concat (List.repeat (count - 1) [ seq "[2K", one "[A" 1 ]) ++ [ seq "[2K", seq "[G" ]


suite : Test
suite =
    describe "What Claude Code does to the terminal"
        [ test "startup: keyboard protocol, bracketed paste, focus events, hidden cursor" <|
            \_ ->
                let
                    terminal =
                        run 24 80 [ one "[>u" 1, seq "[?2004h", seq "[?1004h", seq "[?25l" ]
                in
                Expect.equal
                    ( Terminal.Input.keyboardState terminal
                    , ( terminal.modes.bracketedPaste, terminal.modes.focusEvents, terminal.modes.cursorVisible )
                    )
                    ( { applicationCursorKeys = False, keyboardFlags = 1 }, ( True, True, False ) )
        , test "exit: everything is switched back off" <|
            \_ ->
                let
                    terminal =
                        run 24 80 [ one "[>u" 1, seq "[?2004h", seq "[?1004h", seq "[?25l", one "[<u" 1, seq "[?2004l", seq "[?1004l", seq "[?25h" ]
                in
                Expect.equal
                    ( Terminal.Input.keyboardState terminal
                    , ( terminal.modes.bracketedPaste, terminal.modes.focusEvents, terminal.modes.cursorVisible )
                    )
                    ( { applicationCursorKeys = False, keyboardFlags = 0 }, ( False, False, True ) )
        , test "the frame is redrawn in place: erase the old lines upward, write the new ones" <|
            \_ ->
                run 6
                    30
                    (List.concat
                        [ [ txt "$ claude", seq "\u{000D}", seq "\n" ]
                        , [ txt "frame 1 line 1", seq "\u{000D}", seq "\n", txt "frame 1 line 2", seq "\u{000D}", seq "\n", txt "frame 1 line 3" ]
                        , [ seq "[?2026h" ]
                        , eraseLines 3
                        , [ txt "frame 2 line 1", seq "\u{000D}", seq "\n", txt "frame 2 line 2" ]
                        , [ seq "[?2026l" ]
                        ]
                    )
                    |> rows
                    |> Expect.equal [ "$ claude", "frame 2 line 1", "frame 2 line 2", "", "", "" ]
        , test "synchronized output brackets a frame without changing the screen" <|
            \_ ->
                let
                    terminal =
                        run 2 10 [ seq "[?2026h", txt "frame", seq "[?2026l" ]
                in
                Expect.equal ( screen terminal, terminal.modes.synchronizedOutput ) ( "frame", False )
        , test "a full redraw clears the screen and the scrollback and starts at the top" <|
            \_ ->
                let
                    terminal =
                        run 3 20 [ txt "1", seq "E", txt "2", seq "E", txt "3", seq "E", txt "4", seq "[2J", seq "[3J", seq "[H", txt "fresh" ]
                in
                Expect.equal ( rows terminal, Screen.scrollbackText terminal ) ( [ "fresh", "", "" ], [] )
        , test "the input cursor is drawn by the program as an inverse cell" <|
            \_ ->
                let
                    terminal =
                        run 2 20 [ txt "> hi", one "[m" 7, txt " ", one "[m" 27 ]
                in
                Expect.equal
                    ( Screen.hasAttribute Screen.attributeInverse (styleAt 4 0 terminal)
                    , Screen.hasAttribute Screen.attributeInverse (styleAt 3 0 terminal)
                    )
                    ( True, False )
        , test "true color text with dim and bold, each reset separately" <|
            \_ ->
                let
                    terminal =
                        run 2 30 [ three "[m-fg-rgb" 215 119 87, one "[m" 1, txt "Claude", one "[m" 22, one "[m" 39, one "[m" 2, txt " dim", one "[m" 22, txt " plain" ]
                in
                Expect.equal
                    [ styleAt 0 0 terminal, styleAt 7 0 terminal, styleAt 11 0 terminal ]
                    [ { foreground = RgbColor 215 119 87, background = DefaultColor, attributes = Screen.attributeBold, link = "" }
                    , { foreground = DefaultColor, background = DefaultColor, attributes = Screen.attributeDim, link = "" }
                    , Screen.defaultStyle
                    ]
        , test "the title is set and remembered" <|
            \_ ->
                (run 2 20 [ str "set-icon-name-and-window-title" "✳ Claude Code" ]).title
                    |> Expect.equal "✳ Claude Code"
        , test "box drawing rules and status glyphs each take one column" <|
            \_ ->
                let
                    terminal =
                        run 2 20 [ txt "╭──╮ ⏺ ✻ ⎿ ❯ ▐▛█▜▌" ]
                in
                Expect.equal ( cursor terminal, screen terminal ) ( ( 18, 0 ), "╭──╮ ⏺ ✻ ⎿ ❯ ▐▛█▜▌" )
        , test "the full screen interface uses the alternate screen and mouse reporting, and restores both" <|
            \_ ->
                let
                    inside =
                        run 5 20 [ txt "shell", seq "[?1049h", seq "[?1000h", seq "[?1002h", seq "[?1003h", seq "[?1006h" ]

                    after =
                        Screen.applyAll [ seq "[?1006l", seq "[?1003l", seq "[?1049l" ] inside |> Tuple.first
                in
                Expect.equal
                    [ ( inside.activeBuffer, inside.modes.mouseTracking, inside.modes.mouseEncoding )
                    , ( after.activeBuffer, after.modes.mouseTracking, after.modes.mouseEncoding )
                    ]
                    [ ( Alternate, MouseAnyMotion, MouseEncodingSgr )
                    , ( Primary, MouseOff, MouseEncodingDefault )
                    ]
        , test "when the shell exits the terminal knows" <|
            \_ ->
                (run 2 10 [ seq "child-exited" ]).exited
                    |> Expect.equal True
        ]
