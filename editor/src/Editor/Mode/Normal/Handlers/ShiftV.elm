module Editor.Mode.Normal.Handlers.ShiftV exposing (handle)

import Editor.Lib
import Editor.Msg exposing (Msg)
import List.Extra


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle model =
    let
        { y } =
            model.travelable.cursorPosition

        prevNormalBuffer =
            model.normalBuffer

        lineLength =
            List.Extra.getAt y model.travelable.renderableLines
                |> Maybe.map (.text >> String.length)
                |> Maybe.withDefault 0

        endX =
            max 0 (lineLength - 1)
    in
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.updateNormalBuffer { prevNormalBuffer | command = "" }
        |> Editor.Lib.updateMode Editor.Msg.VisualLine
        |> Editor.Lib.updateVisualLineAnchor (Just y)
        |> Editor.Lib.updateSelection (Just ( { x = 0, y = y }, { x = endX, y = y } ))
        |> Editor.Lib.updateEditor model
