module Model exposing (Model)

import Editor.Msg
import FileTree.Model
import FuzzyFinder.Model
import Notification.Types
import Terminal.Types
import Types exposing (Focused)


type alias Model =
    { editor : Maybe Editor.Msg.Model
    , fileHistory : List ( String, String )
    , activeFile : Maybe String
    , terminal : Maybe Terminal.Types.Model
    , terminalShowing : Bool
    , fileTree : Maybe FileTree.Model.Model
    , fileTreeShowing : Bool
    , focused : Focused
    , fuzzyFinder : FuzzyFinder.Model.Model
    , notifications : List Notification.Types.Notification
    }
