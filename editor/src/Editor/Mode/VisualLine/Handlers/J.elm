module Editor.Mode.VisualLine.Handlers.J exposing (handle)

import Editor.Lib
import Editor.Mode.VisualLine.Selection as Selection
import Editor.Msg exposing (Msg)


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle model =
    let
        { x, y } =
            model.travelable.cursorPosition

        lastLine =
            max 0 (List.length model.travelable.renderableLines - 1)

        newY =
            min lastLine (y + max 1 model.normalBuffer.number)

        anchor =
            Maybe.withDefault y model.visualLineAnchor

        ( newSelection, newCursor ) =
            Selection.recompute model.travelable.renderableLines anchor newY
    in
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.resetNormalBuffer
        |> Editor.Lib.updateSelection (Just newSelection)
        |> Editor.Lib.updateCursorPosition newCursor
        |> Editor.Lib.updateEditor model
