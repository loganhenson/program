module Editor.Mode.Insert.Handlers.Tab exposing (handle)

import Editor.Lib
import Editor.Msg exposing (RenderableLine)
import List.Extra
import String.Extra


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
handle model =
    let
        { x, y } =
            model.travelable.cursorPosition

        currentRenderableLineMaybe =
            List.Extra.getAt y model.travelable.renderableLines
    in
    case currentRenderableLineMaybe of
        Just currentRenderableLine ->
            let
                nextRenderableLine =
                    let
                        newText =
                            String.Extra.insertAt "  " x currentRenderableLine.text
                    in
                    { currentRenderableLine
                        | text = newText
                    }

                renderableLines =
                    List.Extra.updateAt y
                        (always nextRenderableLine)
                        model.travelable.renderableLines
            in
            model
                |> Editor.Lib.startUpdateEditor
                |> Editor.Lib.updateRenderableLines renderableLines
                |> Editor.Lib.updateCursorPosition { x = x + 2, y = y }
                |> Editor.Lib.updateEditor model

        Nothing ->
            ( model, Cmd.none )
