module Editor.Syntax.Rust exposing (syntax)

import Editor.Syntax.Types exposing (Syntax)


{-| A line is matched against all of these at once: at each position the
first entry that matches wins, so the order matters (a comment before the
operators that `/` would otherwise be, keywords before function calls, `->`
before `-`).

Every entry has exactly one capturing group, which has to start where the
match starts: the group is what gets colored. Anything else is written as a
non-capturing group or a lookahead.

-}
syntax : Syntax
syntax =
    [ { class = "syntax-comment", regex = "(//.*)" }

    -- a block comment that ends on its line, or one that is still open at the end of it
    , { class = "syntax-comment", regex = "(/\\*.*?\\*/|/\\*.*)" }

    -- #[derive(Debug)], #![allow(unused)]
    , { class = "syntax-attribute", regex = "(#!?\\[[^\\]]*\\]?)" }

    -- raw strings: r"..", r#".."#, br#".."#
    , { class = "syntax-string", regex = "(b?r#+\".*?(?:\"#+|$)|b?r\"[^\"]*\"?)" }

    -- strings and byte strings, with escapes
    , { class = "syntax-string", regex = "(b?\"[^\"\\\\]*(?:\\\\.[^\"\\\\]*)*\"?)" }

    -- characters and bytes: 'a', '\n', '\'', '\u{1F600}', b'\x1b'
    , { class = "syntax-string", regex = "(b?'(?:[^'\\\\]|\\\\(?:u\\{[0-9a-fA-F_]{1,6}\\}|x[0-9a-fA-F]{2}|.))')" }

    -- lifetimes and loop labels: 'a, 'static, 'outer
    , { class = "syntax-variable", regex = "('[a-zA-Z_][a-zA-Z0-9_]*)" }
    , { class = "syntax-import", regex = "\\b(as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|union|unsafe|use|where|while)\\b" }

    -- macros: println!(..), vec![..], macro_rules! name {..}
    , { class = "syntax-function-def", regex = "\\b([a-zA-Z_][a-zA-Z0-9_]*!)(?=\\s*[(\\[{]|\\s+[a-zA-Z_])" }

    -- functions, where they are defined and where they are called
    , { class = "syntax-function-def", regex = "\\b([a-z_][a-zA-Z0-9_]*)(?=\\s*\\(|::<)" }

    -- constants and statics: MAX_BATCH_BYTES
    , { class = "syntax-variable", regex = "\\b([A-Z][A-Z0-9_]+)\\b" }

    -- types: the built in ones, and anything named like one
    , { class = "syntax-module", regex = "\\b(bool|char|str|u8|u16|u32|u64|u128|usize|i8|i16|i32|i64|i128|isize|f32|f64)\\b" }
    , { class = "syntax-module", regex = "\\b([A-Z][a-zA-Z0-9_]*)\\b" }

    -- numbers: 0xff, 0b1010_1010, 0o17, 1_000, 2.5e-3, 4u8, 1.0f32
    , { class = "syntax-number", regex = "\\b(0x[0-9a-fA-F_]+(?:[iu](?:8|16|32|64|128|size))?|0b[01_]+(?:[iu](?:8|16|32|64|128|size))?|0o[0-7_]+(?:[iu](?:8|16|32|64|128|size))?)\\b" }
    , { class = "syntax-number", regex = "\\b(\\d[\\d_]*(?:\\.\\d[\\d_]*)?(?:[eE][+-]?\\d+)?(?:_?(?:[iu](?:8|16|32|64|128|size)|f32|f64))?)\\b" }
    , { class = "syntax-skinny-arrow", regex = "(->|=>)" }
    , { class = "syntax-double-colon", regex = "(::)" }
    , { class = "syntax-operator", regex = "(\\.\\.=?|==|!=|<=|>=|&&|\\|\\||[-+*/%^!&|]=?|\\?)" }
    , { class = "syntax-equals", regex = "(=)" }
    , { class = "syntax-import", regex = "(,|;)" }
    , { class = "syntax-parens", regex = "(\\(|\\))" }
    , { class = "syntax-open-brace", regex = "({)" }
    , { class = "syntax-close-brace", regex = "(})" }
    , { class = "syntax-open-bracket", regex = "(\\[)" }
    , { class = "syntax-close-bracket", regex = "(\\])" }
    ]
