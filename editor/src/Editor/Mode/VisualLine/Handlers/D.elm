module Editor.Mode.VisualLine.Handlers.D exposing (handle)

import Editor.Lib exposing (createRenderableLine)
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

        ( before, tail ) =
            List.Extra.splitAt startY model.travelable.renderableLines

        ( _, after ) =
            List.Extra.splitAt (endY - startY + 1) tail

        updatedRenderableLines =
            let
                joined =
                    List.append before after
            in
            case List.length joined of
                0 ->
                    [ createRenderableLine 0 "" ]

                _ ->
                    joined

        nextY =
            max 0 (min (List.length updatedRenderableLines - 1) startY)

        prevBuffer =
            model.normalBuffer
    in
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.updateRenderableLines updatedRenderableLines
        |> Editor.Lib.updateNormalBuffer { prevBuffer | command = "", clipboard = yankedText }
        |> Editor.Lib.updateMode Editor.Msg.Normal
        |> Editor.Lib.updateVisualLineAnchor Nothing
        |> Editor.Lib.updateSelection Nothing
        |> Editor.Lib.updateCursorPosition { x = 0, y = nextY }
        |> Editor.Lib.updateEditor model
