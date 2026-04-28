module Editor.Mode.VisualLine.Selection exposing (recompute)

import Editor.Msg exposing (EditorCoordinate, RenderableLine, Selection)
import List.Extra


lineLength : List RenderableLine -> Int -> Int
lineLength lines y =
    List.Extra.getAt y lines
        |> Maybe.map (.text >> String.length)
        |> Maybe.withDefault 0


lineEndX : List RenderableLine -> Int -> Int
lineEndX lines y =
    max 0 (lineLength lines y - 1)


{-| Build a line-bounded selection from `anchor` to `cursor`. The selection
covers full lines: from column 0 of the topmost line to the last column of the
bottommost line. The returned cursor coordinate is the visual cursor position
(end of the line the user is "on").
-}
recompute : List RenderableLine -> Int -> Int -> ( Selection, EditorCoordinate )
recompute lines anchor cursor =
    if cursor >= anchor then
        ( ( { x = 0, y = anchor }, { x = lineEndX lines cursor, y = cursor } )
        , { x = lineEndX lines cursor, y = cursor }
        )

    else
        ( ( { x = lineEndX lines anchor, y = anchor }, { x = 0, y = cursor } )
        , { x = 0, y = cursor }
        )
