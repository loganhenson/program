module Editor.Mode.Insert.Handlers.RightArrow exposing (handle)

import Editor.Lib
import Editor.Msg
import List.Extra


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
handle model =
    let
        { x, y } =
            model.travelable.cursorPosition

        currentRenderableLineLength =
            case List.Extra.getAt y model.travelable.renderableLines of
                Just renderableLine ->
                    max 0 (String.length renderableLine.text)

                Nothing ->
                    0
    in
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.updateCursorPosition { x = min currentRenderableLineLength (x + 1), y = y }
        |> Editor.Lib.updateEditor model
