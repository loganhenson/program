module Tabs.Tabs exposing (view)

import Html exposing (Html, button, div, span, text)
import Html.Attributes exposing (class, classList, style, title)
import Html.Events exposing (onClick)
import Msg exposing (Msg(..))
import Workspace.Types exposing (Workspace)


{-| Render the project-tabs strip at the top of the window.

  - Tabs scroll horizontally when they don't fit.
  - The `+` button lives in a sibling container so it stays pinned right
    even when the strip is scrolled.

`closeArmed` on each workspace is the inline two-click confirmation
state for the `×` button; see `Step 3` for its wiring.

-}
view :
    { workspaces : List Workspace
    , activeIndex : Int
    }
    -> Html Msg
view { workspaces, activeIndex } =
    div
        [ class "flex flex-row select-none"
        , style "height" "32px"
        , style "background" "#1e1e1e"
        , style "border-bottom" "1px solid #333"
        , style "flex-shrink" "0"
        ]
        [ div
            [ class "flex flex-row"
            , style "flex" "1 1 auto"
            , style "min-width" "0"
            , style "overflow-x" "auto"
            ]
            (List.indexedMap (\i ws -> viewTab i (i == activeIndex) ws) workspaces)
        , div
            [ style "flex-shrink" "0"
            , style "display" "flex"
            , style "align-items" "stretch"
            ]
            [ addButton ]
        ]


viewTab : Int -> Bool -> Workspace -> Html Msg
viewTab idx isActive ws =
    let
        name =
            basename ws.projectPath
    in
    div
        [ classList
            [ ( "border-blue-400", isActive )
            ]
        , style "padding" "0 8px 0 12px"
        , style "min-width" "0"
        , style "max-width" "180px"
        , style "display" "flex"
        , style "align-items" "center"
        , style "gap" "6px"
        , style "cursor" "pointer"
        , style "border-right" "1px solid #333"
        , style "border-bottom"
            (if isActive then
                "2px solid #4a9eff"

             else
                "2px solid transparent"
            )
        , style "background"
            (if isActive then
                "#2a2a2a"

             else
                "#1e1e1e"
            )
        , style "color"
            (if isActive then
                "#d4d4d4"

             else
                "#9aa0a6"
            )
        , title ws.projectPath
        , onClick (SelectTab idx)
        ]
        [ span
            [ style "font-size" "12px"
            , style "white-space" "nowrap"
            , style "overflow" "hidden"
            , style "text-overflow" "ellipsis"
            , style "flex" "1 1 auto"
            , style "min-width" "0"
            ]
            [ text name ]
        , viewCloseButton idx ws
        ]


viewCloseButton : Int -> Workspace -> Html Msg
viewCloseButton idx ws =
    if ws.closeArmed then
        button
            [ onClick (CloseConfirmed idx)
            , style "background" "#c0392b"
            , style "border" "0"
            , style "color" "#ffffff"
            , style "cursor" "pointer"
            , style "font-size" "10px"
            , style "padding" "2px 6px"
            , style "border-radius" "3px"
            , title "Click again to close (auto-cancels in a few seconds)"
            ]
            [ text "Confirm?" ]

    else
        button
            [ onClick (CloseRequested idx)
            , style "background" "transparent"
            , style "border" "0"
            , style "color" "#7a8088"
            , style "cursor" "pointer"
            , style "font-size" "14px"
            , style "line-height" "1"
            , style "padding" "0 4px"
            , title "Close tab"
            ]
            [ text "×" ]


addButton : Html Msg
addButton =
    button
        [ onClick AddTabRequested
        , style "background" "transparent"
        , style "border" "0"
        , style "border-left" "1px solid #333"
        , style "color" "#9aa0a6"
        , style "cursor" "pointer"
        , style "font-size" "16px"
        , style "line-height" "1"
        , style "padding" "0 14px"
        , title "Open another project"
        ]
        [ text "+" ]


basename : String -> String
basename path =
    let
        trimmed =
            if String.endsWith "/" path then
                String.dropRight 1 path

            else
                path
    in
    case List.reverse (String.split "/" trimmed) of
        last :: _ ->
            if String.isEmpty last then
                trimmed

            else
                last

        [] ->
            trimmed
