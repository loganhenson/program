module FileTree.FileTree exposing (init, refresh, treeNodeToFileOrDirectory, update, view)

import Array
import Browser.Dom exposing (focus)
import ContextMenu.ContextMenu exposing (onContextMenu)
import ContextMenu.Types
import Dict exposing (Dict)
import Editor.RawKeyboard exposing (RawKey)
import FileTree.ContextMenus exposing (fileOrDirectoryContextMenu, noFileOrDirectoryContextMenu)
import FileTree.Encoders exposing (encodeFilesAndDirectories)
import FileTree.Lib exposing (getFileOrDirectoryAbove, getFileOrDirectoryBelow)
import FileTree.Model exposing (Model)
import FileTree.Types exposing (..)
import Html exposing (Attribute, button, div, form, input, text)
import Html.Attributes exposing (class, classList, id, style, title, type_, value)
import Html.Events exposing (onClick, onDoubleClick, onInput, onSubmit, stopPropagationOn)
import Json.Decode
import Layout exposing (viewDialog)
import List.Extra
import Octicons exposing (color, defaultOptions, file, fileDirectory, triangleDown, triangleRight)
import Ports
import String.Extra
import Styles exposing (buttonStyles)
import Task
import Tuple exposing (first)
import Utils exposing (basename)


init : FileTreeAndFlat -> Maybe String -> Model
init { tree, flat } activeFile =
    { fileTree = tree
    , flatTree = flat
    , pressedKey = Nothing
    , error = Nothing
    , activeFile = activeFile
    , selectedPaths = Dict.fromList [ ( tree.path, FileTree.Types.FileOrDirectory tree.path tree.name tree.type_ ) ]
    , openDirectories = Dict.fromList [ ( tree.path, FileTree.Types.FileOrDirectory tree.path tree.name tree.type_ ) ]
    , contextMenu = Nothing
    , creating = Nothing
    , deleting = Nothing
    }


refresh : Model -> FileTreeAndFlat -> Model
refresh oldModel { tree, flat } =
    -- If the active file no longer exists, unselect it
    let
        activeFileDeleted =
            case oldModel.activeFile of
                Just activeFile ->
                    List.member activeFile (List.map .path flat)

                Nothing ->
                    False

        flatPaths =
            Dict.fromList (List.map (\a -> ( a.path, a )) flat)
    in
    { oldModel
        | fileTree = tree
        , flatTree = flat
        , activeFile =
            if activeFileDeleted then
                Nothing

            else
                oldModel.activeFile
        , selectedPaths = Dict.intersect oldModel.selectedPaths flatPaths
        , creating =
            case oldModel.creating of
                Just creating ->
                    case Dict.member creating.path flatPaths of
                        True ->
                            Nothing

                        False ->
                            oldModel.creating

                Nothing ->
                    Nothing
        , error = Nothing
    }


