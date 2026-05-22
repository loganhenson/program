module Lib exposing (..)

import Editor
import Editor.Lib
import Editor.Msg
import FileTree.FileTree
import FileTree.Types
import Json.Encode
import List.Extra
import Model exposing (Model)
import Msg exposing (Msg(..))
import Ports
import Tuple exposing (first)
import Types exposing (Focused(..))
import Workspace.Lib as WL
import Workspace.Types exposing (Workspace)


handleFileTreeMsg : FileTree.Types.Msg -> Model -> ( Model, Cmd Msg )
handleFileTreeMsg m model =
    case WL.active model of
        Nothing ->
            ( model, Cmd.none )

        Just ws ->
            case ws.fileTree of
                Nothing ->
                    ( model, Cmd.none )

                Just fileTree ->
                    let
                        ( nextFileTree, fileTreeMsgs ) =
                            FileTree.FileTree.update m fileTree

                        ( afterActivate, editorMsgs ) =
                            case m of
                                FileTree.Types.ActivateFile path ->
                                    requestActivateFileOrDirectory model path True

                                _ ->
                                    ( model, Cmd.none )
                    in
                    ( afterActivate
                        |> WL.mapActive
                            (\w -> { w | fileTree = Just nextFileTree, focused = FileTree })
                    , Cmd.batch
                        [ Cmd.map FileTreeMsg fileTreeMsgs
                        , editorMsgs
                        ]
                    )


handleEditorMsg : Editor.Msg.Msg -> Model -> ( Model, Cmd Msg )
handleEditorMsg m model =
    case WL.active model |> Maybe.andThen .editor of
        Nothing ->
            ( model, Cmd.none )

        Just prevEditor ->
            let
                ( editor, message ) =
                    Editor.update m prevEditor
            in
            ( WL.mapActive (\w -> { w | editor = Just editor }) model
            , Cmd.map EditorMsg message
            )


{-| Hard cap on remembered file contents. Each entry holds a full file's
contents in memory; opening hundreds of files across a session was
unbounded growth. Oldest entries (tail) are dropped when we exceed this.
-}
maxFileHistory : Int
maxFileHistory =
    50


addToFileHistory : List ( String, String ) -> String -> String -> List ( String, String )
addToFileHistory fileHistory path contents =
    (( path, contents ) :: fileHistory)
        |> List.Extra.uniqueBy first
        |> List.take maxFileHistory


requestActivateFileOrDirectory : Model -> String -> Bool -> ( Model, Cmd Msg )
requestActivateFileOrDirectory model path updateFileHistory =
    case WL.active model of
        Nothing ->
            ( model, Cmd.none )

        Just ws ->
            let
                ( nextWs, cmd ) =
                    activateInWorkspace ws path updateFileHistory
            in
            ( WL.mapActive (always nextWs) model, cmd )


activateInWorkspace : Workspace -> String -> Bool -> ( Workspace, Cmd Msg )
activateInWorkspace ws path updateFileHistory =
    let
        maybeCurrentFileIndex =
            case ws.activeFile of
                Just af ->
                    List.Extra.findIndex (first >> (==) af) ws.fileHistory

                Nothing ->
                    Nothing

        maybeNextFileIndex =
            List.Extra.findIndex (first >> (==) path) ws.fileHistory

        maybeNextFileAndContents =
            maybeNextFileIndex |> Maybe.andThen (\i -> List.Extra.getAt i ws.fileHistory)

        nextFileHistory =
            case ( maybeCurrentFileIndex, ws.editor ) of
                ( Just index, Just justEditor ) ->
                    List.Extra.updateAt index
                        (\( curFile, _ ) ->
                            ( curFile
                            , Editor.Lib.renderableLinesToContents justEditor.travelable.renderableLines
                            )
                        )
                        ws.fileHistory

                _ ->
                    ws.fileHistory

        ( nextFileTree, fileTreeMsgs ) =
            case ws.fileTree of
                Just fileTree ->
                    Tuple.mapFirst Just <| FileTree.FileTree.update (FileTree.Types.ActivateFile path) fileTree

                Nothing ->
                    ( ws.fileTree, Cmd.none )

        fuzzyFinder =
            ws.fuzzyFinder

        nextWs =
            { ws
                | focused = Editor
                , fuzzyFinder = { fuzzyFinder | fuzzyFindResults = [] }
                , fileHistory = nextFileHistory
                , fileTree = nextFileTree
            }
    in
    case maybeNextFileAndContents of
        Just ( file, contents ) ->
            case ws.editor of
                Just justEditor ->
                    let
                        ( nextEditor, editorMsgs ) =
                            Editor.Lib.changeFile justEditor file contents
                    in
                    ( { nextWs
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
                    ( nextWs, Cmd.none )

        Nothing ->
            ( nextWs
            , Cmd.batch
                [ Ports.requestActivateFileOrDirectory path
                , Cmd.map FileTreeMsg fileTreeMsgs
                ]
            )


{-| Open a project directory. Just fires the port — Rust canonicalizes
the path, creates the workspace state, and emits an `initialize` event
which JS forwards via `receiveWorkspaceInitialized` so Elm adds the
workspace under its canonical name. This avoids the user-input vs
canonical-path mismatch you'd get if Elm added optimistically.
-}
requestOpenProject : Model -> String -> ( Model, Cmd Msg )
requestOpenProject model directory =
    ( model, Ports.requestOpenProject directory )
