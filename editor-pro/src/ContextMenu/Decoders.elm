module ContextMenu.Decoders exposing (..)

import ContextMenu.Types exposing (Location)
import Json.Decode exposing (Decoder, field, int, map2)


decodeClickLocation : Decoder Location
decodeClickLocation =
    map2 Location
        (field "clientX" int)
        (field "clientY" int)
