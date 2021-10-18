module Main exposing (main)

import Browser
import Decoders exposing (decodeVideError)
import Editor
import Editor.Lib
import Editor.Msg
import Editor.RawKeyboard as RawKeyboard
import FileTree.Decoders exposing (decodeFiles, decodeJsonFile)
import FileTree.FileTree
import FileTree.Types
import FuzzyFinder.FuzzyFinder
import Html exposing (div, text)
import Html.Attributes exposing (class, classList, id, style)
import Html.Events exposing (onClick)
import Html.Lazy
import Json.Decode exposing (decodeValue)
import Keybindings exposing (handleKeybindings)
import Lib exposing (addToFileHistory, handleEditorMsg, handleFileTreeMsg, requestActivateFileOrDirectory)
import Model exposing (Model)
import Msg exposing (Msg(..))
import Notification.Decoders exposing (decodeNotification)
import Notification.Types
import PortHandlers exposing (editorPorts)
import Ports
import Terminal
import Terminal.Types
import Types exposing (Focused(..), VideErrorType(..))


type alias Flags =
    { activeFile : Maybe String, files : Maybe Json.Decode.Value }


init : Flags -> ( Model, Cmd Msg )
init { activeFile, files } =
    let
        maybeFileTree =
            case files of
                Just justFiles ->
                    case decodeFiles justFiles of
                        Ok treeAndFlat ->
                            Just (FileTree.FileTree.init treeAndFlat activeFile)

                        Err _ ->
                            Nothing

                Nothing ->
                    Nothing
    in
    ( { fileTree = maybeFileTree
      , fileTreeShowing = False
      , terminal = Nothing
      , terminalShowing = True
      , editor = Nothing
      , fileHistory = []
      , activeFile = activeFile
      , focused = FileTree
      , fuzzyFinder = FuzzyFinder.FuzzyFinder.init
      , notifications = []
      }
    , case activeFile of
        Just file ->
            Ports.requestActivateFileOrDirectory file

        Nothing ->
            Cmd.none
    )


