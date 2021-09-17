module Editor.Syntax.Elm exposing (syntax)

import Editor.Syntax.Types exposing (Syntax)


syntax : Syntax
syntax =
    [ { class = "syntax-comment", regex = "(--.*)" }
    , { class = "syntax-import", regex = "^(import)\\b" }
    , { class = "syntax-module-export", regex = "^(module)\\b" }
    , { class = "syntax-function-def", regex = "(^\\w+[?:^=]*)" }
    , { class = "syntax-module", regex = "\\b([A-Z]+[a-zA-Z]*)\\b" }
    , { class = "syntax-string", regex = "(\"[^\"\\\\]*(?:\\\\.[^\"\\\\]*)*\"?)" }
    , { class = "syntax-function-type-sig", regex = "^(\\w+)\\s*:" }
    , { class = "syntax-parens", regex = "(\\(|\\))" }
    , { class = "syntax-equals", regex = "(=)" }
    , { class = "syntax-comma", regex = "(,)" }
    , { class = "syntax-dot-dot", regex = "(\\.\\.)" }
    , { class = "syntax-case", regex = "\\b(case)\\b" }
    , { class = "syntax-of", regex = "\\b(of)\\b" }
    , { class = "syntax-if", regex = "\\b(if)\\b" }
    , { class = "syntax-else", regex = "\\b(else)\\b" }
    , { class = "syntax-then", regex = "\\b(then)\\b" }
    , { class = "syntax-let", regex = "\\b(let)\\b" }
    , { class = "syntax-in", regex = "\\b(in)\\b" }
    , { class = "syntax-skinny-arrow", regex = "(->)" }
    , { class = "syntax-left-compose", regex = "(\\<\\|)" }
    , { class = "syntax-right-compose", regex = "(\\|\\>)" }
    , { class = "syntax-forward-slash", regex = "(/)" }
    , { class = "syntax-minus", regex = "(-)" }
    , { class = "syntax-plus", regex = "(\\+)" }
    , { class = "syntax-star", regex = "(\\*)" }
    , { class = "syntax-double-colon", regex = "(::)" }
    , { class = "syntax-open-brace", regex = "({)" }
    , { class = "syntax-close-brace", regex = "(})" }
    , { class = "syntax-open-bracket", regex = "(\\[)" }
    , { class = "syntax-close-bracket", regex = "(\\])" }
    , { class = "syntax-pipe", regex = "(\\|)" }
    , { class = "syntax-percent", regex = "(%)" }
    , { class = "syntax-backslash", regex = "(\\\\)" }
    , { class = "syntax-number", regex = "\\b(\\d+)\\b" }
    ]
