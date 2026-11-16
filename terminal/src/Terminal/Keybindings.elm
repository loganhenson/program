module Terminal.Keybindings exposing (..)

import Editor.RawKeyboard exposing (RawKey)
import Terminal exposing (scrollToBottom)
import Terminal.Input exposing (encodeKey, keyboardState)
import Terminal.Screen
import Terminal.Types exposing (Model, Msg, Terminal, TerminalBuffer(..))


isAlternateBuffer : TerminalBuffer -> Bool
isAlternateBuffer activeBuffer =
    case activeBuffer of
        Alternate ->
            True

        Primary ->
            False


isPrimaryBuffer : TerminalBuffer -> Bool
isPrimaryBuffer activeBuffer =
    isAlternateBuffer activeBuffer |> not


handleKeybindings : RawKey -> Model -> ( Model, Cmd Msg )
handleKeybindings key model =
    let
        command code =
            key.metaKey && not (key.ctrlKey || key.altKey) && key.code == code
    in
    if command "KeyK" then
        -- Clear the screen and the scrollback, keeping the prompt
        ( { model | terminal = Terminal.Screen.clearKeepingCursorLine model.terminal }, Cmd.none )

    else if command "KeyQ" then
        ( model, model.ports.requestQuit () )

    else if command "KeyC" then
        ( model, model.ports.requestCopyTerminal () )

    else if command "KeyV" then
        ( model, model.ports.requestPasteTerminal () )

    else
        case encodeKey (keyboardState model.terminal) key of
            Just input ->
                ( model
                , Cmd.batch [ model.ports.requestRunTerminal input, scrollToBottom "terminal-container" ]
                )

            Nothing ->
                ( model, Cmd.none )
