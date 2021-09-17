module Terminal.Keybindings exposing (..)

import Editor.Lib
import Editor.RawKeyboard exposing (RawKey)
import List.Extra
import Terminal exposing (getBuffer, updateTerminalEditor)
import Terminal.Input exposing (evaluateKeyboardEvent)
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
        ( editor, scrollRegion ) =
            getBuffer model.terminal

        msgs =
            if key.metaKey && key.code == "KeyK" then
                Cmd.none

            else if key.metaKey && key.code == "KeyQ" then
                model.ports.requestQuit ()

            else if key.metaKey && key.code == "KeyC" then
                model.ports.requestCopyTerminal ()

            else if key.metaKey && key.code == "KeyV" then
                model.ports.requestPasteTerminal ()

            else
                case evaluateKeyboardEvent key of
                    Nothing ->
                        Cmd.none

                    Just input ->
                        model.ports.requestRunTerminal input

        nextModel =
            if key.metaKey && key.code == "KeyK" && isPrimaryBuffer model.terminal.activeBuffer then
                { model
                    | terminal =
                        let
                            { x, y } =
                                editor.travelable.cursorPosition

                            term =
                                model.terminal

                            travelable =
                                editor.travelable

                            nextRenderableLines =
                                case List.Extra.getAt y travelable.renderableLines of
                                    Just currentLine ->
                                        currentLine :: List.repeat (List.length travelable.renderableLines - 1) (Editor.Lib.createRenderableLine 0 "")

                                    Nothing ->
                                        travelable.renderableLines
                        in
                        updateTerminalEditor
                            { editor | travelable = { travelable | renderableLines = nextRenderableLines, cursorPosition = { x = x, y = 0 } } }
                            { term
                                | scrollback =
                                    let
                                        scrollback =
                                            model.terminal.scrollback

                                        scrollbackTravelable =
                                            scrollback.travelable
                                    in
                                    { scrollback | travelable = { scrollbackTravelable | renderableLines = [] } }
                            }
                }

            else
                model
    in
    ( nextModel
    , msgs
    )
