module Editor.Mode.VisualLine.Handlers.Y exposing (handle)

import Editor.Lib
import Editor.Msg exposing (Msg, RenderableLine)
import List.Extra


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle model =
    let
        { y } =
            model.travelable.cursorPosition

        anchor =
            Maybe.withDefault y model.visualLineAnchor

        startY =
            min anchor y

        endY =
            max anchor y

        yankedText =
            model.travelable.renderableLines
                |> List.drop startY
                |> List.take (endY - startY + 1)
                |> List.map .text
                |> String.join "\n"
                |> (\s -> s ++ "\n")

        prevBuffer =
            model.normalBuffer
    in
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.updateNormalBuffer { prevBuffer | command = "", clipboard = yankedText }
        |> Editor.Lib.updateMode Editor.Msg.Normal
        |> Editor.Lib.updateVisualLineAnchor Nothing
        |> Editor.Lib.updateSelection Nothing
        |> Editor.Lib.updateCursorPosition { x = 0, y = startY }
        |> Editor.Lib.updateEditor model
