module Types exposing (..)

import FileTree.Types exposing (FileTreeError)


type VideErrorType
    = FileTreeError FileTreeError


type alias VideError =
    { type_ : VideErrorType, message : String }


type Focused
    = Editor
    | FileTree
    | Terminal
    | FuzzyFinder
