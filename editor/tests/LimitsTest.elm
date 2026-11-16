module LimitsTest exposing (suite)

{-| The editor does not let a file grow past what it opens: it could be saved
like that, and then not be opened again.
-}

import Editor
import Editor.Limits exposing (maxLineLength, maxLines, refusal, violation)
import Editor.Msg exposing (Msg(..))
import Editor.RawKeyboard exposing (Msg(..))
import Expect
import Test exposing (..)
import TestCase exposing (initModel)


open : String -> Editor.Msg.Model
open contents =
    initModel contents Editor.initialConfig


send : Editor.Msg.Msg -> Editor.Msg.Model -> Editor.Msg.Model
send msg model =
    Tuple.first (Editor.update msg model)


press : String -> String -> Editor.Msg.Model -> Editor.Msg.Model
press code key =
    send (RawKeyboardMsg (Down { key = key, code = code, shiftKey = False, altKey = False, ctrlKey = False, metaKey = False }))


type_ : String -> Editor.Msg.Model -> Editor.Msg.Model
type_ text model =
    List.foldl (\character -> press "KeyX" (String.fromChar character)) model (String.toList text)


lineCount : Editor.Msg.Model -> Int
lineCount model =
    List.length model.travelable.renderableLines


firstLine : Editor.Msg.Model -> String
firstLine model =
    List.head model.travelable.renderableLines |> Maybe.map .text |> Maybe.withDefault ""


lines : Int -> String
lines count =
    String.join "\n" (List.repeat count "line")


suite : Test
suite =
    describe "what the editor holds"
        [ test "a paste that fits is made" <|
            \_ ->
                open (lines 9000)
                    |> send (PasteResponse (lines 1001))
                    |> lineCount
                    |> Expect.equal 10000
        , test "a paste that would make the file longer than it opens is not made" <|
            \_ ->
                open (lines 9000)
                    |> send (PasteResponse (lines 1002))
                    |> lineCount
                    |> Expect.equal 9000
        , test "a paste of a hundred thousand lines is not made" <|
            \_ ->
                open "one\ntwo"
                    |> send (PasteResponse (lines 100000))
                    |> lineCount
                    |> Expect.equal 2
        , test "a paste that would make a line longer than it opens is not made" <|
            \_ ->
                open "short"
                    |> send (PasteResponse (String.repeat 600 "x"))
                    |> firstLine
                    |> Expect.equal "short"
        , test "a line can be typed up to its full length, and no further" <|
            \_ ->
                let
                    full =
                        open (String.repeat (maxLineLength - 2) "x")
                            |> press "KeyI" "i"
                            |> type_ "ab"
                in
                ( String.length (firstLine full), String.length (firstLine (type_ "c" full)) )
                    |> Expect.equal ( maxLineLength, maxLineLength )
        , test "a line can be added up to the last one, and no further" <|
            \_ ->
                let
                    full =
                        open (lines (maxLines - 1))
                            |> press "KeyO" "o"
                in
                ( lineCount full, lineCount (press "Enter" "Enter" full) )
                    |> Expect.equal ( maxLines, maxLines )
        , test "the empty line after a final newline is not a line of the file" <|
            \_ ->
                let
                    withNewline =
                        open (lines maxLines ++ "\n")
                in
                ( violation withNewline.travelable.renderableLines
                , lineCount (press "KeyO" "o" withNewline)
                )
                    |> Expect.equal ( Nothing, maxLines + 1 )
        , test "what is typed after a refusal still goes in where it fits" <|
            \_ ->
                open (String.repeat maxLineLength "x" ++ "\nb")
                    |> press "KeyI" "i"
                    |> type_ "no"
                    |> press "Escape" "Escape"
                    |> press "KeyJ" "j"
                    |> press "KeyI" "i"
                    |> type_ "yes"
                    |> (\model -> List.map .text model.travelable.renderableLines)
                    |> Expect.equal [ String.repeat maxLineLength "x", "yesb" ]
        , test "lines that already are more than the editor opens can still be edited" <|
            \_ ->
                -- the terminal's output, shown in an editor, can be this
                open (String.repeat 800 "x")
                    |> press "KeyI" "i"
                    |> type_ "y"
                    |> firstLine
                    |> String.length
                    |> Expect.equal 801
        , test "the reason says which limit it was" <|
            \_ ->
                ( refusal [ { text = "a" } ] (List.repeat (maxLines + 1) { text = "a" }) |> Maybe.map (String.contains "10000 lines")
                , refusal [ { text = "a" } ] [ { text = String.repeat (maxLineLength + 1) "a" } ] |> Maybe.map (String.contains "500 characters")
                , refusal [ { text = "a" } ] [ { text = "ab" } ]
                )
                    |> Expect.equal ( Just True, Just True, Nothing )
        ]
