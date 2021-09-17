module Editor.Mode.Normal.Handlers.DW exposing (handle)

import Editor.Lib
import Editor.Msg exposing (Mode(..), Msg)
import Editor.Words exposing (getWordUntilEnd)
import List.Extra
import String.Extra


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle model =
    let
        { x, y } =
            model.travelable.cursorPosition

        prevNormalBuffer =
            model.normalBuffer
    in
    case List.Extra.getAt y model.travelable.renderableLines of
        Just renderableLine ->
            let
                wordLength =
                    case String.slice x (String.length renderableLine.text) renderableLine.text |> getWordUntilEnd of
                        Just word ->
                            String.length word

                        Nothing ->
                            0

                updatedRenderableLine =
                    { renderableLine | text = String.Extra.replaceSlice "" x (x + wordLength) renderableLine.text }

                updatedRenderableLines =
                    List.Extra.updateAt y (always updatedRenderableLine) model.travelable.renderableLines
            in
            model
                |> Editor.Lib.startUpdateEditor
                |> Editor.Lib.updateRenderableLines updatedRenderableLines
                |> Editor.Lib.updateNormalBuffer { prevNormalBuffer | command = "" }
                |> Editor.Lib.updateEditor model

        Nothing ->
            ( model
            , Cmd.none
            )
