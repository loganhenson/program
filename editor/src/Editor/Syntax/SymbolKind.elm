module Editor.Syntax.SymbolKind exposing (kindToSymbolClass)


kindToSymbolClass : Int -> String
kindToSymbolClass number =
    case number of
        100 ->
            "syntax-multiline-string"

        101 ->
            "syntax-multiline-comment"

        _ ->
            ""