update : Msg -> Model.Model -> ( Model.Model, Cmd Msg )
update msg model =
    let
        -- Global changes go here
        fuzzyFinder =
            model.fuzzyFinder

        fileTree =
            model.fileTree

        editor =
            model.editor

        nextModel =
            { model
                | fuzzyFinder = fuzzyFinder
                , fileTree = fileTree
                , editor = Maybe.map (\v -> { v | active = model.focused == Editor }) editor
            }
    in
    case msg of
        RawKeyboardMsg m ->
            handleKeybindings nextModel m

        DismissNotification notification ->
            ( { nextModel | notifications = List.filter (\n -> n /= notification) nextModel.notifications }, Cmd.none )

        ReceivedNotification json ->
            case decodeValue decodeNotification json of
                Ok notification ->
                    ( { nextModel | notifications = notification :: nextModel.notifications }, Cmd.none )

                Err err ->
                    ( nextModel, Cmd.none )

        TerminalMsg terminalMsg ->
            case model.terminal of
                Nothing ->
                    ( model, Cmd.none )

                Just t ->
                    let
                        ( nextTerminal, terminalMsgs ) =
                            Terminal.update terminalMsg t
                    in
                    ( { nextModel | terminal = Just nextTerminal }, Cmd.map TerminalMsg terminalMsgs )

        ReceivedVideError json ->
            case decodeValue decodeVideError json of
                Ok videError ->
                    case videError.type_ of
                        FileTreeError fileTreeError ->
                            ( { nextModel
                                | fileTree = Maybe.map (\v -> { v | error = Just fileTreeError }) fileTree
                              }
                            , Cmd.none
                            )

                Err err ->
                    ( nextModel, Cmd.none )

        ReceivedFileTree fileTreeJson ->
            case decodeFiles fileTreeJson of
                Err _ ->
                    ( nextModel, Cmd.none )

                Ok treeAndFlat ->
                    case fileTree of
                        -- First file tree received
                        Nothing ->
                            ( { nextModel
                                | fileTree = Just (FileTree.FileTree.init treeAndFlat Nothing)
                                , terminal = Just (Terminal.init treeAndFlat.tree.path PortHandlers.editorPorts (PortHandlers.terminalPorts treeAndFlat.tree.path))
                                , fileTreeShowing = True
                                , terminalShowing = True
                              }
                            , Ports.requestSetupTerminalResizeObserver ()
                            )

                        -- Refreshed file tree received
                        Just oldTree ->
                            -- If the active file no longer exists, remove the editor
                            let
                                activeFileDeleted =
                                    case nextModel.activeFile of
                                        Just activeFile ->
                                            not (List.member activeFile (List.map .path treeAndFlat.flat))

                                        Nothing ->
                                            False
                            in
                            ( { nextModel
                                | fileTree = Just (FileTree.FileTree.refresh oldTree treeAndFlat)
                                , editor =
                                    if activeFileDeleted then
                                        Nothing

                                    else
                                        nextModel.editor
                              }
                            , Cmd.none
                            )

        FocusElementByIdResult result ->
            ( nextModel, Cmd.none )

        RequestOpenProject directory ->
            ( { nextModel
                | fuzzyFinder = { fuzzyFinder | fuzzyFindResults = [] }
              }
            , Ports.requestOpenProject directory
            )

        FuzzyFindInProjectFileOrDirectory string ->
            ( { nextModel | fuzzyFinder = { fuzzyFinder | fuzzyFinderInputValue = string } }, Ports.requestFuzzyFindInProjectFileOrDirectory string )

        FuzzyFindProjects string ->
            ( nextModel, Ports.requestFuzzyFindProjects string )

        ReceivedFuzzyFindResults results ->
            ( { nextModel | fuzzyFinder = { fuzzyFinder | fuzzyFindResults = results } }, Cmd.none )

        FocusEditor ->
            ( { nextModel
                | focused = Editor
              }
            , Cmd.none
            )

        FocusFileTree ->
            ( { nextModel
                | focused = FileTree
              }
            , Cmd.none
            )

        FocusTerminal ->
            ( { nextModel
                | focused = Terminal
              }
            , Cmd.none
            )

        RequestActivateFileOrDirectory path ->
            requestActivateFileOrDirectory nextModel path True

        ActivateFile jsonFile ->
            case Json.Decode.decodeValue decodeJsonFile jsonFile of
                Ok file ->
                    let
                        ( nextFileTree, fileTreeMsgs ) =
                            case fileTree of
                                Just tree ->
                                    FileTree.FileTree.update (FileTree.Types.ActivateFile file.path) tree
                                        |> Tuple.mapFirst Just

                                Nothing ->
                                    ( Nothing, Cmd.none )

                        ( nextEditor, editorMsgs ) =
                            case editor of
                                Just justEditor ->
                                    Editor.Lib.changeFile justEditor file.path file.contents

                                Nothing ->
                                    ( Editor.Lib.init
                                        True
                                        file.path
                                        file.contents
                                        { vimMode = True
                                        , showLineNumbers = True
                                        , padBottom = True
                                        , padRight = True
                                        , showCursor = True
                                        , characterWidth = 8.40625
                                        }
                                        editorPorts
                                    , Cmd.none
                                    )
                    in
                    ( { model
                        | editor = Just nextEditor
                        , fileTree = nextFileTree
                        , fileHistory = addToFileHistory model.fileHistory file.path file.contents
                        , activeFile = Just file.path
                        , focused = Editor
                      }
                    , Cmd.batch [ Cmd.map EditorMsg editorMsgs, Cmd.map FileTreeMsg fileTreeMsgs ]
                    )

                Err error ->
                    ( model, Cmd.none )

        ActivateDirectory directory ->
            case fileTree of
                Just tree ->
                    let
                        ( nextFileTree, messages ) =
                            FileTree.FileTree.update (FileTree.Types.ActivateDirectory directory) tree
                    in
                    ( { nextModel | focused = FileTree, fileTree = Just nextFileTree }, Cmd.map FileTreeMsg messages )

                Nothing ->
                    ( nextModel, Cmd.none )

        FileTreeMsg m ->
            handleFileTreeMsg m nextModel

        EditorMsg m ->
            handleEditorMsg m nextModel


editorSubscriptions : Maybe Editor.Msg.Model -> Sub Msg
editorSubscriptions maybeEditor =
    case maybeEditor of
        Just editor ->
            Sub.batch
                [ Sub.map EditorMsg <| Ports.receiveSave Editor.Msg.SaveResponse
                , Sub.map EditorMsg <| Ports.receivePaste Editor.Msg.PasteResponse
                , Sub.map EditorMsg <| Ports.receiveErrors Editor.Msg.ErrorsResponse
                , Sub.map EditorMsg <| Ports.receiveCompletions Editor.Msg.CompletionResponse
                , Sub.map EditorMsg <| Ports.receiveSymbols Editor.Msg.SymbolResponse
                , Sub.map EditorMsg <| Editor.subscriptions editor
                ]

        Nothing ->
            Sub.none


fileTreeSubscriptions : Sub Msg
fileTreeSubscriptions =
    Sub.batch
        [ Ports.receiveActivatedFile ActivateFile
        , Ports.receiveActivatedDirectory ActivateDirectory
        ]


