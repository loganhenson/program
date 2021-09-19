module FuzzyFinder.FuzzyFinder exposing (..)

import FuzzyFinder.Model exposing (Model)
import Html exposing (Html, div, text)
import Html.Attributes exposing (class, classList, id)
import Html.Events exposing (onClick, onInput)
import Layout exposing (viewDialog)
import Msg exposing (Msg(..))


init : Model
init =
    { fuzzyFinderInputValue = ""
    , fuzzyFinderHighlightedIndex = 0
    , fuzzyFindResults = []
    }


view : Model -> Maybe String -> Html Msg
view model projectPath =
    viewDialog
        "Search..."
        ""
        [ Html.input
            [ class "w-full p-2 text-gray-900 outline-none"
            , id "vide-fuzzy-finder-input"
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
            model.fuzzyFindResults
        )
