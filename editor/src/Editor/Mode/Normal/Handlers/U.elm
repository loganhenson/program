module Editor.Mode.Normal.Handlers.U exposing (handle)

import Editor.Lib
import Editor.Msg exposing (Msg)


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle model =
    -- Mirrors Cmd+Z. Despite its name, `goForwardInHistory` is the undo
    -- direction here: this codebase prepends new entries to the history list,
    -- so a higher index is an *older* snapshot.
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.resetNormalBuffer
        |> Editor.Lib.updateSelection Nothing
        |> Editor.Lib.goForwardInHistory
        |> Editor.Lib.updateEditor model