updateContextMenu : Model -> ContextMenu.Types.Msg -> ContextMenu.Types.ContextMenu Msg -> ( Model, Cmd Msg )
updateContextMenu model msg contextMenu =
    let
        ( nextContextMenu, msgs ) =
            ContextMenu.ContextMenu.update msg contextMenu
    in
    ( { model | contextMenu = Just nextContextMenu }, msgs )


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        FileTreeClicked ->
            ( { model | contextMenu = Nothing, creating = Nothing }, Cmd.none )

        OpenDirectory fileOrDirectory ->
            ( { model | openDirectories = Dict.insert fileOrDirectory.path fileOrDirectory model.openDirectories }
            , Cmd.none
            )

        Refresh directory ->
            ( model, Ports.requestRefreshDirectory directory )

        RightArrow ->
            ( { model | openDirectories = Dict.union model.openDirectories model.selectedPaths }
            , Cmd.none
            )

        LeftArrow ->
            ( { model | openDirectories = Dict.diff model.openDirectories model.selectedPaths }
            , Cmd.none
            )

        Enter ->
            case model.contextMenu of
                Just contextMenu ->
                    case ContextMenu.ContextMenu.getSelectedMsg contextMenu of
                        Just selectedMsg ->
                            update selectedMsg model

                        Nothing ->
                            ( model, Cmd.none )

                Nothing ->
                    case List.head <| Dict.values model.selectedPaths of
                        Just fileOrDirectory ->
                            ( { model | activeFile = Just fileOrDirectory.path }
                            , Ports.requestActivateFileOrDirectory fileOrDirectory.path
                            )

                        Nothing ->
                            ( model, Cmd.none )

        DownArrow ->
            case model.contextMenu of
                Just contextMenu ->
                    updateContextMenu model ContextMenu.Types.DownArrow contextMenu

                Nothing ->
                    let
                        maybeNextSelected =
                            getFileOrDirectoryBelow model
                    in
                    ( { model
                        | selectedPaths =
                            case maybeNextSelected of
                                Just nextSelected ->
                                    Dict.fromList [ nextSelected ]

                                Nothing ->
                                    model.selectedPaths
                      }
                    , case maybeNextSelected of
                        Just ( path, _ ) ->
                            Ports.requestScrollIntoView path

                        Nothing ->
                            Cmd.none
                    )

        UpArrow ->
            case model.contextMenu of
                Just contextMenu ->
                    updateContextMenu model ContextMenu.Types.UpArrow contextMenu

                Nothing ->
                    let
                        maybeNextSelected =
                            getFileOrDirectoryAbove model
                    in
                    ( { model
                        | selectedPaths =
                            case maybeNextSelected of
                                Just nextSelected ->
                                    Dict.fromList [ nextSelected ]

                                Nothing ->
                                    model.selectedPaths
                      }
                    , case maybeNextSelected of
                        Just ( path, _ ) ->
                            Ports.requestScrollIntoView path

                        Nothing ->
                            Cmd.none
                    )

        CloseDirectory path ->
            ( { model | openDirectories = Dict.remove path model.openDirectories }
            , Cmd.none
            )

        SelectFileOrDirectory fileOrDirectory ->
            ( { model
                | selectedPaths =
                    if Maybe.map (.code >> (==) "MetaLeft") model.pressedKey |> Maybe.withDefault False then
                        Dict.insert fileOrDirectory.path fileOrDirectory model.selectedPaths

                    else if Maybe.map (.code >> (==) "ShiftLeft") model.pressedKey |> Maybe.withDefault False then
                        case List.Extra.findIndex (\v -> v.path == fileOrDirectory.path) model.flatTree of
                            Just toIndex ->
                                let
                                    maybeFromIndex =
                                        model.selectedPaths
                                            |> Dict.toList
                                            |> List.head
                                            |> Maybe.map first
                                            |> Maybe.map
                                                (\item ->
                                                    List.Extra.findIndex (\i -> i.path == item) model.flatTree
                                                )
                                            |> Maybe.withDefault Nothing
                                in
                                case maybeFromIndex of
                                    Nothing ->
                                        model.selectedPaths

                                    Just fromIndex ->
                                        let
                                            newSelectionArray =
                                                case fromIndex <= (toIndex + 1) of
                                                    True ->
                                                        Array.slice fromIndex (toIndex + 1) (Array.fromList model.flatTree)

                                                    False ->
                                                        Array.slice toIndex (fromIndex + 1) (Array.fromList model.flatTree)
                                        in
                                        newSelectionArray |> Array.foldl (\selected acc -> ( selected.path, selected ) :: acc) [] |> Dict.fromList

                            Nothing ->
                                model.selectedPaths

                    else
                        Dict.fromList [ ( fileOrDirectory.path, fileOrDirectory ) ]
              }
            , Cmd.none
            )

        ActivateFile path ->
            let
                nextFileTree =
                    let
                        fileOrDirectory =
                            FileOrDirectory path (basename path) FileOrDirectoryDirectory

                        nextOpenDirectories =
                            openParentDirectories model fileOrDirectory
                    in
                    { model | openDirectories = nextOpenDirectories, selectedPaths = Dict.fromList [ ( fileOrDirectory.path, fileOrDirectory ) ] }
            in
            ( { nextFileTree | activeFile = Just path }
            , Cmd.batch [ Ports.requestScrollIntoView path ]
            )

        ActivateDirectory path ->
            let
                nextFileTree =
                    let
                        fileOrDirectory =
                            FileOrDirectory path (basename path) FileOrDirectoryDirectory

                        nextOpenDirectories =
                            openParentDirectories model fileOrDirectory
                    in
                    { model | openDirectories = nextOpenDirectories, selectedPaths = Dict.fromList [ ( fileOrDirectory.path, fileOrDirectory ) ] }
            in
            ( nextFileTree
            , Ports.requestScrollIntoView path
            )

        ContextMenuMsg m ->
            case model.contextMenu of
                Just contextMenu ->
                    updateContextMenu model m contextMenu

                Nothing ->
                    ( model, Cmd.none )

        ShowContextMenu contextMenu ->
            ( { model | contextMenu = Just contextMenu, error = Nothing }
            , Cmd.none
            )

        StartCreateNewFile path ->
            ( { model
                | creating = Just { path = path, name = "", type_ = FileOrDirectoryFile }
                , contextMenu = Nothing
                , openDirectories = Dict.insert path (FileOrDirectory path (basename path) FileOrDirectoryDirectory) model.openDirectories
                , selectedPaths = Dict.empty
              }
            , Task.attempt FocusElementByIdResult (focus "vide-create-new-file-input")
            )

        StartCreateNewDirectory path ->
            ( { model
                | creating = Just { path = path, name = "", type_ = FileOrDirectoryDirectory }
                , contextMenu = Nothing
                , openDirectories = Dict.insert path (FileOrDirectory path (basename path) FileOrDirectoryDirectory) model.openDirectories
              }
            , Task.attempt FocusElementByIdResult (focus "vide-create-new-file-input")
            )

        StartDelete filesAndDirectories ->
            ( { model | deleting = Just filesAndDirectories, contextMenu = Nothing }
            , Task.attempt FocusElementByIdResult (focus "vide-delete-dialog")
            )

        SetCreatingName name ->
            ( { model | creating = Maybe.map (\v -> { v | name = name }) model.creating }
            , Cmd.none
            )

        CreateFile file ->
            ( model
            , Ports.requestCreateFile file
            )

        CancelDelete ->
            ( { model | deleting = Nothing }
            , Cmd.none
            )

        Delete filesAndDirectories ->
            ( { model | deleting = Nothing }
            , Ports.requestDelete <| encodeFilesAndDirectories filesAndDirectories
            )

        FocusElementByIdResult _ ->
            ( model, Cmd.none )

        CreateDirectory directory ->
            ( model
            , Ports.requestCreateDirectory directory
            )

        NoOp ->
            ( model, Cmd.none )


openParentDirectories : Model -> FileOrDirectory -> Dict String FileOrDirectory
openParentDirectories model fileOrDirectory =
    String.split "/" (String.replace model.fileTree.path "" fileOrDirectory.path)
        |> List.tail
        |> Maybe.withDefault []
        |> List.foldl
            (\segment ( acc, prevPath ) ->
                let
                    nextPath =
                        prevPath ++ "/" ++ segment
                in
                ( Dict.insert nextPath (FileOrDirectory nextPath (basename nextPath) FileOrDirectoryDirectory) acc, nextPath )
            )
            ( model.openDirectories
                |> Dict.insert model.fileTree.path (treeNodeToFileOrDirectory model.fileTree)
                |> Dict.insert fileOrDirectory.path fileOrDirectory
            , model.fileTree.path
            )
        |> Tuple.first


view : Maybe Model -> Html.Html Msg
view maybeFileTreeModel =
    case maybeFileTreeModel of
        Nothing ->
            div
                []
                []

        Just fileTreeModel ->
            div
                [ onContextMenu
                    ShowContextMenu
                    (noFileOrDirectoryContextMenu fileTreeModel.fileTree.path)
                , class "h-full"
                , style "padding" "4px 0"
                , onClick FileTreeClicked
                ]
                [ viewContextMenu fileTreeModel.contextMenu
                , viewDeleteDialog fileTreeModel.deleting
                , viewChildren 0
                    fileTreeModel.fileTree
                    fileTreeModel.activeFile
                    fileTreeModel.openDirectories
                    fileTreeModel.selectedPaths
                    fileTreeModel.creating
                    fileTreeModel.error
                ]


{-| How far each level of the tree is indented.
-}
indent : Int
indent =
    16


{-| A row starts this far from the left edge, by how deep it is in the tree.
-}
rowPadding : Int -> Attribute msg
rowPadding depth =
    style "padding-left" (String.fromInt (8 + depth * indent) ++ "px")


{-| Every row is laid out the same way: a slot for the chevron, a slot for
the icon, then the name. A file has an empty chevron slot, so that names at
the same depth line up whether or not the row can be opened.
-}
rowAttributes : Int -> List (Attribute msg)
rowAttributes depth =
    [ class "file-tree-row flex items-center whitespace-no-wrap"
    , rowPadding depth
    , style "height" "24px"
    , style "line-height" "24px"
    , style "font-size" "13px"
    , style "cursor" "default"
    ]


chevronSlot : List (Attribute msg) -> Maybe (Octicons.Options -> Html.Html msg) -> Html.Html msg
chevronSlot attributes maybeIcon =
    div
        ([ class "file-tree-chevron flex items-center justify-center"
         , style "width" "16px"
         , style "min-width" "16px"
         , style "height" "24px"
         ]
            ++ attributes
        )
        [ case maybeIcon of
            Just icon ->
                defaultOptions |> Octicons.class "h-3 w-3" |> color "#9aa3b2" |> icon

            Nothing ->
                text ""
        ]


iconSlot : String -> (Octicons.Options -> Html.Html msg) -> Html.Html msg
iconSlot iconColor icon =
    div
        [ class "flex items-center justify-center"
        , style "width" "16px"
        , style "min-width" "16px"
        , style "height" "24px"
        , style "margin-right" "6px"
        ]
        [ defaultOptions |> Octicons.class "h-4 w-4" |> color iconColor |> icon ]


{-| Colors of the tree. Folders stand out from files, a file's icon hints
at what kind of file it is, and things that are rarely opened are dimmer.
-}
folderColor : String
folderColor =
    "#7fa9ee"


dimColor : String
dimColor =
    "#727a86"


selectedColor : String
selectedColor =
    "#ffffff"


fileIconColor : String -> String
fileIconColor name =
    let
        extension =
            case String.split "." name of
                _ :: rest ->
                    List.Extra.last rest |> Maybe.withDefault "" |> String.toLower

                [] ->
                    ""
    in
    if List.member extension [ "rs" ] then
        "#e0884a"

    else if List.member extension [ "elm" ] then
        "#5fb4cb"

    else if List.member extension [ "php" ] then
        "#a394e6"

    else if List.member extension [ "js", "mjs", "cjs", "ts", "jsx", "tsx" ] then
        "#e2c95c"

    else if List.member extension [ "css", "scss", "html" ] then
        "#e08aa8"

    else if List.member extension [ "md", "txt" ] then
        "#8fb3d9"

    else if List.member extension [ "sh", "zsh", "bash" ] then
        "#8fc46b"

    else
        -- configuration, data, lock files and everything else
        "#8b93a1"


fileNameColor : String -> String
fileNameColor name =
    if String.startsWith "." name then
        "#9aa1ab"

    else
        "#d3d7de"


