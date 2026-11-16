module FileTreeTest exposing (suite)

import Dict
import Expect
import FileTree.FileTree as FileTree
import FileTree.Types exposing (Children(..), FileOrDirectory, FileOrDirectoryType(..), FileTree)
import Html.Attributes
import Test exposing (..)
import Test.Html.Query as Query
import Test.Html.Selector exposing (attribute, class, containing, text)


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


suite : Test
suite =
    describe "The file tree highlights the selected entry"
        [ test "a new tree has its root selected: one row is highlighted" <|
            \_ ->
                viewSelecting "/project"
                    |> highlighted
                    |> Query.count (\count -> if count == 1 then pass else fail ("highlighted elements: " ++ String.fromInt count))
        , test "selecting a directory highlights its own row" <|
            -- the solid highlight used to sit on the element holding the
            -- children, so the whole project turned into one blue block
            \_ ->
                viewSelecting "/project"
                    |> highlighted
                    |> Query.first
                    |> Expect.all
                        [ Query.has [ containing [ attribute (Html.Attributes.id "/project") ] ]
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
                        , Query.has [ Test.Html.Selector.style "background" "rgba(43, 108, 176, 0.16)" ]
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
                    |> Query.count (\count -> if count == 0 then pass else fail ("marked contents: " ++ String.fromInt count))
        , test "a directory inside another one: only that row" <|
            \_ ->
                viewSelecting "/project/src"
                    |> highlighted
                    |> Query.first
                    |> Expect.all
                        [ Query.has [ containing [ attribute (Html.Attributes.id "/project/src") ] ]
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
        , test "the entries inside a directory are still indented under it" <|
            \_ ->
                viewSelecting "/project/readme.md"
                    |> Query.findAll [ class "pl-6", containing [ text "Main.elm" ] ]
                    |> Query.count (\count -> if count >= 3 then pass else fail ("levels of indentation around a nested file: " ++ String.fromInt count))
        ]


pass : Expect.Expectation
pass =
    Expect.pass


fail : String -> Expect.Expectation
fail =
    Expect.fail
