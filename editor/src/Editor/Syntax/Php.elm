module Editor.Syntax.Php exposing (syntax)

import Editor.Syntax.Types exposing (Syntax)


syntax : Syntax
syntax =
    [ { class = "syntax-comment", regex = "(//.*)" }
    , { class = "syntax-import", regex = "\\b(fn|static|trait|try|catch|echo|foreach|for|public|protected|private|require|return|new|extends|include|use|class|function|namespace|declare)\\b" }
    , { class = "syntax-import", regex = "(<\\?php)" }
    , { class = "syntax-variable", regex = "(\\$\\w+)\\b" }
    , { class = "syntax-function-def", regex = "([a-zA-Z_{1}][a-zA-Z0-9_]+)(?=\\()" }
    , { class = "syntax-string", regex = "(\"[^\"]*(?:[^\"]*)*\"?)" }
    , { class = "syntax-string", regex = "('[^']*(?:[^']*)*'?)" }
    , { class = "syntax-import", regex = "(,|\\;)" }
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
