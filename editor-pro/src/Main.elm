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
import Json.Encode
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


{-| Push the active workspace's identity + active file + active terminal
to JS so its event emitters (save, run, resize, createFile) can stamp
outgoing events with the right workspaceId/terminalId.
-}
emitActiveContext : Model -> Cmd Msg
emitActiveContext model =
    let
        encoded =
            case WL.active model of
                Just ws ->
                    let
                        activeTermId =
                            List.Extra.getAt ws.activeTerminalIndex ws.terminals
                                |> Maybe.map .id
                    in
                    Json.Encode.object
                        [ ( "workspaceId", Json.Encode.string ws.projectPath )
                        , ( "activeFile"
                          , case ws.activeFile of
                                Just f ->
                                    Json.Encode.string f

                                Nothing ->
                                    Json.Encode.null
                          )
                        , ( "terminalId"
                          , case activeTermId of
                                Just t ->
                                    Json.Encode.string t

                                Nothing ->
                                    Json.Encode.null
                          )
                        ]

                Nothing ->
                    Json.Encode.object
                        [ ( "workspaceId", Json.Encode.null )
                        , ( "activeFile", Json.Encode.null )
                        , ( "terminalId", Json.Encode.null )
                        ]
    in
    Ports.setActiveContext encoded


{-| Opens a new terminal in the given workspace. Generates a fresh
workspace-scoped terminalId, initialises an Elm-side Terminal model,
appends it to that workspace's terminals list, and asks Rust to spawn
the corresponding PTY.
-}
openTerminalInWorkspace : String -> Model -> ( Model, Cmd Msg )
openTerminalInWorkspace workspaceId model =
    case WL.findByPath workspaceId model of
        Nothing ->
            ( model, Cmd.none )

        Just ws ->
            let
                newId =
                    "term-" ++ String.fromInt ws.terminalCounter

                newTerminalModel =
                    Terminal.init ws.projectPath PortHandlers.editorPorts (PortHandlers.terminalPorts ws.projectPath)

                newTab =
                    { id = newId, terminal = newTerminalModel, closeArmed = False }

                nextWs =
                    { ws
                        | terminals = ws.terminals ++ [ newTab ]
                        , activeTerminalIndex = List.length ws.terminals
                        , terminalCounter = ws.terminalCounter + 1
                    }

                nextModel =
                    WL.mapWorkspaceByPath workspaceId (always nextWs) model

                openPayload =
                    Json.Encode.object
                        [ ( "workspaceId", Json.Encode.string workspaceId )
                        , ( "terminalId", Json.Encode.string newId )
                        ]
            in
            ( nextModel
            , Cmd.batch
                [ Ports.requestOpenTerminal openPayload
                , Ports.requestSetupTerminalResizeObserver ()
                , emitActiveContext nextModel
                ]
            )


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
            -- Legacy in-Elm TerminalMsg (e.g., keybindings handing input
            -- to the focused terminal). Applies to the active terminal of
            -- the active workspace since that's the only one receiving
            -- direct input.
            case WL.active model of
                Nothing ->
                    ( model, Cmd.none )

                Just ws ->
                    case List.Extra.getAt ws.activeTerminalIndex ws.terminals of
                        Nothing ->
                            ( model, Cmd.none )

                        Just tab ->
                            let
                                ( nextTerminal, terminalMsgs ) =
                                    Terminal.update terminalMsg tab.terminal
                            in
                            ( WL.mapTerminalInWorkspace ws.projectPath tab.id (\t -> { t | terminal = nextTerminal }) model
                            , Cmd.map TerminalMsg terminalMsgs
                            )

        TerminalMsgFor workspaceId terminalId terminalMsg ->
            -- Routed terminal event from Rust (output / sendResizedToTerminal).
            -- Routes to that workspace's specific terminal regardless of
            -- which tab is active — background terminals keep updating.
            case WL.findByPath workspaceId model of
                Nothing ->
                    ( model, Cmd.none )

                Just ws ->
                    case List.Extra.find (\tt -> tt.id == terminalId) ws.terminals of
                        Nothing ->
                            ( model, Cmd.none )

                        Just tab ->
                            let
                                ( nextTerminal, terminalMsgs ) =
                                    Terminal.update terminalMsg tab.terminal
                            in
                            ( WL.mapTerminalInWorkspace workspaceId terminalId (\t -> { t | terminal = nextTerminal }) model
                            , Cmd.map (TerminalMsgFor workspaceId terminalId) terminalMsgs
                            )

        NoOp ->
            ( model, Cmd.none )

        WorkspaceInitialized envelope ->
            case
                Json.Decode.decodeValue
                    (Json.Decode.field "workspaceId" Json.Decode.string)
                    envelope
            of
                Ok workspaceId ->
                    if String.isEmpty workspaceId then
                        ( model, Cmd.none )

                    else
                        let
                            wasNew =
                                WL.findByPath workspaceId model == Nothing

                            nextModel =
                                WL.addOrFocus workspaceId model
                        in
                        if wasNew then
                            -- Auto-open the workspace's first terminal so
                            -- the user has a shell immediately. Subsequent
                            -- terminals come via the + button on the
                            -- terminal-tab strip.
                            let
                                ( withTerm, openCmd ) =
                                    openTerminalInWorkspace workspaceId nextModel
                            in
                            ( withTerm
                            , Cmd.batch [ emitActiveContext withTerm, openCmd ]
                            )

                        else
                            ( nextModel, emitActiveContext nextModel )

                Err _ ->
                    ( model, Cmd.none )

        OpenTerminal ->
            case WL.active model of
                Just ws ->
                    openTerminalInWorkspace ws.projectPath model

                Nothing ->
                    ( model, Cmd.none )

        SelectTerminal idx ->
            case WL.active model of
                Nothing ->
                    ( model, Cmd.none )

                Just ws ->
                    if idx == ws.activeTerminalIndex then
                        ( disarmTerminalCloses model, Cmd.none )

                    else
                        let
                            nextModel =
                                WL.mapActive
                                    (\w -> { w | activeTerminalIndex = idx, focused = Terminal })
                                    model
                                    |> disarmTerminalCloses
                        in
                        ( nextModel, emitActiveContext nextModel )

        CloseTerminalRequested idx ->
            ( armTerminalCloseAt idx model
            , Process.sleep 3000 |> Task.perform (\_ -> DisarmCloseTick)
            )

        CloseTerminalConfirmed idx ->
            case WL.active model of
                Nothing ->
                    ( model, Cmd.none )

                Just ws ->
                    case List.Extra.getAt idx ws.terminals of
                        Nothing ->
                            ( model, Cmd.none )

                        Just closingTab ->
                            let
                                remainingTerms =
                                    List.Extra.removeAt idx ws.terminals

                                nextActiveTermIdx =
                                    if List.isEmpty remainingTerms then
                                        0

                                    else if idx < ws.activeTerminalIndex then
                                        ws.activeTerminalIndex - 1

                                    else if idx == ws.activeTerminalIndex then
                                        min ws.activeTerminalIndex (List.length remainingTerms - 1)

                                    else
                                        ws.activeTerminalIndex

                                nextWs =
                                    { ws
                                        | terminals = remainingTerms
                                        , activeTerminalIndex = max 0 nextActiveTermIdx
                                    }

                                modelAfterClose =
                                    WL.mapActive (always nextWs) model
                                        |> disarmTerminalCloses

                                closePayload =
                                    Json.Encode.object
                                        [ ( "workspaceId", Json.Encode.string ws.projectPath )
                                        , ( "terminalId", Json.Encode.string closingTab.id )
                                        ]

                                -- Closing the last terminal leaves the pane empty
                                -- and unusable; auto-spawn a fresh one in the
                                -- workspace's cwd so the user always has a shell.
                                ( nextModel, openCmd ) =
                                    if List.isEmpty remainingTerms then
                                        openTerminalInWorkspace ws.projectPath modelAfterClose

                                    else
                                        ( modelAfterClose, Cmd.none )
                            in
                            ( nextModel
                            , Cmd.batch
                                [ Ports.requestCloseTerminal closePayload
                                , openCmd
                                , emitActiveContext nextModel
                                ]
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

        ReceivedFileTree envelope ->
            case decodeWorkspaceFileTreeEnvelope envelope of
                Err _ ->
                    ( model, Cmd.none )

                Ok ( workspaceId, treeAndFlat ) ->
                    let
                        wasFirstTree =
                            case WL.findByPath workspaceId model of
                                Just ws ->
                                    ws.fileTree == Nothing

                                Nothing ->
                                    False

                        nextModel =
                            WL.mapWorkspaceByPath workspaceId (updateWorkspaceFileTree treeAndFlat) model

                        cmds =
                            if wasFirstTree then
                                [ Ports.requestSetupTerminalResizeObserver ()
                                , emitActiveContext nextModel
                                ]

                            else
                                []
                    in
                    ( nextModel, Cmd.batch cmds )

        FocusElementByIdResult _ ->
            ( model, Cmd.none )

        RequestOpenProject directory ->
            let
                ( nextModel, cmd ) =
                    Lib.requestOpenProject model directory
            in
            ( nextModel, Cmd.batch [ cmd, emitActiveContext nextModel ] )

        RequestPickProjectFolder ->
            ( model, Ports.requestPickProjectFolder () )

        PickedProjectFolder maybeDir ->
            case maybeDir of
                Just dir ->
                    let
                        ( nextModel, cmd ) =
                            Lib.requestOpenProject model dir
                    in
                    ( nextModel, Cmd.batch [ cmd, emitActiveContext nextModel ] )

                Nothing ->
                    ( model, Cmd.none )

        ReceivedRecentProjects paths ->
            ( { model | recentProjects = paths }, Cmd.none )

        ExternalFileChange json ->
            applyExternalFileChange json model

        ExternalFileDelete json ->
            case
                Json.Decode.decodeValue
                    (Json.Decode.map2 Tuple.pair
                        (Json.Decode.field "workspaceId" Json.Decode.string)
                        (Json.Decode.field "path" Json.Decode.string)
                    )
                    json
            of
                Ok ( workspaceId, path ) ->
                    case WL.findByPath workspaceId model of
                        Just ws ->
                            if ws.activeFile == Just path then
                                let
                                    nextModel =
                                        WL.mapWorkspaceByPath workspaceId
                                            (\w ->
                                                { w
                                                    | editor = Nothing
                                                    , activeFile = Nothing
                                                    , fileHistory = List.filter (\( p, _ ) -> p /= path) w.fileHistory
                                                }
                                            )
                                            model
                                in
                                ( nextModel, emitActiveContext nextModel )

                            else
                                ( model, Cmd.none )

                        Nothing ->
                            ( model, Cmd.none )

                Err _ ->
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

        ReceivedFuzzyFindResults envelope ->
            case
                Json.Decode.decodeValue
                    (Json.Decode.map2 Tuple.pair
                        (Json.Decode.field "workspaceId" Json.Decode.string)
                        (Json.Decode.field "results" (Json.Decode.list Json.Decode.string))
                    )
                    envelope
            of
                Ok ( workspaceId, results ) ->
                    if String.isEmpty workspaceId then
                        -- Project-search results (from welcome screen) — apply to active
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

                    else
                        ( WL.mapWorkspaceByPath workspaceId
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

                Err _ ->
                    ( model, Cmd.none )

        FocusEditor ->
            ( WL.mapActive (\w -> { w | focused = Editor }) model, Cmd.none )

        FocusFileTree ->
            ( WL.mapActive (\w -> { w | focused = FileTree }) model, Cmd.none )

        FocusTerminal ->
            ( WL.mapActive (\w -> { w | focused = Terminal }) model, Cmd.none )

        RequestActivateFileOrDirectory path ->
            requestActivateFileOrDirectory model path True

        ActivateFile envelope ->
            case
                Json.Decode.decodeValue
                    (Json.Decode.map3 (\wsId path contents -> ( wsId, path, contents ))
                        (Json.Decode.field "workspaceId" Json.Decode.string)
                        (Json.Decode.field "path" Json.Decode.string)
                        (Json.Decode.field "contents" Json.Decode.string)
                    )
                    envelope
            of
                Ok ( workspaceId, path, contents ) ->
                    case WL.findByPath workspaceId model of
                        Nothing ->
                            ( model, Cmd.none )

                        Just ws ->
                            let
                                ( nextFileTree, fileTreeMsgs ) =
                                    case ws.fileTree of
                                        Just tree ->
                                            FileTree.FileTree.update (FileTree.Types.ActivateFile path) tree
                                                |> Tuple.mapFirst Just

                                        Nothing ->
                                            ( Nothing, Cmd.none )

                                ( nextEditor, editorMsgs ) =
                                    case ws.editor of
                                        Just justEditor ->
                                            Editor.Lib.changeFile justEditor path contents

                                        Nothing ->
                                            ( Editor.Lib.init
                                                True
                                                path
                                                contents
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

                                nextModel =
                                    WL.mapWorkspaceByPath workspaceId
                                        (\w ->
                                            { w
                                                | editor = Just nextEditor
                                                , fileTree = nextFileTree
                                                , fileHistory = addToFileHistory w.fileHistory path contents
                                                , activeFile = Just path
                                                , focused = Editor
                                            }
                                        )
                                        model
                            in
                            ( nextModel
                            , Cmd.batch
                                [ Cmd.map EditorMsg editorMsgs
                                , Cmd.map FileTreeMsg fileTreeMsgs
                                , emitActiveContext nextModel
                                ]
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
            if idx == model.activeIndex then
                ( disarmAllCloses model, Cmd.none )

            else
                let
                    nextModel =
                        { model | activeIndex = idx } |> disarmAllCloses
                in
                ( nextModel, emitActiveContext nextModel )

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
            case List.Extra.getAt idx model.workspaces of
                Nothing ->
                    ( disarmAllCloses model, Cmd.none )

                Just closingWs ->
                    let
                        nextModel =
                            WL.removeAt idx model |> disarmAllCloses
                    in
                    ( nextModel
                    , Cmd.batch
                        [ Ports.requestCloseWorkspace closingWs.projectPath
                        , emitActiveContext nextModel
                        ]
                    )

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
            List.map
                (\ws ->
                    { ws
                        | closeArmed = False
                        , terminals = List.map (\t -> { t | closeArmed = False }) ws.terminals
                    }
                )
                model.workspaces
    }


{-| Flip `closeArmed = True` on the terminal at `idx` of the active
workspace; disarm everything else.
-}
armTerminalCloseAt : Int -> Model -> Model
armTerminalCloseAt idx model =
    let
        clearedProjectArm =
            disarmAllCloses model
    in
    WL.mapActive
        (\w ->
            { w
                | terminals =
                    List.indexedMap
                        (\i tt ->
                            { tt | closeArmed = i == idx }
                        )
                        w.terminals
            }
        )
        clearedProjectArm


disarmTerminalCloses : Model -> Model
disarmTerminalCloses model =
    { model
        | workspaces =
            List.map
                (\ws ->
                    { ws | terminals = List.map (\tt -> { tt | closeArmed = False }) ws.terminals }
                )
                model.workspaces
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


terminalSubscriptions : Sub Msg
terminalSubscriptions =
    -- Output and resize events from Rust carry both workspaceId and
    -- terminalId so we can route to the specific terminal model
    -- regardless of which project / which terminal-tab is active.
    Sub.batch
        [ Ports.receiveTerminalOutput
            (\envelope ->
                case decodeTerminalEnvelope (Json.Decode.field "data" Json.Decode.value) envelope of
                    Ok ( wsId, termId, data ) ->
                        TerminalMsgFor wsId termId (Terminal.Types.ReceivedTerminalOutput data)

                    Err _ ->
                        NoOp
            )
        , Ports.receiveTerminalResized
            (\envelope ->
                case decodeTerminalEnvelope (Json.Decode.field "size" Json.Decode.value) envelope of
                    Ok ( wsId, termId, size ) ->
                        TerminalMsgFor wsId termId (Terminal.Types.ReceivedTerminalResized size)

                    Err _ ->
                        NoOp
            )
        ]


decodeTerminalEnvelope : Json.Decode.Decoder a -> Json.Decode.Value -> Result Json.Decode.Error ( String, String, a )
decodeTerminalEnvelope innerDecoder envelope =
    Json.Decode.decodeValue
        (Json.Decode.map3 (\wsId termId inner -> ( wsId, termId, inner ))
            (Json.Decode.field "workspaceId" Json.Decode.string)
            (Json.Decode.field "terminalId" Json.Decode.string)
            innerDecoder
        )
        envelope


subscriptions : Model -> Sub Msg
subscriptions model =
    let
        activeWs =
            WL.active model
    in
    Sub.batch
        [ editorSubscriptions (activeWs |> Maybe.andThen .editor)
        , terminalSubscriptions
        , fileTreeSubscriptions
        , Ports.receiveNotification ReceivedNotification
        , Ports.receiveFuzzyFindResults ReceivedFuzzyFindResults
        , Ports.receiveFileTree ReceivedFileTree
        , Ports.receiveVideError ReceivedVideError
        , Ports.receivePickedProjectFolder PickedProjectFolder
        , Ports.receiveRecentProjects ReceivedRecentProjects
        , Ports.receiveExternalFileChange ExternalFileChange
        , Ports.receiveExternalFileDelete ExternalFileDelete
        , Ports.receiveWorkspaceInitialized WorkspaceInitialized
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
                    [ projectTabBar model
                    , viewWorkspace ws model.recentProjects
                    ]

            ( Nothing, False ) ->
                div [ class "flex flex-col w-full h-full" ]
                    [ projectTabBar model
                    , viewWelcomeOnly model.recentProjects
                    ]

            ( Nothing, True ) ->
                viewWelcomeOnly model.recentProjects
        , viewNotifications model.notifications
        ]


projectTabBar : Model -> Html.Html Msg
projectTabBar model =
    let
        items =
            List.map
                (\ws ->
                    { label = basename ws.projectPath
                    , tooltip = Just ws.projectPath
                    , closeArmed = ws.closeArmed
                    }
                )
                model.workspaces
    in
    Tabs.Tabs.view
        { tabs = items
        , activeIndex = model.activeIndex
        , onSelect = SelectTab
        , onClose = CloseRequested
        , onConfirmClose = CloseConfirmed
        , onAdd = AddTabRequested
        , addTooltip = "Open another project"
        }


basename : String -> String
basename path =
    let
        trimmed =
            if String.endsWith "/" path then
                String.dropRight 1 path

            else
                path
    in
    case List.reverse (String.split "/" trimmed) of
        last :: _ ->
            if String.isEmpty last then
                trimmed

            else
                last

        [] ->
            trimmed


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
                viewTerminalPane ws

            False ->
                text ""
        , viewFuzzyFinder ws
        ]


viewTerminalPane : Workspace -> Html.Html Msg
viewTerminalPane ws =
    case List.Extra.getAt ws.activeTerminalIndex ws.terminals of
        Nothing ->
            text ""

        Just activeTab ->
            div
                [ style "height" "30%"
                , style "display" "flex"
                , style "flex-direction" "column"
                , style "background" "#262626"
                -- Keep the pane radius just inside the macOS window
                -- corner — at exact-match the border's outermost corner
                -- pixels sit on the OS clip boundary and get sliced off.
                , style "border-bottom-left-radius" "8px"
                , style "border-bottom-right-radius" "8px"
                -- overflow:hidden so the inner terminal view + scrollbar
                -- are clipped to the rounded corners instead of bleeding
                -- past them with sharp edges.
                , style "overflow" "hidden"
                -- Wry refuses to render `border` AND `outline` along the
                -- curved corner segment. Trick: pad the pane by 1px and
                -- use box-shadow inset for the ring. The padding gives
                -- the shadow its own pixel ring along the rounded edge
                -- that the children (tab strip, terminal) physically
                -- can't paint over. box-shadow follows border-radius
                -- reliably in Wry where the other two don't.
                , style "padding" "1px"
                , style "box-shadow"
                    (if ws.focused == Terminal then
                        "inset 0 0 0 1px #60a5fa"

                     else
                        "inset 0 0 0 1px #8f99ab42"
                    )
                , class "w-full"
                ]
                [ terminalTabBar ws
                , div
                    -- Terminal.view brings its own #terminal-container
                    -- scroll context; adding another overflow-y: scroll
                    -- here stacks two scrollbars and the outer one fights
                    -- the terminal's autoscroll on `ls`-like bursts.
                    [ style "flex" "1 1 auto"
                    , style "min-height" "0"
                    , style "overflow" "hidden"
                    , onClick FocusTerminal
                    ]
                    [ Html.map TerminalMsg <| Terminal.view activeTab.terminal ]
                ]


terminalTabBar : Workspace -> Html.Html Msg
terminalTabBar ws =
    let
        items =
            List.indexedMap
                (\i tt ->
                    { label = "Terminal " ++ String.fromInt (i + 1)
                    , tooltip = Just tt.id
                    , closeArmed = tt.closeArmed
                    }
                )
                ws.terminals
    in
    Tabs.Tabs.view
        { tabs = items
        , activeIndex = ws.activeTerminalIndex
        , onSelect = SelectTerminal
        , onClose = CloseTerminalRequested
        , onConfirmClose = CloseTerminalConfirmed
        , onAdd = OpenTerminal
        , addTooltip = "Open another terminal in this project"
        }


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


{-| Apply an externally-modified file's contents to whichever workspace
owns it. Disk always wins. Cursor is preserved, clamped to the new line
bounds. Identical contents are a no-op (catches own-save round-trips).
-}
applyExternalFileChange : Json.Decode.Value -> Model -> ( Model, Cmd Msg )
applyExternalFileChange envelope model =
    case
        Json.Decode.decodeValue
            (Json.Decode.map3 (\wsId path contents -> ( wsId, path, contents ))
                (Json.Decode.field "workspaceId" Json.Decode.string)
                (Json.Decode.field "path" Json.Decode.string)
                (Json.Decode.field "contents" Json.Decode.string)
            )
            envelope
    of
        Ok ( workspaceId, path, contents ) ->
            case WL.findByPath workspaceId model of
                Nothing ->
                    ( model, Cmd.none )

                Just ws ->
                    case ( ws.activeFile == Just path, ws.editor ) of
                        ( True, Just editor ) ->
                            let
                                currentContents =
                                    Editor.Lib.renderableLinesToContents editor.travelable.renderableLines
                            in
                            if currentContents == contents then
                                ( model, Cmd.none )

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

                                    newEditor =
                                        { editor | travelable = newTravelable }
                                in
                                ( WL.mapWorkspaceByPath workspaceId
                                    (\w ->
                                        { w
                                            | editor = Just newEditor
                                            , fileHistory = addToFileHistory w.fileHistory path contents
                                        }
                                    )
                                    model
                                , Cmd.none
                                )

                        _ ->
                            ( model, Cmd.none )

        Err _ ->
            ( model, Cmd.none )


decodeWorkspaceFileTreeEnvelope : Json.Decode.Value -> Result Json.Decode.Error ( String, FileTree.Types.FileTreeAndFlat )
decodeWorkspaceFileTreeEnvelope envelope =
    case
        Json.Decode.decodeValue
            (Json.Decode.map2 Tuple.pair
                (Json.Decode.field "workspaceId" Json.Decode.string)
                (Json.Decode.field "tree" Json.Decode.value)
            )
            envelope
    of
        Err e ->
            Err e

        Ok ( workspaceId, treeValue ) ->
            case decodeFiles treeValue of
                Ok treeAndFlat ->
                    Ok ( workspaceId, treeAndFlat )

                Err e ->
                    Err e


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
            let
                activeFileDeleted =
                    case ws.activeFile of
                        Just af ->
                            not (List.member af (List.map .path treeAndFlat.flat))

                        Nothing ->
                            False
            in
            { ws
                | fileTree = Just (FileTree.FileTree.refresh oldTree treeAndFlat)
                , editor =
                    if activeFileDeleted then
                        Nothing

                    else
                        ws.editor
            }


main : Program Flags Model Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }
