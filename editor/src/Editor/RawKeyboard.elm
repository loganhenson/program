module Editor.RawKeyboard exposing
    ( Msg(..)
    , RawKey
    , decoder
    , subscriptions
    )

import Browser.Events
import Json.Decode as Json


type alias RawKey =
    { key : String
    , code : String
    , shiftKey : Bool
    , altKey : Bool
    , ctrlKey : Bool
    , metaKey : Bool
    }


type Msg
    = Down RawKey
    | Up RawKey


decoder : Json.Decoder RawKey
decoder =
    Json.map6 RawKey
        (Json.field "key" Json.string)
        (Json.field "code" Json.string)
        (Json.field "shiftKey" Json.bool)
        (Json.field "altKey" Json.bool)
        (Json.field "ctrlKey" Json.bool)
        (Json.field "metaKey" Json.bool)


downs : (RawKey -> msg) -> Sub msg
downs toMsg =
    Browser.Events.onKeyDown (decoder |> Json.map toMsg)


ups : (RawKey -> msg) -> Sub msg
ups toMsg =
    Browser.Events.onKeyUp (decoder |> Json.map toMsg)


subscriptions : Bool -> Bool -> Sub Msg
subscriptions down up =
    Sub.batch
        [ if down then
            downs Down

          else
            Sub.none
        , if up then
            ups Up

          else
            Sub.none
        ]
