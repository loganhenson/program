module Terminal.Decoders exposing (..)

import Json.Decode exposing (Decoder, field, int, list, map, map2, map3, map4, oneOf, string, succeed)
import Terminal.Types exposing (TerminalCommand(..), TerminalOutput, TerminalSize)


decodeTerminalResized : Decoder TerminalSize
decodeTerminalResized =
    map2 TerminalSize
        (field "height" int)
        (field "width" int)


decodeTerminalCommands : Decoder TerminalOutput
decodeTerminalCommands =
    list decodeTerminalCommand


decodeTerminalCommand : Decoder TerminalCommand
decodeTerminalCommand =
    oneOf
        -- Order matters here, higher arg count first.
        [ map4 TerminalCommandSequenceAndTripleArgument
            (field "command" string)
            (field "argument1" int)
            (field "argument2" int)
            (field "argument3" int)
        , map3 TerminalCommandSequenceAndDoubleArgument
            (field "command" string)
            (field "argument1" int)
            (field "argument2" int)
        , map2 TerminalCommandSequenceAndSingleArgument
            (field "command" string)
            (field "argument" int)
        , map2 TerminalCommandSequenceAndSingleStringArgument
            (field "command" string)
            (field "argument" string)
        , map TerminalCommandSequence
            (field "command" string)
        , map TerminalCommandText string
        ]
