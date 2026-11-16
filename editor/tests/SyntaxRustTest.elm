module SyntaxRustTest exposing (suite)

import Editor.Syntax.Elm
import Editor.Syntax.Html
import Editor.Syntax.Javascript
import Editor.Syntax.Json
import Editor.Syntax.Language exposing (getSyntaxFromFileName)
import Editor.Syntax.Php
import Editor.Syntax.Rust
import Editor.Syntax.Types exposing (Syntax)
import Editor.Syntax.Util exposing (tokenize)
import Expect exposing (Expectation)
import Regex
import Test exposing (..)


{-| What gets colored on a line of Rust: each piece of text with its class,
in order. Text that is left alone is not listed.
-}
colored : String -> List ( String, String )
colored line =
    tokenize line Editor.Syntax.Rust.syntax
        |> List.map (\token -> ( String.slice token.index (token.index + token.length) line, String.replace "syntax-" "" token.class ))


{-| The class a piece of text gets on a line (the first time it is colored).
-}
classOf : String -> String -> Maybe String
classOf text line =
    colored line
        |> List.filter (\( piece, _ ) -> piece == text)
        |> List.head
        |> Maybe.map Tuple.second


expectClass : String -> String -> String -> Expectation
expectClass class text line =
    classOf text line
        |> Expect.equal (Just class)
        |> Expect.onFail ("in `" ++ line ++ "`, `" ++ text ++ "` should be " ++ class ++ " but the line is colored as " ++ Debug.toString (colored line))


expectPlain : String -> String -> Expectation
expectPlain text line =
    classOf text line
        |> Expect.equal Nothing
        |> Expect.onFail ("in `" ++ line ++ "`, `" ++ text ++ "` should not be colored, but the line is colored as " ++ Debug.toString (colored line))


{-| How many capturing groups a regex has: match the empty string against
"the regex, or nothing" and count the groups in the result.
-}
groups : String -> Maybe Int
groups regex =
    Regex.fromString ("(?:" ++ regex ++ ")|")
        |> Maybe.map (\compiled -> Regex.find compiled "")
        |> Maybe.andThen List.head
        |> Maybe.map (.submatches >> List.length)


languages : List ( String, Syntax )
languages =
    [ ( "Rust", Editor.Syntax.Rust.syntax )
    , ( "Elm", Editor.Syntax.Elm.syntax )
    , ( "PHP", Editor.Syntax.Php.syntax )
    , ( "JavaScript", Editor.Syntax.Javascript.syntax )
    , ( "JSON", Editor.Syntax.Json.syntax )
    , ( "HTML", Editor.Syntax.Html.syntax )
    ]


