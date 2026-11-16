module Editor.Syntax.Util exposing (fillInTokens, getCurrentToken, highlight, maxHighlightedLineLength, tokenize, viewLine)

import Editor.Constants as Constants
import Editor.Msg exposing (RenderableLine)
import Editor.Syntax.SymbolKind exposing (kindToSymbolClass)
import Editor.Syntax.Types exposing (..)
import Html exposing (div, text)
import Html.Attributes exposing (classList, style)
import Html.Parser
import Html.Parser.Util
import List.Extra
import Regex


{-| A line longer than this is shown without colors. Coloring makes an
element for every token: on a line of tens of thousands of characters (a
minified bundle, a pasted blob) that is tens of thousands of elements, built
again at every key typed on the line.
-}
maxHighlightedLineLength : Int
maxHighlightedLineLength =
    5000


{-| The tokens of a line with the text between them filled in as tokens
without a class, so that together they cover the line from start to end.

One pass over the tokens. (This used to look through all tokens for every
character of the line, and to append to the end of a list for every token:
the time went up with the square of the line's length, and a long line took
seconds at every key.)

-}
fillInTokens : String -> List Token -> List Token
fillInTokens contents tokens =
    let
        plain from to =
            { class = "", styles = [], index = from, length = to - from }

        ( covered, reversed ) =
            List.foldl
                (\token ( position, acc ) ->
                    if token.index < position || token.length <= 0 then
                        -- starts inside what is already covered, or is empty
                        ( position, acc )

                    else if token.index > position then
                        ( token.index + token.length, token :: plain position token.index :: acc )

                    else
                        ( token.index + token.length, token :: acc )
                )
                ( 0, [] )
                tokens

        length =
            String.length contents
    in
    List.reverse
        (if covered < length then
            plain covered length :: reversed

         else
            reversed
        )


highlight : String -> List MultilineSymbol -> List Editor.Syntax.Types.Error -> List Token -> List (Html.Html msg)
highlight contents symbols lineErrors tokens =
    -- ensure contents not covered by symbols are still tokenized
    let
        filledInTokens =
            fillInTokens contents tokens

        tokensLength =
            List.length tokens
    in
    List.concat <|
        List.indexedMap
            (\index token ->
                let
                    matchTokenErrors =
                        List.filter
                            (\err ->
                                case err.col of
                                    Just col ->
                                        (col >= token.index && col < token.index + token.length)
                                            || ((col >= String.length contents) && index == tokensLength)

                                    Nothing ->
                                        False
                            )
                            lineErrors

                    ( tokenClass, tokenStyles ) =
                        List.Extra.find
                            (\symbol ->
                                symbol.start <= token.index && Maybe.withDefault (String.length contents) symbol.end >= (token.index + token.length)
                            )
                            symbols
                            |> Maybe.map (\symbol -> ( kindToSymbolClass symbol.kind, symbol.styles ))
                            |> Maybe.withDefault ( token.class, token.styles )
                in
                [ Html.span
                    ([ Html.Attributes.class tokenClass
                     , Html.Attributes.classList
                        [ ( "error"
                          , List.length matchTokenErrors > 0
                          )
                        ]
                     ]
                        ++ List.map (\( k, v ) -> Html.Attributes.style k v) tokenStyles
                    )
                    [ text (String.slice token.index (token.index + token.length) contents)
                    , case List.head matchTokenErrors of
                        Nothing ->
                            text ""

                        Just error ->
                            div [ Html.Attributes.class "message" ]
                                (case Html.Parser.run error.message of
                                    Ok parsedNodes ->
                                        Html.Parser.Util.toVirtualDom parsedNodes

                                    Err err ->
                                        []
                                )
                    ]
                ]
            )
            filledInTokens


viewLine : Maybe Syntax -> String -> List Editor.Syntax.Types.MultilineSymbol -> List Editor.Syntax.Types.Error -> Html.Html msg
viewLine syntax contents symbols errors =
    case syntax of
        Nothing ->
            case List.length symbols of
                0 ->
                    Html.div [ style "height" "1.5rem", style "display" "flex" ] [ text contents ]

                _ ->
                    Html.div [ style "height" "1.5rem", style "display" "flex" ]
                        (highlight contents
                            symbols
                            []
                            (symbolsToTokens contents symbols)
                        )

        Just s ->
            let
                fullLineErrors =
                    List.filter (\error -> error.col == Nothing) errors

                fullLineError =
                    case List.head fullLineErrors of
                        Nothing ->
                            Nothing

                        Just error ->
                            Just (Html.div [ Html.Attributes.class "message" ] [ text error.message ])
            in
            div
                [ classList
                    [ ( "error"
                      , fullLineError /= Nothing
                      )
                    ]
                ]
                (Maybe.withDefault (text "") fullLineError
                    :: highlight contents
                        symbols
                        errors
                        (if String.length contents > maxHighlightedLineLength then
                            []

                         else
                            tokenize contents s
                        )
                )


symbolsToTokens : String -> List MultilineSymbol -> List Token
symbolsToTokens contents symbols =
    List.foldl
        (\{ start, end, styles } acc ->
            let
                len =
                    String.length
                        (String.slice start
                            (case end of
                                Nothing ->
                                    String.length contents

                                Just e ->
                                    e
                            )
                            contents
                        )
            in
            case len of
                0 ->
                    acc

                _ ->
                    acc
                        ++ [ { index = start
                             , class = ""
                             , styles = styles
                             , length = len
                             }
                           ]
        )
        []
        symbols


positionToSyntaxToken : ( Maybe Int, Int, Int ) -> Syntax -> Maybe Token
positionToSyntaxToken ( position, index, matchLength ) syntax =
    case position of
        Just syntaxIndex ->
            Just
                { index = index
                , class = Maybe.withDefault "" <| Maybe.map .class <| List.Extra.getAt syntaxIndex syntax
                , styles = []
                , length = matchLength
                }

        _ ->
            Nothing


tokenize : String -> Syntax -> List Token
tokenize text syntaxMatches =
    List.filterMap identity <|
        List.map
            (\match ->
                let
                    matchTypeIndex =
                        List.Extra.findIndex
                            (\is ->
                                case is of
                                    Just _ ->
                                        True

                                    _ ->
                                        False
                            )
                            match.submatches

                    firstSubmatch =
                        Maybe.withDefault "" <| List.head (List.filterMap identity match.submatches)
                in
                positionToSyntaxToken ( matchTypeIndex, match.index, String.length firstSubmatch ) syntaxMatches
            )
        <|
            Regex.find (Maybe.withDefault Regex.never <| Regex.fromString (String.join "|" (List.map .regex syntaxMatches))) text


getCurrentToken : Int -> Int -> List RenderableLine -> String
getCurrentToken x y renderableLines =
    List.Extra.getAt y renderableLines
        |> Maybe.map .text
        |> Maybe.map (String.slice 0 x)
        |> Maybe.map String.reverse
        |> Maybe.map (Regex.findAtMost 1 (Maybe.withDefault Regex.never <| Regex.fromString "[^\\s]+"))
        |> Maybe.andThen List.head
        |> Maybe.map .match
        |> Maybe.map String.reverse
        |> Maybe.withDefault ""
