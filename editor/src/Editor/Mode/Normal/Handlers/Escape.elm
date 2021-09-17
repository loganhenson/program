module Editor.Mode.Normal.Handlers.Escape exposing (handle)

import Editor.Lib
import Editor.Msg


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
handle model =
    let
        prevNormalBuffer =
            model.normalBuffer
    in
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.updateNormalBuffer { prevNormalBuffer | command = "" }
        |> Editor.Lib.updateSelection Nothing
        |> Editor.Lib.updateEditor model
