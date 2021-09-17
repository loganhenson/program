module Editor.Mode.Insert.Handlers.UpArrow exposing (handle)

import Editor.Lib
import Editor.Msg
import Editor.VerticalMovement as VerticalMovement


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
handle model =
    let
        { x, y } =
            model.travelable.cursorPosition

        cursorPositions =
            VerticalMovement.getCursorPositionFromLineTransition
                model.travelable.renderableLines
                (Editor.Lib.previousCursorPositionsForCurrentFile model)
                model.travelable.cursorPosition
                { x = x, y = y - 1 }
    in
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.updateCursorPosition cursorPositions
        |> Editor.Lib.updateEditor model
