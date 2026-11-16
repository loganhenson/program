module Terminal.BoxDrawing exposing (className, isDrawn, styles)

{-| Box drawing lines and block elements are drawn by the terminal instead of
being taken from the font.

A font draws these characters for its own line height and the glyphs do not
agree with each other on where a cell begins and ends, so borders show gaps
from one row to the next. Drawn here, every line runs exactly from edge to
edge of its cell.

A cell with such a character keeps the character as (invisible) text, so it
can still be selected and copied, and gets a class from `className`; `styles`
has the rule that draws it for every character.

Not drawn, and left to the font: double lines (U+2550-U+256C) and diagonals
(U+2571-U+2573).

-}


type alias Layer =
    { image : String
    , width : String
    , height : String
    , x : String
    , y : String
    }


{-| U+2500-U+259F, without the double lines and the diagonals.
-}
isDrawn : Int -> Bool
isDrawn code =
    (code >= 0x2500 && code <= 0x254F)
        || (code >= 0x256D && code <= 0x2570)
        || (code >= 0x2574 && code <= 0x259F)


className : Int -> String
className code =
    "bx bx-" ++ String.fromInt code


styles : String
styles =
    """
    .terminal-row .bx {
        position: relative;
        -webkit-text-fill-color: transparent;
    }

    /* half a pixel wider than the cell on both sides, so a run of them has no seams */
    .terminal-row .bx::before {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        left: -0.5px;
        right: -0.5px;
        pointer-events: none;
        background-repeat: no-repeat;
    }
    """
        ++ String.concat (List.filterMap rule (List.range 0x2500 0x259F))


rule : Int -> Maybe String
rule code =
    case layers code of
        [] ->
            Nothing

        drawn ->
            Just
                (".terminal-row .bx-"
                    ++ String.fromInt code
                    ++ "::before{background-image:"
                    ++ String.join "," (List.map .image drawn)
                    ++ ";background-size:"
                    ++ String.join "," (List.map (\layer -> layer.width ++ " " ++ layer.height) drawn)
                    ++ ";background-position:"
                    ++ String.join "," (List.map (\layer -> layer.x ++ " " ++ layer.y) drawn)
                    ++ "}\n"
                )


solid : String
solid =
    "linear-gradient(currentColor,currentColor)"


rect : String -> String -> String -> String -> Layer
rect width height x y =
    { image = solid, width = width, height = height, x = x, y = y }


px : Float -> String
px value =
    String.fromFloat value ++ "px"


{-| Half of the cell plus a number of pixels.
-}
half : Float -> String
half extra =
    "calc(50% + " ++ px extra ++ ")"


layers : Int -> List Layer
layers code =
    if code >= 0x2580 then
        block code

    else
        case code of
            -- dashes: light and heavy, three, four and two to a cell
            0x2504 ->
                dashes True 1 3

            0x2505 ->
                dashes True 3 3

            0x2506 ->
                dashes False 1 3

            0x2507 ->
                dashes False 3 3

            0x2508 ->
                dashes True 1 4

            0x2509 ->
                dashes True 3 4

            0x250A ->
                dashes False 1 4

            0x250B ->
                dashes False 3 4

            0x254C ->
                dashes True 1 2

            0x254D ->
                dashes True 3 2

            0x254E ->
                dashes False 1 2

            0x254F ->
                dashes False 3 2

            -- arcs
            0x256D ->
                arc True True

            0x256E ->
                arc True False

            0x256F ->
                arc False False

            0x2570 ->
                arc False True

            _ ->
                case armsOf code of
                    Just ( ( up, right ), ( down, left ) ) ->
                        arms up right down left

                    Nothing ->
                        []


{-| How heavy the line is towards the top, right, bottom and left of the
cell: 0 none, 1 light, 2 heavy.
-}
armsOf : Int -> Maybe ( ( Int, Int ), ( Int, Int ) )
armsOf code =
    let
        table =
            if code >= 0x2500 && code <= 0x2503 then
                Just ( code - 0x2500, "0101020210102020" )

            else if code >= 0x250C && code <= 0x254B then
                Just
                    ( code - 0x250C
                    , "0110021001200220"
                        ++ "0011001200210022"
                        ++ "1100120021002200"
                        ++ "1001100220012002"
                        ++ "11101210211011202120221012202220"
                        ++ "10111012201110212021201210222022"
                        ++ "01110112021102120121012202210222"
                        ++ "11011102120112022101210222012202"
                        ++ "1111111212111212211111212121211222111122122122121222212222212222"
                    )

            else if code >= 0x2574 && code <= 0x257F then
                Just ( code - 0x2574, "000110000100001000022000020000200201102001022010" )

            else
                Nothing

        digit index entry =
            String.slice index (index + 1) entry
                |> String.toInt
                |> Maybe.withDefault 0
    in
    table
        |> Maybe.map
            (\( index, entries ) ->
                let
                    entry =
                        String.slice (index * 4) (index * 4 + 4) entries
                in
                ( ( digit 0 entry, digit 1 entry ), ( digit 2 entry, digit 3 entry ) )
            )


thickness : Int -> Float
thickness weight =
    if weight == 2 then
        3

    else
        1


