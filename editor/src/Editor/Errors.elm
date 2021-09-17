module Editor.Errors exposing (decodeJson, update)

import Editor.Lib
import Editor.Msg
import Json.Decode


update : Json.Decode.Value -> Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
update json model =
    case Json.Decode.decodeValue decodeJson json of
        Ok errors ->
            model
                |> Editor.Lib.startUpdateEditor
                |> Editor.Lib.updateErrors errors
                |> Editor.Lib.updateEditor model

        Err error ->
            ( model
            , Cmd.none
            )


decodeJson : Json.Decode.Decoder (List Editor.Msg.Error)
decodeJson =
    Json.Decode.list <|
        Json.Decode.map3 Editor.Msg.Error
            (Json.Decode.field "line" Json.Decode.int)
            (Json.Decode.field "col" (Json.Decode.maybe Json.Decode.int))
            (Json.Decode.field "message" Json.Decode.string)
