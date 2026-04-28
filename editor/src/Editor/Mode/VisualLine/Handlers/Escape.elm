module Editor.Mode.VisualLine.Handlers.Escape exposing (handle)

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
        |> Editor.Lib.updateMode Editor.Msg.Normal
        |> Editor.Lib.updateVisualLineAnchor Nothing
        |> Editor.Lib.updateSelection Nothing
        |> Editor.Lib.updateEditor model
