module Editor.Symbols exposing (update)

import Editor.Decoders exposing (decodeLocation)
import Editor.Lib
import Editor.Msg exposing (Range)
import Json.Decode


update : Json.Decode.Value -> Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
update json model =
    case Json.Decode.decodeValue decodeJson json of
        Ok symbols ->
            model
                |> Editor.Lib.startUpdateEditor
                |> Editor.Lib.updateSymbols (jsonSymbolsToSymbols symbols)

        Err error ->
            ( model
            , Cmd.none
            )


type alias Location =
    { range : Range }


type alias JsonSymbol =
    { kind : Int
    , location : Location
    }


jsonSymbolsToSymbols jsonSymbols =
    List.map
        (\s ->
            { kind = s.kind
            , start =
                { character = s.location.range.start.character
                , line = s.location.range.start.line
                }
            , end =
                { character = s.location.range.end.character
                , line = s.location.range.end.line
                }
            }
        )
        jsonSymbols


decodeJson : Json.Decode.Decoder (List JsonSymbol)
decodeJson =
    Json.Decode.list <|
        Json.Decode.map2 JsonSymbol
            (Json.Decode.field "kind" Json.Decode.int)
            (Json.Decode.field "location" decodeLocation)
