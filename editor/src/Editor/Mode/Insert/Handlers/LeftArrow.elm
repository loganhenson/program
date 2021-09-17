module Editor.Mode.Insert.Handlers.LeftArrow exposing (handle)

import Editor.Lib
import Editor.Msg


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
handle model =
    let
        { x, y } =
            model.travelable.cursorPosition
    in
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.updateCursorPosition { x = max 0 (x - 1), y = y }
        |> Editor.Lib.updateEditor model
