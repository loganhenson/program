module Editor.Syntax.Json exposing (syntax)

import Editor.Syntax.Types exposing (Syntax)


syntax : Syntax
syntax =
    [ { class = "syntax-string", regex = "(\"[^\"]*(?:[^\"]*)*\"?)" }
    , { class = "syntax-import", regex = "(,|\\;)" }
    , { class = "syntax-number", regex = "\\b(\\d+)\\b" }
    , { class = "syntax-parens", regex = "(\\(|\\))" }
    , { class = "syntax-open-brace", regex = "({)" }
    , { class = "syntax-close-brace", regex = "(})" }
    , { class = "syntax-open-bracket", regex = "(\\[)" }
    , { class = "syntax-close-bracket", regex = "(\\])" }
    ]
