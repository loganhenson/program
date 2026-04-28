module Editor.Mode.VisualLine.VisualLine exposing (update)

import Editor.Mode.VisualLine.Handlers.D as D
import Editor.Mode.VisualLine.Handlers.Escape as Escape
import Editor.Mode.VisualLine.Handlers.J as J
import Editor.Mode.VisualLine.Handlers.K as K
import Editor.Mode.VisualLine.Handlers.Y as Y
import Editor.Msg exposing (Msg)
import Editor.RawKeyboard exposing (RawKey)


update : RawKey -> Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
update key model =
    if key.code == "Escape" then
        Escape.handle model

    else if key.code == "KeyJ" then
        J.handle model

    else if key.code == "KeyK" then
        K.handle model

    else if key.code == "KeyY" then
        Y.handle model

    else if key.code == "KeyD" then
        D.handle model

    else
        ( model, Cmd.none )