viewDeleteDialog : Maybe (List FileOrDirectory) -> Html.Html Msg
viewDeleteDialog maybeFilesAndDirectories =
    case maybeFilesAndDirectories of
        Just filesAndDirectories ->
            let
                directoryCount =
                    List.Extra.count (\fileOrDirectory -> fileOrDirectory.type_ == FileOrDirectoryDirectory) filesAndDirectories

                fileCount =
                    List.Extra.count (\fileOrDirectory -> fileOrDirectory.type_ == FileOrDirectoryFile) filesAndDirectories

                message =
                    if fileCount == 1 && directoryCount == 0 then
                        let
                            name =
                                List.head filesAndDirectories |> Maybe.map .name |> Maybe.withDefault ""
                        in
                        " file \"" ++ name ++ "\""

                    else if fileCount == 0 && directoryCount == 1 then
                        let
                            name =
                                List.head filesAndDirectories |> Maybe.map .name |> Maybe.withDefault ""
                        in
                        " directory \"" ++ name ++ "\""

                    else
                        (case directoryCount > 0 of
                            True ->
                                String.Extra.pluralize "directory" "directories" directoryCount

                            False ->
                                ""
                        )
                            ++ (case directoryCount > 0 && fileCount > 0 of
                                    True ->
                                        " and "

                                    False ->
                                        ""
                               )
                            ++ (case fileCount > 0 of
                                    True ->
                                        String.Extra.pluralize "file" "files" fileCount

                                    False ->
                                        ""
                               )
            in
            viewDialog
                ("Delete " ++ message)
                ""
                [ form [ onSubmit (Delete filesAndDirectories), class "m-0 p-2" ]
                    [ div [ class "flex justify-end" ]
                        [ button [ type_ "button", onClick CancelDelete, class buttonStyles, class "mr-2" ] [ text "Cancel" ]
                        , button [ type_ "submit", id "vide-delete-dialog", class buttonStyles ] [ text "OK" ]
                        ]
                    ]
                ]

        Nothing ->
            text ""


stopClickPropagation : Attribute Msg
stopClickPropagation =
    stopPropagationOn "click" (Json.Decode.succeed ( NoOp, True ))


viewContextMenu : Maybe (ContextMenu.Types.ContextMenu Msg) -> Html.Html Msg
viewContextMenu maybeContextMenu =
    case maybeContextMenu of
        Just contextMenu ->
            ContextMenu.ContextMenu.view NoOp contextMenu

        Nothing ->
            text ""


viewChildren : Int -> FileTree.Types.FileTree -> Maybe String -> Dict String FileOrDirectory -> Dict String FileOrDirectory -> Maybe FileOrDirectory -> Maybe FileTreeError -> Html.Html Msg
viewChildren depth fileTree activeFile openDirectories selectedPaths creatingNewDirectory maybeError =
    case fileTree.type_ of
        FileOrDirectoryOpaque ->
            viewOpaqueDirectory depth fileTree

        _ ->
            case fileTree.children of
                -- Directory
                Just (FileTree.Types.Children nextChildren) ->
                    viewDirectory depth fileTree nextChildren activeFile openDirectories selectedPaths creatingNewDirectory maybeError

                -- File
                Nothing ->
                    viewFile depth fileTree activeFile selectedPaths


{-| Rendered for directories the walker chose not to recurse into
(node_modules, target, etc.). Shown so the user knows they exist in the
project but with a muted style + no expand chevron so it's obvious the
tree won't open here.
-}
viewOpaqueDirectory : Int -> FileTree -> Html.Html Msg
viewOpaqueDirectory depth fileTree =
    div
        (rowAttributes depth
            ++ [ id fileTree.path
               , title "Not traversed (vendor / cache / build output)"
               , style "color" dimColor
               , style "font-style" "italic"
               ]
        )
        [ chevronSlot [] Nothing
        , iconSlot dimColor fileDirectory
        , text fileTree.name
        ]


