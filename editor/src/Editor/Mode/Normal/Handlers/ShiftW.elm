module Editor.Mode.Normal.Handlers.ShiftW exposing (handle)

import Editor.Lib
import Editor.Msg exposing (EditorCoordinate, Model, Msg)
import List.Extra


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle model =
    case getNextWord model of
        Just next ->
            model
                |> Editor.Lib.startUpdateEditor
                |> Editor.Lib.updateCursorPosition next
                |> Editor.Lib.updateEditor model

        Nothing ->
            ( model, Cmd.none )


getNextWord : Model -> Maybe EditorCoordinate
getNextWord model =
    let
        currentCursorPosition =
            model.travelable.cursorPosition

        ( lengthOfLine, restOfLineText ) =
            case List.Extra.getAt currentCursorPosition.y model.travelable.renderableLines of
                Just renderableLine ->
                    let
                        len =
                            String.length renderableLine.text
                    in
                    ( len, String.slice currentCursorPosition.x len renderableLine.text )

                Nothing ->
                    ( 0, "" )

        ( succeeded, { x, y } ) =
            case lengthOfLine == 0 || String.length restOfLineText == 0 || currentCursorPosition.x == lengthOfLine - 1 of
                True ->
                    ( "failure", currentCursorPosition )

                False ->
                    String.foldl
                        (\char ( start, next ) ->
                            case ( start, char ) of
                                ( "", _ ) ->
                                    -- Get the first char for comparison
                                    ( String.fromChar char, { x = next.x + 1, y = next.y } )

                                ( "$", _ ) ->
                                    -- Finished, looping out
                                    ( "$", next )

                                ( " ", ' ' ) ->
                                    -- Space -> Space, keep going
                                    ( start, { x = next.x + 1, y = next.y } )

                                ( " ", _ ) ->
                                    -- STOP
                                    ( "$", next )

                                --( " ", { x = next.x + 1, y = next.y } )
                                ( _, ' ' ) ->
                                    -- Non Space -> Space, keep going
                                    ( " ", { x = next.x + 1, y = next.y } )

                                ( _, _ ) ->
                                    -- If we run out of tries, fail
                                    case next.x + 1 == lengthOfLine of
                                        True ->
                                            ( "failure", { x = 0, y = 0 } )

                                        False ->
                                            ( start, { x = next.x + 1, y = next.y } )
                        )
                        ( "" {- always "" -}, { x = currentCursorPosition.x, y = currentCursorPosition.y } )
                        restOfLineText
    in
    case succeeded of
        "failure" ->
            case List.Extra.getAt (currentCursorPosition.y + 1) model.travelable.renderableLines of
                Just nextRenderableLine ->
                    case String.slice 0 1 nextRenderableLine.text of
                        " " ->
                            let
                                travelable =
                                    model.travelable
                            in
                            getNextWord
                                { model
                                    | travelable =
                                        { travelable
                                            | renderableLines = model.travelable.renderableLines
                                            , cursorPosition = { x = 0, y = currentCursorPosition.y + 1 }
                                        }
                                }

                        _ ->
                            Just { x = 0, y = currentCursorPosition.y + 1 }

                Nothing ->
                    Just { x = x, y = y }

        _ ->
            Just { x = x, y = y }
