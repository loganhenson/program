module Utils exposing (..)

import String.Extra


basename : String -> String
basename path =
    String.Extra.rightOfBack "/" path


dirname : String -> String
dirname path =
    String.split "/" path
        |> List.reverse
        |> List.tail
        |> Maybe.map List.reverse
        |> Maybe.map (String.join "/")
        |> Maybe.withDefault ""
