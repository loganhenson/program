module Styles exposing (suite)

import Expect
import Support exposing (..)
import Terminal.Color
import Terminal.Screen as Screen
import Terminal.Types exposing (..)
import Test exposing (..)


has : Int -> Int -> Int -> Terminal -> Bool
has attribute x y terminal =
    Screen.hasAttribute attribute (styleAt x y terminal)


suite : Test
suite =
    describe "Colors and text attributes (SGR)"
        [ test "each attribute is set by its own code" <|
            \_ ->
                let
                    terminal =
                        run 2
                            20
                            [ one "[m" 1
                            , txt "b"
                            , one "[m" 0
                            , one "[m" 2
                            , txt "d"
                            , one "[m" 0
                            , one "[m" 3
                            , txt "i"
                            , one "[m" 0
                            , one "[m" 4
                            , txt "u"
                            , one "[m" 0
                            , one "[m" 7
                            , txt "r"
                            , one "[m" 0
                            , one "[m" 9
                            , txt "s"
                            , one "[m" 0
                            , txt "n"
                            ]
                in
                Expect.equal
                    [ has Screen.attributeBold 0 0 terminal
                    , has Screen.attributeDim 1 0 terminal
                    , has Screen.attributeItalic 2 0 terminal
                    , has Screen.attributeUnderline 3 0 terminal
                    , has Screen.attributeInverse 4 0 terminal
                    , has Screen.attributeStrike 5 0 terminal
                    , styleAt 6 0 terminal == Screen.defaultStyle
                    ]
                    [ True, True, True, True, True, True, True ]
        , test "attributes are turned off individually, leaving the others on" <|
            \_ ->
                let
                    terminal =
                        run 2
                            20
                            [ one "[m" 1
                            , one "[m" 3
                            , one "[m" 4
                            , one "[m" 7
                            , one "[m" 22
                            , txt "a"
                            , one "[m" 23
                            , txt "b"
                            , one "[m" 24
                            , txt "c"
                            , one "[m" 27
                            , txt "d"
                            ]
                in
                Expect.equal
                    [ ( has Screen.attributeBold 0 0 terminal, has Screen.attributeItalic 0 0 terminal )
                    , ( has Screen.attributeItalic 1 0 terminal, has Screen.attributeUnderline 1 0 terminal )
                    , ( has Screen.attributeUnderline 2 0 terminal, has Screen.attributeInverse 2 0 terminal )
                    , ( has Screen.attributeInverse 3 0 terminal, styleAt 3 0 terminal == Screen.defaultStyle )
                    ]
                    [ ( False, True ), ( False, True ), ( False, True ), ( False, True ) ]
        , test "two attributes in one sequence are both applied (bold green prompt)" <|
            \_ ->
                let
                    style =
                        styleAt 0 0 (run 2 20 [ two "[m" 1 32, txt "x" ])
                in
                Expect.equal ( Screen.hasAttribute Screen.attributeBold style, style.foreground ) ( True, IndexedColor 2 )
        , test "a reset in front of a color clears what was set before" <|
            \_ ->
                styleAt 0 0 (run 2 20 [ one "[m" 1, one "[m" 41, two "[m" 0 33, txt "x" ])
                    |> Expect.equal { defaultStyle | foreground = IndexedColor 3 }
        , test "the 8 normal and 8 bright colors, foreground and background" <|
            \_ ->
                let
                    terminal =
                        run 2 20 [ one "[m" 31, one "[m" 44, txt "a", one "[m" 91, one "[m" 104, txt "b", one "[m" 39, one "[m" 49, txt "c" ]
                in
                Expect.equal
                    [ ( (styleAt 0 0 terminal).foreground, (styleAt 0 0 terminal).background )
                    , ( (styleAt 1 0 terminal).foreground, (styleAt 1 0 terminal).background )
                    , ( (styleAt 2 0 terminal).foreground, (styleAt 2 0 terminal).background )
                    ]
                    [ ( IndexedColor 1, IndexedColor 4 )
                    , ( IndexedColor 9, IndexedColor 12 )
                    , ( DefaultColor, DefaultColor )
                    ]
        , test "256 colors and true color" <|
            \_ ->
                let
                    terminal =
                        run 2 20 [ one "[m-fg-256" 196, one "[m-bg-256" 255, txt "a", three "[m-fg-rgb" 1 2 3, three "[m-bg-rgb" 254 253 252, txt "b" ]
                in
                Expect.equal
                    [ styleAt 0 0 terminal, styleAt 1 0 terminal ]
                    [ { defaultStyle | foreground = IndexedColor 196, background = IndexedColor 255 }
                    , { defaultStyle | foreground = RgbColor 1 2 3, background = RgbColor 254 253 252 }
                    ]
        , test "every one of the 16 ANSI colors is a valid CSS color" <|
            -- bright red used to be spelled "rbg(...)", which browsers ignore
            \_ ->
                List.range 0 15
                    |> List.map (\index -> Terminal.Color.toCss (IndexedColor index))
                    |> Expect.equal
                        [ Just "rgb(0,0,0)"
                        , Just "rgb(194,54,33)"
                        , Just "rgb(37,188,36)"
                        , Just "rgb(173,173,39)"
                        , Just "rgb(73,46,225)"
                        , Just "rgb(211,56,211)"
                        , Just "rgb(51,187,200)"
                        , Just "rgb(203,204,205)"
                        , Just "rgb(129,131,131)"
                        , Just "rgb(252,57,31)"
                        , Just "rgb(49,231,34)"
                        , Just "rgb(234,236,35)"
                        , Just "rgb(88,51,255)"
                        , Just "rgb(249,53,248)"
                        , Just "rgb(20,240,240)"
                        , Just "rgb(233,235,235)"
                        ]
        , test "the 256 color palette: color cube and gray ramp" <|
            \_ ->
                [ 16, 21, 196, 231, 232, 255 ]
                    |> List.map (\index -> Terminal.Color.toCss (IndexedColor index))
                    |> Expect.equal
                        [ Just "rgb(0,0,0)"
                        , Just "rgb(0,0,255)"
                        , Just "rgb(255,0,0)"
                        , Just "rgb(255,255,255)"
                        , Just "rgb(8,8,8)"
                        , Just "rgb(238,238,238)"
                        ]
        , test "erased cells take the current background color and nothing else" <|
            \_ ->
                let
                    terminal =
                        run 2 10 [ txt "abcdef", one "[m" 1, one "[m" 31, one "[m" 44, two "[H" 1 3, seq "[K" ]
                in
                Expect.equal
                    ( rows terminal, styleAt 5 0 terminal )
                    ( [ "ab", "" ], { defaultStyle | background = IndexedColor 4 } )
        , test "a hyperlink marks the text until it is closed" <|
            \_ ->
                let
                    terminal =
                        run 2 20 [ str "hyperlink" "https://example.com", txt "link", str "hyperlink" "", txt "x" ]
                in
                Expect.equal
                    ( (styleAt 0 0 terminal).link, (styleAt 3 0 terminal).link, (styleAt 4 0 terminal).link )
                    ( "https://example.com", "https://example.com", "" )
        ]


defaultStyle : Style
defaultStyle =
    Screen.defaultStyle
