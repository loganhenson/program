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
import Html.Attributes exposing (class, classList, id, style, type_, value)
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
                , onClick FileTreeClicked
                ]
                [ viewContextMenu fileTreeModel.contextMenu
                , viewDeleteDialog fileTreeModel.deleting
                , viewChildren
                    fileTreeModel.fileTree
                    fileTreeModel.activeFile
                    fileTreeModel.openDirectories
                    fileTreeModel.selectedPaths
                    fileTreeModel.creating
                    fileTreeModel.error
                ]


fileTreeIcon : List (Attribute msg) -> (Octicons.Options -> Html.Html msg) -> Html.Html msg
fileTreeIcon attributes icon =
    div ([ class "flex items-center justify-center w-6 h-6", style "min-width" "24px" ] ++ attributes)
        [ defaultOptions |> Octicons.class "h-4 w-4" |> color "" |> icon
        ]


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


viewChildren : FileTree.Types.FileTree -> Maybe String -> Dict String FileOrDirectory -> Dict String FileOrDirectory -> Maybe FileOrDirectory -> Maybe FileTreeError -> Html.Html Msg
viewChildren fileTree activeFile openDirectories selectedPaths creatingNewDirectory maybeError =
    case fileTree.children of
        -- Directory
        Just (FileTree.Types.Children nextChildren) ->
            viewDirectory fileTree nextChildren activeFile openDirectories selectedPaths creatingNewDirectory maybeError

        -- File
        Nothing ->
            viewFile fileTree activeFile selectedPaths


viewFile : FileTree -> Maybe String -> Dict String FileOrDirectory -> Html.Html Msg
viewFile fileTree activeFile selectedPaths =
    let
        isActive =
            case activeFile of
                Just e ->
                    e == fileTree.path

                Nothing ->
                    False

        isSelected =
            Dict.member fileTree.path selectedPaths
    in
    div
        [ onClick (SelectFileOrDirectory (treeNodeToFileOrDirectory fileTree))
        , onContextMenu ShowContextMenu (fileOrDirectoryContextMenu (FileOrDirectory fileTree.path (basename fileTree.path) FileOrDirectoryFile))
        , onDoubleClick (ActivateFile fileTree.path)
        , class "pl-6 whitespace-no-wrap w-auto"

        -- element.scrollIntoView
        , id fileTree.path
        , classList
            [ ( "bg-blue-700", isSelected )
            , ( "text-blue-500", isActive && not isSelected )
            ]
        ]
        [ div
            [ class "flex w-full" ]
            [ fileTreeIcon [] file, text (String.Extra.rightOfBack "/" fileTree.path) ]
        ]


treeNodeToFileOrDirectory : FileTree -> FileOrDirectory
treeNodeToFileOrDirectory fileTree =
    FileOrDirectory fileTree.path fileTree.name fileTree.type_


viewDirectory : FileTree.Types.FileTree -> List FileTree -> Maybe String -> Dict String FileOrDirectory -> Dict String FileOrDirectory -> Maybe FileOrDirectory -> Maybe FileTreeError -> Html.Html Msg
viewDirectory fileTree children activeFile openDirectories selectedPaths creatingNew maybeError =
    let
        nameElement =
            div
                [ onClick (SelectFileOrDirectory (treeNodeToFileOrDirectory fileTree))
                , onContextMenu ShowContextMenu (fileOrDirectoryContextMenu (FileOrDirectory fileTree.path (basename fileTree.path) FileOrDirectoryDirectory))
                , class "flex fill-current text-white items-center whitespace-no-wrap w-full"

                -- element.scrollIntoView
                , id fileTree.path
                ]
                [ fileTreeIcon [] fileDirectory
                , basename fileTree.path |> text
                ]
    in
    div
        [ class "flex flex-col fill-current text-white items-center pl-6 w-full"
        , style "min-width" "max-content"
        , classList
            [ ( "bg-blue-700", Dict.member fileTree.path selectedPaths )
            ]
        ]
        [ case Dict.member fileTree.path openDirectories of
            True ->
                div [ class "w-full" ]
                    [ div
                        [ class "flex" ]
                        [ fileTreeIcon
                            [ onClick <| CloseDirectory fileTree.path
                            ]
                            triangleDown
                        , nameElement
                        ]
                    , case ( Maybe.map .type_ creatingNew, Maybe.map (\v -> v.path == fileTree.path) creatingNew, creatingNew ) of
                        ( Just FileOrDirectoryDirectory, Just True, Just justCreatingNew ) ->
                            viewCreatingNewDirectory justCreatingNew maybeError

                        ( Just FileOrDirectoryFile, Just True, Just justCreatingNew ) ->
                            viewCreatingNewFile justCreatingNew maybeError

                        _ ->
                            text ""
                    , div [] (List.foldr (\child acc -> viewChildren child activeFile openDirectories selectedPaths creatingNew maybeError :: acc) [] children)
                    ]

            False ->
                div
                    [ class "flex w-full" ]
                    [ fileTreeIcon [ onClick <| OpenDirectory (treeNodeToFileOrDirectory fileTree) ] triangleRight
                    , nameElement
                    ]
        ]


viewCreatingNewFile : FileOrDirectory -> Maybe FileTreeError -> Html.Html Msg
viewCreatingNewFile newFile maybeError =
    div
        [ stopClickPropagation
        , class "pl-6 flex w-full items-center whitespace-no-wrap bg-transparent"
        ]
        [ fileTreeIcon [] file
        , form [ onSubmit (CreateFile (newFile.path ++ "/" ++ newFile.name)), class "m-0 flex flex-col" ]
            [ input
                [ class "focus:outline-none focus:shadow-outline bg-lightgray border"
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


viewCreatingNewDirectory : FileOrDirectory -> Maybe FileTreeError -> Html.Html Msg
viewCreatingNewDirectory newDir maybeError =
    div
        [ stopClickPropagation
        , class "pl-6 flex w-full items-center whitespace-no-wrap bg-transparent"
        ]
        [ fileTreeIcon [] triangleDown
        , fileTreeIcon [] fileDirectory
        , form [ onSubmit (CreateDirectory (newDir.path ++ "/" ++ newDir.name)), class "m-0 flex flex-col" ]
            [ input
                [ class "focus:outline-none focus:shadow-outline bg-lightgray border"
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
