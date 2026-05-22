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
import List.Extra
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
import Task
import Terminal
import Terminal.Types
import Time
import Types exposing (Focused(..), VideErrorType(..))
import Process
import Tabs.Tabs
import Welcome.Welcome
import Workspace.Lib as WL
import Workspace.Types exposing (Workspace)


type alias Flags =
    { activeFile : Maybe String, files : Maybe Json.Decode.Value }


{-| Auto-dismiss notifications after this many milliseconds — append-only
notification lists used to grow unbounded. Tick polls once a second.
-}
notificationTtlMs : Int
notificationTtlMs =
    10000


{-| FIFO cap on concurrent notifications; protects against a noisy
backend (build failures, sync errors) overwhelming the model.
-}
maxNotifications : Int
maxNotifications =
    50


init : Flags -> ( Model, Cmd Msg )
init { activeFile, files } =
    let
        initialWorkspaces =
            case files of
                Just justFiles ->
                    case decodeFiles justFiles of
                        Ok treeAndFlat ->
                            let
                                ws =
                                    WL.empty treeAndFlat.tree.path
                            in
                            [ { ws
                                | fileTree = Just (FileTree.FileTree.init treeAndFlat activeFile)
                                , activeFile = activeFile
                                , fileTreeShowing = True
                              }
                            ]

                        Err _ ->
                            []

                Nothing ->
                    []
    in
    ( { workspaces = initialWorkspaces
      , activeIndex = 0
      , notifications = []
      , recentProjects = []
      }
    , Cmd.batch
        [ case activeFile of
            Just file ->
                Ports.requestActivateFileOrDirectory file

            Nothing ->
                Cmd.none
        , Ports.requestRecentProjects ()
        ]
    )


