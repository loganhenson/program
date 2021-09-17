module Editor.Mode.Normal.Handlers.W exposing (handle)

import Editor.Lib exposing (startUpdateEditor, updateCursorPosition, updateEditor)
import Editor.Msg exposing (EditorCoordinate, Model, Msg)
import List.Extra
import Regex


handle : Model -> ( Model, Cmd Msg )
handle model =
    case getNextWord model of
        Just next ->
            model
                |> startUpdateEditor
                |> updateCursorPosition next
                |> updateEditor model

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
                    ( Failure, currentCursorPosition )

                False ->
                    String.foldl
                        (\char ( start, next ) ->
                            let
                                stringChar =
                                    String.fromChar char

                                state =
                                    if isWord stringChar then
                                        Word

                                    else if stringChar == " " then
                                        Space

                                    else
                                        NonWord
                            in
                            case
                                ( start
                                , state
                                )
                            of
                                ( Start, _ ) ->
                                    -- Get the first char for comparison
                                    ( state, { x = next.x + 1, y = next.y } )

                                ( Done, _ ) ->
                                    -- Finished, looping out
                                    ( Done, next )

                                ( Space, Word ) ->
                                    ( Done, next )

                                ( Space, Space ) ->
                                    ( start, { x = next.x + 1, y = next.y } )

                                ( NonWord, NonWord ) ->
                                    ( start, { x = next.x + 1, y = next.y } )

                                ( NonWord, Space ) ->
                                    ( LookingForAnything, { x = next.x + 1, y = next.y } )

                                ( Word, Space ) ->
                                    ( LookingForAnything, { x = next.x + 1, y = next.y } )

                                ( Word, Word ) ->
                                    ( start, { x = next.x + 1, y = next.y } )

                                ( Word, NonWord ) ->
                                    ( Done, next )

                                ( LookingForAnything, NonWord ) ->
                                    ( Done, next )

                                ( LookingForAnything, Word ) ->
                                    ( Done, next )

                                ( NonWord, Word ) ->
                                    -- STOP
                                    ( Done, next )

                                _ ->
                                    -- If we run out of tries, fail
                                    ( Failure, { x = 0, y = 0 } )
                        )
                        ( Start, { x = currentCursorPosition.x, y = currentCursorPosition.y } )
                        restOfLineText
    in
    case succeeded of
        Failure ->
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


isWord : String -> Bool
isWord =
    Regex.contains
        (Maybe.withDefault Regex.never <|
            Regex.fromString "\\w"
        )


type WordOrNonWord
    = Word
    | Space
    | NonWord
    | LookingForAnything
    | Start
    | Done
    | Failure
