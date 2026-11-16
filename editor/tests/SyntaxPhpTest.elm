module SyntaxPhpTest exposing (suite)

import Editor.Syntax.Javascript
import Editor.Syntax.Language exposing (getSyntax, getSyntaxFromFileName)
import Editor.Syntax.Php
import Editor.Syntax.Util exposing (tokenize)
import Expect exposing (Expectation)
import Test exposing (..)


{-| What gets colored on a line of PHP: each piece of text with its class,
in order. Text that is left alone is not listed.
-}
colored : String -> List ( String, String )
colored line =
    tokenize line Editor.Syntax.Php.syntax
        |> List.map (\token -> ( String.slice token.index (token.index + token.length) line, String.replace "syntax-" "" token.class ))


expectClass : String -> String -> String -> Expectation
expectClass class text line =
    colored line
        |> List.filter (\( piece, _ ) -> piece == text)
        |> List.head
        |> Maybe.map Tuple.second
        |> Expect.equal (Just class)
        |> Expect.onFail ("in `" ++ line ++ "`, `" ++ text ++ "` should be " ++ class ++ " but the line is colored as " ++ Debug.toString (colored line))


suite : Test
suite =
    describe "Syntax highlighting"
        [ describe "Which language a file is in"
            [ test "by its extension" <|
                \_ -> getSyntax "/app/routes/web.php" "" |> Expect.equal (Just Editor.Syntax.Php.syntax)
            , test "a script without an extension, by its first line" <|
                -- Laravel's `artisan`
                \_ -> getSyntax "/app/artisan" "#!/usr/bin/env php\n<?php\n\nuse Illuminate\\Foundation\\Application;\n" |> Expect.equal (Just Editor.Syntax.Php.syntax)
            , test "an interpreter given by its path and version" <|
                \_ -> getSyntax "/app/bin/task" "#!/usr/local/bin/php8.3\n<?php\n" |> Expect.equal (Just Editor.Syntax.Php.syntax)
            , test "an interpreter started through env with a flag" <|
                \_ -> getSyntax "/app/bin/cli" "#!/usr/bin/env -S node --no-warnings\nconsole.log(1)\n" |> Expect.equal (Just Editor.Syntax.Javascript.syntax)
            , test "PHP without a first line that says so, by where it opens" <|
                \_ -> getSyntax "/app/bin/job" "<?php\n\necho 1;\n" |> Expect.equal (Just Editor.Syntax.Php.syntax)
            , test "the extension wins over the contents" <|
                \_ -> getSyntax "/app/build.js" "#!/usr/bin/env php\n" |> Expect.equal (Just Editor.Syntax.Javascript.syntax)
            , test "a script for something there are no rules for is left plain" <|
                \_ -> getSyntax "/app/deploy" "#!/bin/bash\nphp artisan migrate\n" |> Expect.equal Nothing
            , test "a file that only mentions php is left plain" <|
                \_ -> getSyntax "/app/notes" "how to install php\n" |> Expect.equal Nothing
            , test "an empty file" <|
                \_ -> getSyntax "/app/LICENSE" "" |> Expect.equal Nothing
            , test "a directory with a dot in its name does not give its files an extension" <|
                \_ -> getSyntaxFromFileName "/sites/example.php/Makefile" |> Expect.equal Nothing
            , test "a file named like an extension is not that language" <|
                \_ -> getSyntaxFromFileName "/usr/bin/php" |> Expect.equal Nothing
            ]
        , describe "PHP: the lines of an artisan file"
            [ test "the interpreter line is a comment, not an attribute" <|
                \_ -> colored "#!/usr/bin/env php" |> Expect.equal [ ( "#!/usr/bin/env php", "comment" ) ]
            , test "the opening tag" <|
                \_ -> colored "<?php" |> Expect.equal [ ( "<?php", "import" ) ]
            , test "a use statement" <|
                \_ ->
                    colored "use Illuminate\\Foundation\\Application;"
                        |> Expect.equal
                            [ ( "use", "import" )
                            , ( "Illuminate", "module" )
                            , ( "\\", "backslash" )
                            , ( "Foundation", "module" )
                            , ( "\\", "backslash" )
                            , ( "Application", "module" )
                            , ( ";", "import" )
                            ]
            , test "a call with a string and a call inside it" <|
                \_ ->
                    colored "define('LARAVEL_START', microtime(true));"
                        |> Expect.equal
                            [ ( "define", "function-def" )
                            , ( "(", "parens" )
                            , ( "'LARAVEL_START'", "string" )
                            , ( ",", "import" )
                            , ( "microtime", "function-def" )
                            , ( "(", "parens" )
                            , ( "true", "import" )
                            , ( ")", "parens" )
                            , ( ")", "parens" )
                            , ( ";", "import" )
                            ]
            , test "require with a magic constant joined to a string" <|
                \_ ->
                    colored "require __DIR__.'/vendor/autoload.php';"
                        |> Expect.equal
                            [ ( "require", "import" )
                            , ( "__DIR__", "variable" )
                            , ( ".", "operator" )
                            , ( "'/vendor/autoload.php'", "string" )
                            , ( ";", "import" )
                            ]
            , test "a one line doc block" <|
                \_ -> colored "/** @var Application $app */" |> Expect.equal [ ( "/** @var Application $app */", "comment" ) ]
            , test "a method call on a variable" <|
                \_ ->
                    colored "$status = $app->handleCommand(new ArgvInput);"
                        |> Expect.equal
                            [ ( "$status", "variable" )
                            , ( "=", "equals" )
                            , ( "$app", "variable" )
                            , ( "->", "skinny-arrow" )
                            , ( "handleCommand", "function-def" )
                            , ( "(", "parens" )
                            , ( "new", "import" )
                            , ( "ArgvInput", "module" )
                            , ( ")", "parens" )
                            , ( ";", "import" )
                            ]
            ]
        , describe "PHP: comments"
            [ test "a line comment" <|
                \_ -> colored "// Register the Composer autoloader..." |> Expect.equal [ ( "// Register the Composer autoloader...", "comment" ) ]
            , test "a hash comment" <|
                \_ -> expectClass "comment" "# legacy" "$a = 1; # legacy"
            , test "an attribute is not a hash comment" <|
                \_ -> colored "#[Override]" |> Expect.equal [ ( "#[Override]", "attribute" ) ]
            , test "a line in the middle of a doc block" <|
                \_ -> colored "     * @param  string  $name" |> Expect.equal [ ( "     * @param  string  $name", "comment" ) ]
            , test "the end of a doc block" <|
                \_ -> colored "     */" |> Expect.equal [ ( "     */", "comment" ) ]
            , test "an empty line in a doc block" <|
                \_ -> colored "     *" |> Expect.equal [ ( "     *", "comment" ) ]
            , test "a multiplication is not a doc block" <|
                \_ -> colored "$a * $b" |> Expect.equal [ ( "$a", "variable" ), ( "*", "operator" ), ( "$b", "variable" ) ]
            , test "// inside a string is not a comment" <|
                \_ -> expectClass "string" "'https://example.com'" "$url = 'https://example.com';"
            ]
        , describe "PHP: strings"
            [ test "an escaped quote does not end a single quoted string" <|
                \_ -> expectClass "string" "'it\\'s'" "echo 'it\\'s', $x;"
            , test "an escaped quote does not end a double quoted string" <|
                \_ -> expectClass "string" "\"say \\\"hi\\\"\"" "echo \"say \\\"hi\\\"\", $x;"
            , test "what follows a string is code again" <|
                \_ -> expectClass "variable" "$x" "echo 'a', $x;"
            ]
        , describe "PHP: names"
            [ test "a class declaration" <|
                \_ ->
                    colored "final class UserController extends Controller"
                        |> Expect.equal [ ( "final", "import" ), ( "class", "import" ), ( "UserController", "module" ), ( "extends", "import" ), ( "Controller", "module" ) ]
            , test "a method declaration with types" <|
                \_ ->
                    colored "public function show(int $id): ?User"
                        |> Expect.equal
                            [ ( "public", "import" )
                            , ( "function", "import" )
                            , ( "show", "function-def" )
                            , ( "(", "parens" )
                            , ( "int", "module" )
                            , ( "$id", "variable" )
                            , ( ")", "parens" )
                            , ( "?", "operator" )
                            , ( "User", "module" )
                            ]
            , test "a static call" <|
                \_ ->
                    colored "Route::get('/', fn () => view('welcome'));"
                        |> List.take 4
                        |> Expect.equal [ ( "Route", "module" ), ( "::", "double-colon" ), ( "get", "function-def" ), ( "(", "parens" ) ]
            , test "a keyword before a parenthesis is still a keyword" <|
                \_ -> expectClass "import" "foreach" "foreach($items as $item) {"
            , test "keywords are only whole words" <|
                \_ -> colored "$form->format()" |> Expect.equal [ ( "$form", "variable" ), ( "->", "skinny-arrow" ), ( "format", "function-def" ), ( "(", "parens" ), ( ")", "parens" ) ]
            , test "this" <|
                \_ -> expectClass "variable" "$this" "return $this->name;"
            , test "the null-safe arrow" <|
                \_ -> expectClass "skinny-arrow" "?->" "$user?->name"
            , test "an array arrow" <|
                \_ -> expectClass "skinny-arrow" "=>" "['key' => 1]"
            , test "a number" <|
                \_ -> expectClass "number" "3.14" "$pi = 3.14;"
            , test "strict comparison is one operator" <|
                \_ -> expectClass "operator" "===" "if ($a === null) {"
            , test "null coalescing" <|
                \_ -> expectClass "operator" "??" "$a ?? 'none'"
            ]
        ]