viewFile : Int -> FileTree -> Maybe String -> Dict String FileOrDirectory -> Html.Html Msg
viewFile depth fileTree activeFile selectedPaths =
    let
        isActive =
            case activeFile of
                Just e ->
                    e == fileTree.path

                Nothing ->
                    False

        isSelected =
            Dict.member fileTree.path selectedPaths

        name =
            String.Extra.rightOfBack "/" fileTree.path
    in
    div
        (rowAttributes depth
            ++ [ onClick (SelectFileOrDirectory (treeNodeToFileOrDirectory fileTree))
               , onContextMenu ShowContextMenu (fileOrDirectoryContextMenu (FileOrDirectory fileTree.path (basename fileTree.path) FileOrDirectoryFile))
               , onDoubleClick (ActivateFile fileTree.path)

               -- element.scrollIntoView
               , id fileTree.path
               , classList
                    [ ( "bg-blue-700", isSelected )
                    , ( "file-tree-active", isActive )
                    ]
               , style "color"
                    (if isSelected then
                        selectedColor

                     else if isActive then
                        -- the file that is open in the editor
                        "#8fb8ff"

                     else
                        fileNameColor name
                    )
               ]
        )
        [ chevronSlot [] Nothing
        , iconSlot
            (if isSelected then
                selectedColor

             else
                fileIconColor name
            )
            file
        , text name
        ]


treeNodeToFileOrDirectory : FileTree -> FileOrDirectory
treeNodeToFileOrDirectory fileTree =
    FileOrDirectory fileTree.path fileTree.name fileTree.type_


viewDirectory : Int -> FileTree.Types.FileTree -> List FileTree -> Maybe String -> Dict String FileOrDirectory -> Dict String FileOrDirectory -> Maybe FileOrDirectory -> Maybe FileTreeError -> Html.Html Msg
viewDirectory depth fileTree children activeFile openDirectories selectedPaths creatingNew maybeError =
    let
        isOpen =
            Dict.member fileTree.path openDirectories

        isSelected =
            Dict.member fileTree.path selectedPaths

        -- The directory's own row. The chevron opens and closes it; the rest
        -- of the row selects it.
        row =
            div
                (rowAttributes depth
                    ++ [ -- element.scrollIntoView
                         id fileTree.path
                       , classList [ ( "bg-blue-700", isSelected ) ]
                       , style "color"
                            (if isSelected then
                                selectedColor

                             else
                                "#eef0f3"
                            )
                       ]
                )
                [ chevronSlot
                    [ onClick <|
                        if isOpen then
                            CloseDirectory fileTree.path

                        else
                            OpenDirectory (treeNodeToFileOrDirectory fileTree)
                    ]
                    (Just
                        (if isOpen then
                            triangleDown

                         else
                            triangleRight
                        )
                    )
                , div
                    [ onClick (SelectFileOrDirectory (treeNodeToFileOrDirectory fileTree))
                    , onContextMenu ShowContextMenu (fileOrDirectoryContextMenu (FileOrDirectory fileTree.path (basename fileTree.path) FileOrDirectoryDirectory))
                    , class "flex items-center"
                    , style "flex" "1"
                    ]
                    [ iconSlot
                        (if isSelected then
                            selectedColor

                         else
                            folderColor
                        )
                        fileDirectory
                    , basename fileTree.path |> text
                    ]
                ]

        -- What is inside a selected directory goes with it (deleting the
        -- directory deletes all of it), so it is marked as part of the
        -- selection, but quietly: a tint and a line down the side rather
        -- than the solid highlight of the row that is actually selected.
        selectedContents =
            if isSelected then
                [ class "file-tree-selected-contents"
                , style "background" "rgba(43, 108, 176, 0.16)"
                , style "box-shadow" "inset 2px 0 0 rgba(66, 153, 225, 0.7)"
                ]

            else
                []

        -- A line down from the chevron, so it can be seen which rows belong
        -- to this directory and where it ends.
        guide =
            div
                [ class "file-tree-guide"
                , style "position" "absolute"
                , style "top" "0"
                , style "bottom" "0"
                , style "left" (String.fromInt (8 + depth * indent + 7) ++ "px")
                , style "width" "1px"
                , style "background" "rgba(255, 255, 255, 0.1)"
                , style "pointer-events" "none"
                ]
                []
    in
    div
        [ style "min-width" "max-content" ]
        (if isOpen then
            [ row
            , div (style "position" "relative" :: selectedContents)
                [ guide
                , case ( Maybe.map .type_ creatingNew, Maybe.map (\v -> v.path == fileTree.path) creatingNew, creatingNew ) of
                    ( Just FileOrDirectoryDirectory, Just True, Just justCreatingNew ) ->
                        viewCreatingNewDirectory (depth + 1) justCreatingNew maybeError

                    ( Just FileOrDirectoryFile, Just True, Just justCreatingNew ) ->
                        viewCreatingNewFile (depth + 1) justCreatingNew maybeError

                    _ ->
                        text ""
                , div [] (List.foldr (\child acc -> viewChildren (depth + 1) child activeFile openDirectories selectedPaths creatingNew maybeError :: acc) [] children)
                ]
            ]

         else
            [ row ]
        )


