module Editor.Mode.Normal.Handlers.I exposing (handle)

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
        |> Editor.Lib.updateMode Editor.Msg.Insert
        |> Editor.Lib.updateEditor model
