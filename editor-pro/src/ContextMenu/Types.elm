module ContextMenu.Types exposing (..)

import Html exposing (Html)


type alias Location =
    { x : Int
    , y : Int
    }


type alias ContextMenuOptionView msg =
    ( ( msg, msg ) -> Html msg, ( msg, msg ) )


type alias ContextMenuView msg =
    Int -> List (ContextMenuOptionView msg)


type alias ContextMenu msg =
    { view : ContextMenuView msg
    , location : Location
    , selected : Int
    }


type Msg
    = HoverContextOption Int
    | DownArrow
    | UpArrow
    | NoOp
