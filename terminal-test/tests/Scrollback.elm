module Scrollback exposing (suite)

import Expect
import Support exposing (..)
import Terminal.Screen as Screen
import Terminal.Types exposing (..)
import Test exposing (..)


numbered : Int -> List TerminalCommand
numbered count =
    List.range 1 count
        |> List.concatMap (\n -> [ txt (String.fromInt n), seq "\u{000D}", seq "\n" ])


suite : Test
suite =
    describe "Scrollback buffer"
        [ test "lines that scroll off the top are kept, oldest first" <|
            \_ ->
                let
                    terminal =
                        run 3 10 (numbered 5)
                in
                Expect.equal
                    ( Screen.scrollbackText terminal, rows terminal )
                    ( [ "1", "2", "3" ], [ "4", "5", "" ] )
        , test "scrollback lines keep their colors" <|
            \_ ->
                run 2 10 [ one "[m" 31, txt "red", seq "\u{000D}", seq "\n", seq "\n" ]
                    |> .scrollback
                    |> Screen.scrollbackLines
                    |> List.concatMap .spans
                    |> List.map (\span -> ( span.text, span.style.foreground ))
                    |> Expect.equal [ ( "red", IndexedColor 1 ) ]
        , test "a line that wrapped at the right margin is remembered as wrapped" <|
            \_ ->
                run 2 5 [ txt "abcdefgh", seq "\u{000D}", seq "\n", seq "\n" ]
                    |> .scrollback
                    |> Screen.scrollbackLines
                    |> List.map (\line -> ( String.concat (List.map .text line.spans), line.wrapped ))
                    |> Expect.equal [ ( "abcde", True ), ( "fgh", False ) ]
        , test "the scrollback is capped so long-running output cannot grow forever" <|
            \_ ->
                let
                    lines =
                        run 2 10 (numbered 30000)
                            |> Screen.scrollbackText
                in
                Expect.equal
                    ( List.length lines <= 10500, List.length lines >= 10000, List.head (List.reverse lines) )
                    ( True, True, Just "29999" )
        , test "clearing the scrollback leaves the screen alone" <|
            \_ ->
                let
                    terminal =
                        run 3 10 (numbered 5 ++ [ seq "[3J" ])
                in
                Expect.equal ( Screen.scrollbackText terminal, rows terminal ) ( [], [ "4", "5", "" ] )
        , test "lines above a scroll region that starts lower are not sent to the scrollback" <|
            \_ ->
                run 4 10 [ two "[r" 2 4, two "[H" 4 1, seq "\n", seq "\n" ]
                    |> Screen.scrollbackText
                    |> Expect.equal []
        , test "Cmd+K clears the screen and the scrollback but keeps the prompt line" <|
            \_ ->
                let
                    terminal =
                        run 3 10 (numbered 5 ++ [ txt "prompt" ])
                            |> Screen.clearKeepingCursorLine
                in
                Expect.equal
                    ( Screen.scrollbackText terminal, rows terminal, cursor terminal )
                    ( [], [ "prompt", "", "" ], ( 6, 0 ) )
        ]
