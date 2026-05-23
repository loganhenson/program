module Keybindings exposing (..)

import Editor.RawKeyboard as RawKeyboard exposing (RawKey)
import List.Extra
import Model exposing (Model)
import Msg exposing (Msg(..))
import Terminal.Keybindings


handleKeybindings : Model -> RawKeyboard.Msg -> ( Model, Cmd Msg )
handleKeybindings model msg =
    case msg of
        RawKeyboard.Down key ->
            case List.Extra.getAt model.activeTerminalIndex model.terminals of
                Just activeTab ->
                    let
                        ( nextTerminal, msgs ) =
                            Terminal.Keybindings.handleKeybindings key activeTab.terminal

                        nextModel =
                            { model
                                | terminals =
                                    List.map
                                        (\tt ->
                                            if tt.id == activeTab.id then
                                                { tt | terminal = nextTerminal }

                                            else
                                                tt
                                        )
                                        model.terminals
                            }
                    in
                    ( nextModel, Cmd.map TerminalMsg msgs )

                Nothing ->
                    ( model, Cmd.none )

        RawKeyboard.Up _ ->
            ( model, Cmd.none )
