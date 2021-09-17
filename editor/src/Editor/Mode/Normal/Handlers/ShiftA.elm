module Editor.Mode.Normal.Handlers.ShiftA exposing (handle)

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
                    max 0 (String.length renderableLine.text)

                Nothing ->
                    0
    in
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.updateCursorPosition { x = currentRenderableLineLength, y = y }
        |> Editor.Lib.updateMode Editor.Msg.Insert
        |> Editor.Lib.updateEditor model
