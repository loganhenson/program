module Editor.Mode.Normal.Handlers.DD exposing (handle)

import Editor.Lib exposing (createRenderableLine)
import Editor.Msg exposing (Msg, RenderableLine)
import List.Extra


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle model =
    let
        { x, y } =
            model.travelable.cursorPosition

        ( before, tail ) =
            List.Extra.splitAt y model.travelable.renderableLines

        ( _, after ) =
            List.Extra.splitAt (max 1 model.normalBuffer.number) tail

        updatedRenderableLines =
            let
                updated =
                    List.append before after
            in
            case List.length updated of
                0 ->
                    [ createRenderableLine (List.length model.travelable.renderableLines) "" ]

                _ ->
                    updated

        nextLineIndex =
            max 0 (min (List.length updatedRenderableLines - 1) y)
    in
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.updateRenderableLines updatedRenderableLines
        |> Editor.Lib.resetNormalBuffer
        |> Editor.Lib.updateCursorPosition { x = 0, y = nextLineIndex }
        |> Editor.Lib.updateEditor model
