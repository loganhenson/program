module Editor.Mode.Insert.Insert exposing (update)

import Editor.Mode.Insert.Handlers.Backspace as Backspace
import Editor.Mode.Insert.Handlers.Character as Character
import Editor.Mode.Insert.Handlers.DownArrow as DownArrow
import Editor.Mode.Insert.Handlers.Enter as Enter
import Editor.Mode.Insert.Handlers.Escape as Escape
import Editor.Mode.Insert.Handlers.LeftArrow as LeftArrow
import Editor.Mode.Insert.Handlers.RightArrow as RightArrow
import Editor.Mode.Insert.Handlers.Tab as Tab
import Editor.Mode.Insert.Handlers.UpArrow as UpArrow
import Editor.Msg exposing (Msg)
import Editor.RawKeyboard exposing (RawKey)


update : RawKey -> Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
update key model =
    if key.code == "Escape" then
        Escape.handle model

    else if key.code == "Backspace" then
        Backspace.handle model

    else if key.code == "Tab" then
        Tab.handle model

    else if key.code == "Enter" then
        Enter.handle model

    else if key.code == "ArrowLeft" then
        LeftArrow.handle model

    else if key.code == "ArrowRight" then
        RightArrow.handle model

    else if key.code == "ArrowUp" then
        UpArrow.handle model

    else if key.code == "ArrowDown" then
        DownArrow.handle model

    else
        Character.handle key model
