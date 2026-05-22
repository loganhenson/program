module FuzzyFinder.FuzzyFinder exposing (..)

import FuzzyFinder.Model exposing (Model)
import Html exposing (Html, div, text)
import Html.Attributes exposing (class, classList, id, spellcheck)
import Html.Events exposing (onClick, onInput)
import Layout exposing (viewDialog)
import Msg exposing (Msg(..))


init : Model
init =
    { fuzzyFinderInputValue = ""
    , fuzzyFinderHighlightedIndex = 0
    , fuzzyFindResults = []
    }


{-| Hard cap on how many fuzzy results we render at once. Rendering every
match is fine when results count in the tens, but searching a large
monorepo can return thousands; each row is a DOM node and the UI locks
up well before the user can scroll to the bottom. The Rust side already
caps at 5000 — this caps the rendered subset to keep the DOM small.
The user is expected to narrow the query if their target is missing.
-}
maxRenderedResults : Int
maxRenderedResults =
    200


view : Model -> Maybe String -> Html Msg
view model projectPath =
    viewDialog
        "Search..."
        ""
        [ Html.input
            [ class "w-full p-2 text-gray-900 outline-none"
            , id "vide-fuzzy-finder-input"
            , spellcheck False
            , onInput
                (case projectPath of
                    Just _ ->
                        FuzzyFindInProjectFileOrDirectory

                    Nothing ->
                        FuzzyFindProjects
                )
            ]
            []
        , case String.length model.fuzzyFinderInputValue > 0 of
            True ->
                case List.length model.fuzzyFindResults > 0 of
                    True ->
                        viewFuzzyFinderResults model projectPath

                    False ->
                        div [ class "p-2" ] [ text "No Results." ]

            False ->
                text ""
        ]


viewFuzzyFinderResults : Model -> Maybe String -> Html Msg
viewFuzzyFinderResults model projectPath =
    let
        visible =
            List.take maxRenderedResults model.fuzzyFindResults

        hidden =
            List.length model.fuzzyFindResults - List.length visible

        truncationNotice =
            if hidden > 0 then
                div
                    [ class "p-2 text-xs text-gray-400 italic" ]
                    [ text ("Showing first " ++ String.fromInt maxRenderedResults ++ " of " ++ String.fromInt (List.length model.fuzzyFindResults) ++ " results — narrow the search to see more.") ]

            else
                text ""
    in
    div
        [ class "overflow-y-scroll h-full"
        ]
        (List.indexedMap
            (\index result ->
                div
                    [ class "p-2"
                    , classList
                        [ ( "bg-blue-700"
                          , index == model.fuzzyFinderHighlightedIndex
                          )
                        ]
                    , onClick
                        (case projectPath of
                            Just _ ->
                                RequestActivateFileOrDirectory result

                            Nothing ->
                                RequestOpenProject result
                        )
                    ]
                    [ text
                        (case projectPath of
                            Just path ->
                                String.replace path "" result

                            Nothing ->
                                result
                        )
                    ]
            )
            visible
            ++ [ truncationNotice ]
        )
