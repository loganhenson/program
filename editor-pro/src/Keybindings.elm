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


handleKeybindings : Model -> RawKeyboard.Msg -> ( Model, Cmd Msg )
handleKeybindings model msg =
    case msg of
        RawKeyboard.Up key ->
            case model.focused of
                FileTree ->
                    case model.fileTree of
                        Just fileTree ->
                            let
                                ( nextFileTree, msgs ) =
                                    FileTree.Keybindings.handleKeyUp key fileTree
                            in
                            ( { model | fileTree = Just nextFileTree }, Cmd.map FileTreeMsg msgs )

                        Nothing ->
                            ( model, Cmd.none )

                _ ->
                    ( model, Cmd.none )

        RawKeyboard.Down key ->
            -- High level focused element swaps
            if key.metaKey && key.code == "Digit1" then
                ( { model
                    | focused =
                        case model.focused of
                            FileTree ->
                                Editor

                            _ ->
                                FileTree
                    , fileTreeShowing =
                        case model.focused of
                            FileTree ->
                                False

                            _ ->
                                True
                  }
                , Cmd.none
                )

            else if key.metaKey && key.code == "Digit2" then
                ( { model
                    | focused =
                        case model.focused of
                            Terminal ->
                                Editor

                            _ ->
                                Terminal
                    , terminalShowing =
                        case model.focused of
                            Terminal ->
                                False

                            _ ->
                                True
                  }
                , Cmd.none
                )

            else if key.metaKey && key.code == "Digit3" then
                ( { model | focused = Editor }, Cmd.none )
                -- Global actions

            else if
                key.metaKey
                    && key.shiftKey
                    && key.code
                    == "KeyO"
            then
                ( { model | focused = FuzzyFinder }, Task.attempt FocusElementByIdResult (focus "vide-fuzzy-finder-input") )
                -- Focus dependent actions

            else
                case model.focused of
                    FileTree ->
                        case model.fileTree of
                            Just fileTree ->
                                let
                                    ( nextFileTree, msgs ) =
                                        FileTree.Keybindings.handleKeybindings key fileTree
                                in
                                ( { model | fileTree = Just nextFileTree }, Cmd.map FileTreeMsg msgs )

                            Nothing ->
                                ( model, Cmd.none )

                    FuzzyFinder ->
                        if key.code == "Escape" then
                            ( { model
                                | focused = Editor
                              }
                            , Cmd.none
                            )

                        else if key.code == "ArrowDown" && model.focused == FuzzyFinder then
                            let
                                fuzzyFinder =
                                    model.fuzzyFinder
                            in
                            ( { model
                                | fuzzyFinder =
                                    { fuzzyFinder
                                        | fuzzyFinderHighlightedIndex = min (List.length fuzzyFinder.fuzzyFindResults - 2) fuzzyFinder.fuzzyFinderHighlightedIndex + 1
                                    }
                              }
                            , Cmd.none
                            )

                        else if key.code == "ArrowUp" then
                            let
                                fuzzyFinder =
                                    model.fuzzyFinder
                            in
                            ( { model
                                | fuzzyFinder =
                                    { fuzzyFinder
                                        | fuzzyFinderHighlightedIndex = max 1 fuzzyFinder.fuzzyFinderHighlightedIndex - 1
                                    }
                              }
                            , Cmd.none
                            )

                        else if key.code == "Enter" then
                            case Maybe.map (.fileTree >> .path) model.fileTree of
                                Just projectPath ->
                                    case List.Extra.getAt model.fuzzyFinder.fuzzyFinderHighlightedIndex model.fuzzyFinder.fuzzyFindResults of
                                        Just path ->
                                            requestActivateFileOrDirectory model path True

                                        _ ->
                                            ( model, Cmd.none )

                                Nothing ->
                                    case List.Extra.getAt model.fuzzyFinder.fuzzyFinderHighlightedIndex model.fuzzyFinder.fuzzyFindResults of
                                        Just directory ->
                                            Lib.requestOpenProject model directory

                                        _ ->
                                            ( model, Cmd.none )

                        else
                            ( model, Cmd.none )

                    Terminal ->
                        --Generally handled by loganhenson/editor
                        case model.terminal of
                            Just terminal ->
                                let
                                    ( nextTerminal, msgs ) =
                                        Terminal.Keybindings.handleKeybindings key terminal
                                in
                                ( { model | terminal = Just nextTerminal }, Cmd.map TerminalMsg msgs )

                            Nothing ->
                                ( model, Cmd.none )

                    Editor ->
                        if key.metaKey then
                            case model.activeFile of
                                Just activeFile ->
                                    case key.code of
                                        "BracketLeft" ->
                                            case List.Extra.findIndex (\( f, _ ) -> f == activeFile) model.fileHistory of
                                                Just index ->
                                                    case List.Extra.getAt (index + 1) model.fileHistory of
                                                        Just ( file, _ ) ->
                                                            requestActivateFileOrDirectory model file False

                                                        Nothing ->
                                                            ( model, Cmd.none )

                                                Nothing ->
                                                    ( model, Cmd.none )

                                        "BracketRight" ->
                                            case List.Extra.findIndex (\( f, _ ) -> f == activeFile) model.fileHistory of
                                                Just index ->
                                                    case List.Extra.getAt (index - 1) model.fileHistory of
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
