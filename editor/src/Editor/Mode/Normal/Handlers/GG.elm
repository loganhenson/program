module Editor.Mode.Normal.Handlers.GG exposing (handle)

import Editor.Lib
import Editor.Msg exposing (Msg)


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle model =
    let
        prevNormalBuffer =
            model.normalBuffer
    in
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.updateNormalBuffer { prevNormalBuffer | command = "" }
        |> Editor.Lib.updateCursorPosition { x = 0, y = 0 }
        |> Editor.Lib.updateEditor model
