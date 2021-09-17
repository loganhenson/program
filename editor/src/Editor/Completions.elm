module Editor.Completions exposing (update)

import Editor.Decoders exposing (decodeRange)
import Editor.Lib
import Editor.Msg
import Editor.Syntax.Util
import Json.Decode


update : Json.Decode.Value -> Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
update json model =
    case Json.Decode.decodeValue decodeJson json of
        Ok completions ->
            let
                { x, y } =
                    model.travelable.cursorPosition

                token =
                    Editor.Syntax.Util.getCurrentToken x y model.travelable.renderableLines

                filteredCompletions =
                    case token of
                        "" ->
                            completions

                        _ ->
                            List.filter
                                (\completion ->
                                    String.startsWith token completion.label
                                )
                                completions
            in
            model
                |> Editor.Lib.startUpdateEditor
                |> Editor.Lib.updateCompletions filteredCompletions
                |> Editor.Lib.updateEditor model

        Err error ->
            ( model
            , Cmd.none
            )


decodeTextEdit : Json.Decode.Decoder Editor.Msg.TextEdit
decodeTextEdit =
    Json.Decode.map2 Editor.Msg.TextEdit
        (Json.Decode.field "newText" Json.Decode.string)
        (Json.Decode.field "range" decodeRange)


decodeJson : Json.Decode.Decoder (List Editor.Msg.Completion)
decodeJson =
    Json.Decode.list <|
        Json.Decode.map2 Editor.Msg.Completion
            (Json.Decode.field "label" Json.Decode.string)
            (Json.Decode.maybe (Json.Decode.field "textEdit" decodeTextEdit))
