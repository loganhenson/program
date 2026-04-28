module Editor.Mode.Normal.Handlers.CtrlR exposing (handle)

import Editor.Lib
import Editor.Msg exposing (Msg)


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle model =
    -- Mirrors Cmd+Shift+Z. `goBackwardInHistory` decrements the index, which
    -- in this prepend-style history walks toward more recent snapshots = redo.
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.resetNormalBuffer
        |> Editor.Lib.updateSelection Nothing
        |> Editor.Lib.goBackwardInHistory
        |> Editor.Lib.updateEditor model
