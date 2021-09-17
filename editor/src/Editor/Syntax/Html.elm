module Editor.Syntax.Html exposing (syntax)

import Editor.Syntax.Types exposing (Syntax)


syntax : Syntax
syntax =
    [ { class = "syntax-comment", regex = "(//.*)" }
    , { class = "syntax-import", regex = "(<\\/[^>]+>)" }
    , { class = "syntax-import", regex = "(<[^ |>]+)" }
    , { class = "syntax-import", regex = "(<|>|\\/>)" }
    , { class = "syntax-string", regex = "(\"[^\"]*(?:[^\"]*)*\"?)" }
    , { class = "syntax-string", regex = "('[^']*(?:[^']*)*'?)" }
    ]
