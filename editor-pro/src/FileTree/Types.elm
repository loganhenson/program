module FileTree.Types exposing (..)

import Browser.Dom
import ContextMenu.Types


type FileTreeError
    = DirectoryAlreadyExistsError String


type alias File =
    { path : String
    , contents : String
    }


type alias FileTreeAndFlat =
    { tree : FileTree
    , flat : List FileOrDirectory
    }


type alias FileTree =
    { path : String
    , name : String
    , type_ : FileOrDirectoryType
    , children : Maybe Children
    }


type FileOrDirectoryType
    = FileOrDirectoryFile
    | FileOrDirectoryDirectory


type alias FileOrDirectory =
    { path : String
    , name : String
    , type_ : FileOrDirectoryType
    }


type Children
    = Children (List FileTree)


type Msg
    = ActivateFile String
    | ActivateDirectory String
    | FileTreeClicked
    | OpenDirectory FileOrDirectory
    | CreateFile String
    | CreateDirectory String
    | Delete (List FileOrDirectory)
    | CancelDelete
    | CloseDirectory String
    | RightArrow
    | LeftArrow
    | DownArrow
    | Enter
    | Refresh String
    | UpArrow
    | StartCreateNewFile String
    | StartCreateNewDirectory String
    | StartDelete (List FileOrDirectory)
    | FocusElementByIdResult (Result Browser.Dom.Error ())
    | SetCreatingName String
    | SelectFileOrDirectory FileOrDirectory
    | ContextMenuMsg ContextMenu.Types.Msg
    | ShowContextMenu (ContextMenu.Types.ContextMenu Msg)
    | NoOp
