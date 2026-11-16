module WorkspaceTest exposing (suite)

import Dict
import Editor
import Editor.Lib
import Editor.Msg
import Editor.RawKeyboard
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
    , saved = Nothing
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


{-| With a file open as it is on disk.
-}
withFileOpen : String -> String -> Workspace
withFileOpen path contents =
    { workspace
        | editor = Just (editorWith path contents)
        , activeFile = Just path
        , fileHistory = [ ( path, contents ) ]
        , saved = Just ( path, contents )
    }


{-| The same project with the text in the editor replaced, as typing does.
-}
typing : String -> Workspace -> Workspace
typing contents ws =
    { ws | editor = Maybe.map (\editor -> editorWith editor.file contents) ws.editor }


key : { code : String, metaKey : Bool } -> Editor.Msg.Msg
key { code, metaKey } =
    Editor.Msg.RawKeyboardMsg
        (Editor.RawKeyboard.Down { key = "s", code = code, shiftKey = False, altKey = False, ctrlKey = False, metaKey = metaKey })


commandS : Editor.Msg.Msg
commandS =
    key { code = "KeyS", metaKey = True }


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
        , describe "when the open file is changed on disk by something else"
            [ test "a file without unsaved edits takes the new contents" <|
                \_ ->
                    withFileOpen "/project/a.js" "as opened"
                        |> Lib.externalChange "/project/a.js" "changed outside"
                        |> Expect.all
                            [ Tuple.first >> text >> Expect.equal (Just "changed outside")
                            , Tuple.second >> Expect.equal Nothing
                            ]
            , test "unsaved edits are kept, and said to have been kept" <|
                -- they used to be replaced by what was on disk, without a word
                \_ ->
                    withFileOpen "/project/a.js" "as opened"
                        |> typing "as opened, and edited"
                        |> Lib.externalChange "/project/a.js" "changed outside"
                        |> Expect.all
                            [ Tuple.first >> text >> Expect.equal (Just "as opened, and edited")
                            , Tuple.second >> Maybe.map (String.contains "a.js") >> Expect.equal (Just True)
                            , Tuple.second >> Maybe.map (String.contains "unsaved edits were kept") >> Expect.equal (Just True)
                            ]
            , test "once the edits are saved, a later change from outside is taken again" <|
                \_ ->
                    withFileOpen "/project/a.js" "as opened"
                        |> typing "edited"
                        |> Lib.noteSave commandS
                        |> Lib.externalChange "/project/a.js" "formatted by another program"
                        |> Expect.all
                            [ Tuple.first >> text >> Expect.equal (Just "formatted by another program")
                            , Tuple.second >> Expect.equal Nothing
                            ]
            , test "an edit that was typed and then typed back is not an unsaved edit" <|
                \_ ->
                    withFileOpen "/project/a.js" "as opened"
                        |> typing "as opened!"
                        |> typing "as opened"
                        |> Lib.externalChange "/project/a.js" "changed outside"
                        |> Tuple.first
                        |> text
                        |> Expect.equal (Just "changed outside")
            , test "a change that is what the editor already has says nothing and changes nothing" <|
                \_ ->
                    withFileOpen "/project/a.js" "as opened"
                        |> typing "same text"
                        |> Lib.externalChange "/project/a.js" "same text"
                        |> Expect.all
                            [ Tuple.first >> text >> Expect.equal (Just "same text")
                            , Tuple.second >> Expect.equal Nothing

                            -- and what is on disk is now what the editor has
                            , Tuple.first >> Lib.hasUnsavedEdits "/project/a.js" >> Expect.equal False
                            ]
            , test "a change to a file that is not the open one is left alone" <|
                \_ ->
                    withFileOpen "/project/a.js" "as opened"
                        |> Lib.externalChange "/project/b.js" "b changed"
                        |> Expect.all
                            [ Tuple.first >> text >> Expect.equal (Just "as opened")
                            , Tuple.second >> Expect.equal Nothing
                            ]
            , test "any other key is not a save" <|
                \_ ->
                    withFileOpen "/project/a.js" "as opened"
                        |> typing "edited"
                        |> Lib.noteSave (key { code = "KeyS", metaKey = False })
                        |> Lib.hasUnsavedEdits "/project/a.js"
                        |> Expect.equal True
            ]
        , describe "over a long session"
            [ test "only the files opened most recently keep their undo history" <|
                -- every file ever opened used to keep up to 200 states for
                -- as long as the project stayed open
                \_ ->
                    let
                        open path ws =
                            Lib.activateInWorkspace ws path True |> Tuple.first

                        paths =
                            List.range 1 40 |> List.map (\n -> "/project/file" ++ String.fromInt n ++ ".js")

                        start =
                            { workspace
                                | editor = Just (editorWith "/project/file1.js" "1")
                                , activeFile = Just "/project/file1.js"
                                , fileHistory = List.map (\path -> ( path, path )) paths
                            }

                        after =
                            List.foldl open start paths

                        withHistory =
                            after.editor |> Maybe.map (.histories >> Dict.keys) |> Maybe.withDefault []
                    in
                    Expect.all
                        [ \_ -> List.length withHistory |> Expect.atMost (Lib.maxFilesWithUndoHistory + 1)
                        , \_ -> List.member "/project/file40.js" withHistory |> Expect.equal True
                        , \_ -> List.member "/project/file39.js" withHistory |> Expect.equal True
                        , \_ -> List.member "/project/file2.js" withHistory |> Expect.equal False
                        ]
                        ()
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
