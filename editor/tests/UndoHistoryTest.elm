module UndoHistoryTest exposing (suite)

{-| Undo over a long editing session: what the history keeps, and that it
keeps working.
-}

import Dict
import Editor
import Editor.Keys exposing (update)
import Editor.Lib exposing (maxUndoHistory, renderableLinesToContents)
import Editor.Msg exposing (Mode(..))
import Editor.RawKeyboard exposing (Msg(..))
import Expect
import Test exposing (..)
import TestCase exposing (initModel)


key : String -> String -> Editor.RawKeyboard.Msg
key code k =
    Down { key = k, code = code, shiftKey = False, altKey = False, ctrlKey = False, metaKey = False }


ctrlR : Editor.RawKeyboard.Msg
ctrlR =
    Down { key = "r", code = "KeyR", shiftKey = False, altKey = False, ctrlKey = True, metaKey = False }


press : Editor.RawKeyboard.Msg -> Editor.Msg.Model -> Editor.Msg.Model
press msg model =
    Tuple.first (update msg model)


times : Int -> Editor.RawKeyboard.Msg -> Editor.Msg.Model -> Editor.Msg.Model
times n msg model =
    List.foldl (\_ m -> press msg m) model (List.range 1 n)


undo : Editor.Msg.Model -> Editor.Msg.Model
undo =
    press (key "KeyU" "u")


moveDown : Editor.Msg.Model -> Editor.Msg.Model
moveDown =
    press (key "KeyJ" "j")


moveUp : Editor.Msg.Model -> Editor.Msg.Model
moveUp =
    press (key "KeyK" "k")


{-| Open a line below the cursor and type a word on it.

A state is recorded when the cursor leaves a line, so this is two steps of
the history: the line being opened, and the word on it.

-}
addLine : String -> Editor.Msg.Model -> Editor.Msg.Model
addLine word model =
    String.toList word
        |> List.foldl (\c m -> press (key ("Key" ++ String.toUpper (String.fromChar c)) (String.fromChar c)) m) (press (key "KeyO" "o") model)
        |> press (key "Escape" "Escape")


{-| Undo one `addLine`.
-}
undoLine : Editor.Msg.Model -> Editor.Msg.Model
undoLine =
    undo >> undo


redoLine : Editor.Msg.Model -> Editor.Msg.Model
redoLine =
    press ctrlR >> press ctrlR


text : Editor.Msg.Model -> String
text model =
    renderableLinesToContents model.travelable.renderableLines


file : Int -> Editor.Msg.Model
file lines =
    let
        model =
            initModel (List.range 1 lines |> List.map (\n -> "line " ++ String.fromInt n) |> String.join "\n") Editor.initialConfig
    in
    { model | mode = Normal }


states : Editor.Msg.Model -> Int
states model =
    Dict.get model.file model.histories |> Maybe.map (Tuple.second >> List.length) |> Maybe.withDefault 0


suite : Test
suite =
    describe "Undo over a long session"
        [ test "moving through the file does not use up the history" <|
            \_ ->
                let
                    start =
                        file 400

                    moved =
                        start |> times 300 (key "KeyJ" "j") |> times 300 (key "KeyK" "k")
                in
                states moved
                    |> Expect.equal (states start)
        , test "an edit can still be undone after moving through more lines than the history holds" <|
            -- every line the cursor passed used to be recorded, which pushed
            -- the edit itself out
            \_ ->
                let
                    start =
                        file 400

                    edited =
                        addLine "added" start

                    afterMoving =
                        edited |> times (maxUndoHistory + 50) (key "KeyJ" "j")
                in
                afterMoving
                    |> times 5 (key "KeyU" "u")
                    |> text
                    |> Expect.equal (text start)
        , test "undoing does not add to the history" <|
            \_ ->
                let
                    edited =
                        file 20 |> addLine "one" |> addLine "two" |> addLine "three"
                in
                (edited |> undo |> undo |> states)
                    |> Expect.atMost (states edited + 1)
        , test "undo still works after it was pressed far more often than there was anything to undo" <|
            -- holding `u` down used to move past the oldest state, after
            -- which nothing typed could be undone any more
            \_ ->
                let
                    start =
                        file 20

                    worn =
                        start |> addLine "first" |> times 600 (key "KeyU" "u")

                    edited =
                        worn |> addLine "second"
                in
                Expect.all
                    [ \_ -> text worn |> Expect.equal (text start)
                    , \_ -> text edited |> String.contains "second" |> Expect.equal True
                    , \_ -> edited |> undoLine |> text |> Expect.equal (text start)
                    ]
                    ()
        , test "several edits are undone step by step, and redone" <|
            \_ ->
                let
                    start =
                        file 5

                    three =
                        start |> addLine "one" |> addLine "two" |> addLine "three"

                    lines model =
                        List.length (String.lines (text model))
                in
                Expect.all
                    [ -- newest first: "three" goes before "one" does
                      \_ -> three |> undo |> text |> String.contains "three" |> Expect.equal False
                    , \_ -> three |> undo |> text |> String.contains "one" |> Expect.equal True

                    -- never forwards
                    , \_ -> List.map (\n -> three |> times n (key "KeyU" "u") |> lines) (List.range 0 6) |> (\counts -> counts == List.reverse (List.sort counts)) |> Expect.equal True
                    , \_ -> three |> times 6 (key "KeyU" "u") |> text |> Expect.equal (text start)
                    , \_ -> three |> times 6 (key "KeyU" "u") |> times 6 ctrlR |> text |> Expect.equal (text three)
                    ]
                    ()
        , test "an edit made after undoing replaces what was undone" <|
            -- redo used to bring back the undone edit on top of the new one
            \_ ->
                let
                    start =
                        file 5

                    replaced =
                        start |> addLine "abandoned" |> undoLine |> addLine "kept"
                in
                Expect.all
                    [ \_ -> replaced |> text |> String.contains "kept" |> Expect.equal True
                    , \_ -> replaced |> times 4 ctrlR |> text |> Expect.equal (text replaced)
                    , \_ -> replaced |> times 4 ctrlR |> text |> String.contains "abandoned" |> Expect.equal False
                    , \_ -> replaced |> undoLine |> text |> Expect.equal (text start)
                    ]
                    ()
        , test "the history never holds more than its cap" <|
            \_ ->
                List.foldl (\n m -> addLine "x" m) (file 3) (List.range 1 (maxUndoHistory + 60))
                    |> states
                    |> Expect.atMost maxUndoHistory
        ]
