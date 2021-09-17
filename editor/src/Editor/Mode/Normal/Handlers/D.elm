module Editor.Mode.Normal.Handlers.D exposing (handle)

import Editor.Clipboard as Clipboard
import Editor.Lib
import Editor.Msg exposing (Msg, RenderableLine)


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle model =
    let
        prevNormalBuffer =
            model.normalBuffer

        ( cut, afterCutTravelable ) =
            Clipboard.cut model
    in
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.updateRenderableLines afterCutTravelable.renderableLines
        |> Editor.Lib.updateSelection Nothing
        |> Editor.Lib.resetNormalBuffer
        |> Editor.Lib.updateNormalBuffer { prevNormalBuffer | clipboard = cut }
        |> Editor.Lib.updateEditor model
