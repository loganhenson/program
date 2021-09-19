module FileTree.Model exposing (..)

import ContextMenu.Types exposing (ContextMenu)
import Dict exposing (Dict)
import Editor.RawKeyboard exposing (RawKey)
import FileTree.Types exposing (..)
import Html exposing (Html)


type alias Model =
    { fileTree : FileTree
    , flatTree : List FileOrDirectory
    , pressedKey : Maybe RawKey
    , error : Maybe FileTreeError
    , activeFile : Maybe String
    , openDirectories : Dict String FileOrDirectory
    , selectedPaths : Dict String FileOrDirectory
    , contextMenu : Maybe (ContextMenu Msg)
    , creating : Maybe FileOrDirectory
    , deleting : Maybe (List FileOrDirectory)
    }
