module Editor.Limits exposing (maxLineLength, maxLines, refusal, violation)

{-| How large a file the editor holds.

EditorPro does not open a file that is past these (see `MAX_FILE_LINES` and
`MAX_LINE_LENGTH` in its backend, which a test keeps equal to these). An edit
must not take a file past them either: it could be saved, and then not be
opened again.

-}


maxLines : Int
maxLines =
    10000


{-| Counted as the editor's strings are: in UTF-16 code units.
-}
maxLineLength : Int
maxLineLength =
    500


{-| What is wrong with these lines, if they are more than the editor holds.
-}
violation : List { line | text : String } -> Maybe String
violation lines =
    let
        ( count, longest, endsWithNewline ) =
            List.foldl
                (\line ( soFar, length, _ ) -> ( soFar + 1, max length (String.length line.text), line.text == "" ))
                ( 0, 0, False )
                lines

        -- as the file has them: the empty line after a final newline is not one
        fileLines =
            if endsWithNewline then
                count - 1

            else
                count
    in
    if fileLines > maxLines then
        Just
            ("The editor holds files of up to "
                ++ String.fromInt maxLines
                ++ " lines, and that would have made this one longer. Nothing was changed."
            )

    else if longest > maxLineLength then
        Just
            ("The editor holds lines of up to "
                ++ String.fromInt maxLineLength
                ++ " characters, and that would have made one longer. Nothing was changed."
            )

    else
        Nothing


{-| Why an edit that turns `before` into `after` is not made, if it is not:
it takes lines the editor holds to more than it holds. (Lines that already
are more than that can still be edited: the terminal's output, shown in an
editor, is.)
-}
refusal : List { line | text : String } -> List { line | text : String } -> Maybe String
refusal before after =
    if after == before then
        Nothing

    else
        case violation after of
            Nothing ->
                Nothing

            Just reason ->
                if violation before == Nothing then
                    Just reason

                else
                    Nothing
