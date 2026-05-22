module UndoRedoTest exposing (..)

import Dict
import Editor
import Editor.Keys exposing (update)
import Editor.Lib exposing (maxUndoHistory, renderableLinesToContents)
import Editor.Msg exposing (Mode(..))
import Editor.RawKeyboard exposing (Msg(..), RawKey)
import Expect exposing (Expectation)
import Test exposing (..)
import TestCase exposing (initModel)


down : { code : String, key : String, ctrl : Bool, shift : Bool, meta : Bool } -> Editor.RawKeyboard.Msg
down { code, key, ctrl, shift, meta } =
    Down
        { key = key
        , code = code
        , shiftKey = shift
        , altKey = False
        , ctrlKey = ctrl
        , metaKey = meta
        }


key_ : String -> String -> Editor.RawKeyboard.Msg
key_ code k =
    down { code = code, key = k, ctrl = False, shift = False, meta = False }


pressU : Editor.RawKeyboard.Msg
pressU =
    key_ "KeyU" "u"


pressCtrlR : Editor.RawKeyboard.Msg
pressCtrlR =
    down { code = "KeyR", key = "r", ctrl = True, shift = False, meta = False }


pressR : Editor.RawKeyboard.Msg
pressR =
    key_ "KeyR" "r"


pressO : Editor.RawKeyboard.Msg
pressO =
    key_ "KeyO" "o"


pressEsc : Editor.RawKeyboard.Msg
pressEsc =
    key_ "Escape" "Escape"


pressLetter : String -> String -> Editor.RawKeyboard.Msg
pressLetter code k =
    key_ code k


cmdZ : Editor.RawKeyboard.Msg
cmdZ =
    down { code = "KeyZ", key = "z", ctrl = False, shift = False, meta = True }


cmdShiftZ : Editor.RawKeyboard.Msg
cmdShiftZ =
    down { code = "KeyZ", key = "z", ctrl = False, shift = True, meta = True }


normalModel : String -> Editor.Msg.Model
normalModel contents =
    let
        m =
            initModel contents Editor.initialConfig
    in
    { m | mode = Normal }


{-| Open a new line below to force a cursor.y change so the editor records a
history snapshot. Returns the model in Normal mode after the edit.
-}
recordEdit : Editor.Msg.Model -> Editor.Msg.Model
recordEdit model =
    let
        ( afterO, _ ) =
            update pressO model

        ( afterEsc, _ ) =
            update pressEsc afterO
    in
    afterEsc


suite : Test
suite =
    describe "Vim u / Ctrl+R undo/redo"
        [ test "u undoes a recorded edit" <|
            \_ ->
                let
                    edited =
                        recordEdit (normalModel "abc")

                    ( afterUndo, _ ) =
                        update pressU edited
                in
                afterUndo.travelable.renderableLines
                    |> renderableLinesToContents
                    |> Expect.equal "abc"
        , test "u behaves the same as Cmd+Z (vim mode shares the existing history)" <|
            \_ ->
                let
                    edited =
                        recordEdit (normalModel "abc")

                    ( fromU, _ ) =
                        update pressU edited

                    ( fromCmdZ, _ ) =
                        update cmdZ edited
                in
                Expect.equal
                    (renderableLinesToContents fromU.travelable.renderableLines)
                    (renderableLinesToContents fromCmdZ.travelable.renderableLines)
        , test "Ctrl+R redoes after u" <|
            \_ ->
                let
                    edited =
                        recordEdit (normalModel "abc")

                    ( afterUndo, _ ) =
                        update pressU edited

                    ( afterRedo, _ ) =
                        update pressCtrlR afterUndo
                in
                Expect.equal
                    (renderableLinesToContents afterRedo.travelable.renderableLines)
                    (renderableLinesToContents edited.travelable.renderableLines)
        , test "Ctrl+R behaves the same as Cmd+Shift+Z" <|
            \_ ->
                let
                    edited =
                        recordEdit (normalModel "abc")

                    ( afterUndo, _ ) =
                        update pressU edited

                    ( fromCtrlR, _ ) =
                        update pressCtrlR afterUndo

                    ( fromCmdShiftZ, _ ) =
                        update cmdShiftZ afterUndo
                in
                Expect.equal
                    (renderableLinesToContents fromCtrlR.travelable.renderableLines)
                    (renderableLinesToContents fromCmdShiftZ.travelable.renderableLines)
        , test "u clears the normal command buffer" <|
            \_ ->
                let
                    edited =
                        recordEdit (normalModel "abc")

                    ( afterUndo, _ ) =
                        update pressU edited
                in
                afterUndo.normalBuffer.command
                    |> Expect.equal ""
        , test "Ctrl+R clears the normal command buffer" <|
            \_ ->
                let
                    edited =
                        recordEdit (normalModel "abc")

                    ( afterUndo, _ ) =
                        update pressU edited

                    ( afterRedo, _ ) =
                        update pressCtrlR afterUndo
                in
                afterRedo.normalBuffer.command
                    |> Expect.equal ""
        , test "plain 'r' followed by a letter still replaces (regression: Ctrl+R doesn't break r-replace)" <|
            \_ ->
                let
                    -- "abc" with cursor (0,0); rZ should replace 'a' with 'Z'
                    ( afterR, _ ) =
                        update pressR (normalModel "abc")

                    ( afterReplace, _ ) =
                        update (pressLetter "KeyZ" "Z") afterR
                in
                afterReplace.travelable.renderableLines
                    |> renderableLinesToContents
                    |> Expect.equal "Zbc"
        , test "u in Insert mode does NOT trigger undo (it's a normal-mode-only binding)" <|
            \_ ->
                let
                    edited =
                        recordEdit (normalModel "abc")

                    insertModel =
                        { edited | mode = Insert }

                    ( afterU, _ ) =
                        update pressU insertModel
                in
                -- Whatever insert handler does, the content must NOT have collapsed back to "abc"
                -- (which is what undo would have produced).
                afterU.travelable.renderableLines
                    |> renderableLinesToContents
                    |> Expect.notEqual "abc"
        , test "undo history is capped at maxUndoHistory entries (oldest dropped)" <|
            \_ ->
                let
                    target =
                        maxUndoHistory + 20

                    edited =
                        List.foldl (\_ m -> recordEdit m) (normalModel "abc") (List.repeat target ())

                    historyLength =
                        Dict.get edited.file edited.histories
                            |> Maybe.map (\( _, h ) -> List.length h)
                            |> Maybe.withDefault 0
                in
                Expect.equal historyLength maxUndoHistory
        ]
