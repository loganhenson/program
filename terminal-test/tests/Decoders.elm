module Decoders exposing (suite)

{-| What the backend sends, and the commands the terminal makes of it.
-}

import Expect
import Json.Decode exposing (decodeString)
import Terminal.Decoders exposing (decodeTerminalCommands)
import Terminal.Types exposing (TerminalCommand(..))
import Test exposing (..)


decoded : String -> Result String (List TerminalCommand)
decoded json =
    decodeString decodeTerminalCommands json
        |> Result.mapError Json.Decode.errorToString


cr : TerminalCommand
cr =
    TerminalCommandSequence "\u{000D}"


lf : TerminalCommand
lf =
    TerminalCommandSequence "\n"


suite : Test
suite =
    describe "Commands from the backend"
        [ describe "text carries the control characters around it"
            [ test "plain text is one command" <|
                \_ -> decoded "[\"hello world\"]" |> Expect.equal (Ok [ TerminalCommandText "hello world" ])
            , test "a line and its end" <|
                \_ -> decoded "[\"hello\\r\\n\"]" |> Expect.equal (Ok [ TerminalCommandText "hello", cr, lf ])
            , test "several lines in one string" <|
                \_ ->
                    decoded "[\"a\\r\\nb\\r\\n\\r\\nc\"]"
                        |> Expect.equal (Ok [ TerminalCommandText "a", cr, lf, TerminalCommandText "b", cr, lf, cr, lf, TerminalCommandText "c" ])
            , test "only an end of line" <|
                \_ -> decoded "[\"\\r\\n\"]" |> Expect.equal (Ok [ cr, lf ])
            , test "a carriage return on its own, as a progress bar redraws its line" <|
                \_ -> decoded "[\"10%\\r20%\\r\"]" |> Expect.equal (Ok [ TerminalCommandText "10%", cr, TerminalCommandText "20%", cr ])
            , test "tab, backspace and bell" <|
                \_ ->
                    decoded "[\"a\\tb\\bc\\u0007\"]"
                        |> Expect.equal
                            (Ok
                                [ TerminalCommandText "a"
                                , TerminalCommandSequence "\t"
                                , TerminalCommandText "b"
                                , TerminalCommandSequence "\u{0008}"
                                , TerminalCommandText "c"
                                , TerminalCommandSequence "\u{0007}"
                                ]
                            )
            , test "text in other scripts and symbols is not touched" <|
                \_ -> decoded "[\"é ✓ 你好 👍\\r\\n\"]" |> Expect.equal (Ok [ TerminalCommandText "é ✓ 你好 👍", cr, lf ])
            , test "an empty string is nothing" <|
                \_ -> decoded "[\"\"]" |> Expect.equal (Ok [ TerminalCommandText "" ])
            ]
        , describe "every other command is decoded by the arguments it has"
            [ test "none" <|
                \_ -> decoded "[{\"command\":\"[2J\"}]" |> Expect.equal (Ok [ TerminalCommandSequence "[2J" ])
            , test "one number" <|
                \_ -> decoded "[{\"command\":\"[m\",\"argument\":0}]" |> Expect.equal (Ok [ TerminalCommandSequenceAndSingleArgument "[m" 0 ])
            , test "two numbers" <|
                \_ -> decoded "[{\"command\":\"[m\",\"argument1\":1,\"argument2\":31}]" |> Expect.equal (Ok [ TerminalCommandSequenceAndDoubleArgument "[m" 1 31 ])
            , test "three numbers" <|
                \_ ->
                    decoded "[{\"command\":\"[m-fg-256\",\"argument1\":38,\"argument2\":5,\"argument3\":196}]"
                        |> Expect.equal (Ok [ TerminalCommandSequenceAndTripleArgument "[m-fg-256" 38 5 196 ])
            , test "a string" <|
                \_ ->
                    decoded "[{\"command\":\"set-window-title\",\"argument\":\"vim\"}]"
                        |> Expect.equal (Ok [ TerminalCommandSequenceAndSingleStringArgument "set-window-title" "vim" ])
            , test "a batch keeps its order" <|
                \_ ->
                    decoded "[\"plain \",{\"command\":\"[m\",\"argument1\":1,\"argument2\":31},\"red\",{\"command\":\"[m\",\"argument\":0},\"\\r\\n\",{\"command\":\"[2J\"},\"after\"]"
                        |> Expect.equal
                            (Ok
                                [ TerminalCommandText "plain "
                                , TerminalCommandSequenceAndDoubleArgument "[m" 1 31
                                , TerminalCommandText "red"
                                , TerminalCommandSequenceAndSingleArgument "[m" 0
                                , cr
                                , lf
                                , TerminalCommandSequence "[2J"
                                , TerminalCommandText "after"
                                ]
                            )
            , test "something that is neither is an error, not a guess" <|
                \_ -> decoded "[42]" |> Result.toMaybe |> Expect.equal Nothing
            ]
        ]