{-| Each arm runs from its edge of the cell to the middle, and a little past
it so that it meets the arms it crosses.
-}
arms : Int -> Int -> Int -> Int -> List Layer
arms up right down left =
    let
        widest a b =
            if a == 0 && b == 0 then
                0

            else
                max (thickness a) (thickness b) / 2

        pastVertical =
            widest up down

        pastHorizontal =
            widest left right

        arm weight layer =
            if weight == 0 then
                []

            else
                [ layer (px (thickness weight)) ]
    in
    List.concat
        [ arm up (\t -> rect t (half pastHorizontal) "50%" "0")
        , arm down (\t -> rect t (half pastHorizontal) "50%" "100%")
        , arm left (\t -> rect (half pastVertical) t "0" "50%")
        , arm right (\t -> rect (half pastVertical) t "100%" "50%")
        ]


dashes : Bool -> Float -> Int -> List Layer
dashes horizontal weight count =
    let
        period =
            100 / toFloat count

        pattern direction =
            "repeating-linear-gradient("
                ++ direction
                ++ ",currentColor 0 "
                ++ String.fromFloat (period * 0.6)
                ++ "%,transparent "
                ++ String.fromFloat (period * 0.6)
                ++ "% "
                ++ String.fromFloat period
                ++ "%)"
    in
    if horizontal then
        [ { image = pattern "90deg", width = "100%", height = px weight, x = "0", y = "50%" } ]

    else
        [ { image = pattern "180deg", width = px weight, height = "100%", x = "50%", y = "0" } ]


{-| A rounded corner: a quarter circle from the middle of one side edge to a
vertical line, with a radius of half the width of the cell.
-}
arc : Bool -> Bool -> List Layer
arc down right =
    let
        -- the circle is centered on the side edge, half a cell above or
        -- below the middle of the cell
        center =
            (if right then
                "100%"

             else
                "0"
            )
                ++ " "
                ++ (if down then
                        "100%"

                    else
                        "0"
                   )

        ring =
            "radial-gradient(circle at "
                ++ center
                ++ ",transparent calc(0.5ch - 0.5px),currentColor calc(0.5ch - 0.5px),currentColor calc(0.5ch + 0.5px),transparent calc(0.5ch + 0.5px))"

        size =
            "calc(0.5ch + 0.5px)"
    in
    [ { image = ring
      , width = size
      , height = size
      , x =
            if right then
                "100%"

            else
                "0"
      , y =
            if down then
                "calc(50% + 0.25ch - 0.25px)"

            else
                "calc(50% - 0.25ch + 0.25px)"
      }
    , rect "1px"
        "calc(50% - 0.5ch)"
        "50%"
        (if down then
            "100%"

         else
            "0"
        )
    ]


percent : Float -> String
percent value =
    String.fromFloat value ++ "%"


block : Int -> List Layer
block code =
    let
        eighths n =
            percent (toFloat n * 12.5)

        shade amount =
            [ { image =
                    "linear-gradient(color-mix(in srgb,currentColor "
                        ++ String.fromInt amount
                        ++ "%,transparent),color-mix(in srgb,currentColor "
                        ++ String.fromInt amount
                        ++ "%,transparent))"
              , width = "100%"
              , height = "100%"
              , x = "0"
              , y = "0"
              }
            ]

        -- quadrants overlap in the middle so that two of them leave no seam
        upperLeft =
            rect (half 0.5) (half 0.5) "0" "0"

        upperRight =
            rect (half 0.5) (half 0.5) "100%" "0"

        lowerLeft =
            rect (half 0.5) (half 0.5) "0" "100%"

        lowerRight =
            rect (half 0.5) (half 0.5) "100%" "100%"
    in
    if code == 0x2580 then
        [ rect "100%" "50%" "0" "0" ]

    else if code >= 0x2581 && code <= 0x2588 then
        -- lower one eighth up to the full block
        [ rect "100%" (eighths (code - 0x2580)) "0" "100%" ]

    else if code >= 0x2589 && code <= 0x258F then
        -- left seven eighths down to one eighth
        [ rect (eighths (0x2590 - code)) "100%" "0" "0" ]

    else
        case code of
            0x2590 ->
                [ rect "50%" "100%" "100%" "0" ]

            0x2591 ->
                shade 25

            0x2592 ->
                shade 50

            0x2593 ->
                shade 75

            0x2594 ->
                [ rect "100%" (eighths 1) "0" "0" ]

            0x2595 ->
                [ rect (eighths 1) "100%" "100%" "0" ]

            0x2596 ->
                [ lowerLeft ]

            0x2597 ->
                [ lowerRight ]

            0x2598 ->
                [ upperLeft ]

            0x2599 ->
                [ upperLeft, lowerLeft, lowerRight ]

            0x259A ->
                [ upperLeft, lowerRight ]

            0x259B ->
                [ upperLeft, upperRight, lowerLeft ]

            0x259C ->
                [ upperLeft, upperRight, lowerRight ]

            0x259D ->
                [ upperRight ]

            0x259E ->
                [ upperRight, lowerLeft ]

            0x259F ->
                [ upperRight, lowerLeft, lowerRight ]

            _ ->
                []
