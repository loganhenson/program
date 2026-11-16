module Terminal.Decoders exposing (..)

import Json.Decode exposing (Decoder, andThen, field, int, list, map, map2, oneOf, string, succeed)
import Terminal.Types exposing (TerminalCommand(..), TerminalOutput, TerminalSize)


decodeTerminalResized : Decoder TerminalSize
decodeTerminalResized =
    map2 TerminalSize
        (field "height" int)
        (field "width" int)


{-| A batch of commands as the backend sends it.

Text arrives with the control characters around it still inside: `"a\r\nb"`
is the text `a`, a carriage return, a line feed and the text `b`. They are
packed like that because a line of output is otherwise three JSON values, and
taken apart here, so that the terminal itself only ever sees text without
control characters, as before.

-}
decodeTerminalCommands : Decoder TerminalOutput
decodeTerminalCommands =
    list
        (oneOf
            -- Text first: it is most of what arrives, and every decoder
            -- tried before the right one costs a failure.
            [ map unpackText string
            , map List.singleton decodeTerminalCommand
            ]
        )
        |> map List.concat


{-| The control characters that travel inside text. The same list as
`INLINE_CONTROLS` in the backend's parser.
-}
inlineControls : List String
inlineControls =
    [ "\n", "\u{000D}", "\t", "\u{0008}", "\u{0007}" ]


isInlineControl : Char -> Bool
isInlineControl char =
    char == '\n' || char == '\u{000D}' || char == '\t' || char == '\u{0008}' || char == '\u{0007}'


unpackText : String -> List TerminalCommand
unpackText text =
    if String.any isInlineControl text then
        splitAtControls inlineControls text

    else
        [ TerminalCommandText text ]


splitAtControls : List String -> String -> List TerminalCommand
splitAtControls controls text =
    case controls of
        [] ->
            if text == "" then
                []

            else
                [ TerminalCommandText text ]

        control :: rest ->
            String.split control text
                |> List.map (splitAtControls rest)
                |> List.intersperse [ TerminalCommandSequence control ]
                |> List.concat


decodeTerminalCommand : Decoder TerminalCommand
decodeTerminalCommand =
    -- Which arguments a command has says which kind it is. Read from the
    -- command inwards, so that the common ones are found without first
    -- failing as each of the rarer ones.
    field "command" string
        |> andThen
            (\command ->
                oneOf
                    [ map (TerminalCommandSequenceAndSingleArgument command) (field "argument" int)
                    , field "argument1" int
                        |> andThen
                            (\argument1 ->
                                field "argument2" int
                                    |> andThen
                                        (\argument2 ->
                                            oneOf
                                                [ map (TerminalCommandSequenceAndTripleArgument command argument1 argument2) (field "argument3" int)
                                                , succeed (TerminalCommandSequenceAndDoubleArgument command argument1 argument2)
                                                ]
                                        )
                            )
                    , map (TerminalCommandSequenceAndSingleStringArgument command) (field "argument" string)
                    , succeed (TerminalCommandSequence command)
                    ]
            )
