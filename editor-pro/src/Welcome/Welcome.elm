module Welcome.Welcome exposing (view)

import Html exposing (Html, button, div, span, text)
import Html.Attributes exposing (class, style, title)
import Html.Events exposing (onClick)


view :
    { recents : List String
    , onOpenFolder : msg
    , onOpenRecent : String -> msg
    }
    -> Html msg
view { recents, onOpenFolder, onOpenRecent } =
    div
        [ class "flex-1 flex justify-center items-center w-full h-full"
        , style "color" "#d4d4d4"
        ]
        [ div
            [ class "flex flex-col"
            , style "width" "520px"
            , style "max-width" "90%"
            , style "gap" "24px"
            ]
            [ heading
            , primaryButton onOpenFolder
            , recentsList recents onOpenRecent
            , footerHint
            ]
        ]


heading : Html msg
heading =
    div [ class "flex flex-col", style "gap" "4px" ]
        [ div
            [ class "text-2xl"
            , style "font-weight" "600"
            ]
            [ text "EditorPro" ]
        , div
            [ class "text-sm"
            , style "color" "#9aa0a6"
            ]
            [ text "Open a folder to start." ]
        ]


primaryButton : msg -> Html msg
primaryButton onClickMsg =
    button
        [ onClick onClickMsg
        , class "text-base"
        , style "background" "#2b6cb0"
        , style "color" "#ffffff"
        , style "border" "0"
        , style "border-radius" "6px"
        , style "padding" "12px 18px"
        , style "cursor" "pointer"
        , style "font-weight" "500"
        , style "text-align" "left"
        ]
        [ text "Open folder…" ]


recentsList : List String -> (String -> msg) -> Html msg
recentsList recents onOpenRecent =
    case recents of
        [] ->
            text ""

        _ ->
            div [ class "flex flex-col", style "gap" "8px" ]
                [ div
                    [ class "text-xs uppercase tracking-wide"
                    , style "color" "#9aa0a6"
                    , style "letter-spacing" "0.08em"
                    ]
                    [ text "Recent projects" ]
                , div [ class "flex flex-col", style "gap" "2px" ]
                    (List.map (recentRow onOpenRecent) recents)
                ]


recentRow : (String -> msg) -> String -> Html msg
recentRow onOpenRecent path =
    let
        ( label, parent ) =
            splitPath path
    in
    button
        [ onClick (onOpenRecent path)
        , title path
        , class "text-left"
        , style "background" "transparent"
        , style "border" "0"
        , style "color" "#d4d4d4"
        , style "padding" "6px 8px"
        , style "border-radius" "4px"
        , style "cursor" "pointer"
        , style "display" "flex"
        , style "flex-direction" "column"
        , style "gap" "2px"
        ]
        [ span [ style "font-weight" "500" ] [ text label ]
        , span [ style "color" "#7a8088", style "font-size" "12px" ] [ text parent ]
        ]


footerHint : Html msg
footerHint =
    div
        [ class "text-xs"
        , style "color" "#7a8088"
        , style "margin-top" "8px"
        ]
        [ text "Or press "
        , span [ style "font-family" "monospace", style "color" "#aaaaaa" ] [ text "⌘⇧O" ]
        , text " to fuzzy-find a project."
        ]


splitPath : String -> ( String, String )
splitPath path =
    case List.reverse (String.split "/" path) of
        last :: rest ->
            ( last, String.join "/" (List.reverse rest) )

        [] ->
            ( path, "" )
