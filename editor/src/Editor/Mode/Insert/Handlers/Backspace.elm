module Editor.Mode.Insert.Handlers.Backspace exposing (handle)

import Editor.Clipboard as Clipboard
import Editor.Lib exposing (createRenderableLine)
import Editor.Msg exposing (EditorCoordinate, RenderableLine)
import List.Extra
import String.Extra


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
handle model =
    let
        { x, y } =
            model.travelable.cursorPosition

        currentRenderableLineMaybe =
            List.Extra.getAt y model.travelable.renderableLines
    in
    case currentRenderableLineMaybe of
        Just currentRenderableLine ->
            case model.selection of
                Just _ ->
                    let
                        ( _, afterCutTravelable ) =
                            Clipboard.cut model
                    in
                    model
                        |> Editor.Lib.startUpdateEditor
                        |> Editor.Lib.updateRenderableLines afterCutTravelable.renderableLines
                        |> Editor.Lib.updateCursorPosition afterCutTravelable.cursorPosition
                        |> Editor.Lib.updateSelectionState Editor.Msg.None
                        |> Editor.Lib.updateSelection Nothing
                        |> Editor.Lib.updateEditor model

                Nothing ->
                    case x - 1 >= 0 of
                        True ->
                            let
                                updatedRenderableLine =
                                    { currentRenderableLine | text = String.Extra.replaceSlice "" (x - 1) x currentRenderableLine.text }

                                updatedRenderableLines =
                                    List.Extra.updateAt y
                                        (\a -> { a | text = String.Extra.replaceSlice "" (x - 1) x a.text })
                                        model.travelable.renderableLines
                            in
                            model
                                |> Editor.Lib.startUpdateEditor
                                |> Editor.Lib.updateRenderableLines updatedRenderableLines
                                |> Editor.Lib.updateCursorPosition
                                    { x = max 0 (min (x - 1) (max 0 (String.length updatedRenderableLine.text))), y = y }
                                |> Editor.Lib.updateEditor model

                        False ->
                            case y > 0 of
                                True ->
                                    let
                                        previousRenderableLine =
                                            Maybe.withDefault (createRenderableLine (List.length model.travelable.renderableLines) "") <| List.Extra.getAt (y - 1) model.travelable.renderableLines

                                        updatedPreviousRenderableLine =
                                            { previousRenderableLine | text = String.append previousRenderableLine.text currentRenderableLine.text }

                                        updatedRenderableLines =
                                            List.Extra.updateAt (y - 1)
                                                (always updatedPreviousRenderableLine)
                                                (List.Extra.removeAt y model.travelable.renderableLines)
                                    in
                                    model
                                        |> Editor.Lib.startUpdateEditor
                                        |> Editor.Lib.updateRenderableLines updatedRenderableLines
                                        |> Editor.Lib.updateCursorPosition
                                            { x = String.length previousRenderableLine.text, y = y - 1 }
                                        |> Editor.Lib.updateEditor model

                                False ->
                                    ( model
                                    , Cmd.none
                                    )

        Nothing ->
            ( model
            , Cmd.none
            )
