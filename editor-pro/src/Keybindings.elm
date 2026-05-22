module Keybindings exposing (..)

import Browser.Dom exposing (focus)
import Editor.RawKeyboard as RawKeyboard exposing (RawKey)
import FileTree.Keybindings
import Json.Encode
import Lib exposing (requestActivateFileOrDirectory)
import List.Extra
import Model exposing (Model)
import Msg exposing (Msg(..))
import Ports
import Task
import Terminal.Input
import Terminal.Keybindings
import Types exposing (Focused(..))
import Workspace.Lib as WL
import Workspace.Types exposing (Workspace)


handleKeybindings : Model -> RawKeyboard.Msg -> ( Model, Cmd Msg )
handleKeybindings model msg =
    case WL.active model of
        Nothing ->
            ( model, Cmd.none )

        Just ws ->
            handleKeybindingsForWorkspace model ws msg


handleKeybindingsForWorkspace : Model -> Workspace -> RawKeyboard.Msg -> ( Model, Cmd Msg )
handleKeybindingsForWorkspace model ws msg =
    case msg of
        RawKeyboard.Up key ->
            case ws.focused of
                FileTree ->
                    case ws.fileTree of
                        Just fileTree ->
                            let
                                ( nextFileTree, msgs ) =
                                    FileTree.Keybindings.handleKeyUp key fileTree
                            in
                            ( WL.mapActive (\w -> { w | fileTree = Just nextFileTree }) model
                            , Cmd.map FileTreeMsg msgs
                            )

                        Nothing ->
                            ( model, Cmd.none )

                _ ->
                    ( model, Cmd.none )

        RawKeyboard.Down key ->
            -- High level focused element swaps
            if key.metaKey && key.code == "Digit1" then
                ( WL.mapActive
                    (\w ->
                        { w
                            | focused =
                                case w.focused of
                                    FileTree ->
                                        Editor

                                    _ ->
                                        FileTree
                            , fileTreeShowing =
                                case w.focused of
                                    FileTree ->
                                        False

                                    _ ->
                                        True
                        }
                    )
                    model
                , Cmd.none
                )

            else if key.metaKey && key.code == "Digit2" then
                ( WL.mapActive
                    (\w ->
                        { w
                            | focused =
                                case w.focused of
                                    Terminal ->
                                        Editor

                                    _ ->
                                        Terminal
                            , terminalShowing =
                                case w.focused of
                                    Terminal ->
                                        False

                                    _ ->
                                        True
                        }
                    )
                    model
                , Cmd.none
                )

            else if key.metaKey && key.code == "Digit3" then
                ( WL.mapActive (\w -> { w | focused = Editor }) model, Cmd.none )

            else if
                key.metaKey
                    && key.shiftKey
                    && key.code
                    == "KeyO"
            then
                ( WL.mapActive (\w -> { w | focused = FuzzyFinder }) model
                , Task.attempt FocusElementByIdResult (focus "vide-fuzzy-finder-input")
                )

            else
                case ws.focused of
                    FileTree ->
                        case ws.fileTree of
                            Just fileTree ->
                                let
                                    ( nextFileTree, msgs ) =
                                        FileTree.Keybindings.handleKeybindings key fileTree
                                in
                                ( WL.mapActive (\w -> { w | fileTree = Just nextFileTree }) model
                                , Cmd.map FileTreeMsg msgs
                                )

                            Nothing ->
                                ( model, Cmd.none )

                    FuzzyFinder ->
                        if key.code == "Escape" then
                            ( WL.mapActive (\w -> { w | focused = Editor }) model, Cmd.none )

                        else if key.code == "ArrowDown" then
                            ( WL.mapActive
                                (\w ->
                                    let
                                        fuzzyFinder =
                                            w.fuzzyFinder
                                    in
                                    { w
                                        | fuzzyFinder =
                                            { fuzzyFinder
                                                | fuzzyFinderHighlightedIndex = min (List.length fuzzyFinder.fuzzyFindResults - 2) fuzzyFinder.fuzzyFinderHighlightedIndex + 1
                                            }
                                    }
                                )
                                model
                            , Cmd.none
                            )

                        else if key.code == "ArrowUp" then
                            ( WL.mapActive
                                (\w ->
                                    let
                                        fuzzyFinder =
                                            w.fuzzyFinder
                                    in
                                    { w
                                        | fuzzyFinder =
                                            { fuzzyFinder
                                                | fuzzyFinderHighlightedIndex = max 1 fuzzyFinder.fuzzyFinderHighlightedIndex - 1
                                            }
                                    }
                                )
                                model
                            , Cmd.none
                            )

                        else if key.code == "Enter" then
                            case Maybe.map (.fileTree >> .path) ws.fileTree of
                                Just _ ->
                                    case List.Extra.getAt ws.fuzzyFinder.fuzzyFinderHighlightedIndex ws.fuzzyFinder.fuzzyFindResults of
                                        Just path ->
                                            requestActivateFileOrDirectory model path True

                                        _ ->
                                            ( model, Cmd.none )

                                Nothing ->
                                    case List.Extra.getAt ws.fuzzyFinder.fuzzyFinderHighlightedIndex ws.fuzzyFinder.fuzzyFindResults of
                                        Just directory ->
                                            Lib.requestOpenProject model directory

                                        _ ->
                                            ( model, Cmd.none )

                        else
                            ( model, Cmd.none )

                    Terminal ->
                        --Generally handled by loganhenson/editor
                        case ws.terminal of
                            Just terminal ->
                                let
                                    ( nextTerminal, msgs ) =
                                        Terminal.Keybindings.handleKeybindings key terminal
                                in
                                ( WL.mapActive (\w -> { w | terminal = Just nextTerminal }) model
                                , Cmd.map TerminalMsg msgs
                                )

                            Nothing ->
                                ( model, Cmd.none )

                    Editor ->
                        if key.metaKey then
                            case ws.activeFile of
                                Just activeFile ->
                                    case key.code of
                                        "BracketLeft" ->
                                            case List.Extra.findIndex (\( f, _ ) -> f == activeFile) ws.fileHistory of
                                                Just index ->
                                                    case List.Extra.getAt (index + 1) ws.fileHistory of
                                                        Just ( file, _ ) ->
                                                            requestActivateFileOrDirectory model file False

                                                        Nothing ->
                                                            ( model, Cmd.none )

                                                Nothing ->
                                                    ( model, Cmd.none )

                                        "BracketRight" ->
                                            case List.Extra.findIndex (\( f, _ ) -> f == activeFile) ws.fileHistory of
                                                Just index ->
                                                    case List.Extra.getAt (index - 1) ws.fileHistory of
                                                        Just ( file, _ ) ->
                                                            requestActivateFileOrDirectory model file False

                                                        Nothing ->
                                                            ( model, Cmd.none )

                                                Nothing ->
                                                    ( model, Cmd.none )

                                        _ ->
                                            ( model, Cmd.none )

                                Nothing ->
                                    ( model, Cmd.none )

                        else
                            -- Generally handled by loganhenson/editor
                            ( model, Cmd.none )


requestRunTerminal : Maybe String -> Cmd msg
requestRunTerminal maybeInput =
    case maybeInput of
        Nothing ->
            Cmd.none

        Just input ->
            Ports.requestRunTerminal
                (Json.Encode.object
                    [ ( "contents", Json.Encode.string input )
                    ]
                )