suite : Test
suite =
    describe "Syntax highlighting"
        [ describe "Rust files"
            [ test "a .rs file is highlighted as Rust" <|
                \_ ->
                    getSyntaxFromFileName "/project/src/main.rs"
                        |> Expect.equal (Just Editor.Syntax.Rust.syntax)
            , test "a file that only has rs in its name is not" <|
                \_ ->
                    getSyntaxFromFileName "/project/users"
                        |> Expect.equal Nothing
            ]
        , describe "Rust: a whole line"
            [ test "a use declaration" <|
                \_ ->
                    colored "use std::io::{Read, Write};"
                        |> Expect.equal
                            [ ( "use", "import" )
                            , ( "::", "double-colon" )
                            , ( "::", "double-colon" )
                            , ( "{", "open-brace" )
                            , ( "Read", "module" )
                            , ( ",", "import" )
                            , ( "Write", "module" )
                            , ( "}", "close-brace" )
                            , ( ";", "import" )
                            ]
            , test "a function signature" <|
                \_ ->
                    colored "pub fn start(directory: String) -> Api {"
                        |> Expect.equal
                            [ ( "pub", "import" )
                            , ( "fn", "import" )
                            , ( "start", "function-def" )
                            , ( "(", "parens" )
                            , ( "String", "module" )
                            , ( ")", "parens" )
                            , ( "->", "skinny-arrow" )
                            , ( "Api", "module" )
                            , ( "{", "open-brace" )
                            ]
            , test "a constant" <|
                \_ ->
                    colored "const MAX_BATCH_BYTES: usize = 256 * 1024;"
                        |> Expect.equal
                            [ ( "const", "import" )
                            , ( "MAX_BATCH_BYTES", "variable" )
                            , ( "usize", "module" )
                            , ( "=", "equals" )
                            , ( "256", "number" )
                            , ( "*", "operator" )
                            , ( "1024", "number" )
                            , ( ";", "import" )
                            ]
            ]
        , describe "Rust: comments"
            [ test "a line comment runs to the end of the line" <|
                \_ -> colored "let x = 1; // not \"a string\", not a fn()" |> List.reverse |> List.head |> Expect.equal (Just ( "// not \"a string\", not a fn()", "comment" ))
            , test "a doc comment is a comment" <|
                \_ -> colored "/// Sent as the last command once the shell has exited." |> Expect.equal [ ( "/// Sent as the last command once the shell has exited.", "comment" ) ]
            , test "a block comment ends where it is closed" <|
                \_ -> colored "a /* b */ c()" |> Expect.equal [ ( "/* b */", "comment" ), ( "c", "function-def" ), ( "(", "parens" ), ( ")", "parens" ) ]
            , test "a block comment left open takes the rest of the line" <|
                \_ -> colored "x /* still open" |> Expect.equal [ ( "/* still open", "comment" ) ]
            , test "// inside a string is not a comment" <|
                \_ -> expectClass "string" "\"https://example.com\"" "let url = \"https://example.com\";"
            ]
        , describe "Rust: strings and characters"
            [ test "an escaped quote does not end a string" <|
                \_ -> expectClass "string" "\"say \\\"hi\\\" now\"" "print(\"say \\\"hi\\\" now\", x)"
            , test "what follows a string is code again" <|
                \_ -> expectClass "function-def" "len" "\"abc\".len()"
            , test "a byte string" <|
                \_ -> expectClass "string" "b\"\\x1b[0m\"" "write(b\"\\x1b[0m\")"
            , test "a raw string keeps its quotes and backslashes" <|
                \_ -> expectClass "string" "r#\"a \"quoted\" \\ word\"#" "let s = r#\"a \"quoted\" \\ word\"#;"
            , test "a character" <|
                \_ -> expectClass "string" "'a'" "let c = 'a';"
            , test "an escaped character" <|
                \_ -> expectClass "string" "'\\n'" "if c == '\\n' {"
            , test "a quote character" <|
                \_ -> expectClass "string" "'\\''" "let q = '\\'';"
            , test "a double quote character does not start a string" <|
                \_ -> colored "let q = '\"'; let n = 1;" |> List.filter (\( _, class ) -> class == "string") |> Expect.equal [ ( "'\"'", "string" ) ]
            , test "a unicode escape" <|
                \_ -> expectClass "string" "'\\u{1F600}'" "let c = '\\u{1F600}';"
            ]
        , describe "Rust: lifetimes"
            [ test "a lifetime is not the start of a character" <|
                \_ ->
                    colored "impl<'a> Parser<'a> {"
                        |> Expect.equal [ ( "impl", "import" ), ( "'a", "variable" ), ( "Parser", "module" ), ( "'a", "variable" ), ( "{", "open-brace" ) ]
            , test "the static lifetime" <|
                \_ -> expectClass "variable" "'static" "fn name() -> &'static str {"
            , test "a loop label" <|
                \_ -> expectClass "variable" "'batches" "'batches: loop {"
            ]
        , describe "Rust: names"
            [ test "keywords are only whole words" <|
                \_ -> expectPlain "format" "let format = information;"
            , test "a keyword inside a longer name is left alone" <|
                \_ -> colored "let format = information;" |> Expect.equal [ ( "let", "import" ), ( "=", "equals" ), ( ";", "import" ) ]
            , test "a keyword before a parenthesis is still a keyword" <|
                \_ -> expectClass "import" "if" "if (a) {"
            , test "match is a keyword, not a function" <|
                \_ -> expectClass "import" "match" "match (a, b) {"
            , test "a method call" <|
                \_ -> expectClass "function-def" "recv_timeout" "raw_rx.recv_timeout(remaining)"
            , test "a function called with a turbofish" <|
                \_ -> expectClass "function-def" "channel" "mpsc::channel::<Vec<u8>>()"
            , test "a variable is left alone" <|
                \_ -> expectPlain "raw_rx" "raw_rx.recv_timeout(remaining)"
            , test "a macro, with its exclamation mark" <|
                \_ -> expectClass "function-def" "println!" "println!(\"{}\", x);"
            , test "a macro with brackets" <|
                \_ -> expectClass "function-def" "vec!" "let v = vec![1, 2];"
            , test "macro_rules" <|
                \_ -> expectClass "function-def" "macro_rules!" "macro_rules! check {"
            , test "not-equal is not a macro" <|
                \_ -> colored "a != b" |> Expect.equal [ ( "!=", "operator" ) ]
            , test "a type" <|
                \_ -> expectClass "module" "TerminalCommand" "fn f(command: &TerminalCommand) -> Option<bool> {"
            , test "a built in type" <|
                \_ -> expectClass "module" "u16" "rows: rows as u16,"
            , test "a generic parameter" <|
                \_ -> expectClass "module" "T" "fn first<T>(items: &[T]) -> &T {"
            , test "an enum variant" <|
                \_ -> expectClass "module" "Some" "Some(true) => {"
            , test "Self is a keyword" <|
                \_ -> expectClass "import" "Self" "fn new() -> Self {"
            , test "an attribute" <|
                \_ -> colored "#[derive(Deserialize, Serialize, Clone)]" |> Expect.equal [ ( "#[derive(Deserialize, Serialize, Clone)]", "attribute" ) ]
            , test "an inner attribute" <|
                \_ -> colored "#![allow(dead_code)]" |> Expect.equal [ ( "#![allow(dead_code)]", "attribute" ) ]
            ]
        , describe "Rust: numbers"
            [ test "a decimal" <| \_ -> expectClass "number" "65536" "let mut buf = [0u8; 65536];"
            , test "a number with a type suffix" <| \_ -> expectClass "number" "0u8" "let mut buf = [0u8; 65536];"
            , test "hexadecimal" <| \_ -> expectClass "number" "0x2500" "code >= 0x2500 && code <= 0x259F"
            , test "binary with separators" <| \_ -> expectClass "number" "0b1010_1010" "let m = 0b1010_1010;"
            , test "a float with an exponent" <| \_ -> expectClass "number" "2.5e-3" "let f = 2.5e-3;"
            , test "a float with a suffix" <| \_ -> expectClass "number" "1.0f32" "let f = 1.0f32;"
            , test "separators" <| \_ -> expectClass "number" "1_000_000" "let n = 1_000_000;"
            , test "a range is two numbers" <|
                \_ -> colored "0..10" |> Expect.equal [ ( "0", "number" ), ( "..", "operator" ), ( "10", "number" ) ]
            , test "a digit inside a name is not a number" <|
                \_ -> expectPlain "2" "let x2 = y;"
            , test "a tuple field" <| \_ -> expectClass "number" "0" "pair.0"
            ]
        , describe "Rust: operators"
            [ test "a fat arrow is one thing" <| \_ -> expectClass "skinny-arrow" "=>" "Ok(bytes) => bytes,"
            , test "a path separator" <| \_ -> expectClass "double-colon" "::" "Instant::now()"
            , test "the question mark" <| \_ -> expectClass "operator" "?" "let n = read()?;"
            , test "a reference" <| \_ -> expectClass "operator" "&" "f(&bytes)"
            , test "comparison" <| \_ -> expectClass "operator" ">=" "if waited >= LIMIT {"
            , test "compound assignment" <| \_ -> expectClass "operator" "+=" "n += 1;"
            , test "the brackets of a generic type are left alone" <|
                \_ -> colored "Vec<u8>" |> Expect.equal [ ( "Vec", "module" ), ( "u8", "module" ) ]
            ]
        , describe "Every language"
            (List.concatMap
                (\( name, syntax ) ->
                    [ test (name ++ ": the rules compile together") <|
                        \_ ->
                            Regex.fromString (String.join "|" (List.map .regex syntax))
                                |> (/=) Nothing
                                |> Expect.equal True
                                |> Expect.onFail "the combined regex is not valid, so nothing would be highlighted at all"
                    , test (name ++ ": every rule has exactly one capturing group") <|
                        -- the group that matched is how a token finds its class:
                        -- a rule with two groups shifts the class of every rule after it
                        \_ ->
                            syntax
                                |> List.filter (\rule -> groups rule.regex /= Just 1)
                                |> List.map .regex
                                |> Expect.equal []
                    ]
                )
                languages
            )
        ]
