module Editor.Mode.Insert.Handlers.Escape exposing (handle)

import Editor.Lib
import Editor.Msg
import List.Extra


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
handle model =
    case model.config.vimMode of
        True ->
            let
                { x, y } =
                    model.travelable.cursorPosition

                currentRenderableLineLength =
                    case List.Extra.getAt y model.travelable.renderableLines of
                        Just renderableLine ->
                            max 0 (String.length renderableLine.text - 1)

                        Nothing ->
                            0

                prevNormalBuffer =
                    model.normalBuffer
            in
            model
                |> Editor.Lib.startUpdateEditor
                |> Editor.Lib.updateNormalBuffer { prevNormalBuffer | command = "" }
                |> Editor.Lib.updateMode Editor.Msg.Normal
                |> Editor.Lib.updateSelection Nothing
                |> Editor.Lib.updateCursorPosition { x = min x currentRenderableLineLength, y = y }
                |> Editor.Lib.updateEditor model

        False ->
            ( model, Cmd.none )
