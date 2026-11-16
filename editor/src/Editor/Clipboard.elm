module Editor.Clipboard exposing (copy, cut, paste)

import Array
import Editor.Lib exposing (createRenderableLine, orderSelectionCoordinates)
import Editor.Msg exposing (Model, RenderableLine, Travelable)
import List.Extra
import String.Extra
import Tuple exposing (first)


paste : Editor.Msg.Model -> String -> Model
paste model pasted =
    -- if selection, then cut (without copying) before pasting
    let
        pastedRenderableLines =
            Editor.Lib.contentsToRenderableLines pasted

        { x, y } =
            model.travelable.cursorPosition
    in
    case model.selection of
        Nothing ->
            case List.length pastedRenderableLines of
                1 ->
                    let
                        travelable =
                            model.travelable
                    in
                    -- inject pasted at cursor location
                    { model
                        | travelable =
                            { travelable
                                | renderableLines =
                                    List.Extra.updateAt y
                                        (\line ->
                                            { line | text = String.Extra.insertAt pasted x line.text }
                                        )
                                        model.travelable.renderableLines
                                , cursorPosition = { x = x + String.length pasted, y = y }
                            }
                    }

                _ ->
                    -- combine first half of y line with first pasted line and second half of y line with last pasted line
                    -- put the rest in the middle
                    let
                        beforeYLine =
                            List.take y model.travelable.renderableLines

                        afterYLine =
                            List.drop (y + 1) model.travelable.renderableLines

                        yLine =
                            Maybe.withDefault (createRenderableLine (List.length model.travelable.renderableLines) "") <| List.Extra.getAt y model.travelable.renderableLines

                        firstLineOfPastedText =
                            Maybe.withDefault "" <| Maybe.map .text <| List.head pastedRenderableLines

                        middleLinesOfPasted =
                            List.reverse <| Maybe.withDefault [] <| List.tail <| List.reverse <| Maybe.withDefault [] <| List.tail <| pastedRenderableLines

                        lastLineOfPastedText =
                            Maybe.withDefault "" <| Maybe.map .text <| List.Extra.last pastedRenderableLines

                        firstHalfYLine =
                            String.slice 0 x yLine.text

                        secondHalfYLine =
                            String.slice x (String.length yLine.text) yLine.text

                        nextRenderableLines =
                            List.concat
                                [ beforeYLine
                                , [ { yLine | text = firstHalfYLine ++ firstLineOfPastedText } ]
                                , middleLinesOfPasted
                                , [ { yLine | text = lastLineOfPastedText ++ secondHalfYLine } ]
                                , afterYLine
                                ]
                    in
                    model
                        |> Editor.Lib.startUpdateEditor
                        |> Editor.Lib.updateRenderableLines nextRenderableLines
                        |> Editor.Lib.updateCursorPosition
                            { x = String.length lastLineOfPastedText, y = y + List.length pastedRenderableLines - 1 }
                        |> Editor.Lib.updateEditor model
                        |> first

        _ ->
            let
                travelable =
                    model.travelable

                ( _, nextTravelable ) =
                    cut model
            in
            paste { model | travelable = { travelable | renderableLines = nextTravelable.renderableLines, cursorPosition = nextTravelable.cursorPosition }, selection = Nothing } pasted


