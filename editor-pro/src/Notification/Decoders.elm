module Notification.Decoders exposing (..)

import Json.Decode exposing (Decoder, andThen, fail, field, int, list, map, map2, map3, maybe, nullable, oneOf, string, succeed)
import Notification.Types exposing (Notification, NotificationType(..))


decodeNotification : Decoder Notification
decodeNotification =
    map3 Notification
        (field "source" string)
        (field "type" decodeType)
        (field "message" string)


decodeType : Decoder NotificationType
decodeType =
    string
        |> andThen
            (\str ->
                case str of
                    "error" ->
                        succeed Error

                    "warning" ->
                        succeed Warning

                    "info" ->
                        succeed Info

                    _ ->
                        fail "unknown type (allowed: 'error'|'warning'|'info')"
            )
