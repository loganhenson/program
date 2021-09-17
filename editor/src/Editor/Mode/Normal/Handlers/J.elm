module Editor.Mode.Normal.Handlers.J exposing (handle)

import Editor.Lib
import Editor.Mode.Normal.Handlers.DD as DD
import Editor.Msg exposing (Msg)
import Editor.VerticalMovement as VerticalMovement


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle model =
    let
        { number, command } =
            model.normalBuffer
    in
    case command of
        "d" ->
            DD.handle model

        _ ->
            let
                { x, y } =
                    model.travelable.cursorPosition

                cursorPositions =
                    VerticalMovement.getCursorPositionFromLineTransition
                        model.travelable.renderableLines
                        (Editor.Lib.previousCursorPositionsForCurrentFile model)
                        model.travelable.cursorPosition
                        { x = x, y = y + max 1 number }
            in
            model
                |> Editor.Lib.startUpdateEditor
                |> Editor.Lib.resetNormalBuffer
                |> Editor.Lib.updateCursorPosition cursorPositions
                |> Editor.Lib.updateEditor model
