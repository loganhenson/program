module FileTreeTest exposing (suite)

import Dict
import Expect
import FileTree.FileTree as FileTree
import FileTree.Types exposing (Children(..), FileOrDirectory, FileOrDirectoryType(..), FileTree)
import Html.Attributes
import Test exposing (..)
import Test.Html.Query as Query
import Test.Html.Selector exposing (attribute, class, containing, style, tag, text)


file : String -> FileTree
file path =
    { path = path, name = path, type_ = FileOrDirectoryFile, children = Nothing }


directory : String -> List FileTree -> FileTree
directory path children =
    { path = path, name = path, type_ = FileOrDirectoryDirectory, children = Just (Children children) }


project : FileTree
project =
    directory "/project"
        [ file "/project/readme.md"
        , directory "/project/src" [ file "/project/src/Main.elm" ]
        ]


{-| The tree with everything open and exactly `path` selected.
-}
viewSelecting : String -> Query.Single FileTree.Types.Msg
viewSelecting path =
    let
        model =
            FileTree.init { tree = project, flat = [] } Nothing

        entry p =
            ( p, FileOrDirectory p p FileOrDirectoryDirectory )
    in
    FileTree.view
        (Just
            { model
                | openDirectories = Dict.fromList [ entry "/project", entry "/project/src" ]
                , selectedPaths = Dict.fromList [ entry path ]
            }
        )
        |> Query.fromHtml


highlighted : Query.Single msg -> Query.Multiple msg
highlighted =
    Query.findAll [ class "bg-blue-700" ]


row : String -> Query.Single msg -> Query.Single msg
row path =
    Query.find [ attribute (Html.Attributes.id path) ]


count : Int -> String -> Query.Multiple msg -> Expect.Expectation
count expected what =
    Query.count
        (\found ->
            if found == expected then
                Expect.pass

            else
                Expect.fail (what ++ ": " ++ String.fromInt found ++ ", expected " ++ String.fromInt expected)
        )


suite : Test
suite =
    describe "The file tree"
        [ describe "highlights the selected entry"
            [ test "a new tree has its root selected: one row is highlighted" <|
                \_ ->
                    viewSelecting "/project"
                        |> highlighted
                        |> count 1 "highlighted rows"
            , test "selecting a directory highlights its own row" <|
                -- the solid highlight used to sit on the element holding the
                -- children, so the whole project turned into one blue block
                \_ ->
                    viewSelecting "/project"
                        |> highlighted
                        |> Query.first
                        |> Expect.all
                            [ Query.has [ attribute (Html.Attributes.id "/project") ]
                            , Query.hasNot [ containing [ text "readme.md" ] ]
                            , Query.hasNot [ containing [ attribute (Html.Attributes.id "/project/src") ] ]
                            ]
            , test "what is inside a selected directory is marked as going with it, more quietly" <|
                \_ ->
                    viewSelecting "/project"
                        |> Query.find [ class "file-tree-selected-contents" ]
                        |> Expect.all
                            [ Query.has [ containing [ text "readme.md" ] ]
                            , Query.has [ containing [ text "Main.elm" ] ]
                            , Query.hasNot [ class "bg-blue-700" ]
                            , Query.has [ style "background" "rgba(43, 108, 176, 0.16)" ]
                            ]
            , test "only the contents of the selected directory are marked" <|
                \_ ->
                    viewSelecting "/project/src"
                        |> Query.find [ class "file-tree-selected-contents" ]
                        |> Expect.all
                            [ Query.has [ containing [ text "Main.elm" ] ]
                            , Query.hasNot [ containing [ text "readme.md" ] ]
                            ]
            , test "selecting a file marks nothing else" <|
                \_ ->
                    viewSelecting "/project/readme.md"
                        |> Query.findAll [ class "file-tree-selected-contents" ]
                        |> count 0 "marked contents"
            , test "a directory inside another one: only that row" <|
                \_ ->
                    viewSelecting "/project/src"
                        |> highlighted
                        |> Query.first
                        |> Expect.all
                            [ Query.has [ attribute (Html.Attributes.id "/project/src") ]
                            , Query.hasNot [ containing [ text "Main.elm" ] ]
                            ]
            , test "a file: only that file" <|
                \_ ->
                    viewSelecting "/project/readme.md"
                        |> highlighted
                        |> Query.first
                        |> Expect.all
                            [ Query.has [ containing [ text "readme.md" ] ]
                            , Query.hasNot [ containing [ text "Main.elm" ] ]
                            ]
            ]
        , describe "shows where an entry is in the project"
            [ test "each level is indented one step further" <|
                \_ ->
                    viewSelecting "/project/readme.md"
                        |> Expect.all
                            [ row "/project" >> Query.has [ style "padding-left" "8px" ]
                            , row "/project/src" >> Query.has [ style "padding-left" "24px" ]
                            , row "/project/src/Main.elm" >> Query.has [ style "padding-left" "40px" ]
                            ]
            , test "a file and a folder at the same depth start at the same place" <|
                -- a file used to start where a folder's chevron is, so the
                -- names in one folder were ragged
                \_ ->
                    viewSelecting "/project"
                        |> Expect.all
                            [ row "/project/readme.md" >> Query.has [ style "padding-left" "24px" ]
                            , row "/project/src" >> Query.has [ style "padding-left" "24px" ]
                            , row "/project/readme.md" >> Query.findAll [ class "file-tree-chevron" ] >> count 1 "chevron slots in a file's row"
                            , row "/project/src" >> Query.findAll [ class "file-tree-chevron" ] >> count 1 "chevron slots in a folder's row"
                            ]
            , test "only a folder has a chevron in its slot" <|
                \_ ->
                    viewSelecting "/project"
                        |> Expect.all
                            [ row "/project/src" >> Query.find [ class "file-tree-chevron" ] >> Query.findAll [ tag "svg" ] >> count 1 "chevrons in a folder's row"
                            , row "/project/readme.md" >> Query.find [ class "file-tree-chevron" ] >> Query.findAll [ tag "svg" ] >> count 0 "chevrons in a file's row"
                            ]
            , test "every open folder has a guide line, down to where it ends" <|
                \_ ->
                    viewSelecting "/project"
                        |> Query.findAll [ class "file-tree-guide" ]
                        |> count 2 "guide lines for two open folders"
            , test "every row is the same height" <|
                \_ ->
                    viewSelecting "/project"
                        |> Query.findAll [ class "file-tree-row" ]
                        |> Expect.all
                            [ count 4 "rows"
                            , Query.each (Query.has [ style "height" "24px" ])
                            ]
            ]
        , describe "tells entries apart"
            [ test "the file that is open in the editor is marked" <|
                \_ ->
                    FileTree.view (Just (FileTree.init { tree = project, flat = [] } (Just "/project/readme.md")))
                        |> Query.fromHtml
                        |> Query.find [ class "file-tree-active" ]
                        |> Query.has [ attribute (Html.Attributes.id "/project/readme.md") ]
            , test "a folder that is not walked cannot be opened" <|
                \_ ->
                    FileTree.view (Just (FileTree.init { tree = directory "/project" [ { path = "/project/node_modules", name = "node_modules", type_ = FileOrDirectoryOpaque, children = Nothing } ], flat = [] } Nothing))
                        |> Query.fromHtml
                        |> row "/project/node_modules"
                        |> Expect.all
                            [ Query.findAll [ tag "svg" ] >> count 1 "icons (a folder, no chevron)"
                            , Query.has [ style "font-style" "italic" ]
                            ]
            ]
        ]
