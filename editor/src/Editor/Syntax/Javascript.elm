module Editor.Syntax.Javascript exposing (syntax)

import Editor.Syntax.Types exposing (Syntax)


syntax : Syntax
syntax =
    [ { class = "syntax-comment", regex = "(//.*)" }
    , { class = "syntax-import", regex = "\\b(try|catch|const|for|require|return|new|class|function|var|let|const|import|async|await)\\b" }
    , { class = "syntax-import", regex = "(,|\\;)" }
    , { class = "syntax-variable", regex = "(\\$\\w+)\\b" }
    , { class = "syntax-function-def", regex = "([a-zA-Z_{1}][a-zA-Z0-9_]+)(?=\\()" }
    , { class = "syntax-string", regex = "(\"[^\"]*(?:[^\"]*)*\"?)" }
    , { class = "syntax-string", regex = "('[^']*(?:[^']*)*'?)" }
    , { class = "syntax-string", regex = "(`[^`]*(?:[^`]*)*`?)" }
    , { class = "syntax-if", regex = "\\b(if)\\b" }
    , { class = "syntax-else", regex = "\\b(else|elseif)\\b" }
    , { class = "syntax-number", regex = "\\b(\\d+)\\b" }
    , { class = "syntax-parens", regex = "(\\(|\\))" }
    , { class = "syntax-open-brace", regex = "({)" }
    , { class = "syntax-close-brace", regex = "(})" }
    , { class = "syntax-open-bracket", regex = "(\\[)" }
    , { class = "syntax-close-bracket", regex = "(\\])" }
    , { class = "syntax-double-colon", regex = "(::)" }
    ]
