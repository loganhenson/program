module Lib exposing (..)

import Editor
import Editor.Lib
import Editor.Msg
import Editor.RawKeyboard
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
            ( WL.mapActive (\w -> noteSave m { w | editor = Just editor }) model
            , Cmd.map EditorMsg message
            )


{-| The text in a project's editor.
-}
editorContents : Workspace -> Maybe String
editorContents ws =
    ws.editor |> Maybe.map (.travelable >> .renderableLines >> Editor.Lib.renderableLinesToContents)


{-| Command+S in the editor saves the file: from then on what is in the
editor is what is on disk.
-}
noteSave : Editor.Msg.Msg -> Workspace -> Workspace
noteSave msg ws =
    case msg of
        Editor.Msg.RawKeyboardMsg (Editor.RawKeyboard.Down key) ->
            if key.metaKey && key.code == "KeyS" then
                { ws | saved = Maybe.map2 Tuple.pair ws.activeFile (editorContents ws) }

            else
                ws

        _ ->
            ws


{-| Whether the editor holds text for this file that is not on disk.
-}
hasUnsavedEdits : String -> Workspace -> Bool
hasUnsavedEdits path ws =
    case ( ws.saved, editorContents ws ) of
        ( Just ( savedPath, savedContents ), Just contents ) ->
            savedPath == path && savedContents /= contents

        _ ->
            False


{-| The open file was changed on disk by something else.

The editor takes the new contents, unless it holds edits that were not saved:
those are kept (they used to be replaced without a word), and the message
returned says so.

-}
externalChange : String -> String -> Workspace -> ( Workspace, Maybe String )
externalChange path contents ws =
    case ( ws.activeFile == Just path, ws.editor ) of
        ( True, Just editor ) ->
            if editorContents ws == Just contents then
                ( { ws | saved = Just ( path, contents ) }, Nothing )

            else if hasUnsavedEdits path ws then
                ( ws
                , Just (fileName path ++ " was changed on disk. Your unsaved edits were kept; saving will replace what is on disk.")
                )

            else
                let
                    newLines =
                        Editor.Lib.contentsToRenderableLines contents

                    currentCursor =
                        editor.travelable.cursorPosition

                    clampedY =
                        max 0 (min (List.length newLines - 1) currentCursor.y)

                    clampedLineLength =
                        List.Extra.getAt clampedY newLines
                            |> Maybe.map (.text >> String.length)
                            |> Maybe.withDefault 0

                    clampedX =
                        max 0 (min clampedLineLength currentCursor.x)

                    travelable =
                        editor.travelable

                    newTravelable =
                        { travelable
                            | renderableLines = newLines
                            , cursorPosition = { x = clampedX, y = clampedY }
                        }
                in
                ( { ws
                    | editor = Just { editor | travelable = newTravelable }
                    , fileHistory = addToFileHistory ws.fileHistory path contents
                    , saved = Just ( path, contents )
                  }
                , Nothing
                )

        _ ->
            ( ws, Nothing )


fileName : String -> String
fileName path =
    String.split "/" path |> List.Extra.last |> Maybe.withDefault path


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
                    -- There is no editor to show it in: the file that was
                    -- open was deleted. Ask for the file as for one that was
                    -- never opened (the answer makes an editor). This used
                    -- to do nothing at all, so that after a deletion no file
                    -- opened before could be opened again.
                    ( { nextWs | fileHistory = List.filter (first >> (/=) path) nextFileHistory }
                    , Cmd.batch
                        [ Ports.requestActivateFileOrDirectory path
                        , Cmd.map FileTreeMsg fileTreeMsgs
                        ]
                    )

        Nothing ->
            ( nextWs
            , Cmd.batch
                [ Ports.requestActivateFileOrDirectory path
                , Cmd.map FileTreeMsg fileTreeMsgs
                ]
            )


{-| A new tree for a project: the first one, or one after something changed
on disk.

The open file stays open whatever the tree says. A file can be open without
being in the tree (one inside `dist/` or `node_modules/` found through the
file finder, or one past the limit of what a tree holds), and the tree is
sent again after any change in the project, including the editor's own save:
closing the editor for a file "missing" from it threw unsaved work away. That
a file was deleted is said by the backend, which watches the open file.

-}
updateWorkspaceFileTree : FileTree.Types.FileTreeAndFlat -> Workspace -> Workspace
updateWorkspaceFileTree treeAndFlat ws =
    case ws.fileTree of
        Nothing ->
            -- Terminals are created lazily via openTerminalInWorkspace
            -- (triggered by WorkspaceInitialized), not here.
            { ws
                | fileTree = Just (FileTree.FileTree.init treeAndFlat Nothing)
                , fileTreeShowing = True
                , terminalShowing = True
            }

        Just oldTree ->
            { ws | fileTree = Just (FileTree.FileTree.refresh oldTree treeAndFlat) }


{-| Open a project directory. Just fires the port — Rust canonicalizes
the path, creates the workspace state, and emits an `initialize` event
which JS forwards via `receiveWorkspaceInitialized` so Elm adds the
workspace under its canonical name. This avoids the user-input vs
canonical-path mismatch you'd get if Elm added optimistically.
-}
requestOpenProject : Model -> String -> ( Model, Cmd Msg )
requestOpenProject model directory =
    ( model, Ports.requestOpenProject directory )
