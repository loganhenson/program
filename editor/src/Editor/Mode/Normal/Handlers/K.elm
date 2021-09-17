module Editor.Mode.Normal.Handlers.K exposing (handle)

import Editor.Lib
import Editor.Msg exposing (Msg)
import Editor.VerticalMovement as VerticalMovement


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle model =
    let
        { x, y } =
            model.travelable.cursorPosition

        cursorPositions =
            VerticalMovement.getCursorPositionFromLineTransition
                model.travelable.renderableLines
                (Editor.Lib.previousCursorPositionsForCurrentFile model)
                model.travelable.cursorPosition
                { x = x, y = y - max 1 model.normalBuffer.number }
    in
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.resetNormalBuffer
        |> Editor.Lib.updateCursorPosition cursorPositions
        |> Editor.Lib.updateEditor model
