module Notification.Types exposing (..)


type NotificationType
    = Error
    | Warning
    | Info


type alias Notification =
    { source : String, type_ : NotificationType, message : String }
