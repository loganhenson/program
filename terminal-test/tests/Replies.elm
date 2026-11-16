module Replies exposing (suite)

import Expect
import Support exposing (..)
import Terminal.Types exposing (..)
import Test exposing (..)


replies : List TerminalCommand -> List String
replies commands =
    effects 24 80 commands
        |> List.filterMap
            (\effect ->
                case effect of
                    Reply reply ->
                        Just reply

                    _ ->
                        Nothing
            )


esc : String
esc =
    "\u{001B}"


suite : Test
suite =
    describe "Answers to queries"
        [ test "cursor position report is 1 based" <|
            \_ ->
                replies [ two "[H" 5 10, seq "[6n" ]
                    |> Expect.equal [ esc ++ "[5;10R" ]
        , test "cursor position with the cursor waiting past the last column reports the last column" <|
            \_ ->
                replies [ txt (String.repeat 80 "x"), seq "[6n" ]
                    |> Expect.equal [ esc ++ "[1;80R" ]
        , test "cursor position in origin mode is relative to the scroll region" <|
            \_ ->
                replies [ two "[r" 5 10, seq "[?6h", two "[H" 2 3, seq "[6n" ]
                    |> Expect.equal [ esc ++ "[2;3R" ]
        , test "device status and device attributes are answered" <|
            \_ ->
                replies [ seq "[5n", seq "[0c", seq "[>c" ]
                    |> Expect.equal [ esc ++ "[0n", esc ++ "[?62;22c", esc ++ "[>1;10;0c" ]
        , test "replies keep the order of the queries" <|
            -- programs send a feature query followed by device attributes and
            -- take the device attributes answer to mean "no more answers"
            \_ ->
                replies [ seq "[>q", seq "[?u", seq "[0c" ]
                    |> Expect.equal
                        [ esc ++ "P>|TerminalPro" ++ esc ++ "\\"
                        , esc ++ "[?0u"
                        , esc ++ "[?62;22c"
                        ]
        , test "mode queries report set, reset and not recognized" <|
            \_ ->
                replies [ seq "[?2004h", seq "[?2004$p", seq "[?25$p", seq "[?1000$p", seq "[?2026$p", seq "[?9999$p", seq "[4$p" ]
                    |> Expect.equal
                        [ esc ++ "[?2004;1$y"
                        , esc ++ "[?25;1$y"
                        , esc ++ "[?1000;2$y"
                        , esc ++ "[?2026;2$y"
                        , esc ++ "[?9999;0$y"
                        , esc ++ "[4;2$y"
                        ]
        , test "the size of the screen in characters" <|
            \_ ->
                replies [ seq "[18t" ]
                    |> Expect.equal [ esc ++ "[8;24;80t" ]
        , test "default colors are reported with the terminator the program used" <|
            \_ ->
                replies [ seq "]11;?\u{0007}", seq ("]10;?" ++ esc ++ "\\"), seq "]4;1;?\u{0007}" ]
                    |> Expect.equal
                        [ esc ++ "]11;rgb:2626/2626/2626\u{0007}"
                        , esc ++ "]10;rgb:d4d4/d4d4/d4d4" ++ esc ++ "\\"
                        , esc ++ "]4;1;rgb:c2c2/3636/2121\u{0007}"
                        ]
        , test "the color scheme is reported as dark" <|
            \_ ->
                replies [ seq "[?996n" ]
                    |> Expect.equal [ esc ++ "[?997;1n" ]
        , test "settings and terminfo capabilities can be requested" <|
            \_ ->
                replies [ two "[r" 2 20, seq "P$qr", seq "P$qm", seq "P$qz", seq "P+q544e", seq "P+q7a7a" ]
                    |> Expect.equal
                        [ esc ++ "P1$r2;20r" ++ esc ++ "\\"
                        , esc ++ "P1$r0m" ++ esc ++ "\\"
                        , esc ++ "P0$r" ++ esc ++ "\\"

                        -- TN = xterm-256color, hex encoded
                        , esc ++ "P1+r544e=787465726d2d323536636f6c6f72" ++ esc ++ "\\"
                        , esc ++ "P0+r7a7a" ++ esc ++ "\\"
                        ]
        , test "the keyboard protocol flags can be pushed, queried and popped" <|
            \_ ->
                replies [ one "[>u" 1, seq "[?u", one "[<u" 1, seq "[?u", two "[=u" 1 1, seq "[?u", two "[=u" 1 3, seq "[?u" ]
                    |> Expect.equal [ esc ++ "[?1u", esc ++ "[?0u", esc ++ "[?1u", esc ++ "[?0u" ]
        , test "only the keyboard flags that are implemented can be turned on" <|
            \_ ->
                replies [ one "[>u" 31, seq "[?u" ]
                    |> Expect.equal [ esc ++ "[?1u" ]
        , test "titles, bell, notifications, clipboard and the shell exiting are reported to the application" <|
            \_ ->
                effects 4
                    20
                    [ str "set-window-title" "vim"
                    , str "set-icon-name-and-window-title" "zsh"
                    , seq "\u{0007}"
                    , str "notify" "done"
                    , str "clipboard-write" "copied"
                    , seq "child-exited"
                    ]
                    |> Expect.equal [ SetTitle "vim", SetTitle "zsh", Bell, Notify "done", WriteClipboard "copied", ChildExited ]
        , test "an unknown sequence gets no reply and changes nothing" <|
            \_ ->
                ( replies [ seq "[?9999h", seq "[99t", seq "nonsense" ], screen (run 2 5 [ seq "nonsense", one "[y" 5 ]) )
                    |> Expect.equal ( [], "" )
        ]