{-| Keep each workspace's editor.active flag in sync with whether that
workspace is the active one AND has the editor pane focused. Only the
active workspace can ever have a focused editor.
-}
refreshEditorActiveFlags : Model -> Model
refreshEditorActiveFlags model =
    let
        focusEditor idx ws =
            let
                shouldBeActive =
                    idx == model.activeIndex && ws.focused == Editor
            in
            { ws | editor = Maybe.map (\e -> { e | active = shouldBeActive }) ws.editor }
    in
    { model | workspaces = List.indexedMap focusEditor model.workspaces }


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model_ =
    let
        model =
            refreshEditorActiveFlags model_
    in
    case msg of
        RawKeyboardMsg m ->
            handleKeybindings model m

        DismissNotification notification ->
            ( { model | notifications = List.filter (\( _, n ) -> n /= notification) model.notifications }
            , Cmd.none
            )

        ReceivedNotification json ->
            case decodeValue decodeNotification json of
                Ok notification ->
                    ( model, Task.perform (NotificationReceivedAt notification) Time.now )

                Err _ ->
                    ( model, Cmd.none )

        NotificationReceivedAt notification now ->
            if List.any (\( _, n ) -> n == notification) model.notifications then
                ( model, Cmd.none )

            else
                let
                    entry =
                        ( Time.posixToMillis now, notification )
                in
                ( { model
                    | notifications =
                        (entry :: model.notifications)
                            |> List.take maxNotifications
                  }
                , Cmd.none
                )

        NotificationTick now ->
            let
                nowMs =
                    Time.posixToMillis now
            in
            ( { model
                | notifications =
                    List.filter
                        (\( receivedAt, _ ) -> nowMs - receivedAt < notificationTtlMs)
                        model.notifications
              }
            , Cmd.none
            )

        TerminalMsg terminalMsg ->
            case WL.active model |> Maybe.andThen .terminal of
                Nothing ->
                    ( model, Cmd.none )

                Just t ->
                    let
                        ( nextTerminal, terminalMsgs ) =
                            Terminal.update terminalMsg t
                    in
                    ( WL.mapActive (\w -> { w | terminal = Just nextTerminal }) model
                    , Cmd.map TerminalMsg terminalMsgs
                    )

        ReceivedVideError json ->
            case decodeValue decodeVideError json of
                Ok videError ->
                    case videError.type_ of
                        FileTreeError fileTreeError ->
                            ( WL.mapActive
                                (\w -> { w | fileTree = Maybe.map (\ft -> { ft | error = Just fileTreeError }) w.fileTree })
                                model
                            , Cmd.none
                            )

                Err _ ->
                    ( model, Cmd.none )

        ReceivedFileTree fileTreeJson ->
            case decodeFiles fileTreeJson of
                Err _ ->
                    ( model, Cmd.none )

                Ok treeAndFlat ->
                    case WL.active model of
                        Nothing ->
                            -- No workspace exists yet — create one from the tree
                            let
                                ws =
                                    WL.empty treeAndFlat.tree.path
                            in
                            ( { model
                                | workspaces =
                                    model.workspaces
                                        ++ [ { ws
                                                | fileTree = Just (FileTree.FileTree.init treeAndFlat Nothing)
                                                , terminal = Just (Terminal.init treeAndFlat.tree.path PortHandlers.editorPorts (PortHandlers.terminalPorts treeAndFlat.tree.path))
                                                , fileTreeShowing = True
                                                , terminalShowing = True
                                             }
                                           ]
                                , activeIndex = List.length model.workspaces
                              }
                            , Ports.requestSetupTerminalResizeObserver ()
                            )

                        Just ws ->
                            case ws.fileTree of
                                Nothing ->
                                    -- First file tree for this workspace
                                    ( WL.mapActive
                                        (\w ->
                                            { w
                                                | fileTree = Just (FileTree.FileTree.init treeAndFlat Nothing)
                                                , terminal = Just (Terminal.init treeAndFlat.tree.path PortHandlers.editorPorts (PortHandlers.terminalPorts treeAndFlat.tree.path))
                                                , fileTreeShowing = True
                                                , terminalShowing = True
                                            }
                                        )
                                        model
                                    , Ports.requestSetupTerminalResizeObserver ()
                                    )

                                Just oldTree ->
                                    -- Refreshed file tree
                                    let
                                        activeFileDeleted =
                                            case ws.activeFile of
                                                Just af ->
                                                    not (List.member af (List.map .path treeAndFlat.flat))

                                                Nothing ->
                                                    False
                                    in
                                    ( WL.mapActive
                                        (\w ->
                                            { w
                                                | fileTree = Just (FileTree.FileTree.refresh oldTree treeAndFlat)
                                                , editor =
                                                    if activeFileDeleted then
                                                        Nothing

                                                    else
                                                        w.editor
                                            }
                                        )
                                        model
                                    , Cmd.none
                                    )

        FocusElementByIdResult _ ->
            ( model, Cmd.none )

        RequestOpenProject directory ->
            Lib.requestOpenProject model directory

        RequestPickProjectFolder ->
            ( model, Ports.requestPickProjectFolder () )

        PickedProjectFolder maybeDir ->
            case maybeDir of
                Just dir ->
                    Lib.requestOpenProject model dir

                Nothing ->
                    ( model, Cmd.none )

        ReceivedRecentProjects paths ->
            ( { model | recentProjects = paths }, Cmd.none )

        ExternalFileChange json ->
            case Json.Decode.decodeValue decodeJsonFile json of
                Ok externalFile ->
                    applyExternalFileChange externalFile model

                Err _ ->
                    ( model, Cmd.none )

        ExternalFileDelete path ->
            case WL.active model of
                Just ws ->
                    if ws.activeFile == Just path then
                        ( WL.mapActive
                            (\w ->
                                { w
                                    | editor = Nothing
                                    , activeFile = Nothing
                                    , fileHistory = List.filter (\( p, _ ) -> p /= path) w.fileHistory
                                }
                            )
                            model
                        , Cmd.none
                        )

                    else
                        ( model, Cmd.none )

                Nothing ->
                    ( model, Cmd.none )

        FuzzyFindInProjectFileOrDirectory string ->
            ( WL.mapActive
                (\w ->
                    let
                        ff =
                            w.fuzzyFinder
                    in
                    { w | fuzzyFinder = { ff | fuzzyFinderInputValue = string } }
                )
                model
            , Ports.requestFuzzyFindInProjectFileOrDirectory string
            )

        FuzzyFindProjects string ->
            ( WL.mapActive
                (\w ->
                    let
                        ff =
                            w.fuzzyFinder
                    in
                    { w | fuzzyFinder = { ff | fuzzyFinderInputValue = string } }
                )
                model
            , Ports.requestFuzzyFindProjects string
            )

        ReceivedFuzzyFindResults results ->
            ( WL.mapActive
                (\w ->
                    let
                        ff =
                            w.fuzzyFinder
                    in
                    { w | fuzzyFinder = { ff | fuzzyFindResults = results } }
                )
                model
            , Cmd.none
            )

        FocusEditor ->
            ( WL.mapActive (\w -> { w | focused = Editor }) model, Cmd.none )

        FocusFileTree ->
            ( WL.mapActive (\w -> { w | focused = FileTree }) model, Cmd.none )

        FocusTerminal ->
            ( WL.mapActive (\w -> { w | focused = Terminal }) model, Cmd.none )

        RequestActivateFileOrDirectory path ->
            requestActivateFileOrDirectory model path True

        ActivateFile jsonFile ->
            case Json.Decode.decodeValue decodeJsonFile jsonFile of
                Ok file ->
                    case WL.active model of
                        Nothing ->
                            ( model, Cmd.none )

                        Just ws ->
                            let
                                ( nextFileTree, fileTreeMsgs ) =
                                    case ws.fileTree of
                                        Just tree ->
                                            FileTree.FileTree.update (FileTree.Types.ActivateFile file.path) tree
                                                |> Tuple.mapFirst Just

                                        Nothing ->
                                            ( Nothing, Cmd.none )

                                ( nextEditor, editorMsgs ) =
                                    case ws.editor of
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
                            ( WL.mapActive
                                (\w ->
                                    { w
                                        | editor = Just nextEditor
                                        , fileTree = nextFileTree
                                        , fileHistory = addToFileHistory w.fileHistory file.path file.contents
                                        , activeFile = Just file.path
                                        , focused = Editor
                                    }
                                )
                                model
                            , Cmd.batch [ Cmd.map EditorMsg editorMsgs, Cmd.map FileTreeMsg fileTreeMsgs ]
                            )

                Err _ ->
                    ( model, Cmd.none )

        ActivateDirectory directory ->
            case WL.active model |> Maybe.andThen .fileTree of
                Just tree ->
                    let
                        ( nextFileTree, messages ) =
                            FileTree.FileTree.update (FileTree.Types.ActivateDirectory directory) tree
                    in
                    ( WL.mapActive (\w -> { w | focused = FileTree, fileTree = Just nextFileTree }) model
                    , Cmd.map FileTreeMsg messages
                    )

                Nothing ->
                    ( model, Cmd.none )

        FileTreeMsg m ->
            handleFileTreeMsg m model

        EditorMsg m ->
            handleEditorMsg m model

        SelectTab idx ->
            -- Switching tabs re-asks Rust to load that project (single-PR
            -- intermediate: the Rust side is still single-workspace, so
            -- we re-open to get its file tree + terminal back. Full state
            -- preservation across tabs is the next PR.
            case List.Extra.getAt idx model.workspaces of
                Just ws ->
                    if idx == model.activeIndex then
                        ( disarmAllCloses model, Cmd.none )

                    else
                        ( { model | activeIndex = idx } |> disarmAllCloses
                        , Ports.requestOpenProject ws.projectPath
                        )

                Nothing ->
                    ( disarmAllCloses model, Cmd.none )

        AddTabRequested ->
            ( disarmAllCloses model, Ports.requestPickProjectFolder () )

        CloseRequested idx ->
            ( armCloseFor idx model
              -- Schedule auto-disarm in 3s; if user re-arms a different tab
              -- mid-window, the disarm still fires and resets whatever's
              -- currently armed. Acceptable courtesy behavior.
            , Process.sleep 3000 |> Task.perform (\_ -> DisarmCloseTick)
            )

        CloseConfirmed idx ->
            -- If closing changes the active workspace, re-open the new
            -- active project on the Rust side (single-PR intermediate).
            let
                prevPath =
                    WL.active model |> Maybe.map .projectPath

                nextModel =
                    WL.removeAt idx model |> disarmAllCloses

                nextPath =
                    WL.active nextModel |> Maybe.map .projectPath
            in
            if prevPath == nextPath then
                ( nextModel, Cmd.none )

            else
                case nextPath of
                    Just path ->
                        ( nextModel, Ports.requestOpenProject path )

                    Nothing ->
                        ( nextModel, Cmd.none )

        DisarmCloseTick ->
            ( disarmAllCloses model, Cmd.none )


armCloseFor : Int -> Model -> Model
armCloseFor idx model =
    { model
        | workspaces =
            List.indexedMap
                (\i ws ->
                    if i == idx then
                        { ws | closeArmed = True }

                    else
                        { ws | closeArmed = False }
                )
                model.workspaces
    }


disarmAllCloses : Model -> Model
disarmAllCloses model =
    { model
        | workspaces =
            List.map (\ws -> { ws | closeArmed = False }) model.workspaces
    }


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
        Just _ ->
            Sub.batch
                [ Sub.map TerminalMsg <| Ports.receiveTerminalOutput Terminal.Types.ReceivedTerminalOutput
                , Sub.map TerminalMsg <| Ports.receiveTerminalResized Terminal.Types.ReceivedTerminalResized
                ]

        Nothing ->
            Sub.none


subscriptions : Model -> Sub Msg
subscriptions model =
    let
        activeWs =
            WL.active model
    in
    Sub.batch
        [ editorSubscriptions (activeWs |> Maybe.andThen .editor)
        , terminalSubscriptions (activeWs |> Maybe.andThen .terminal)
        , fileTreeSubscriptions
        , Ports.receiveNotification ReceivedNotification
        , Ports.receiveFuzzyFindResults ReceivedFuzzyFindResults
        , Ports.receiveFileTree ReceivedFileTree
        , Ports.receiveVideError ReceivedVideError
        , Ports.receivePickedProjectFolder PickedProjectFolder
        , Ports.receiveRecentProjects ReceivedRecentProjects
        , Ports.receiveExternalFileChange ExternalFileChange
        , Ports.receiveExternalFileDelete ExternalFileDelete
        , Time.every 1000 NotificationTick
        , Sub.map RawKeyboardMsg (RawKeyboard.subscriptions True True)
        ]


viewFileTree : Workspace -> Html.Html Msg
viewFileTree ws =
    case ws.fileTreeShowing of
        True ->
            div
                ([ class "border overflow-scroll bg-lightgray_transparent h-full w-full"
                 , onClick FocusFileTree
                 , classList
                    [ ( "border-blue-400", ws.focused == FileTree )
                    , ( "border-lightgray_transparent", ws.focused /= FileTree )
                    ]
                 ]
                    ++ (case ws.terminalShowing of
                            False ->
                                [ style "border-bottom-left-radius" "12px" ]

                            True ->
                                []
                       )
                )
                [ Html.map FileTreeMsg <|
                    Html.Lazy.lazy
                        FileTree.FileTree.view
                        ws.fileTree
                ]

        False ->
            div [] []


viewEditor : Workspace -> List String -> Html.Html Msg
viewEditor ws recentProjects =
    case ws.editor of
        Just editor ->
            div
                ([ class "w-full h-full border overflow-hidden"
                 , style "will-change" "contents"
                 , onClick FocusEditor
                 , classList
                    [ ( "border-blue-400", ws.focused == Editor )
                    , ( "border-lightgray-transparent", ws.focused /= Editor )
                    ]
                 ]
                    ++ (case ( ws.fileTreeShowing, ws.terminalShowing ) of
                            ( False, False ) ->
                                [ style "border-radius" "0 0 12px 12px" ]

                            ( True, False ) ->
                                [ style "border-radius" "0 0 12px 0" ]

                            ( _, _ ) ->
                                []
                       )
                )
                [ Html.map EditorMsg <|
                    Html.Lazy.lazy
                        Editor.view
                        editor
                ]

        Nothing ->
            case Maybe.map (.fileTree >> .path) ws.fileTree of
                Just _ ->
                    div
                        [ class "flex-1 flex justify-center h-full items-center text-2xl"
                        ]
                        [ text "Select a file" ]

                Nothing ->
                    Welcome.Welcome.view
                        { recents = recentProjects
                        , onOpenFolder = RequestPickProjectFolder
                        , onOpenRecent = RequestOpenProject
                        }


viewFuzzyFinder : Workspace -> Html.Html Msg
viewFuzzyFinder ws =
    case ws.focused of
        FuzzyFinder ->
            FuzzyFinder.FuzzyFinder.view ws.fuzzyFinder (Maybe.map (.fileTree >> .path) ws.fileTree)

        _ ->
            text ""


view : Model -> Html.Html Msg
view model =
    div [ class "flex flex-col w-full h-full outline-none overflow-hidden" ]
        [ case ( WL.active model, List.isEmpty model.workspaces ) of
            ( Just ws, _ ) ->
                div [ class "flex flex-col w-full h-full" ]
                    [ Tabs.Tabs.view { workspaces = model.workspaces, activeIndex = model.activeIndex }
                    , viewWorkspace ws model.recentProjects
                    ]

            ( Nothing, False ) ->
                -- Workspaces exist but activeIndex is out of bounds — render
                -- the tab strip alone so the user can pick one.
                div [ class "flex flex-col w-full h-full" ]
                    [ Tabs.Tabs.view { workspaces = model.workspaces, activeIndex = model.activeIndex }
                    , viewWelcomeOnly model.recentProjects
                    ]

            ( Nothing, True ) ->
                viewWelcomeOnly model.recentProjects
        , viewNotifications model.notifications
        ]


viewWelcomeOnly : List String -> Html.Html Msg
viewWelcomeOnly recents =
    Welcome.Welcome.view
        { recents = recents
        , onOpenFolder = RequestPickProjectFolder
        , onOpenRecent = RequestOpenProject
        }


viewWorkspace : Workspace -> List String -> Html.Html Msg
viewWorkspace ws recentProjects =
    div
        [ class "flex flex-col w-full"
        , style "flex" "1 1 auto"
        , style "min-height" "0"
        , style "overflow" "hidden"
        ]
        [ div
            [ class "w-full flex"
            , case ws.terminalShowing of
                True ->
                    style "height" "70%"

                False ->
                    style "height" "100%"
            ]
            [ case ws.fileTreeShowing of
                True ->
                    div
                        [ style "width" "20%"
                        , class "select-none"
                        ]
                        [ viewFileTree ws ]

                False ->
                    text ""
            , div
                [ case ws.fileTreeShowing of
                    True ->
                        style "width" "80%"

                    False ->
                        style "width" "100%"
                , class "select-none"
                ]
                [ viewEditor ws recentProjects ]
            ]
        , case ws.terminalShowing of
            True ->
                viewTerminal ws.terminal ws.focused

            False ->
                text ""
        , viewFuzzyFinder ws
        ]


viewTerminal : Maybe Terminal.Types.Model -> Focused -> Html.Html Msg
viewTerminal maybeTerminal focused =
    case maybeTerminal of
        Just terminal ->
            div
                [ style "height" "30%"
                , style "overflow-y" "scroll"
                , style "overflow-x" "hidden"
                , style "background" "#262626"
                , style "border-bottom-left-radius" "12px"
                , style "border-bottom-right-radius" "12px"
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


viewNotifications : List ( Int, Notification.Types.Notification ) -> Html.Html Msg
viewNotifications notifications =
    div
        [ class "fixed bottom-0 right-0 m-3 flex flex-col"
        , style "max-width" "440px"
        , style "gap" "8px"
        , style "z-index" "50"
        ]
        (List.map viewNotificationCard notifications)


viewNotificationCard : ( Int, Notification.Types.Notification ) -> Html.Html Msg
viewNotificationCard ( _, notification ) =
    div
        [ class "bg-lightgray rounded shadow"
        , style "padding" "10px 12px"
        ]
        [ div [ class "flex", style "gap" "8px" ]
            [ div
                [ class "flex-1"
                , style "font-size" "13px"
                , style "line-height" "1.4"
                , style "color" "#d4d4d4"
                ]
                [ text notification.message ]
            , Html.button
                [ onClick (DismissNotification notification)
                , style "background" "transparent"
                , style "border" "0"
                , style "color" "#8a8a8a"
                , style "cursor" "pointer"
                , style "font-size" "16px"
                , style "line-height" "1"
                , style "padding" "0 4px"
                , Html.Attributes.title "Dismiss"
                ]
                [ text "×" ]
            ]
        , div
            [ style "font-size" "11px"
            , style "color" "#7a8088"
            , style "margin-top" "4px"
            ]
            [ text notification.source ]
        ]


{-| Apply an externally-modified file's contents to the active workspace's
editor when that file is currently active. Disk always wins. Cursor is
preserved, clamped to the new line bounds.
-}
applyExternalFileChange : FileTree.Types.File -> Model -> ( Model, Cmd Msg )
applyExternalFileChange externalFile model =
    case WL.active model of
        Nothing ->
            ( model, Cmd.none )

        Just ws ->
            case ( ws.activeFile == Just externalFile.path, ws.editor ) of
                ( True, Just editor ) ->
                    let
                        currentContents =
                            Editor.Lib.renderableLinesToContents editor.travelable.renderableLines
                    in
                    if currentContents == externalFile.contents then
                        ( model, Cmd.none )

                    else
                        let
                            newLines =
                                Editor.Lib.contentsToRenderableLines externalFile.contents

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

                            newEditor =
                                { editor | travelable = newTravelable }
                        in
                        ( WL.mapActive
                            (\w ->
                                { w
                                    | editor = Just newEditor
                                    , fileHistory = addToFileHistory w.fileHistory externalFile.path externalFile.contents
                                }
                            )
                            model
                        , Cmd.none
                        )

                _ ->
                    ( model, Cmd.none )


main : Program Flags Model Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }
