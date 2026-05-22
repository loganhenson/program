module Workspace.Types exposing (Workspace)

import Editor.Msg
import FileTree.Model
import FuzzyFinder.Model
import Terminal.Types
import Types exposing (Focused)


{-| A single project tab. Every field that used to live directly on the
top-level Model and was logically per-project now lives here. The
`projectPath` doubles as the workspace's identity — opening the same
folder twice focuses the existing tab rather than creating a duplicate.

`closeArmed` tracks the "click × once → confirm" UX for closing the tab.
-}
type alias Workspace =
    { projectPath : String
    , editor : Maybe Editor.Msg.Model
    , fileHistory : List ( String, String )
    , activeFile : Maybe String
    , terminal : Maybe Terminal.Types.Model
    , terminalShowing : Bool
    , fileTree : Maybe FileTree.Model.Model
    , fileTreeShowing : Bool
    , focused : Focused
    , fuzzyFinder : FuzzyFinder.Model.Model
    , closeArmed : Bool
    }
