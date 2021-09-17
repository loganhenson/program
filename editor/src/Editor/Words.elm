module Editor.Words exposing (..)

import Regex


getWordUntilEnd : String -> Maybe String
getWordUntilEnd text =
    text
        |> (Regex.fromString "(\\w+)"
                |> Maybe.withDefault Regex.never
                |> Regex.findAtMost 1
           )
        |> List.head
        |> Maybe.map .match
