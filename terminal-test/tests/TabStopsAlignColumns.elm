module TabStopsAlignColumns exposing (..)

import Editor.Lib
import Expect exposing (Expectation)
import Json.Encode
import Terminal exposing (getBuffer, update)
import Terminal.Types exposing (Msg(..))
import Test exposing (..)
import TestCase exposing (initModel)


{-| `ls` lays out its columns by emitting a TAB to jump to the next tab
stop (every 8 columns) and then padding with spaces. If the terminal
ignores TAB the columns collapse and misalign. This reproduces that with
a hand-checkable stream:

    row 0:  "a" TAB "bb" TAB "ccc"
    row 1:  "dddddddd" TAB "e"

Tab stops are at columns 0, 8, 16, 24, ...

  - row 0: "a" ends at col 1, TAB -> col 8, "bb" ends at col 10,
    TAB -> col 16, "ccc".
  - row 1: "dddddddd" ends exactly on a tab stop (col 8), so TAB must
    advance to the *next* stop (col 16), then "e".

-}
tab : Json.Encode.Value
tab =
    Json.Encode.object [ ( "command", Json.Encode.string "\u{0009}" ) ]


cr : Json.Encode.Value
cr =
    Json.Encode.object [ ( "command", Json.Encode.string "\u{000D}" ) ]


lf : Json.Encode.Value
lf =
    Json.Encode.object [ ( "command", Json.Encode.string "\n" ) ]


row : Int -> String -> String
row stop content =
    String.padRight stop ' ' content


suite : Test
suite =
    describe "Tab stops align columns (ls layout)"
        [ test "TAB advances the cursor to the next 8-column tab stop" <|
            \_ ->
                let
                    ( afterInput, _ ) =
                        update
                            (ReceivedTerminalOutput
                                (Json.Encode.list identity
                                    [ Json.Encode.string "a"
                                    , tab
                                    , Json.Encode.string "bb"
                                    , tab
                                    , Json.Encode.string "ccc"
                                    , cr
                                    , lf
                                    , Json.Encode.string "dddddddd"
                                    , tab
                                    , Json.Encode.string "e"
                                    ]
                                )
                            )
                            initModel

                    blank =
                        String.repeat 80 " "
                in
                afterInput.terminal
                    |> getBuffer
                    |> Tuple.first
                    |> .travelable
                    |> .renderableLines
                    |> Editor.Lib.renderableLinesToContents
                    |> Expect.equal
                        (String.join "\n"
                            [ row 80 "a       bb      ccc"
                            , row 80 "dddddddd        e"
                            , blank
                            , blank
                            ]
                        )
        ]
