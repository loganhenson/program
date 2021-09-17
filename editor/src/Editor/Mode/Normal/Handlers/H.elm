module Editor.Mode.Normal.Handlers.H exposing (handle)

import Editor.Lib
import Editor.Msg exposing (Msg)


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle model =
    let
        { x, y } =
            model.travelable.cursorPosition
    in
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.resetNormalBuffer
        |> Editor.Lib.updateCursorPosition { x = max 0 (x - max 1 model.normalBuffer.number), y = y }
        |> Editor.Lib.updateEditor model
