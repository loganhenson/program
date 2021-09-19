module Layout exposing (..)

import Html exposing (div, text)
import Html.Attributes exposing (class, style)


viewDialog : String -> String -> List (Html.Html msg) -> Html.Html msg
viewDialog title subtitle children =
    div
        [ class "absolute h-screen w-screen z-10 bg-transparent flex justify-center shadow-lg"
        ]
        [ div
            [ class "flex flex-col max-w-1/2 h-1/2 bg-lightgray text-white mt-12"
            , style "max-height" "50%"
            , style "height" "min-content"
            ]
            ([ div [ class "p-2 bg-lightgray text-white flex justify-between" ]
                [ div [] [ text title ]
                , div [] [ text subtitle ]
                ]
             ]
                ++ children
            )
        ]
