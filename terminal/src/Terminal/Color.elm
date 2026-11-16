module Terminal.Color exposing (defaultBackground, defaultForeground, toCss, toRgb, toXParseColor)

import Terminal.Types exposing (Color(..))


type alias Rgb =
    ( Int, Int, Int )


{-| The colors reported to programs that ask for the default colors (OSC 10
and OSC 11). They match the default theme of the apps using this library.
-}
defaultForeground : Rgb
defaultForeground =
    ( 0xD4, 0xD4, 0xD4 )


defaultBackground : Rgb
defaultBackground =
    ( 0x26, 0x26, 0x26 )


toCss : Color -> Maybe String
toCss color =
    case color of
        DefaultColor ->
            Nothing

        _ ->
            toRgb color
                |> Maybe.map
                    (\( r, g, b ) ->
                        "rgb(" ++ String.fromInt r ++ "," ++ String.fromInt g ++ "," ++ String.fromInt b ++ ")"
                    )


toRgb : Color -> Maybe Rgb
toRgb color =
    case color of
        DefaultColor ->
            Nothing

        RgbColor r g b ->
            Just ( r, g, b )

        IndexedColor index ->
            Just (indexed index)


{-| The `rgb:rrrr/gggg/bbbb` form used in color query replies.
-}
toXParseColor : Rgb -> String
toXParseColor ( r, g, b ) =
    let
        component value =
            let
                hex =
                    hexByte value
            in
            hex ++ hex
    in
    "rgb:" ++ component r ++ "/" ++ component g ++ "/" ++ component b


hexByte : Int -> String
hexByte value =
    let
        digit n =
            String.slice n (n + 1) "0123456789abcdef"

        clamped =
            clamp 0 255 value
    in
    digit (clamped // 16) ++ digit (modBy 16 clamped)


{-| The 256 color palette: 16 ANSI colors, a 6x6x6 color cube and 24 grays.
-}
indexed : Int -> Rgb
indexed index =
    if index < 16 then
        ansi index

    else if index < 232 then
        let
            n =
                index - 16

            level value =
                if value == 0 then
                    0

                else
                    55 + 40 * value
        in
        ( level (n // 36), level (modBy 6 (n // 6)), level (modBy 6 n) )

    else
        let
            gray =
                8 + 10 * (min 255 index - 232)
        in
        ( gray, gray, gray )


ansi : Int -> Rgb
ansi index =
    case index of
        0 ->
            ( 0, 0, 0 )

        1 ->
            ( 194, 54, 33 )

        2 ->
            ( 37, 188, 36 )

        3 ->
            ( 173, 173, 39 )

        4 ->
            ( 73, 46, 225 )

        5 ->
            ( 211, 56, 211 )

        6 ->
            ( 51, 187, 200 )

        7 ->
            ( 203, 204, 205 )

        8 ->
            ( 129, 131, 131 )

        9 ->
            ( 252, 57, 31 )

        10 ->
            ( 49, 231, 34 )

        11 ->
            ( 234, 236, 35 )

        12 ->
            ( 88, 51, 255 )

        13 ->
            ( 249, 53, 248 )

        14 ->
            ( 20, 240, 240 )

        _ ->
            ( 233, 235, 235 )
