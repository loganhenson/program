module FileTree.Keybindings exposing (..)

import ContextMenu.Types
import Dict exposing (Dict)
import Editor.RawKeyboard exposing (RawKey)
import FileTree.ContextMenus exposing (fileOrDirectoryContextMenu, noFileOrDirectoryContextMenu)
import FileTree.FileTree
import FileTree.Lib exposing (firstSelectedFileOrDirectory)
import FileTree.Model exposing (Model)
import FileTree.Types exposing (..)
import List.Extra
import String.Extra


handleKeyUp : RawKey -> Model -> ( Model, Cmd Msg )
handleKeyUp key model =
    let
        newPressedKey =
            case model.pressedKey of
                Just pressedKey ->
                    case key.key == pressedKey.key of
                        True ->
                            Nothing

                        False ->
                            Just pressedKey

                Nothing ->
                    Nothing
    in
    ( { model | pressedKey = newPressedKey }, Cmd.none )


handleKeybindings : RawKey -> Model -> ( Model, Cmd Msg )
handleKeybindings key model =
    let
        withPressedKey =
            { model | pressedKey = Just key }
    in
    if key.code == "Escape" then
        ( { withPressedKey
            | creating = Nothing
            , contextMenu = Nothing
            , deleting = Nothing
            , error = Nothing
          }
        , Cmd.none
        )

    else if key.code == "Backspace" && withPressedKey.creating == Nothing then
        FileTree.FileTree.update (StartDelete (Dict.values withPressedKey.selectedPaths)) withPressedKey

    else if key.code == "KeyR" then
        FileTree.FileTree.update (Refresh model.fileTree.path) withPressedKey

    else if key.code == "Enter" then
        FileTree.FileTree.update Enter withPressedKey

    else if key.code == "ArrowRight" then
        FileTree.FileTree.update RightArrow withPressedKey

    else if key.code == "ArrowLeft" then
        FileTree.FileTree.update LeftArrow withPressedKey

    else if key.code == "ArrowUp" then
        FileTree.FileTree.update UpArrow withPressedKey

    else if key.code == "ArrowDown" then
        FileTree.FileTree.update DownArrow withPressedKey

    else if key.metaKey && key.code == "KeyN" then
        let
            contextMenu =
                case firstSelectedFileOrDirectory withPressedKey.selectedPaths of
                    Just fileOrDirectory ->
                        fileOrDirectoryContextMenu fileOrDirectory

                    Nothing ->
                        noFileOrDirectoryContextMenu withPressedKey.fileTree.path
        in
        case firstSelectedFileOrDirectory withPressedKey.selectedPaths of
            Just firstSelected ->
                let
                    y =
                        List.Extra.findIndex (\v -> v.path == firstSelected.path) withPressedKey.flatTree
                            -- height of each "row" in the tree (file or directory)
                            |> Maybe.map ((*) 24)
                            -- Start 1 down
                            |> Maybe.map ((+) 24)
                            |> Maybe.withDefault 0
                            -- 1px border
                            |> (+) 1

                    x =
                        -- number of "columns" to the right
                        String.Extra.countOccurrences "/" (String.replace withPressedKey.fileTree.path "" firstSelected.path)
                            -- 2 "24px" blocks to the right by default
                            |> (+) 2
                            -- each "column" (left padding between tree directories and their parent) is 24px
                            |> (*) 24
                in
                FileTree.FileTree.update
                    (ShowContextMenu (ContextMenu.Types.ContextMenu contextMenu (ContextMenu.Types.Location x y) 0))
                    withPressedKey

            Nothing ->
                FileTree.FileTree.update
                    (ShowContextMenu (ContextMenu.Types.ContextMenu contextMenu (ContextMenu.Types.Location 1 1) 0))
                    withPressedKey

    else
        ( withPressedKey, Cmd.none )
