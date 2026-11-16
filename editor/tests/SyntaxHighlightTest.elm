module SyntaxHighlightTest exposing (suite)

import Editor.Syntax.Javascript
import Editor.Syntax.Php
import Editor.Syntax.Rust
import Editor.Syntax.Types exposing (Syntax, Token)
import Editor.Syntax.Util exposing (fillInTokens, highlight, maxHighlightedLineLength, tokenize, viewLine)
import Expect
import Html
import Test exposing (..)
import Test.Html.Query as Query
import Test.Html.Selector exposing (class, tag)


token : Int -> Int -> String -> Token
token index length class_ =
    { index = index, length = length, class = class_, styles = [] }


{-| The pieces a line is cut into: each with its text and its class.
-}
pieces : String -> List Token -> List ( String, String )
pieces line tokens =
    fillInTokens line tokens
        |> List.map (\t -> ( String.slice t.index (t.index + t.length) line, t.class ))


{-| The line put back together from its pieces.
-}
rejoined : Syntax -> String -> String
rejoined syntax line =
    fillInTokens line (tokenize line syntax)
        |> List.map (\t -> String.slice t.index (t.index + t.length) line)
        |> String.concat


lines : List ( String, Syntax, String )
lines =
    [ ( "Rust", Editor.Syntax.Rust.syntax, "    let mut buf = [0u8; 65536]; // a buffer" )
    , ( "Rust", Editor.Syntax.Rust.syntax, "impl<'a> Parser<'a> { fn new(s: &'a str) -> Self { todo!(\"é ✓ 你好\") } }" )
    , ( "Rust", Editor.Syntax.Rust.syntax, "" )
    , ( "Rust", Editor.Syntax.Rust.syntax, "   " )
    , ( "Rust", Editor.Syntax.Rust.syntax, "plain words with nothing to color" )
    , ( "PHP", Editor.Syntax.Php.syntax, "$status = $app->handleCommand(new ArgvInput); # done" )
    , ( "JavaScript", Editor.Syntax.Javascript.syntax, "const x = require('fs'), y = `a ${b} c`; // 👍 emoji" )
    ]


suite : Test
suite =
    describe "Coloring a line"
        [ describe "covers the line from start to end, in order"
            [ test "text before, between and after the tokens is kept" <|
                \_ ->
                    pieces "let x = 1;" [ token 0 3 "kw", token 8 1 "num" ]
                        |> Expect.equal [ ( "let", "kw" ), ( " x = ", "" ), ( "1", "num" ), ( ";", "" ) ]
            , test "a line without tokens is one piece" <|
                \_ -> pieces "nothing here" [] |> Expect.equal [ ( "nothing here", "" ) ]
            , test "an empty line has no pieces" <|
                \_ -> pieces "" [] |> Expect.equal []
            , test "tokens that touch have nothing between them" <|
                \_ -> pieces "ab" [ token 0 1 "a", token 1 1 "b" ] |> Expect.equal [ ( "a", "a" ), ( "b", "b" ) ]
            , test "a token that starts inside another one is left out" <|
                \_ -> pieces "abcdef" [ token 0 4 "first", token 2 3 "inside" ] |> Expect.equal [ ( "abcd", "first" ), ( "ef", "" ) ]
            , test "an empty token is left out" <|
                \_ -> pieces "abc" [ token 1 0 "empty" ] |> Expect.equal [ ( "abc", "" ) ]
            ]
        , describe "never loses or repeats a character"
            (List.indexedMap
                (\index ( language, syntax, line ) ->
                    test (language ++ " line " ++ String.fromInt (index + 1)) <|
                        \_ -> rejoined syntax line |> Expect.equal line
                )
                lines
            )
        , describe "on a very long line"
            [ test "a long line is still colored, token by token" <|
                \_ ->
                    let
                        line =
                            String.repeat 400 "let a = 1; "
                    in
                    viewLine (Just Editor.Syntax.Rust.syntax) line [] []
                        |> Query.fromHtml
                        |> Query.findAll [ class "syntax-import" ]
                        |> Query.count (Expect.atLeast 400)
            , test "it is put back together exactly" <|
                \_ ->
                    let
                        line =
                            String.repeat 400 "let a = 1; "
                    in
                    rejoined Editor.Syntax.Rust.syntax line |> Expect.equal line
            , test "a line beyond the limit is shown without colors, in one piece" <|
                -- a minified bundle, a pasted blob: an element for every token,
                -- built again at every key, froze the editor
                \_ ->
                    let
                        line =
                            String.repeat (maxHighlightedLineLength // 10 + 1) "let a = 1;"
                    in
                    viewLine (Just Editor.Syntax.Rust.syntax) line [] []
                        |> Query.fromHtml
                        |> Expect.all
                            [ Query.findAll [ class "syntax-import" ] >> Query.count (Expect.equal 0)
                            , Query.findAll [ tag "span" ] >> Query.count (Expect.equal 1)
                            ]
            ]
        ]
