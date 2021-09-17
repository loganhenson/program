module Editor.Mode.Insert.Handlers.Enter exposing (handle)

import Editor.Lib exposing (createRenderableLine)
import Editor.Msg exposing (RenderableLine)
import List.Extra


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
handle model =
    let
        { x, y } =
            model.travelable.cursorPosition

        ( headOfLines, tailOfLines ) =
            List.Extra.splitAt y model.travelable.renderableLines
    in
    case List.head tailOfLines of
        Just currentRenderableLine ->
            let
                -- Enter causes a snapshot history to be recorded
                ( nextModel, _ ) =
                    model
                        |> Editor.Lib.startUpdateEditor
                        |> Editor.Lib.updateEditor model

                headOfLine =
                    String.slice 0 x currentRenderableLine.text

                tailOfLineText =
                    String.slice x (String.length currentRenderableLine.text) currentRenderableLine.text

                updatedCurrentLine =
                    { currentRenderableLine | text = headOfLine }

                nextLine =
                    createRenderableLine (List.length model.travelable.renderableLines) tailOfLineText

                updatedRenderableLines =
                    List.concat [ headOfLines, [ updatedCurrentLine ], [ nextLine ], Maybe.withDefault [] <| List.tail tailOfLines ]
            in
            nextModel
                |> Editor.Lib.startUpdateEditor
                |> Editor.Lib.updateRenderableLines updatedRenderableLines
                |> Editor.Lib.updateCursorPosition { x = 0, y = y + 1 }
                |> Editor.Lib.updateEditor model

        Nothing ->
            ( model, Cmd.none )
