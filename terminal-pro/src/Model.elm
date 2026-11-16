module Model exposing (Model, TerminalTab)

import Terminal.Types


type alias TerminalTab =
    { id : String
    , terminal : Terminal.Types.Model
    , closeArmed : Bool

    -- the bell rang while the tab was in the background
    , attention : Bool
    }


type alias Model =
    { home : String
    , terminals : List TerminalTab
    , activeTerminalIndex : Int
    , terminalCounter : Int
    }
