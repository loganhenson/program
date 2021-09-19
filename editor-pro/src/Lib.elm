module Lib exposing (..)

import Editor
import Editor.Lib
import Editor.Msg
import FileTree.FileTree
import FileTree.Types
import List.Extra
import Model exposing (Model)
import Msg exposing (Msg(..))
import Ports
import Tuple exposing (first)
import Types exposing (Focused(..))


handleFileTreeMsg : FileTree.Types.Msg -> Model -> ( Model, Cmd Msg )
handleFileTreeMsg m model =
    case model.fileTree of
        Nothing ->
            ( model, Cmd.none )

        Just fileTree ->
            let
                ( nextFileTree, fileTreeMsgs ) =
                    FileTree.FileTree.update m fileTree

                ( nextModel, editorMsgs ) =
                    case m of
                        FileTree.Types.ActivateFile path ->
                            requestActivateFileOrDirectory model path True

                        _ ->
                            ( model, Cmd.none )
            in
            ( { nextModel | fileTree = Just nextFileTree }
            , Cmd.batch
                [ Cmd.map FileTreeMsg fileTreeMsgs
                , editorMsgs
                ]
            )


handleEditorMsg : Editor.Msg.Msg -> Model -> ( Model, Cmd Msg )
handleEditorMsg m model =
    case model.editor of
        Nothing ->
            ( model, Cmd.none )

        Just prevEditor ->
            let
                ( editor, message ) =
                    Editor.update m prevEditor
            in
            ( { model | editor = Just editor, fileTree = model.fileTree }, Cmd.map EditorMsg message )


addToFileHistory : List ( String, String ) -> String -> String -> List ( String, String )
addToFileHistory fileHistory path contents =
    (( path, contents ) :: fileHistory) |> List.Extra.uniqueBy first


requestActivateFileOrDirectory : Model -> String -> Bool -> ( Model, Cmd Msg )
requestActivateFileOrDirectory model path updateFileHistory =
    -- First, update contents of active file (if there is one) in fileHistory
    -- if the requested file is in fileHistory load it up via changeFile
    -- if not, request it via port
    let
        maybeCurrentFileIndex =
            case model.activeFile of
                Just activeFile ->
                    List.Extra.findIndex (first >> (==) activeFile) model.fileHistory

                Nothing ->
                    Nothing

        maybeNextFileIndex =
            List.Extra.findIndex (first >> (==) path) model.fileHistory

        maybeNextFileAndContents =
            maybeNextFileIndex |> Maybe.andThen (\i -> List.Extra.getAt i model.fileHistory)

        nextFileHistory =
            case ( maybeCurrentFileIndex, model.editor ) of
                ( Just index, Just justEditor ) ->
                    List.Extra.updateAt index (\( curFile, _ ) -> ( curFile, Editor.Lib.renderableLinesToContents justEditor.travelable.renderableLines )) model.fileHistory

                _ ->
                    model.fileHistory

        ( nextFileTree, fileTreeMsgs ) =
            case model.fileTree of
                Just fileTree ->
                    Tuple.mapFirst Just <| FileTree.FileTree.update (FileTree.Types.ActivateFile path) fileTree

                Nothing ->
                    ( model.fileTree, Cmd.none )

        nextModel =
            let
                fuzzyFinder =
                    model.fuzzyFinder
            in
            { model
                | focused = Editor
                , fuzzyFinder = { fuzzyFinder | fuzzyFindResults = [] }
                , fileHistory = nextFileHistory
                , fileTree = nextFileTree
            }
    in
    case maybeNextFileAndContents of
        Just ( file, contents ) ->
            case model.editor of
                Just justEditor ->
                    let
                        ( nextEditor, editorMsgs ) =
                            Editor.Lib.changeFile justEditor file contents
                    in
                    ( { nextModel
                        | editor = Just nextEditor
                        , activeFile = Just file
                        , fileHistory =
                            case updateFileHistory of
                                True ->
                                    addToFileHistory nextFileHistory file contents

                                False ->
                                    nextFileHistory
                      }
                    , Cmd.map EditorMsg editorMsgs
                    )

                Nothing ->
                    ( nextModel, Cmd.none )

        Nothing ->
            ( nextModel
            , Cmd.batch
                [ Ports.requestActivateFileOrDirectory path
                , Cmd.map FileTreeMsg fileTreeMsgs
                ]
            )
