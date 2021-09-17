module Editor.Mode.Normal.Handlers.R exposing (handle)

import Editor.Lib
import Editor.Msg exposing (Mode(..), Msg)
import Editor.Words exposing (getWordUntilEnd)
import List.Extra
import String.Extra


handle : String -> Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle char model =
    let
        { x, y } =
            model.travelable.cursorPosition

        prevNormalBuffer =
            model.normalBuffer
    in
    case List.Extra.getAt y model.travelable.renderableLines of
        Just renderableLine ->
            let
                updatedRenderableLine =
                    { renderableLine | text = String.Extra.replaceSlice char x (x + 1) renderableLine.text }

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
