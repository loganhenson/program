module Editor.Mode.Normal.Handlers.X exposing (handle)

import Editor.Lib
import Editor.Msg exposing (Msg)
import List.Extra
import String.Extra


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle model =
    let
        { x, y } =
            model.travelable.cursorPosition
    in
    case List.Extra.getAt y model.travelable.renderableLines of
        Just renderableLine ->
            let
                updatedRenderableLine =
                    { renderableLine | text = String.Extra.replaceSlice "" x (x + 1) renderableLine.text }

                updatedRenderableLines =
                    List.Extra.updateAt y (always updatedRenderableLine) model.travelable.renderableLines

                cursorPosition =
                    case x == String.length updatedRenderableLine.text of
                        True ->
                            { x = x, y = y }

                        False ->
                            { x = x, y = y }

                prevNormalBuffer =
                    model.normalBuffer
            in
            model
                |> Editor.Lib.startUpdateEditor
                |> Editor.Lib.updateRenderableLines updatedRenderableLines
                |> Editor.Lib.updateNormalBuffer { prevNormalBuffer | command = "" }
                |> Editor.Lib.updateCursorPosition cursorPosition
                |> Editor.Lib.updateEditor model

        Nothing ->
            ( model
            , Cmd.none
            )
