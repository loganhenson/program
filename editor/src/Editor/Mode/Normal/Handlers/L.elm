module Editor.Mode.Normal.Handlers.L exposing (handle)

import Editor.Lib
import Editor.Msg exposing (Msg)
import List.Extra


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle model =
    let
        { x, y } =
            model.travelable.cursorPosition

        currentRenderableLineLength =
            case List.Extra.getAt y model.travelable.renderableLines of
                Just renderableLine ->
                    max 0 (String.length renderableLine.text - 1)

                Nothing ->
                    0
    in
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.resetNormalBuffer
        |> Editor.Lib.updateCursorPosition
            { x = min currentRenderableLineLength (x + max 1 model.normalBuffer.number), y = y }
        |> Editor.Lib.updateEditor model