viewCreatingNewFile : Int -> FileOrDirectory -> Maybe FileTreeError -> Html.Html Msg
viewCreatingNewFile depth newFile maybeError =
    div
        [ stopClickPropagation
        , class "flex items-center whitespace-no-wrap bg-transparent"
        , rowPadding depth
        , style "font-size" "13px"
        ]
        [ chevronSlot [] Nothing
        , iconSlot (fileIconColor newFile.name) file
        , form [ onSubmit (CreateFile (newFile.path ++ "/" ++ newFile.name)), class "m-0 flex flex-col" ]
            [ input
                [ class "focus:outline-hidden focus:shadow-outline bg-lightgray border"
                , classList
                    [ ( "border-red-700"
                      , case maybeError of
                            Just _ ->
                                True

                            _ ->
                                False
                      )
                    ]
                , onInput SetCreatingName

                -- Autofocus
                , id "vide-create-new-file-input"
                , value newFile.name
                ]
                []
            , case maybeError of
                Just (DirectoryAlreadyExistsError error) ->
                    viewInTreeError error

                Nothing ->
                    text ""
            ]
        ]


viewCreatingNewDirectory : Int -> FileOrDirectory -> Maybe FileTreeError -> Html.Html Msg
viewCreatingNewDirectory depth newDir maybeError =
    div
        [ stopClickPropagation
        , class "flex items-center whitespace-no-wrap bg-transparent"
        , rowPadding depth
        , style "font-size" "13px"
        ]
        [ chevronSlot [] (Just triangleRight)
        , iconSlot folderColor fileDirectory
        , form [ onSubmit (CreateDirectory (newDir.path ++ "/" ++ newDir.name)), class "m-0 flex flex-col" ]
            [ input
                [ class "focus:outline-hidden focus:shadow-outline bg-lightgray border"
                , classList
                    [ ( "border-red-700"
                      , case maybeError of
                            Just _ ->
                                True

                            _ ->
                                False
                      )
                    ]
                , onInput SetCreatingName

                -- Autofocus
                , id "vide-create-new-file-input"
                , value newDir.name
                ]
                []
            , case maybeError of
                Just (DirectoryAlreadyExistsError error) ->
                    viewInTreeError error

                Nothing ->
                    text ""
            ]
        ]


viewInTreeError : String -> Html.Html msg
viewInTreeError error =
    div [ class "bg-red-700 text-white p-1 whitespace-pre-wrap", style "max-width" "12rem" ] [ text error ]
