module Keybindings exposing (..)

import Editor.RawKeyboard as RawKeyboard exposing (RawKey)
import Model exposing (Model)
import Msg exposing (Msg(..))
import Terminal.Keybindings


handleKeybindings : Model -> RawKeyboard.Msg -> ( Model, Cmd Msg )
handleKeybindings model msg =
    case msg of
        RawKeyboard.Down key ->
            let
                ( nextTerminal, msgs ) =
                    Terminal.Keybindings.handleKeybindings key model.terminal
            in
            ( { model | terminal = nextTerminal }, Cmd.map TerminalMsg msgs )

        RawKeyboard.Up _ ->
            ( model, Cmd.none )
