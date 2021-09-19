module FileTree.Lib exposing (..)

import Array
import Dict exposing (Dict)
import FileTree.Model exposing (Model)
import FileTree.Types exposing (FileOrDirectory, FileOrDirectoryType(..))
import List.Extra
import Utils exposing (basename, dirname)


getFileOrDirectoryBelow : Model -> Maybe ( String, { path : String, name : String, type_ : FileOrDirectoryType } )
getFileOrDirectoryBelow model =
    case List.head <| Dict.toList model.selectedPaths of
        Just ( currentSelectedPath, currentSelectedFileOrDirectory ) ->
            case List.Extra.findIndex (\flat -> flat.path == currentSelectedPath) model.flatTree of
                Just index ->
                    case List.Extra.getAt (index + 1) model.flatTree of
                        Just next ->
                            case currentSelectedFileOrDirectory.type_ of
                                FileOrDirectoryDirectory ->
                                    case Dict.member currentSelectedFileOrDirectory.path model.openDirectories of
                                        True ->
                                            Just ( next.path, next )

                                        False ->
                                            case List.Extra.find (\item -> not (String.startsWith currentSelectedFileOrDirectory.path item.path)) <| Array.toList <| (Array.slice (index + 1) -1 <| Array.fromList model.flatTree) of
                                                Just nextFile ->
                                                    Just ( nextFile.path, nextFile )

                                                Nothing ->
                                                    -- We are at the bottom
                                                    Nothing

                                FileOrDirectoryFile ->
                                    Just ( next.path, next )

                        Nothing ->
                            -- We are at the bottom
                            Nothing

                Nothing ->
                    -- Only way to hit this is if our tree and flat tree are out of sync,
                    -- which shouldn't be possible
                    Nothing

        Nothing ->
            -- If we don't currently have anything selected in the tree, do nothing
            Nothing


getFileOrDirectoryAbove : Model -> Maybe ( String, { path : String, name : String, type_ : FileOrDirectoryType } )
getFileOrDirectoryAbove model =
    case List.head <| Dict.toList model.selectedPaths of
        Just ( currentSelectedPath, currentSelectedFileOrDirectory ) ->
            case List.Extra.findIndex (\flat -> flat.path == currentSelectedPath) model.flatTree of
                Just index ->
                    case List.Extra.getAt (index - 1) model.flatTree of
                        Just next ->
                            case dirname next.path == dirname currentSelectedPath of
                                -- Same directory, just go up
                                True ->
                                    Just ( next.path, next )

                                -- Different directory
                                False ->
                                    case List.Extra.find (\item -> dirname currentSelectedFileOrDirectory.path == dirname item.path) <| List.reverse <| Array.toList <| (Array.slice 0 (index - 1) <| Array.fromList model.flatTree) of
                                        -- Attempt to go to our next _sibling_ up
                                        Just nextSibling ->
                                            Just ( nextSibling.path, nextSibling )

                                        -- If no siblings up the tree, go to our _parent_
                                        Nothing ->
                                            let
                                                parentDir =
                                                    dirname currentSelectedPath
                                            in
                                            Just ( parentDir, FileOrDirectory parentDir (basename parentDir) FileOrDirectoryDirectory )

                        Nothing ->
                            Nothing

                Nothing ->
                    -- Only way to hit this is if our tree and flat tree are out of sync,
                    -- which shouldn't be possible
                    Nothing

        Nothing ->
            -- If we don't currently have anything selected in the tree, do nothing
            Nothing


firstSelectedFileOrDirectory : Dict String FileOrDirectory -> Maybe FileOrDirectory
firstSelectedFileOrDirectory selectedPaths =
    selectedPaths
        |> Dict.values
        |> List.head
