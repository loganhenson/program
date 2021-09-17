module Editor.Mode.Normal.Handlers.ShiftG exposing (handle)

import Editor.Lib
import Editor.Msg exposing (Msg)


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle model =
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.updateCursorPosition
            { x = 0, y = max 0 (List.length model.travelable.renderableLines - 1) }
        |> Editor.Lib.updateEditor model
