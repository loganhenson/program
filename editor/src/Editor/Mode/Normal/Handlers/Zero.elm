module Editor.Mode.Normal.Handlers.Zero exposing (handle)

import Editor.Lib
import Editor.Msg exposing (Msg)


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle model =
    let
        { y } =
            model.travelable.cursorPosition

        cursorPosition =
            { x = 0, y = y }
    in
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.updateCursorPosition cursorPosition
        |> Editor.Lib.updateEditor model
