module Model exposing (Model)

import Notification.Types
import Workspace.Types exposing (Workspace)


type alias Model =
    { workspaces : List Workspace
    , activeIndex : Int
    , notifications : List ( Int, Notification.Types.Notification )
    , recentProjects : List String
    }
