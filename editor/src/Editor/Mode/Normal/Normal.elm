module Editor.Mode.Normal.Normal exposing (update)

import Editor.Lib
import Editor.Mode.Insert.Handlers.DownArrow as DownArrow
import Editor.Mode.Insert.Handlers.LeftArrow as LeftArrow
import Editor.Mode.Insert.Handlers.RightArrow as RightArrow
import Editor.Mode.Insert.Handlers.UpArrow as UpArrow
import Editor.Mode.Normal.Handlers.CW as CW
import Editor.Mode.Normal.Handlers.D as D
import Editor.Mode.Normal.Handlers.DD as DD
import Editor.Mode.Normal.Handlers.DW as DW
import Editor.Mode.Normal.Handlers.Escape as Escape
import Editor.Mode.Normal.Handlers.GG as GG
import Editor.Mode.Normal.Handlers.H as H
import Editor.Mode.Normal.Handlers.I as I
import Editor.Mode.Normal.Handlers.J as J
import Editor.Mode.Normal.Handlers.K as K
import Editor.Mode.Normal.Handlers.L as L
import Editor.Mode.Normal.Handlers.O as O
import Editor.Mode.Normal.Handlers.P as P
import Editor.Mode.Normal.Handlers.R as R
import Editor.Mode.Normal.Handlers.ShiftA as ShiftA
import Editor.Mode.Normal.Handlers.ShiftG as ShiftG
import Editor.Mode.Normal.Handlers.ShiftW as ShiftW
import Editor.Mode.Normal.Handlers.W as W
import Editor.Mode.Normal.Handlers.X as X
import Editor.Mode.Normal.Handlers.YY as YY
import Editor.Mode.Normal.Handlers.Zero as Zero
import Editor.Msg exposing (Msg)
import Editor.RawKeyboard exposing (RawKey)


update : RawKey -> Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
update key model =
    if key.code == "Escape" then
        Escape.handle model

    else if key.shiftKey && key.code == "KeyA" then
        ShiftA.handle model

    else if key.shiftKey && key.code == "KeyG" then
        ShiftG.handle model

    else if key.shiftKey && key.code == "KeyW" then
        ShiftW.handle model

    else if key.code == "KeyD" && model.selection /= Nothing then
        D.handle model

    else if String.right 1 model.normalBuffer.command == "y" && key.code == "KeyY" then
        YY.handle model

    else if String.right 1 model.normalBuffer.command == "d" && key.code == "KeyD" then
        DD.handle model

    else if String.right 1 model.normalBuffer.command == "d" && key.code == "KeyW" then
        DW.handle model

    else if String.right 1 model.normalBuffer.command == "c" && key.code == "KeyW" then
        CW.handle model

    else if String.right 1 model.normalBuffer.command == "g" && key.code == "KeyG" then
        GG.handle model

    else if String.right 1 model.normalBuffer.command == "r" && String.length key.key == 1 then
        R.handle key.key model

    else if key.code == "KeyW" then
        W.handle model

    else if key.code == "Digit0" then
        Zero.handle model

    else if key.code == "KeyI" then
        I.handle model

    else if key.code == "KeyH" then
        H.handle model

    else if key.code == "KeyJ" then
        J.handle model

    else if key.code == "KeyK" then
        K.handle model

    else if key.code == "KeyL" then
        L.handle model

    else if key.code == "KeyP" then
        P.handle model

    else if key.code == "KeyX" then
        X.handle model

    else if key.code == "KeyO" then
        O.handle model

    else if key.code == "ArrowLeft" then
        LeftArrow.handle model

    else if key.code == "ArrowRight" then
        RightArrow.handle model

    else if key.code == "ArrowUp" then
        UpArrow.handle model

    else if key.code == "ArrowDown" then
        DownArrow.handle model

    else
        let
            ( maybeNumber, maybeCommand ) =
                case String.toInt key.key of
                    Just number ->
                        ( Just number, Nothing )

                    Nothing ->
                        ( Nothing, Just key.key )

            prevNormalBuffer =
                model.normalBuffer

            normalBuffer =
                { prevNormalBuffer
                    | number =
                        case maybeNumber of
                            Just number ->
                                String.toInt (String.fromInt prevNormalBuffer.number ++ String.fromInt number)
                                    |> Maybe.withDefault 0

                            Nothing ->
                                prevNormalBuffer.number
                    , command =
                        case maybeCommand of
                            Just command ->
                                prevNormalBuffer.command ++ command

                            Nothing ->
                                prevNormalBuffer.command
                }
        in
        model
            |> Editor.Lib.startUpdateEditor
            |> Editor.Lib.updateNormalBuffer normalBuffer
            |> Editor.Lib.updateEditor model
