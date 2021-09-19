module ContextMenu.ContextMenu exposing (getSelectedMsg, makeContextMenu, onContextMenu, update, view, viewContextMenuOption)

import ContextMenu.Decoders exposing (decodeClickLocation)
import ContextMenu.Types exposing (ContextMenu, ContextMenuOptionView, ContextMenuView, Msg(..))
import Html exposing (Attribute, div, text)
import Html.Attributes exposing (class, classList, style)
import Html.Events exposing (custom, on, onClick, stopPropagationOn)
import Json.Decode
import List.Extra


makeContextMenu contextMenuMsg options selected =
    List.indexedMap
        (\index ( label, msg ) ->
            ( viewContextMenuOption label (selected == index), ( msg, contextMenuMsg <| ContextMenu.Types.HoverContextOption index ) )
        )
        options


getSelectedMsg : ContextMenu msg -> Maybe msg
getSelectedMsg model =
    case List.Extra.getAt model.selected (model.view 0) of
        Just ( _, ( selectedMsg, _ ) ) ->
            Just selectedMsg

        Nothing ->
            Nothing


onContextMenu : (ContextMenu msg -> msg) -> (Int -> List (ContextMenuOptionView msg)) -> Html.Attribute msg
onContextMenu showContextMenuMsg contextMenuView =
    custom "contextmenu" <|
        Json.Decode.map (\message -> { message = message, preventDefault = False, stopPropagation = True }) <|
            Json.Decode.map
                (\clickLocation -> showContextMenuMsg (ContextMenu contextMenuView clickLocation 0))
                decodeClickLocation


viewContextMenuOption : String -> Bool -> ( msg, msg ) -> Html.Html msg
viewContextMenuOption label active ( clickMsg, hoverMsg ) =
    div [ onClick clickMsg, on "mouseover" (Json.Decode.succeed hoverMsg), class "p-2", classList [ ( "bg-blue-500", active ) ] ]
        [ text label
        ]


stopClickPropagation : msg -> Attribute msg
stopClickPropagation noOpMsg =
    stopPropagationOn "click" (Json.Decode.succeed ( noOpMsg, True ))


view : msg -> ContextMenu msg -> Html.Html msg
view noOpMsg model =
    div
        [ stopClickPropagation noOpMsg
        , class "absolute bg-lightgray shadow-lg z-10"
        , style "left" (String.fromInt model.location.x)
        , style "top" (String.fromInt model.location.y)
        ]
        (List.foldr
            (\( option, msg ) acc ->
                option msg :: acc
            )
            []
            (model.view model.selected)
        )


update : Msg -> ContextMenu msg -> ( ContextMenu msg, Cmd msg )
update msg model =
    case msg of
        HoverContextOption index ->
            ( { model | selected = index }
            , Cmd.none
            )

        DownArrow ->
            let
                optionsCount =
                    List.length (model.view 0) - 1
            in
            ( { model | selected = min optionsCount (model.selected + 1) }, Cmd.none )

        UpArrow ->
            ( { model | selected = max 0 (model.selected - 1) }, Cmd.none )

        NoOp ->
            ( model, Cmd.none )
