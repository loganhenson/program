module FileTree.Encoders exposing (..)

import FileTree.Types exposing (..)
import Json.Encode exposing (..)


encodeFilesAndDirectories : List FileOrDirectory -> Value
encodeFilesAndDirectories filesAndDirectories =
    list encodeFileOrDirectory filesAndDirectories


encodeFileOrDirectory : FileOrDirectory -> Value
encodeFileOrDirectory fileOrDirectory =
    object <|
        [ ( "path", string fileOrDirectory.path )
        , ( "type"
          , case fileOrDirectory.type_ of
                FileOrDirectoryFile ->
                    string "file"

                FileOrDirectoryDirectory ->
                    string "directory"
          )
        ]
