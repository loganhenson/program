module Editor.Keys exposing (update)

import Editor.Clipboard
import Editor.Lib
import Editor.Mode.Insert.Insert as InsertMode
import Editor.Mode.Normal.Normal as NormalMode
import Editor.Msg exposing (CompletionRequest, Model, Msg, SelectionState(..))
import Editor.RawKeyboard exposing (Msg(..), RawKey)
import Editor.Syntax.Util exposing (getCurrentToken)
import List.Extra


update : Editor.RawKeyboard.Msg -> Model -> ( Model, Cmd Editor.Msg.Msg )
update rawKey model =
    case rawKey of
        Up _ ->
            ( model, Cmd.none )

        Down key ->
            if key.ctrlKey && key.code == "Space" then
                let
                    { x, y } =
                        model.travelable.cursorPosition

                    contents =
                        Editor.Lib.renderableLinesToContents model.travelable.renderableLines

                    tok =
                        getCurrentToken x y model.travelable.renderableLines
                in
                ( model
                , model.ports.requestCompletion <|
                    { line = y
                    , character = x
                    , token = tok
                    }
                )

            else if key.metaKey && key.code == "KeyS" then
                let
                    contents =
                        Editor.Lib.renderableLinesToContents model.travelable.renderableLines
                in
                ( model
                , model.ports.requestSave contents
                )

            else if key.metaKey && key.code == "KeyA" then
                model
                    |> Editor.Lib.startUpdateEditor
                    |> Editor.Lib.updateSelection
                        (Just
                            ( { x = 0, y = 0 }
                            , { x =
                                    case List.Extra.last model.travelable.renderableLines of
                                        Just renderableLine ->
                                            max 0 (String.length renderableLine.text - 1)

                                        Nothing ->
                                            0
                              , y = List.length model.travelable.renderableLines - 1
                              }
                            )
                        )

            else if key.metaKey && key.code == "KeyC" then
                ( model
                , model.ports.requestCopy <| Editor.Clipboard.copy model
                )

            else if key.metaKey && key.code == "KeyX" then
                let
                    ( selection, nextTravelable ) =
                        Editor.Clipboard.cut model

                    ( nextModel, cmd ) =
                        model
                            |> Editor.Lib.startUpdateEditor
                            |> Editor.Lib.updateSelection Nothing
                            |> Editor.Lib.updateRenderableLines nextTravelable.renderableLines
                            |> Editor.Lib.updateCursorPosition nextTravelable.cursorPosition
                            |> Editor.Lib.updateEditor model
                in
                ( nextModel
                , Cmd.batch [ model.ports.requestCopy selection, cmd ]
                )

            else if key.metaKey && key.code == "KeyV" then
                ( model
                , model.ports.requestPaste ()
                )

            else if key.metaKey && key.code == "Enter" then
                ( model
                , model.ports.requestRun <| Editor.Lib.renderableLinesToContents model.travelable.renderableLines
                )

            else if key.metaKey && key.shiftKey && key.code == "KeyZ" then
                model
                    |> Editor.Lib.startUpdateEditor
                    |> Editor.Lib.updateSelection Nothing
                    |> Editor.Lib.goBackwardInHistory
                    |> Editor.Lib.updateEditor model

            else if key.metaKey && key.code == "KeyZ" then
                model
                    |> Editor.Lib.startUpdateEditor
                    |> Editor.Lib.updateSelection Nothing
                    |> Editor.Lib.goForwardInHistory
                    |> Editor.Lib.updateEditor model

            else if key.code == "ArrowDown" && List.length model.completions > 0 then
                model
                    |> Editor.Lib.startUpdateEditor
                    |> Editor.Lib.updateSelectedCompletionIndex (min (List.length model.completions - 1) (model.selectedCompletionIndex + 1))
                    |> Editor.Lib.updateEditor model

            else if key.code == "ArrowUp" && List.length model.completions > 0 then
                model
                    |> Editor.Lib.startUpdateEditor
                    |> Editor.Lib.updateSelectedCompletionIndex (max 0 (model.selectedCompletionIndex - 1))
                    |> Editor.Lib.updateEditor model

            else if key.code == "Enter" && List.length model.completions > 0 then
                -- insert completion
                let
                    maybeCompletion =
                        List.Extra.getAt model.selectedCompletionIndex model.completions

                    maybeTextEdit =
                        Maybe.map .textEdit maybeCompletion
                in
                case maybeTextEdit of
                    Just (Just textEdit) ->
                        let
                            ( nextModel, _ ) =
                                model
                                    |> Editor.Lib.startUpdateEditor
                                    |> Editor.Lib.updateSelection Nothing
                                    |> (\( m, msg ) -> ( Editor.Clipboard.paste m textEdit.newText, msg ))
                        in
                        model
                            |> Editor.Lib.startUpdateEditor
                            |> Editor.Lib.updateRenderableLines nextModel.travelable.renderableLines
                            |> (\( m, msg ) -> ( { m | completions = [], selectedCompletionIndex = 0 }, msg ))
                            |> Editor.Lib.updateCursorPosition
                                { x = textEdit.range.start.character + String.length textEdit.newText, y = textEdit.range.end.line }
                            |> Editor.Lib.updateEditor model

                    _ ->
                        ( { model | completions = [], selectedCompletionIndex = 0 }, Cmd.none )

            else
                case model.mode of
                    Editor.Msg.Insert ->
                        InsertMode.update key model

                    Editor.Msg.Normal ->
                        NormalMode.update key model
