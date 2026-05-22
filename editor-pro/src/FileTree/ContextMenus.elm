module FileTree.ContextMenus exposing (..)

import ContextMenu.ContextMenu
import ContextMenu.Types
import FileTree.Types exposing (FileOrDirectory, FileOrDirectoryType(..), Msg(..))
import Utils exposing (dirname)


noFileOrDirectoryContextMenu : String -> ContextMenu.Types.ContextMenuView Msg
noFileOrDirectoryContextMenu rootPath =
    ContextMenu.ContextMenu.makeContextMenu ContextMenuMsg
        [ ( "New File", StartCreateNewFile rootPath )
        , ( "New Directory", StartCreateNewDirectory rootPath )
        ]


fileOrDirectoryContextMenu : FileOrDirectory -> ContextMenu.Types.ContextMenuView Msg
fileOrDirectoryContextMenu fileOrDirectory =
    ContextMenu.ContextMenu.makeContextMenu ContextMenuMsg
        [ ( "New File"
          , StartCreateNewFile
                (case fileOrDirectory.type_ of
                    FileOrDirectoryDirectory ->
                        fileOrDirectory.path

                    FileOrDirectoryFile ->
                        dirname fileOrDirectory.path

                    FileOrDirectoryOpaque ->
                        dirname fileOrDirectory.path
                )
          )
        , ( "New Directory"
          , StartCreateNewDirectory
                (case fileOrDirectory.type_ of
                    FileOrDirectoryDirectory ->
                        fileOrDirectory.path

                    FileOrDirectoryFile ->
                        dirname fileOrDirectory.path

                    FileOrDirectoryOpaque ->
                        dirname fileOrDirectory.path
                )
          )
        , ( "Delete"
          , StartDelete [ fileOrDirectory ]
          )
        ]
