module Editor.Mode.Normal.Handlers.P exposing (handle)

import Editor.Clipboard
import Editor.Lib
import Editor.Mode.Normal.Handlers.O as O
import Editor.Msg exposing (Msg, RenderableLine)


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle model =
    case String.endsWith "\n" model.normalBuffer.clipboard of
        True ->
            -- if clipboard has newline, paste to next line
            model
                |> Editor.Lib.startUpdateEditor
                |> Editor.Lib.runHandler O.handle
                |> (\( m, msgs ) -> ( Editor.Clipboard.paste m (String.trimRight model.normalBuffer.clipboard), msgs ))
                |> Editor.Lib.updateMode Editor.Msg.Normal
                |> Editor.Lib.updateEditor model

        False ->
            -- otherwise it is just paste
            ( Editor.Clipboard.paste model model.normalBuffer.clipboard, Cmd.none )
