module Editor.Mode.Normal.Handlers.YY exposing (handle)

import Editor.Lib
import Editor.Msg exposing (Msg, RenderableLine)
import List.Extra


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle model =
    let
        { x, y } =
            model.travelable.cursorPosition

        line =
            (List.Extra.getAt y model.travelable.renderableLines
                |> Maybe.map .text
                |> Maybe.withDefault ""
            )
                ++ "\n"

        prevBuffer =
            model.normalBuffer
    in
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.updateNormalBuffer { prevBuffer | clipboard = line }
        |> Editor.Lib.updateEditor model
