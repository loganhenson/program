module WorkspaceTest exposing (suite)

import Editor
import Editor.Lib
import Editor.Msg
import Expect
import FileTree.FileTree as FileTree
import FileTree.Types exposing (Children(..), FileOrDirectory, FileOrDirectoryType(..), FileTree, FileTreeAndFlat)
import Lib
import Test exposing (..)
import Types
import Workspace.Types exposing (Workspace)


file : String -> FileTree
file path =
    { path = path, name = path, type_ = FileOrDirectoryFile, children = Nothing }


{-| A project as the backend sends it: the tree, and the same entries in a
flat list. Whatever is inside `dist` is in neither: the backend does not walk
it.
-}
project : List String -> FileTreeAndFlat
project files =
    { tree =
        { path = "/project"
        , name = "project"
        , type_ = FileOrDirectoryDirectory
        , children = Just (Children (List.map file files ++ [ { path = "/project/dist", name = "dist", type_ = FileOrDirectoryOpaque, children = Nothing } ]))
        }
    , flat =
        FileOrDirectory "/project" "project" FileOrDirectoryDirectory
            :: List.map (\path -> FileOrDirectory path path FileOrDirectoryFile) files
            ++ [ FileOrDirectory "/project/dist" "dist" FileOrDirectoryOpaque ]
    }


editorWith : String -> String -> Editor.Msg.Model
editorWith path contents =
    Editor.Lib.init True
        path
        contents
        { vimMode = True, showLineNumbers = True, padBottom = True, padRight = True, showCursor = True, characterWidth = 8 }
        Editor.initialPorts


workspace : Workspace
workspace =
    { projectPath = "/project"
    , editor = Nothing
    , fileHistory = []
    , activeFile = Nothing
    , terminals = []
    , activeTerminalIndex = 0
    , terminalCounter = 0
    , terminalShowing = True
    , fileTree = Just (FileTree.init (project [ "/project/a.js", "/project/b.js" ]) Nothing)
    , fileTreeShowing = True
    , focused = Types.FileTree
    , fuzzyFinder = { fuzzyFinderInputValue = "", fuzzyFinderHighlightedIndex = 0, fuzzyFindResults = [] }
    , closeArmed = False
    }


{-| With a file open and edited.
-}
editing : String -> Workspace
editing path =
    { workspace
        | editor = Just (editorWith path "unsaved work")
        , activeFile = Just path
        , fileHistory = [ ( path, "as it was opened" ) ]
    }


text : Workspace -> Maybe String
text ws =
    ws.editor |> Maybe.map (.travelable >> .renderableLines >> Editor.Lib.renderableLinesToContents)


suite : Test
suite =
    describe "A project that stays open"
        [ describe "when its tree is sent again (after any change in the project, the editor's own save included)"
            [ test "a file that is in the tree stays open" <|
                \_ ->
                    editing "/project/a.js"
                        |> Lib.updateWorkspaceFileTree (project [ "/project/a.js", "/project/b.js" ])
                        |> text
                        |> Expect.equal (Just "unsaved work")
            , test "a file the tree does not list stays open, with what was typed" <|
                -- found through the file finder inside a folder the tree does
                -- not go into; this used to close the editor at the next
                -- change anywhere in the project and discard the edits
                \_ ->
                    editing "/project/dist/bundle.js"
                        |> Lib.updateWorkspaceFileTree (project [ "/project/a.js", "/project/b.js" ])
                        |> Expect.all
                            [ text >> Expect.equal (Just "unsaved work")
                            , .activeFile >> Expect.equal (Just "/project/dist/bundle.js")
                            ]
            , test "the open file stays marked in the tree" <|
                \_ ->
                    let
                        opened =
                            { workspace | fileTree = Just (FileTree.init (project [ "/project/a.js" ]) (Just "/project/a.js")) }
                    in
                    opened
                        |> Lib.updateWorkspaceFileTree (project [ "/project/a.js", "/project/new.js" ])
                        |> .fileTree
                        |> Maybe.andThen .activeFile
                        |> Expect.equal (Just "/project/a.js")
            , test "the first tree of a project shows the tree and the terminal" <|
                \_ ->
                    { workspace | fileTree = Nothing, fileTreeShowing = False, terminalShowing = False }
                        |> Lib.updateWorkspaceFileTree (project [ "/project/a.js" ])
                        |> Expect.all
                            [ .fileTreeShowing >> Expect.equal True
                            , .terminalShowing >> Expect.equal True
                            , .fileTree >> Maybe.map (.flatTree >> List.length) >> Expect.equal (Just 3)
                            ]
            ]
        , describe "after the open file was deleted"
            [ test "a file that was opened before can be opened again" <|
                -- it used to be looked up among the files opened before,
                -- found, and then not shown because there was no editor:
                -- nothing happened, for every such file
                \_ ->
                    let
                        afterDeletion =
                            { workspace
                                | editor = Nothing
                                , activeFile = Nothing
                                , fileHistory = [ ( "/project/a.js", "contents of a" ) ]
                            }

                        ( next, _ ) =
                            Lib.activateInWorkspace afterDeletion "/project/a.js" True
                    in
                    -- it is asked for again as a file that was never opened:
                    -- the answer is what makes an editor
                    next.fileHistory
                        |> List.map Tuple.first
                        |> Expect.equal []
            , test "with an editor open, a file opened before comes back with what was typed in it" <|
                \_ ->
                    let
                        twoFiles =
                            { workspace
                                | editor = Just (editorWith "/project/b.js" "b, edited")
                                , activeFile = Just "/project/b.js"
                                , fileHistory = [ ( "/project/b.js", "b" ), ( "/project/a.js", "a, edited before" ) ]
                            }

                        ( next, _ ) =
                            Lib.activateInWorkspace twoFiles "/project/a.js" True
                    in
                    next
                        |> Expect.all
                            [ text >> Expect.equal (Just "a, edited before")
                            , .activeFile >> Expect.equal (Just "/project/a.js")

                            -- and what was typed in the file that was left is kept
                            , .fileHistory >> List.filter (Tuple.first >> (==) "/project/b.js") >> List.map Tuple.second >> Expect.equal [ "b, edited" ]
                            ]
            ]
        ]
