module Editor.Syntax.Php exposing (syntax)

import Editor.Syntax.Types exposing (Syntax)


{-| A line is matched against all of these at once: at each position the
first entry that matches wins, so the order matters. Every entry has exactly
one capturing group, which has to start where the match starts.
-}
syntax : Syntax
syntax =
    -- #!/usr/bin/env php
    [ { class = "syntax-comment", regex = "^(#!.*)" }

    -- #[Attribute]
    , { class = "syntax-attribute", regex = "(#\\[[^\\]]*\\]?)" }
    , { class = "syntax-comment", regex = "(//.*|#.*)" }

    -- a block comment that ends on its line, or one that is still open at the end of it
    , { class = "syntax-comment", regex = "(/\\*.*?\\*/|/\\*.*)" }

    -- the lines in the middle and at the end of a doc block:  * @param ...   */
    , { class = "syntax-comment", regex = "^(\\s*\\*(?:[ \\t/].*)?)$" }
    , { class = "syntax-import", regex = "(<\\?php|<\\?=|\\?>)" }
    , { class = "syntax-string", regex = "(\"[^\"\\\\]*(?:\\\\.[^\"\\\\]*)*\"?)" }
    , { class = "syntax-string", regex = "('[^'\\\\]*(?:\\\\.[^'\\\\]*)*'?)" }
    , { class = "syntax-variable", regex = "(\\$\\w+)\\b" }
    , { class = "syntax-import", regex = "\\b(abstract|and|array|as|break|callable|case|catch|class|clone|const|continue|declare|default|do|echo|else|elseif|empty|enum|extends|false|final|finally|fn|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|match|namespace|new|null|or|parent|print|private|protected|public|readonly|require|require_once|return|self|static|switch|throw|trait|true|try|unset|use|var|while|xor|yield)\\b" }

    -- __DIR__, __CLASS__, and constants: LARAVEL_START
    , { class = "syntax-variable", regex = "\\b(__[A-Z]+__|[A-Z][A-Z0-9_]+)\\b" }

    -- functions and methods, where they are defined and where they are called
    , { class = "syntax-function-def", regex = "\\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\\()" }

    -- types: the built in ones, and anything named like a class
    , { class = "syntax-module", regex = "\\b(string|int|float|bool|void|mixed|iterable|object|never)\\b" }
    , { class = "syntax-module", regex = "\\b([A-Z][a-zA-Z0-9_]*)\\b" }
    , { class = "syntax-number", regex = "\\b(0x[0-9a-fA-F_]+|0b[01_]+|\\d[\\d_]*(?:\\.\\d[\\d_]*)?(?:[eE][+-]?\\d+)?)\\b" }
    , { class = "syntax-skinny-arrow", regex = "(\\?->|->|=>)" }
    , { class = "syntax-double-colon", regex = "(::)" }
    , { class = "syntax-backslash", regex = "(\\\\)" }
    , { class = "syntax-operator", regex = "(===|!==|==|!=|<=>|<=|>=|&&|\\|\\||\\?\\?=?|\\.\\.\\.|[-+*/%.!&|^]=?|\\?)" }
    , { class = "syntax-equals", regex = "(=)" }
    , { class = "syntax-import", regex = "(,|;)" }
    , { class = "syntax-parens", regex = "(\\(|\\))" }
    , { class = "syntax-open-brace", regex = "({)" }
    , { class = "syntax-close-brace", regex = "(})" }
    , { class = "syntax-open-bracket", regex = "(\\[)" }
    , { class = "syntax-close-bracket", regex = "(\\])" }
    ]
