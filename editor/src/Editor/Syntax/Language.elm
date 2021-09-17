module Editor.Syntax.Language exposing (getSyntaxFromFileName)

import Editor.Syntax.Elm
import Editor.Syntax.Html
import Editor.Syntax.Javascript
import Editor.Syntax.Json
import Editor.Syntax.Php
import Editor.Syntax.Types exposing (Syntax)
import List.Extra


getSyntaxFromFileName : String -> Maybe Syntax
getSyntaxFromFileName fileName =
    let
        extension =
            String.split "." fileName
                |> List.Extra.last
    in
    case extension of
        Just "html" ->
            Just Editor.Syntax.Html.syntax

        Just "js" ->
            Just Editor.Syntax.Javascript.syntax

        Just "ts" ->
            Just Editor.Syntax.Javascript.syntax

        Just "elm" ->
            Just Editor.Syntax.Elm.syntax

        Just "php" ->
            Just Editor.Syntax.Php.syntax

        Just "json" ->
            Just Editor.Syntax.Json.syntax

        _ ->
            Nothing
