module Editor.VerticalMovement exposing (getCursorPositionFromLineTransition)

import Editor.Lib
import Editor.Msg
import List.Extra


getCursorPositionFromLineTransition : List Editor.Msg.RenderableLine -> List Editor.Msg.EditorCoordinate -> Editor.Msg.EditorCoordinate -> Editor.Msg.EditorCoordinate -> Editor.Msg.EditorCoordinate
getCursorPositionFromLineTransition renderableLines previousCursorPositions cursorPosition targetPosition =
    let
        { x, y } =
            cursorPosition

        targetLineIndex =
            max 0 targetPosition.y

        targetColumnIndex =
            targetPosition.x

        lastNonZeroColumnCursorPosition =
            Maybe.withDefault { x = 0, y = 0 } (List.Extra.find (\prev -> prev.x > 0) previousCursorPositions)

        targetRenderableLineIndex =
            case List.Extra.getAt targetLineIndex renderableLines of
                Just _ ->
                    targetLineIndex

                Nothing ->
                    List.length renderableLines - 1

        targetRenderableLineMaybe =
            List.Extra.getAt targetRenderableLineIndex renderableLines
    in
    case targetRenderableLineMaybe of
        Just targetRenderableLine ->
            -- target line is shorter in length, so we should drop the cursor back
            if String.length targetRenderableLine.text < targetColumnIndex then
                { x = max 0 (String.length targetRenderableLine.text - 1)
                , y = targetRenderableLineIndex
                }
                -- target line is equal or greater than the current in length, so we can just drop down
                -- BUT we need to keep track of the historical column position in to keep it at that location

            else
                { x = min (max 0 (String.length targetRenderableLine.text - 1)) (max 0 <| lastNonZeroColumnCursorPosition.x)
                , y = targetRenderableLineIndex
                }

        Nothing ->
            { x = 0, y = 0 }
