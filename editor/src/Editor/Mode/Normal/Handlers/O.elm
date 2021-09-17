module Editor.Mode.Normal.Handlers.O exposing (handle)

import Editor.Lib exposing (createRenderableLine)
import Editor.Msg exposing (Msg, RenderableLine)
import List.Extra


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Msg )
handle model =
    let
        { x, y } =
            model.travelable.cursorPosition

        ( headOfLines, tailOfLines ) =
            List.Extra.splitAt y model.travelable.renderableLines

        updatedRenderableLines =
            let
                headOfTailLines =
                    case List.head tailOfLines of
                        Just h ->
                            [ h ]

                        Nothing ->
                            []

                tailOfTailLines =
                    Maybe.withDefault [] <| List.tail tailOfLines
            in
            List.concat [ headOfLines, headOfTailLines, [ createRenderableLine (List.length model.travelable.renderableLines) "" ], tailOfTailLines ]

        prevNormalBuffer =
            model.normalBuffer
    in
    model
        |> Editor.Lib.startUpdateEditor
        |> Editor.Lib.updateRenderableLines updatedRenderableLines
        |> Editor.Lib.updateNormalBuffer { prevNormalBuffer | command = "" }
        |> Editor.Lib.updateCursorPosition { x = 0, y = y + 1 }
        |> Editor.Lib.updateMode Editor.Msg.Insert
        |> Editor.Lib.updateEditor model