terminalSubscriptions : Maybe Terminal.Types.Model -> Sub Msg
terminalSubscriptions maybeTerminal =
    case maybeTerminal of
        Just terminal ->
            Sub.batch
                [ Sub.map TerminalMsg <| Ports.receiveTerminalOutput Terminal.Types.ReceivedTerminalOutput
                , Sub.map TerminalMsg <| Ports.receiveTerminalResized Terminal.Types.ReceivedTerminalResized
                ]

        Nothing ->
            Sub.none


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ editorSubscriptions model.editor
        , terminalSubscriptions model.terminal
        , fileTreeSubscriptions
        , Ports.receiveNotification ReceivedNotification
        , Ports.receiveFuzzyFindResults ReceivedFuzzyFindResults
        , Ports.receiveFileTree ReceivedFileTree
        , Ports.receiveVideError ReceivedVideError
        , Sub.map RawKeyboardMsg (RawKeyboard.subscriptions True True)
        ]


viewFileTree : Model -> Html.Html Msg
viewFileTree model =
    case model.fileTreeShowing of
        True ->
            div
                [ class "border overflow-scroll bg-lightgray_transparent h-full w-full"
                , onClick FocusFileTree
                , classList
                    [ ( "border-blue-400", model.focused == FileTree )
                    , ( "border-lightgray_transparent", model.focused /= FileTree )
                    ]
                ]
                [ Html.map FileTreeMsg <|
                    Html.Lazy.lazy
                        FileTree.FileTree.view
                        model.fileTree
                ]

        False ->
            div [] []


viewEditor : Model -> Html.Html Msg
viewEditor model =
    case model.editor of
        Just editor ->
            div
                [ class "w-full h-full border"
                , onClick FocusEditor
                , classList
                    [ ( "border-blue-400", model.focused == Editor )
                    , ( "border-lightgray-transparent", model.focused /= Editor )
                    ]
                ]
                [ Html.map EditorMsg <|
                    Html.Lazy.lazy
                        Editor.view
                        editor
                ]

        Nothing ->
            div
                [ class "flex-1 flex justify-center h-full items-center text-2xl"
                ]
                [ text "Select a file" ]


viewFuzzyFinder : Model -> Html.Html Msg
viewFuzzyFinder model =
    case model.focused of
        FuzzyFinder ->
            FuzzyFinder.FuzzyFinder.view model.fuzzyFinder (Maybe.map (.fileTree >> .path) model.fileTree)

        _ ->
            text ""


view : Model -> Html.Html Msg
view model =
    div [ class "flex flex-col w-full h-full outline-none overflow-hidden" ]
        [ div
            [ class "w-full flex"
            , case model.terminalShowing of
                True ->
                    style "height" "70%"

                False ->
                    style "height" "100%"
            ]
            [ case model.fileTreeShowing of
                True ->
                    div
                        [ style "width" "20%"
                        , class "select-none"
                        ]
                        [ viewFileTree model ]

                False ->
                    text ""
            , div
                [ case model.fileTreeShowing of
                    True ->
                        style "width" "80%"

                    False ->
                        style "width" "100%"
                , class "select-none"
                ]
                [ viewEditor model ]
            ]
        , case model.terminalShowing of
            True ->
                viewTerminal model.terminal model.focused

            False ->
                text ""
        , viewFuzzyFinder model
        , viewNotifications model.notifications
        ]


viewTerminal : Maybe Terminal.Types.Model -> Focused -> Html.Html Msg
viewTerminal maybeTerminal focused =
    case maybeTerminal of
        Just terminal ->
            div
                [ style "height" "30%"
                , style "overflow-y" "scroll"
                , style "background" "#262626"
                , classList
                    [ ( "border-blue-400", focused == Terminal )
                    , ( "border-lightgray-transparent", focused /= Terminal )
                    ]
                , class "border w-full h-full"
                ]
                [ div
                    [ onClick FocusTerminal
                    ]
                    [ Html.map TerminalMsg <| Terminal.view terminal ]
                ]

        Nothing ->
            text ""


viewNotifications : List Notification.Types.Notification -> Html.Html Msg
viewNotifications notifications =
    div [ class "fixed bottom-0 right-0 w-1/2 m-2" ]
        (List.map
            (\notification ->
                div [ class "h-32 bg-lightgray p-2 w-full flex flex-col justify-between" ]
                    [ div [ class "flex" ]
                        [ div [ class "mb-2" ] [ text notification.message ]
                        , div [ onClick (DismissNotification notification) ] [ text "X" ]
                        ]
                    , div [] [ text ("Source: " ++ notification.source) ]
                    ]
            )
            notifications
        )


main : Program Flags Model.Model Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }
