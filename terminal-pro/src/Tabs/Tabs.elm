module Tabs.Tabs exposing (TabItem, view)

import Html exposing (Html, button, div, span, text)
import Html.Attributes exposing (class, classList, style, title)
import Html.Events exposing (onClick, stopPropagationOn)
import Json.Decode


type alias TabItem =
    { label : String
    , tooltip : Maybe String
    , closeArmed : Bool
    }


{-| Render a horizontal tab strip with a pinned `+` button.

  - Tabs scroll horizontally when they don't fit; the `+` stays right.
  - Each tab has a close button; first click flips its `closeArmed`
    state (so the parent renders it as a red "Confirm?"); second click
    fires `onConfirmClose`.
  - All msg-producing callbacks come from the parent so this view is
    reusable for both project tabs and terminal tabs.

-}
view :
    { tabs : List TabItem
    , activeIndex : Int
    , onSelect : Int -> msg
    , onClose : Int -> msg
    , onConfirmClose : Int -> msg
    , onAdd : msg
    , addTooltip : String
    }
    -> Html msg
view config =
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
            (List.indexedMap
                (\i tab ->
                    viewTab
                        { index = i
                        , isActive = i == config.activeIndex
                        , tab = tab
                        , onSelect = config.onSelect
                        , onClose = config.onClose
                        , onConfirmClose = config.onConfirmClose
                        }
                )
                config.tabs
            )
        , div
            [ style "flex-shrink" "0"
            , style "display" "flex"
            , style "align-items" "stretch"
            ]
            [ addButton config.onAdd config.addTooltip ]
        ]


viewTab :
    { index : Int
    , isActive : Bool
    , tab : TabItem
    , onSelect : Int -> msg
    , onClose : Int -> msg
    , onConfirmClose : Int -> msg
    }
    -> Html msg
viewTab args =
    div
        [ classList [ ( "border-blue-400", args.isActive ) ]
        , style "padding" "0 8px 0 12px"
        , style "min-width" "0"
        , style "max-width" "180px"
        , style "display" "flex"
        , style "align-items" "center"
        , style "gap" "6px"
        , style "cursor" "pointer"
        , style "border-right" "1px solid #333"
        , style "border-bottom"
            (if args.isActive then
                "2px solid #4a9eff"

             else
                "2px solid transparent"
            )
        , style "background"
            (if args.isActive then
                "#2a2a2a"

             else
                "#1e1e1e"
            )
        , style "color"
            (if args.isActive then
                "#d4d4d4"

             else
                "#9aa0a6"
            )
        , title (Maybe.withDefault args.tab.label args.tab.tooltip)
        , onClick (args.onSelect args.index)
        ]
        [ span
            [ style "font-size" "12px"
            , style "white-space" "nowrap"
            , style "overflow" "hidden"
            , style "text-overflow" "ellipsis"
            , style "flex" "1 1 auto"
            , style "min-width" "0"
            ]
            [ text args.tab.label ]
        , viewCloseButton args
        ]


{-| Don't let close-button clicks bubble up to the parent tab div, or
clicking × would also select the tab and immediately disarm/discard the
close intent. -}
onClickStop : msg -> Html.Attribute msg
onClickStop msg =
    stopPropagationOn "click" (Json.Decode.succeed ( msg, True ))


viewCloseButton :
    { index : Int
    , isActive : Bool
    , tab : TabItem
    , onSelect : Int -> msg
    , onClose : Int -> msg
    , onConfirmClose : Int -> msg
    }
    -> Html msg
viewCloseButton args =
    if args.tab.closeArmed then
        button
            [ onClickStop (args.onConfirmClose args.index)
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
            [ onClickStop (args.onClose args.index)
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


addButton : msg -> String -> Html msg
addButton onAdd tooltip =
    button
        [ onClick onAdd
        , style "background" "transparent"
        , style "border" "0"
        , style "border-left" "1px solid #333"
        , style "color" "#9aa0a6"
        , style "cursor" "pointer"
        , style "font-size" "16px"
        , style "line-height" "1"
        , style "padding" "0 14px"
        , title tooltip
        ]
        [ text "+" ]
