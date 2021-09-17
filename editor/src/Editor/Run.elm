module Editor.Run exposing (requestRun, update)

import Editor.Errors
import Editor.Lib
import Editor.Msg
import Json.Decode
import Json.Encode


update : Json.Decode.Value -> Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
update json model =
    case Json.Decode.decodeValue Editor.Errors.decodeJson json of
        Ok errors ->
            model
                |> Editor.Lib.startUpdateEditor
                |> Editor.Lib.updateErrors errors
                |> Editor.Lib.updateEditor model

        Err error ->
            ( model
            , Cmd.none
            )


requestRun : (Json.Encode.Value -> Cmd msg) -> String -> Cmd msg
requestRun p contents =
    p <|
        Json.Encode.object
            [ ( "contents", Json.Encode.string contents )
            ]
