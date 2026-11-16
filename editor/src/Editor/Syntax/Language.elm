module Editor.Syntax.Language exposing (getSyntax, getSyntaxFromFileName)

import Editor.Syntax.Elm
import Editor.Syntax.Html
import Editor.Syntax.Javascript
import Editor.Syntax.Json
import Editor.Syntax.Php
import Editor.Syntax.Rust
import Editor.Syntax.Types exposing (Syntax)
import List.Extra


{-| The syntax of a file: by its extension, and for a file without one (a
script like `artisan`) by how it starts.
-}
getSyntax : String -> String -> Maybe Syntax
getSyntax fileName contents =
    case getSyntaxFromFileName fileName of
        Just syntax ->
            Just syntax

        Nothing ->
            getSyntaxFromContents contents


getSyntaxFromFileName : String -> Maybe Syntax
getSyntaxFromFileName fileName =
    let
        name =
            String.split "/" fileName
                |> List.Extra.last
                |> Maybe.withDefault fileName

        extension =
            case String.split "." name of
                _ :: rest ->
                    List.Extra.last rest

                [] ->
                    Nothing
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

        Just "rs" ->
            Just Editor.Syntax.Rust.syntax

        _ ->
            Nothing


{-| A script says what it is on its first line: `#!/usr/bin/env php`. PHP
also says so where it opens: `<?php`.
-}
getSyntaxFromContents : String -> Maybe Syntax
getSyntaxFromContents contents =
    let
        firstLines =
            String.left 512 contents
                |> String.lines
                |> List.map String.trim
                |> List.filter (not << String.isEmpty)

        interpreter =
            case firstLines of
                first :: _ ->
                    if String.startsWith "#!" first then
                        -- "#!/usr/bin/env php", "#!/usr/local/bin/php8.3", "#!/usr/bin/env -S node --flag"
                        String.dropLeft 2 first
                            |> String.words
                            |> List.map (\word -> String.split "/" word |> List.Extra.last |> Maybe.withDefault word)
                            |> List.filter (\word -> word /= "env" && not (String.startsWith "-" word))
                            |> List.head

                    else
                        Nothing

                [] ->
                    Nothing

        runs name =
            Maybe.map (String.startsWith name) interpreter == Just True
    in
    if runs "php" then
        Just Editor.Syntax.Php.syntax

    else if runs "node" then
        Just Editor.Syntax.Javascript.syntax

    else if List.any (String.startsWith "<?php") (List.take 2 firstLines) then
        Just Editor.Syntax.Php.syntax

    else
        Nothing
