module Editor.Mode.Insert.Handlers.Character exposing (handle)

import Editor.Clipboard as Clipboard
import Editor.Lib exposing (createRenderableLine)
import Editor.Msg exposing (Model, RenderableLine, Travelable)
import Editor.RawKeyboard exposing (RawKey)
import Editor.Syntax.Util exposing (getCurrentToken)
import List.Extra
import String.Extra
import Tuple exposing (second)


handle : RawKey -> Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
handle key model =
    case key.metaKey || String.length key.key /= 1 of
        -- Ensure Meta+Digit keys don't result in adding characters.
        -- Ensure only single char keys result in input (e.g. Shift doesn't get printed)
        True ->
            ( model
            , Cmd.none
            )

        False ->
            case key.key of
                "" ->
                    ( model
                    , Cmd.none
                    )

                text ->
                    let
                        afterCutTravelable =
                            Clipboard.cut model |> second

                        afterInsertTextTravelable =
                            insertText text { model | travelable = afterCutTravelable }

                        { x, y } =
                            afterInsertTextTravelable.cursorPosition

                        tok =
                            getCurrentToken x y afterInsertTextTravelable.renderableLines
                    in
                    model
                        |> Editor.Lib.startUpdateEditor
                        |> Editor.Lib.updateRenderableLines afterInsertTextTravelable.renderableLines
                        |> Editor.Lib.updateCursorPosition afterInsertTextTravelable.cursorPosition
                        |> Editor.Lib.updateSelectionState Editor.Msg.None
                        |> Editor.Lib.updateSelection Nothing
                        |> Editor.Lib.addMsg
                            (model.ports.requestCompletion
                                (Editor.Msg.CompletionRequest
                                    y
                                    x
                                    tok
                                )
                            )
                        |> Editor.Lib.updateEditor model


insertText : String -> Model -> Travelable
insertText text model =
    let
        travelable =
            model.travelable

        { x, y } =
            model.travelable.cursorPosition

        nextCursorPosition =
            { x = x + String.length text, y = y }

        currentRenderableLine =
            case List.Extra.getAt y model.travelable.renderableLines of
                Just rL ->
                    rL

                Nothing ->
                    createRenderableLine (List.length model.travelable.renderableLines) ""

        nextRenderableLine =
            let
                newText =
                    String.Extra.insertAt text (nextCursorPosition.x - 1) currentRenderableLine.text
            in
            { currentRenderableLine
                | text = newText
            }

        renderableLines =
            List.Extra.updateAt y
                (always nextRenderableLine)
                model.travelable.renderableLines
    in
    { travelable | cursorPosition = nextCursorPosition, renderableLines = renderableLines }
