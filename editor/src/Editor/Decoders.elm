module Editor.Decoders exposing (..)

import Editor.Msg exposing (Location, Position, Range)
import Json.Decode


decodePosition : Json.Decode.Decoder Position
decodePosition =
    Json.Decode.map2 Position
        (Json.Decode.field "line" Json.Decode.int)
        (Json.Decode.field "character" Json.Decode.int)


decodeRange : Json.Decode.Decoder Range
decodeRange =
    Json.Decode.map2
        Range
        (Json.Decode.field "start" decodePosition)
        (Json.Decode.field "end" decodePosition)


decodeLocation : Json.Decode.Decoder Location
decodeLocation =
    Json.Decode.map
        Location
        (Json.Decode.field "range" decodeRange)
