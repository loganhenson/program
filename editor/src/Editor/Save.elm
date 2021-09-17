module Editor.Save exposing (requestSave, update)

import Editor.Msg
import Json.Decode
import Json.Encode


update : Json.Decode.Value -> Editor.Msg.Model -> ( Editor.Msg.Model, Cmd msg )
update json model =
    ( model
    , Cmd.none
    )


requestSave : (Json.Encode.Value -> Cmd msg) -> String -> Cmd msg
requestSave p contents =
    p <|
        Json.Encode.string contents