cut : Model -> ( String, Travelable )
cut model =
    case model.selection of
        Just selected ->
            let
                travelable =
                    model.travelable

                ( start, end ) =
                    orderSelectionCoordinates selected

                startLine =
                    min start.y end.y

                endLine =
                    max start.y end.y

                -- Looked up by number once for every line of the selection:
                -- walking the list to each one made cutting a big selection
                -- take time with the square of its length.
                linesByNumber =
                    Array.fromList model.travelable.renderableLines

                beforeHighlight =
                    List.take startLine model.travelable.renderableLines

                afterHighlight =
                    List.drop (endLine + 1) model.travelable.renderableLines

                ( selection, slines ) =
                    List.foldl
                        (\lineNumber ( acc, lines ) ->
                            -- start
                            if lineNumber == start.y then
                                if start.y < end.y then
                                    case Array.get lineNumber linesByNumber of
                                        Just renderableLine ->
                                            let
                                                text =
                                                    String.slice start.x (String.length renderableLine.text) renderableLine.text ++ "\n"

                                                without =
                                                    String.slice 0 start.x renderableLine.text
                                            in
                                            ( acc ++ text, List.append lines [ { renderableLine | text = without } ] )

                                        Nothing ->
                                            ( acc, lines )

                                else if start.y == end.y then
                                    case Array.get lineNumber linesByNumber of
                                        Just renderableLine ->
                                            let
                                                text =
                                                    String.slice (min start.x end.x) (max start.x end.x + 1) renderableLine.text

                                                without =
                                                    String.slice 0 (min start.x end.x) renderableLine.text ++ String.slice (max start.x end.x + 1) (String.length renderableLine.text) renderableLine.text
                                            in
                                            ( acc ++ text, List.append lines [ { renderableLine | text = without } ] )

                                        Nothing ->
                                            ( acc, lines )

                                else
                                    case Array.get lineNumber linesByNumber of
                                        Just renderableLine ->
                                            let
                                                text =
                                                    String.slice 0 (start.x + 1) renderableLine.text

                                                without =
                                                    String.slice (start.x + 1) (String.length renderableLine.text) renderableLine.text
                                            in
                                            ( acc ++ text, List.append lines [ { renderableLine | text = without } ] )

                                        Nothing ->
                                            ( acc, lines )

                            else if lineNumber == end.y then
                                -- end
                                if start.y < end.y then
                                    case Array.get lineNumber linesByNumber of
                                        Just renderableLine ->
                                            let
                                                text =
                                                    String.slice 0 (end.x + 1) renderableLine.text

                                                without =
                                                    String.slice (end.x + 1) (String.length renderableLine.text) renderableLine.text
                                            in
                                            ( acc ++ text, List.append lines [ { renderableLine | text = without } ] )

                                        Nothing ->
                                            ( acc, lines )

                                else if start.y == end.y then
                                    case Array.get lineNumber linesByNumber of
                                        Just renderableLine ->
                                            let
                                                text =
                                                    String.slice (min start.x end.x) (max start.x end.x) renderableLine.text

                                                without =
                                                    String.slice 0 (min start.x end.x) renderableLine.text ++ String.slice (max start.x end.x) (String.length renderableLine.text) renderableLine.text
                                            in
                                            ( acc ++ text, List.append lines [ { renderableLine | text = without } ] )

                                        Nothing ->
                                            ( acc, lines )

                                else
                                    case Array.get lineNumber linesByNumber of
                                        Just renderableLine ->
                                            let
                                                text =
                                                    String.slice end.x (String.length renderableLine.text) renderableLine.text ++ "\n"

                                                without =
                                                    String.slice 0 end.x renderableLine.text
                                            in
                                            ( acc ++ text, List.append lines [ { renderableLine | text = without } ] )

                                        Nothing ->
                                            ( acc, lines )

                            else
                                -- in between lines
                                case Array.get lineNumber linesByNumber of
                                    Just renderableLine ->
                                        let
                                            text =
                                                renderableLine.text ++ "\n"
                                        in
                                        ( acc ++ text, lines )

                                    Nothing ->
                                        ( acc, lines )
                        )
                        ( "", [] )
                        (List.range startLine endLine)
            in
            case start.y /= end.y of
                True ->
                    let
                        text =
                            String.join "" <| List.map .text <| slines
                    in
                    ( selection
                    , { travelable
                        | renderableLines =
                            List.concat
                                [ beforeHighlight
                                , [ createRenderableLine (List.length model.travelable.renderableLines) text ]
                                , afterHighlight
                                ]
                        , cursorPosition =
                            if start.y < end.y then
                                start

                            else if start.x < end.x then
                                start

                            else
                                end
                      }
                    )

                False ->
                    ( selection, { travelable | renderableLines = List.concat [ beforeHighlight, slines, afterHighlight ], cursorPosition = start } )

        Nothing ->
            ( "", model.travelable )


copy : Editor.Msg.Model -> String
copy editor =
    case editor.selection of
        Just ( start, end ) ->
            let
                startLine =
                    min start.y end.y

                endLine =
                    max start.y end.y

                -- see `cut`
                linesByNumber =
                    Array.fromList editor.travelable.renderableLines
            in
            List.foldl
                (\lineNumber acc ->
                    -- start
                    if lineNumber == start.y then
                        if start.y < end.y then
                            case Array.get lineNumber linesByNumber of
                                Just renderableLine ->
                                    acc ++ String.slice start.x (String.length renderableLine.text) renderableLine.text ++ "\n"

                                Nothing ->
                                    acc

                        else if start.y == end.y then
                            case Array.get lineNumber linesByNumber of
                                Just renderableLine ->
                                    acc ++ String.slice (min start.x end.x) (max start.x end.x + 1) renderableLine.text

                                Nothing ->
                                    acc

                        else
                            case Array.get lineNumber linesByNumber of
                                Just renderableLine ->
                                    acc ++ String.slice 0 (start.x + 1) renderableLine.text

                                Nothing ->
                                    acc

                    else if lineNumber == end.y then
                        -- end
                        if start.y < end.y then
                            case Array.get lineNumber linesByNumber of
                                Just renderableLine ->
                                    acc ++ String.slice 0 (end.x + 1) renderableLine.text

                                Nothing ->
                                    acc

                        else if start.y == end.y then
                            case Array.get lineNumber linesByNumber of
                                Just renderableLine ->
                                    acc ++ String.slice (min start.x end.x) (max start.x end.x) renderableLine.text

                                Nothing ->
                                    acc

                        else
                            case Array.get lineNumber linesByNumber of
                                Just renderableLine ->
                                    acc ++ String.slice end.x (String.length renderableLine.text) renderableLine.text ++ "\n"

                                Nothing ->
                                    acc

                    else
                        -- in between lines
                        acc ++ (Maybe.withDefault "" <| Maybe.map .text <| Array.get lineNumber linesByNumber) ++ "\n"
                )
                ""
                (List.range startLine endLine)

        Nothing ->
            ""
