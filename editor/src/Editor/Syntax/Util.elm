module Editor.Syntax.Util exposing (getCurrentToken, highlight, tokenize, viewLine)

import Editor.Msg exposing (RenderableLine)
import Editor.Syntax.SymbolKind exposing (kindToSymbolClass)
import Editor.Syntax.Types exposing (..)
import Html exposing (div, text)
import Html.Attributes exposing (classList, style)
import Html.Parser
import Html.Parser.Util
import List.Extra
import Regex


highlight : String -> List MultilineSymbol -> List Editor.Syntax.Types.Error -> List Token -> List (Html.Html msg)
highlight contents symbols lineErrors tokens =
    -- ensure contents not covered by symbols are still tokenized
    let
        ( _, _, filledInTokens ) =
            List.Extra.indexedFoldl
                (\charIndex char ( tokenIndex, collected, acc ) ->
                    if charIndex < tokenIndex then
                        -- if the current char is before the last token position
                        -- continue
                        ( tokenIndex, collected, acc )

                    else
                        case List.Extra.find (\token -> token.index == charIndex) tokens of
                            Just token ->
                                -- if there is a token that covers this char, insert it and update the tokenIndex
                                case String.length collected of
                                    0 ->
                                        ( token.index + token.length, "", acc ++ [ token ] )

                                    len ->
                                        ( token.index + token.length, "", List.concat [ acc, [ { class = "", styles = [], index = charIndex - len, length = len } ], [ token ] ] )

                            Nothing ->
                                if charIndex == String.length contents - 1 then
                                    let
                                        len =
                                            String.length collected
                                    in
                                    ( 0, "", acc ++ [ { class = "", styles = [], index = charIndex - len, length = len + 1 } ] )

                                else
                                    ( tokenIndex + 1, collected ++ char, acc )
                )
                ( 0, "", [] )
                (String.split "" contents)

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
                    :: highlight contents symbols errors (tokenize contents s)
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
