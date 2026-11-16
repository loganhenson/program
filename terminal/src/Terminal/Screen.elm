module Terminal.Screen exposing
    ( activeScreen
    , apply
    , applyAll
    , attributeBlink
    , attributeBold
    , attributeDim
    , attributeDoubleUnderline
    , attributeInverse
    , attributeInvisible
    , attributeItalic
    , attributeOverline
    , attributeStrike
    , attributeUnderline
    , clearKeepingCursorLine
    , defaultStyle
    , hasAttribute
    , init
    , keyboardFlags
    , lineSpans
    , lineText
    , resize
    , scrollbackLines
    , scrollbackText
    , screenText
    )

{-| The terminal screen: a grid of cells, a cursor, and everything the escape
sequences can do to them. Everything in here is pure; `apply` returns the
`Effect`s (replies to the program, title changes...) for the caller to perform.
-}

import Array exposing (Array)
import Bitwise
import Set exposing (Set)
import Terminal.Color
import Terminal.Types exposing (..)
import Terminal.Width



-- STYLE


attributeBold : Int
attributeBold =
    1


attributeDim : Int
attributeDim =
    2


attributeItalic : Int
attributeItalic =
    4


attributeUnderline : Int
attributeUnderline =
    8


attributeBlink : Int
attributeBlink =
    16


attributeInverse : Int
attributeInverse =
    32


attributeInvisible : Int
attributeInvisible =
    64


attributeStrike : Int
attributeStrike =
    128


attributeDoubleUnderline : Int
attributeDoubleUnderline =
    256


attributeOverline : Int
attributeOverline =
    512


hasAttribute : Int -> Style -> Bool
hasAttribute attribute style =
    Bitwise.and attribute style.attributes /= 0


setAttribute : Int -> Style -> Style
setAttribute attribute style =
    { style | attributes = Bitwise.or attribute style.attributes }


clearAttribute : Int -> Style -> Style
clearAttribute attribute style =
    { style | attributes = Bitwise.and (Bitwise.complement attribute) style.attributes }


defaultStyle : Style
defaultStyle =
    { foreground = DefaultColor
    , background = DefaultColor
    , attributes = 0
    , link = ""
    }


{-| Erased cells keep the current background color.
-}
eraseStyle : Terminal -> Style
eraseStyle terminal =
    { defaultStyle | background = terminal.pen.background }


blankCell : Style -> Cell
blankCell style =
    { char = " ", width = 1, style = style }


defaultBlankCell : Cell
defaultBlankCell =
    blankCell defaultStyle


blankLine : Int -> Style -> Line
blankLine width style =
    { cells = Array.repeat width (blankCell style), wrapped = False }



-- INIT


maxTabStop : Int
maxTabStop =
    2048


defaultTabStops : Set Int
defaultTabStops =
    List.range 1 (maxTabStop // 8)
        |> List.map ((*) 8)
        |> Set.fromList


defaultModes : Modes
defaultModes =
    { applicationCursorKeys = False
    , autoWrap = True
    , origin = False
    , insert = False
    , newLine = False
    , cursorVisible = True
    , reverseVideo = False
    , bracketedPaste = False
    , focusEvents = False
    , mouseTracking = MouseOff
    , mouseEncoding = MouseEncodingDefault
    , alternateScroll = True
    , synchronizedOutput = False
    }


blankScreen : TerminalSize -> Screen
blankScreen size =
    { lines = Array.repeat size.height (blankLine size.width defaultStyle)
    , cursor = { x = 0, y = 0 }
    , saved = Nothing
    , scrollTop = 0
    , scrollBottom = size.height - 1
    , keyboardFlags = []
    , tabStops = defaultTabStops
    }


init : TerminalSize -> Terminal
init size =
    { size = size
    , activeBuffer = Primary
    , primary = blankScreen size
    , alternate = blankScreen size
    , scrollback = emptyScrollback
    , pen = defaultStyle
    , modes = defaultModes
    , cursorShape = CursorBlock
    , title = ""
    , characterWidth = 8.4
    , focused = True
    , mouse = { cell = ( 0, 0 ), wheel = 0 }
    , exited = False
    }



-- ACCESS


activeScreen : Terminal -> Screen
activeScreen terminal =
    case terminal.activeBuffer of
        Primary ->
            terminal.primary

        Alternate ->
            terminal.alternate


setActiveScreen : Screen -> Terminal -> Terminal
setActiveScreen screen terminal =
    case terminal.activeBuffer of
        Primary ->
            { terminal | primary = screen }

        Alternate ->
            { terminal | alternate = screen }


mapScreen : (Screen -> Screen) -> Terminal -> Terminal
mapScreen change terminal =
    setActiveScreen (change (activeScreen terminal)) terminal


setCursor : Int -> Int -> Terminal -> Terminal
setCursor x y terminal =
    mapScreen (\screen -> { screen | cursor = { x = x, y = y } }) terminal


{-| The cursor column, with a cursor waiting past the last column counted as
being on the last column.
-}
cursorColumn : Terminal -> Int
cursorColumn terminal =
    min (terminal.size.width - 1) (activeScreen terminal).cursor.x
        |> max 0


getLine : Int -> Screen -> Line
getLine y screen =
    Array.get y screen.lines
        |> Maybe.withDefault { cells = Array.empty, wrapped = False }


mapLine : Int -> (Line -> Line) -> Terminal -> Terminal
mapLine y change terminal =
    mapScreen
        (\screen ->
            case Array.get y screen.lines of
                Just line ->
                    { screen | lines = Array.set y (change line) screen.lines }

                Nothing ->
                    screen
        )
        terminal


keyboardFlags : Terminal -> Int
keyboardFlags terminal =
    List.head (activeScreen terminal).keyboardFlags
        |> Maybe.withDefault 0



-- TEXT


lineText : Line -> String
lineText line =
    Array.foldr (\cell text -> cell.char :: text) [] line.cells
        |> String.concat


screenText : Terminal -> List String
screenText terminal =
    (activeScreen terminal).lines
        |> Array.toList
        |> List.map lineText


{-| Characters the terminal font draws exactly one cell wide, so a run of them
can be rendered as ordinary text: ASCII, accented Latin, Greek, Cyrillic,
common punctuation, and box drawing and block elements (which must touch
their neighbours to form lines). Everything else is placed cell by cell.
-}
isPlain : Cell -> Bool
isPlain cell =
    (cell.width == 1)
        && (case String.uncons cell.char of
                Just ( char, "" ) ->
                    let
                        code =
                            Char.toCode char
                    in
                    (code >= 0x20 && code < 0x7F)
                        || (code >= 0xA0 && code <= 0x024F)
                        || (code >= 0x0370 && code <= 0x04FF)
                        || (code >= 0x2010 && code <= 0x2027)
                        || (code >= 0x2500 && code <= 0x259F)

                _ ->
                    False
           )


{-| The line as styled runs of text, without the unused cells at the end.
-}
lineSpans : Line -> List Span
lineSpans line =
    let
        dropUnused cells =
            case cells of
                cell :: rest ->
                    if cell == defaultBlankCell then
                        dropUnused rest

                    else
                        cells

                [] ->
                    []

        addCell cell spans =
            if cell.width == 0 then
                spans

            else if isPlain cell then
                case spans of
                    span :: rest ->
                        if not span.fixed && span.style == cell.style then
                            { span | text = cell.char ++ span.text, columns = span.columns + 1 } :: rest

                        else
                            { text = cell.char, columns = 1, style = cell.style, fixed = False } :: spans

                    [] ->
                        [ { text = cell.char, columns = 1, style = cell.style, fixed = False } ]

            else
                { text = cell.char, columns = cell.width, style = cell.style, fixed = True } :: spans
    in
    Array.toList line.cells
        |> List.reverse
        |> dropUnused
        |> List.foldl addCell []



-- SCROLLBACK


scrollbackBlockSize : Int
scrollbackBlockSize =
    256


{-| About 10,000 lines.
-}
maxScrollbackBlocks : Int
maxScrollbackBlocks =
    40


emptyScrollback : Scrollback
emptyScrollback =
    { blocks = [], current = { id = 0, lines = [], count = 0 } }


pushScrollback : Line -> Scrollback -> Scrollback
pushScrollback line scrollback =
    let
        current =
            scrollback.current

        added =
            { current
                | lines = { spans = lineSpans line, wrapped = line.wrapped } :: current.lines
                , count = current.count + 1
            }
    in
    if added.count >= scrollbackBlockSize then
        { blocks = List.take maxScrollbackBlocks (added :: scrollback.blocks)
        , current = { id = added.id + 1, lines = [], count = 0 }
        }

    else
        { scrollback | current = added }


{-| All scrollback lines, oldest first.
-}
scrollbackLines : Scrollback -> List ScrollbackLine
scrollbackLines scrollback =
    (scrollback.current :: scrollback.blocks)
        |> List.foldl (\block lines -> List.foldl (::) lines block.lines) []


scrollbackText : Terminal -> List String
scrollbackText terminal =
    scrollbackLines terminal.scrollback
        |> List.map (\line -> String.concat (List.map .text line.spans))



-- CURSOR MOVEMENT


{-| The rows the cursor can be addressed to: the scroll region in origin mode,
the whole screen otherwise.
-}
addressableRows : Terminal -> ( Int, Int )
addressableRows terminal =
    let
        screen =
            activeScreen terminal
    in
    if terminal.modes.origin then
        ( screen.scrollTop, screen.scrollBottom )

    else
        ( 0, terminal.size.height - 1 )


{-| Move to a 1 based row and column, as used by CUP.
-}
cursorPosition : Int -> Int -> Terminal -> Terminal
cursorPosition row column terminal =
    let
        ( top, bottom ) =
            addressableRows terminal
    in
    setCursor
        (clamp 0 (terminal.size.width - 1) (column - 1))
        (clamp top bottom (top + row - 1))
        terminal


cursorUp : Int -> Terminal -> Terminal
cursorUp count terminal =
    let
        screen =
            activeScreen terminal

        limit =
            if screen.cursor.y >= screen.scrollTop then
                screen.scrollTop

            else
                0
    in
    setCursor (cursorColumn terminal) (max limit (screen.cursor.y - max 1 count)) terminal


cursorDown : Int -> Terminal -> Terminal
cursorDown count terminal =
    let
        screen =
            activeScreen terminal

        limit =
            if screen.cursor.y <= screen.scrollBottom then
                screen.scrollBottom

            else
                terminal.size.height - 1
    in
    setCursor (cursorColumn terminal) (min limit (screen.cursor.y + max 1 count)) terminal


cursorForward : Int -> Terminal -> Terminal
cursorForward count terminal =
    setCursor
        (min (terminal.size.width - 1) (cursorColumn terminal + max 1 count))
        (activeScreen terminal).cursor.y
        terminal


cursorBack : Int -> Terminal -> Terminal
cursorBack count terminal =
    setCursor
        (max 0 (cursorColumn terminal - max 1 count))
        (activeScreen terminal).cursor.y
        terminal


cursorToColumn : Int -> Terminal -> Terminal
cursorToColumn column terminal =
    setCursor
        (clamp 0 (terminal.size.width - 1) (column - 1))
        (activeScreen terminal).cursor.y
        terminal


cursorToRow : Int -> Terminal -> Terminal
cursorToRow row terminal =
    let
        ( top, bottom ) =
            addressableRows terminal
    in
    setCursor (cursorColumn terminal) (clamp top bottom (top + row - 1)) terminal


carriageReturn : Terminal -> Terminal
carriageReturn terminal =
    setCursor 0 (activeScreen terminal).cursor.y terminal


{-| Move down one line, scrolling when the cursor is on the last line of the
scroll region.
-}
index : Terminal -> Terminal
index terminal =
    let
        screen =
            activeScreen terminal

        x =
            cursorColumn terminal
    in
    if screen.cursor.y == screen.scrollBottom then
        scrollUp 1 terminal
            |> setCursor x screen.cursor.y

    else
        setCursor x (min (terminal.size.height - 1) (screen.cursor.y + 1)) terminal


lineFeed : Terminal -> Terminal
lineFeed terminal =
    if terminal.modes.newLine then
        carriageReturn (index terminal)

    else
        index terminal


reverseIndex : Terminal -> Terminal
reverseIndex terminal =
    let
        screen =
            activeScreen terminal

        x =
            cursorColumn terminal
    in
    if screen.cursor.y == screen.scrollTop then
        scrollDown 1 terminal
            |> setCursor x screen.cursor.y

    else
        setCursor x (max 0 (screen.cursor.y - 1)) terminal


tabForward : Int -> Terminal -> Terminal
tabForward count terminal =
    let
        screen =
            activeScreen terminal

        lastColumn =
            terminal.size.width - 1

        next x =
            Set.foldl
                (\stop found ->
                    if stop > x && stop < found then
                        stop

                    else
                        found
                )
                lastColumn
                screen.tabStops

        repeat n x =
            if n <= 0 || x >= lastColumn then
                x

            else
                repeat (n - 1) (next x)
    in
    if screen.cursor.x >= terminal.size.width then
        terminal

    else
        setCursor (repeat (max 1 count) screen.cursor.x) screen.cursor.y terminal


tabBackward : Int -> Terminal -> Terminal
tabBackward count terminal =
    let
        screen =
            activeScreen terminal

        previous x =
            Set.foldl
                (\stop found ->
                    if stop < x && stop > found then
                        stop

                    else
                        found
                )
                0
                screen.tabStops

        repeat n x =
            if n <= 0 || x <= 0 then
                x

            else
                repeat (n - 1) (previous x)
    in
    setCursor (repeat (max 1 count) (cursorColumn terminal)) screen.cursor.y terminal



-- SCROLLING


{-| Scroll the scroll region up. Lines leaving the top of the primary screen
go to the scrollback.
-}
scrollUp : Int -> Terminal -> Terminal
scrollUp count terminal =
    let
        screen =
            activeScreen terminal

        top =
            screen.scrollTop

        bottom =
            screen.scrollBottom

        n =
            clamp 0 (bottom - top + 1) count

        height =
            Array.length screen.lines

        blank =
            blankLine terminal.size.width (eraseStyle terminal)

        lines =
            if top == 0 && bottom == height - 1 && n == 1 then
                Array.push blank (Array.slice 1 height screen.lines)

            else
                Array.append
                    (Array.append (Array.slice 0 top screen.lines) (Array.slice (top + n) (bottom + 1) screen.lines))
                    (Array.append (Array.repeat n blank) (Array.slice (bottom + 1) height screen.lines))

        scrollback =
            if top == 0 && terminal.activeBuffer == Primary then
                Array.foldl pushScrollback terminal.scrollback (Array.slice 0 n screen.lines)

            else
                terminal.scrollback
    in
    if n == 0 then
        terminal

    else
        setActiveScreen { screen | lines = lines } { terminal | scrollback = scrollback }


scrollDown : Int -> Terminal -> Terminal
scrollDown count terminal =
    let
        screen =
            activeScreen terminal
    in
    insertLinesAt screen.scrollTop count terminal


{-| Insert blank lines at `row`, pushing the lines below it down and out of
the bottom of the scroll region.
-}
insertLinesAt : Int -> Int -> Terminal -> Terminal
insertLinesAt row count terminal =
    let
        screen =
            activeScreen terminal

        bottom =
            screen.scrollBottom

        n =
            clamp 0 (bottom - row + 1) count

        height =
            Array.length screen.lines

        blank =
            blankLine terminal.size.width (eraseStyle terminal)

        lines =
            Array.append
                (Array.append (Array.slice 0 row screen.lines) (Array.repeat n blank))
                (Array.append (Array.slice row (bottom + 1 - n) screen.lines) (Array.slice (bottom + 1) height screen.lines))
    in
    if n == 0 then
        terminal

    else
        setActiveScreen { screen | lines = lines } terminal


{-| Delete lines at `row`, pulling the lines below it up and adding blank
lines at the bottom of the scroll region.
-}
deleteLinesAt : Int -> Int -> Terminal -> Terminal
deleteLinesAt row count terminal =
    let
        screen =
            activeScreen terminal

        bottom =
            screen.scrollBottom

        n =
            clamp 0 (bottom - row + 1) count

        height =
            Array.length screen.lines

        blank =
            blankLine terminal.size.width (eraseStyle terminal)

        lines =
            Array.append
                (Array.append (Array.slice 0 row screen.lines) (Array.slice (row + n) (bottom + 1) screen.lines))
                (Array.append (Array.repeat n blank) (Array.slice (bottom + 1) height screen.lines))
    in
    if n == 0 then
        terminal

    else
        setActiveScreen { screen | lines = lines } terminal


cursorInScrollRegion : Terminal -> Bool
cursorInScrollRegion terminal =
    let
        screen =
            activeScreen terminal
    in
    screen.cursor.y >= screen.scrollTop && screen.cursor.y <= screen.scrollBottom


insertLines : Int -> Terminal -> Terminal
insertLines count terminal =
    if cursorInScrollRegion terminal then
        insertLinesAt (activeScreen terminal).cursor.y (max 1 count) terminal
            |> carriageReturn

    else
        terminal


deleteLines : Int -> Terminal -> Terminal
deleteLines count terminal =
    if cursorInScrollRegion terminal then
        deleteLinesAt (activeScreen terminal).cursor.y (max 1 count) terminal
            |> carriageReturn

    else
        terminal


{-| DECSTBM. `bottom` 0 means the last line of the screen.
-}
setScrollRegion : Int -> Int -> Terminal -> Terminal
setScrollRegion top bottom terminal =
    let
        height =
            terminal.size.height

        first =
            max 1 top - 1

        last =
            if bottom <= 0 || bottom > height then
                height - 1

            else
                bottom - 1
    in
    if first < last then
        mapScreen (\screen -> { screen | scrollTop = first, scrollBottom = last }) terminal
            |> cursorPosition 1 1

    else
        terminal



-- PRINTING


{-| A wide character occupies two cells. Whenever one of the two is
overwritten or shifted away the other one must not be left behind: it becomes
a blank in the given style.
-}
repairWide : Style -> Array Cell -> Array Cell
repairWide style cells =
    let
        last =
            Array.length cells - 1

        widthAt i =
            Array.get i cells
                |> Maybe.map .width
                |> Maybe.withDefault 1
    in
    Array.indexedMap
        (\i cell ->
            if cell.width == 1 then
                cell

            else if cell.width == 0 && widthAt (i - 1) /= 2 then
                blankCell style

            else if cell.width == 2 && (i == last || widthAt (i + 1) /= 0) then
                blankCell style

            else
                cell
        )
        cells


{-| Make the cell at `x` safe to overwrite: the other half of a wide character
becomes a blank in the given style.
-}
releaseCell : Style -> Int -> Array Cell -> Array Cell
releaseCell style x cells =
    case Array.get x cells of
        Just cell ->
            if cell.width == 1 then
                cells

            else if cell.width == 0 then
                -- second half of a wide character: blank the first half
                if x > 0 then
                    Array.set (x - 1) (blankCell style) cells

                else
                    cells

            else
                -- first half of a wide character: blank the second half
                if x + 1 < Array.length cells then
                    Array.set (x + 1) (blankCell style) cells

                else
                    cells

        Nothing ->
            cells


{-| State while printing a run of text: the cells of the line being written
are kept aside so that a run only touches the screen once per line.
-}
type alias Printer =
    { terminal : Terminal
    , cells : Array Cell
    , x : Int
    , y : Int
    }


startPrinter : Terminal -> Printer
startPrinter terminal =
    let
        screen =
            activeScreen terminal
    in
    { terminal = terminal
    , cells = (getLine screen.cursor.y screen).cells
    , x = screen.cursor.x
    , y = screen.cursor.y
    }


finishPrinter : Bool -> Printer -> Terminal
finishPrinter wrapped printer =
    mapScreen
        (\screen ->
            { screen
                | lines = Array.set printer.y { cells = printer.cells, wrapped = wrapped } screen.lines
                , cursor = { x = printer.x, y = printer.y }
            }
        )
        printer.terminal


printText : String -> Terminal -> Terminal
printText text terminal =
    if text == "" then
        terminal

    else
        let
            printer =
                String.foldl printChar (startPrinter terminal) text
        in
        finishPrinter (getLine printer.y (activeScreen printer.terminal)).wrapped printer


printChar : Char -> Printer -> Printer
printChar char printer =
    let
        charWidth =
            Terminal.Width.charWidth char
    in
    if charWidth == 0 then
        combineChar char printer

    else
        let
            width =
                printer.terminal.size.width

            fits =
                printer.x + charWidth <= width

            positioned =
                if fits then
                    printer

                else if printer.terminal.modes.autoWrap then
                    -- Continue on the next line. A wide character that does
                    -- not fit in the last column leaves that column blank.
                    finishPrinter True
                        { printer
                            | cells =
                                if printer.x < width then
                                    printer.cells
                                        |> releaseCell printer.terminal.pen printer.x
                                        |> Array.set printer.x (blankCell printer.terminal.pen)

                                else
                                    printer.cells
                        }
                        |> index
                        |> carriageReturn
                        |> startPrinter

                else
                    -- without auto wrap the last column is overwritten
                    { printer | x = width - 1 }

            x =
                positioned.x

            pen =
                positioned.terminal.pen

            shifted =
                if positioned.terminal.modes.insert then
                    Array.append
                        (Array.append (Array.slice 0 x positioned.cells) (Array.repeat charWidth (blankCell pen)))
                        (Array.slice x (width - charWidth) positioned.cells)
                        |> repairWide pen

                else
                    positioned.cells

            cells =
                if charWidth == 2 then
                    shifted
                        |> releaseCell pen x
                        |> releaseCell pen (x + 1)
                        |> Array.set x { char = String.fromChar char, width = 2, style = pen }
                        |> Array.set (x + 1) { char = "", width = 0, style = pen }

                else
                    shifted
                        |> releaseCell pen x
                        |> Array.set x { char = String.fromChar char, width = 1, style = pen }
        in
        if not fits && not printer.terminal.modes.autoWrap && charWidth == 2 then
            -- there is no room for a wide character in the last column
            positioned

        else
            { positioned | cells = cells, x = x + charWidth }


{-| Attach a zero width character to the character before the cursor.
-}
combineChar : Char -> Printer -> Printer
combineChar char printer =
    let
        previous =
            printer.x - 1

        target =
            case Array.get previous printer.cells of
                Just cell ->
                    if cell.width == 0 then
                        previous - 1

                    else
                        previous

                Nothing ->
                    -1
    in
    case Array.get target printer.cells of
        Just cell ->
            let
                combined =
                    { cell | char = cell.char ++ String.fromChar char }
            in
            if
                Terminal.Width.isEmojiPresentationSelector char
                    && (cell.width == 1)
                    && (printer.x < printer.terminal.size.width)
                    && Terminal.Width.widensWithEmojiPresentation cell.char
            then
                -- the emoji form of a symbol is two columns wide
                { printer
                    | cells =
                        printer.cells
                            |> releaseCell cell.style printer.x
                            |> Array.set target { combined | width = 2 }
                            |> Array.set printer.x { char = "", width = 0, style = cell.style }
                    , x = printer.x + 1
                }

            else
                { printer | cells = Array.set target combined printer.cells }

        Nothing ->
            printer



-- ERASING AND EDITING


{-| Blank the cells from `from` (inclusive) to `to` (exclusive).
-}
eraseCells : Int -> Int -> Style -> Array Cell -> Array Cell
eraseCells from to style cells =
    let
        blank =
            blankCell style
    in
    Array.indexedMap
        (\i cell ->
            if i >= from && i < to then
                blank

            else
                cell
        )
        cells
        |> repairWide style


{-| A cursor waiting past the last column erases nothing to its right: the
character in the last column stays. Programs rely on that when they clear to
the end of a line they have just filled (`ls`, `git diff`).
-}
eraseInLine : Int -> Terminal -> Terminal
eraseInLine mode terminal =
    let
        x =
            (activeScreen terminal).cursor.x

        width =
            terminal.size.width

        ( from, to ) =
            case mode of
                1 ->
                    ( 0, x + 1 )

                2 ->
                    ( 0, width )

                _ ->
                    ( x, width )
    in
    mapLine (activeScreen terminal).cursor.y
        (\line -> { cells = eraseCells from to (eraseStyle terminal) line.cells, wrapped = False })
        terminal


eraseInDisplay : Int -> Terminal -> Terminal
eraseInDisplay mode terminal =
    let
        y =
            (activeScreen terminal).cursor.y

        blank =
            blankLine terminal.size.width (eraseStyle terminal)

        eraseLines keep =
            mapScreen
                (\screen ->
                    { screen
                        | lines =
                            Array.indexedMap
                                (\row line ->
                                    if keep row then
                                        line

                                    else
                                        blank
                                )
                                screen.lines
                    }
                )
    in
    case mode of
        1 ->
            terminal
                |> eraseLines (\row -> row >= y)
                |> eraseInLine 1

        2 ->
            eraseLines (always False) terminal

        3 ->
            { terminal | scrollback = emptyScrollback }

        _ ->
            terminal
                |> eraseLines (\row -> row <= y)
                |> eraseInLine 0


eraseCharacters : Int -> Terminal -> Terminal
eraseCharacters count terminal =
    let
        x =
            cursorColumn terminal
    in
    mapLine (activeScreen terminal).cursor.y
        (\line -> { line | cells = eraseCells x (x + max 1 count) (eraseStyle terminal) line.cells })
        terminal
        |> setCursor x (activeScreen terminal).cursor.y


insertBlanks : Int -> Terminal -> Terminal
insertBlanks count terminal =
    let
        x =
            cursorColumn terminal

        width =
            terminal.size.width

        n =
            clamp 1 (width - x) count
    in
    mapLine (activeScreen terminal).cursor.y
        (\line ->
            { line
                | cells =
                    Array.append
                        (Array.append (Array.slice 0 x line.cells) (Array.repeat n (blankCell (eraseStyle terminal))))
                        (Array.slice x (width - n) line.cells)
                        |> repairWide (eraseStyle terminal)
            }
        )
        terminal
        |> setCursor x (activeScreen terminal).cursor.y


deleteCharacters : Int -> Terminal -> Terminal
deleteCharacters count terminal =
    let
        x =
            cursorColumn terminal

        width =
            terminal.size.width

        n =
            clamp 1 (width - x) count
    in
    mapLine (activeScreen terminal).cursor.y
        (\line ->
            { line
                | cells =
                    Array.append
                        (Array.append (Array.slice 0 x line.cells) (Array.slice (x + n) width line.cells))
                        (Array.repeat n (blankCell (eraseStyle terminal)))
                        |> repairWide (eraseStyle terminal)
            }
        )
        terminal
        |> setCursor x (activeScreen terminal).cursor.y


{-| DECALN: fill the screen with E to check the alignment.
-}
screenAlignment : Terminal -> Terminal
screenAlignment terminal =
    let
        line =
            { cells = Array.repeat terminal.size.width { char = "E", width = 1, style = defaultStyle }
            , wrapped = False
            }
    in
    mapScreen
        (\screen ->
            { screen
                | lines = Array.repeat terminal.size.height line
                , scrollTop = 0
                , scrollBottom = terminal.size.height - 1
                , cursor = { x = 0, y = 0 }
            }
        )
        terminal


{-| Clear the screen and the scrollback but keep the line the cursor is on,
so the prompt stays (Cmd+K).
-}
clearKeepingCursorLine : Terminal -> Terminal
clearKeepingCursorLine terminal =
    let
        screen =
            activeScreen terminal

        blank =
            blankLine terminal.size.width defaultStyle

        current =
            getLine screen.cursor.y screen
    in
    case terminal.activeBuffer of
        Alternate ->
            terminal

        Primary ->
            { terminal
                | scrollback = emptyScrollback
                , primary =
                    { screen
                        | lines = Array.set 0 { current | wrapped = False } (Array.repeat terminal.size.height blank)
                        , cursor = { x = screen.cursor.x, y = 0 }
                    }
            }



-- CURSOR SAVE / RESTORE AND SCREEN SWITCHING


saveCursor : Terminal -> Terminal
saveCursor terminal =
    mapScreen
        (\screen ->
            { screen
                | saved =
                    Just
                        { cursor = screen.cursor
                        , pen = terminal.pen
                        , origin = terminal.modes.origin
                        , autoWrap = terminal.modes.autoWrap
                        }
            }
        )
        terminal


restoreCursor : Terminal -> Terminal
restoreCursor terminal =
    let
        modes =
            terminal.modes
    in
    case (activeScreen terminal).saved of
        Just saved ->
            { terminal
                | pen = saved.pen
                , modes = { modes | origin = saved.origin, autoWrap = saved.autoWrap }
            }
                -- a cursor saved while waiting past the last column goes
                -- back to waiting there
                |> setCursor
                    (clamp 0 terminal.size.width saved.cursor.x)
                    (clamp 0 (terminal.size.height - 1) saved.cursor.y)

        Nothing ->
            { terminal | pen = defaultStyle, modes = { modes | origin = False } }
                |> setCursor 0 0


enterAlternateScreen : Terminal -> Terminal
enterAlternateScreen terminal =
    case terminal.activeBuffer of
        Alternate ->
            terminal

        Primary ->
            let
                blank =
                    blankScreen terminal.size
            in
            -- The alternate screen starts out empty, with default margins and
            -- tab stops and the cursor where it was on the primary screen.
            { terminal
                | activeBuffer = Alternate
                , alternate =
                    { blank
                        | lines = Array.repeat terminal.size.height (blankLine terminal.size.width (eraseStyle terminal))
                        , cursor = terminal.primary.cursor
                        , saved = terminal.alternate.saved
                        , keyboardFlags = terminal.alternate.keyboardFlags
                    }
            }


{-| The cursor stays where it was on the alternate screen (`?1049l`
restores the saved one right after).
-}
leaveAlternateScreen : Terminal -> Terminal
leaveAlternateScreen terminal =
    case terminal.activeBuffer of
        Primary ->
            terminal

        Alternate ->
            let
                primary =
                    terminal.primary
            in
            { terminal
                | activeBuffer = Primary
                , primary = { primary | cursor = terminal.alternate.cursor }
            }



-- MODES


setPrivateMode : Int -> Bool -> Terminal -> Terminal
setPrivateMode mode enabled terminal =
    let
        modes =
            terminal.modes

        withModes next =
            { terminal | modes = next }

        mouse tracking =
            withModes
                { modes
                    | mouseTracking =
                        if enabled then
                            tracking

                        else
                            MouseOff
                }

        encoding mouseEncoding =
            withModes
                { modes
                    | mouseEncoding =
                        if enabled then
                            mouseEncoding

                        else
                            MouseEncodingDefault
                }
    in
    case mode of
        1 ->
            withModes { modes | applicationCursorKeys = enabled }

        5 ->
            withModes { modes | reverseVideo = enabled }

        6 ->
            withModes { modes | origin = enabled }
                |> cursorPosition 1 1

        7 ->
            withModes { modes | autoWrap = enabled }

        9 ->
            mouse MouseX10

        25 ->
            withModes { modes | cursorVisible = enabled }

        47 ->
            if enabled then
                enterAlternateScreen terminal

            else
                leaveAlternateScreen terminal

        1000 ->
            mouse MouseButtons

        1002 ->
            mouse MouseDrag

        1003 ->
            mouse MouseAnyMotion

        1004 ->
            withModes { modes | focusEvents = enabled }

        1006 ->
            encoding MouseEncodingSgr

        1007 ->
            withModes { modes | alternateScroll = enabled }

        1015 ->
            encoding MouseEncodingUrxvt

        1016 ->
            encoding MouseEncodingSgrPixels

        1047 ->
            if enabled then
                enterAlternateScreen terminal

            else
                leaveAlternateScreen terminal

        1048 ->
            if enabled then
                saveCursor terminal

            else
                restoreCursor terminal

        1049 ->
            if enabled then
                terminal
                    |> saveCursor
                    |> enterAlternateScreen

            else
                terminal
                    |> leaveAlternateScreen
                    |> restoreCursor

        2004 ->
            withModes { modes | bracketedPaste = enabled }

        2026 ->
            withModes { modes | synchronizedOutput = enabled }

        _ ->
            terminal


{-| The state of a private mode for DECRQM: Nothing when it is not supported.
-}
privateMode : Int -> Terminal -> Maybe Bool
privateMode mode terminal =
    let
        modes =
            terminal.modes
    in
    case mode of
        1 ->
            Just modes.applicationCursorKeys

        5 ->
            Just modes.reverseVideo

        6 ->
            Just modes.origin

        7 ->
            Just modes.autoWrap

        9 ->
            Just (modes.mouseTracking == MouseX10)

        25 ->
            Just modes.cursorVisible

        47 ->
            Just (terminal.activeBuffer == Alternate)

        1000 ->
            Just (modes.mouseTracking == MouseButtons)

        1002 ->
            Just (modes.mouseTracking == MouseDrag)

        1003 ->
            Just (modes.mouseTracking == MouseAnyMotion)

        1004 ->
            Just modes.focusEvents

        1006 ->
            Just (modes.mouseEncoding == MouseEncodingSgr)

        1007 ->
            Just modes.alternateScroll

        1015 ->
            Just (modes.mouseEncoding == MouseEncodingUrxvt)

        1016 ->
            Just (modes.mouseEncoding == MouseEncodingSgrPixels)

        1047 ->
            Just (terminal.activeBuffer == Alternate)

        1049 ->
            Just (terminal.activeBuffer == Alternate)

        2004 ->
            Just modes.bracketedPaste

        2026 ->
            Just modes.synchronizedOutput

        _ ->
            Nothing


softReset : Terminal -> Terminal
softReset terminal =
    let
        modes =
            terminal.modes
    in
    { terminal
        | pen = defaultStyle
        , cursorShape = CursorBlock
        , modes =
            { modes
                | origin = False
                , insert = False
                , autoWrap = True
                , cursorVisible = True
                , applicationCursorKeys = False
            }
    }
        |> mapScreen
            (\screen ->
                { screen
                    | scrollTop = 0
                    , scrollBottom = terminal.size.height - 1
                    , saved = Nothing
                    , keyboardFlags = []
                }
            )


fullReset : Terminal -> Terminal
fullReset terminal =
    let
        fresh =
            init terminal.size
    in
    { fresh
        | title = terminal.title
        , characterWidth = terminal.characterWidth
        , focused = terminal.focused
    }



-- SGR


applySgr : Int -> Style -> Style
applySgr code style =
    if code == 0 then
        { defaultStyle | link = style.link }

    else if code == 1 then
        setAttribute attributeBold style

    else if code == 2 then
        setAttribute attributeDim style

    else if code == 3 then
        setAttribute attributeItalic style

    else if code == 4 then
        setAttribute attributeUnderline style

    else if code == 5 || code == 6 then
        setAttribute attributeBlink style

    else if code == 7 then
        setAttribute attributeInverse style

    else if code == 8 then
        setAttribute attributeInvisible style

    else if code == 9 then
        setAttribute attributeStrike style

    else if code == 21 then
        setAttribute attributeDoubleUnderline style

    else if code == 22 then
        style
            |> clearAttribute attributeBold
            |> clearAttribute attributeDim

    else if code == 23 then
        clearAttribute attributeItalic style

    else if code == 24 then
        style
            |> clearAttribute attributeUnderline
            |> clearAttribute attributeDoubleUnderline

    else if code == 25 then
        clearAttribute attributeBlink style

    else if code == 27 then
        clearAttribute attributeInverse style

    else if code == 28 then
        clearAttribute attributeInvisible style

    else if code == 29 then
        clearAttribute attributeStrike style

    else if code >= 30 && code <= 37 then
        { style | foreground = IndexedColor (code - 30) }

    else if code == 39 then
        { style | foreground = DefaultColor }

    else if code >= 40 && code <= 47 then
        { style | background = IndexedColor (code - 40) }

    else if code == 49 then
        { style | background = DefaultColor }

    else if code == 53 then
        setAttribute attributeOverline style

    else if code == 55 then
        clearAttribute attributeOverline style

    else if code >= 90 && code <= 97 then
        { style | foreground = IndexedColor (code - 90 + 8) }

    else if code >= 100 && code <= 107 then
        { style | background = IndexedColor (code - 100 + 8) }

    else
        style


mapPen : (Style -> Style) -> Terminal -> Terminal
mapPen change terminal =
    { terminal | pen = change terminal.pen }



-- KITTY KEYBOARD PROTOCOL


{-| Only "disambiguate escape codes" (1) is implemented, so that is the only
flag a program can turn on.
-}
supportedKeyboardFlags : Int
supportedKeyboardFlags =
    1


pushKeyboardFlags : Int -> Terminal -> Terminal
pushKeyboardFlags flags terminal =
    mapScreen
        (\screen ->
            { screen
                | keyboardFlags =
                    List.take 16 (Bitwise.and supportedKeyboardFlags flags :: screen.keyboardFlags)
            }
        )
        terminal


popKeyboardFlags : Int -> Terminal -> Terminal
popKeyboardFlags count terminal =
    mapScreen (\screen -> { screen | keyboardFlags = List.drop (max 1 count) screen.keyboardFlags }) terminal


{-| `mode` 1 replaces the flags, 2 turns the given flags on, 3 turns them off.
-}
setKeyboardFlags : Int -> Int -> Terminal -> Terminal
setKeyboardFlags flags mode terminal =
    let
        current =
            keyboardFlags terminal

        next =
            Bitwise.and supportedKeyboardFlags
                (case mode of
                    2 ->
                        Bitwise.or current flags

                    3 ->
                        Bitwise.and current (Bitwise.complement flags)

                    _ ->
                        flags
                )
    in
    mapScreen (\screen -> { screen | keyboardFlags = next :: List.drop 1 screen.keyboardFlags }) terminal



-- REPLIES


csi : String
csi =
    "\u{001B}["


stringTerminator : String
stringTerminator =
    "\u{001B}\\"


{-| The answer to a query sequence, if we have one.
-}
answer : String -> Terminal -> Maybe String
answer query terminal =
    let
        screen =
            activeScreen terminal

        ( top, _ ) =
            addressableRows terminal

        row =
            String.fromInt (screen.cursor.y - top + 1)

        column =
            String.fromInt (cursorColumn terminal + 1)

        rows =
            String.fromInt terminal.size.height

        columns =
            String.fromInt terminal.size.width
    in
    case query of
        "[5n" ->
            Just (csi ++ "0n")

        "[6n" ->
            Just (csi ++ row ++ ";" ++ column ++ "R")

        "[?6n" ->
            Just (csi ++ "?" ++ row ++ ";" ++ column ++ ";1R")

        "[?996n" ->
            -- color scheme: 1 is dark
            Just (csi ++ "?997;1n")

        "[0c" ->
            -- VT220 with ANSI color
            Just (csi ++ "?62;22c")

        "[>c" ->
            Just (csi ++ ">1;10;0c")

        "[=c" ->
            Just ("\u{001B}P!|00000000" ++ stringTerminator)

        "[>q" ->
            Just ("\u{001B}P>|TerminalPro" ++ stringTerminator)

        "[?u" ->
            Just (csi ++ "?" ++ String.fromInt (keyboardFlags terminal) ++ "u")

        "[14t" ->
            Just
                (csi
                    ++ "4;"
                    ++ String.fromInt (terminal.size.height * lineHeight)
                    ++ ";"
                    ++ String.fromInt (round (toFloat terminal.size.width * terminal.characterWidth))
                    ++ "t"
                )

        "[16t" ->
            Just (csi ++ "6;" ++ String.fromInt lineHeight ++ ";" ++ String.fromInt (round terminal.characterWidth) ++ "t")

        "[18t" ->
            Just (csi ++ "8;" ++ rows ++ ";" ++ columns ++ "t")

        "[19t" ->
            Just (csi ++ "9;" ++ rows ++ ";" ++ columns ++ "t")

        _ ->
            if String.startsWith "[?" query && String.endsWith "$p" query then
                requestPrivateMode (String.slice 2 -2 query) terminal

            else if String.startsWith "[" query && String.endsWith "$p" query then
                requestAnsiMode (String.slice 1 -2 query) terminal

            else if String.startsWith "]" query then
                colorQuery (String.dropLeft 1 query)

            else if String.startsWith "P$q" query then
                Just (requestSetting (String.dropLeft 3 query) terminal)

            else if String.startsWith "P+q" query then
                Just (requestTermcap (String.dropLeft 3 query))

            else
                Nothing


lineHeight : Int
lineHeight =
    24


modeReport : String -> String -> Maybe Bool -> String
modeReport prefix mode state =
    csi
        ++ prefix
        ++ mode
        ++ ";"
        ++ (case state of
                Just True ->
                    "1"

                Just False ->
                    "2"

                Nothing ->
                    "0"
           )
        ++ "$y"


requestPrivateMode : String -> Terminal -> Maybe String
requestPrivateMode mode terminal =
    String.toInt mode
        |> Maybe.map (\number -> modeReport "?" mode (privateMode number terminal))


requestAnsiMode : String -> Terminal -> Maybe String
requestAnsiMode mode terminal =
    String.toInt mode
        |> Maybe.map
            (\number ->
                modeReport ""
                    mode
                    (case number of
                        4 ->
                            Just terminal.modes.insert

                        20 ->
                            Just terminal.modes.newLine

                        _ ->
                            Nothing
                    )
            )


{-| OSC 4, 10, 11 and 12 color queries, answered with the terminator the
program used.
-}
colorQuery : String -> Maybe String
colorQuery query =
    let
        ( body, terminator ) =
            if String.endsWith "\u{0007}" query then
                ( String.dropRight 1 query, "\u{0007}" )

            else
                ( String.dropRight 2 query, stringTerminator )

        osc text =
            "\u{001B}]" ++ text ++ terminator
    in
    case String.split ";" body of
        [ "10", "?" ] ->
            Just (osc ("10;" ++ Terminal.Color.toXParseColor Terminal.Color.defaultForeground))

        [ "11", "?" ] ->
            Just (osc ("11;" ++ Terminal.Color.toXParseColor Terminal.Color.defaultBackground))

        [ "12", "?" ] ->
            Just (osc ("12;" ++ Terminal.Color.toXParseColor Terminal.Color.defaultForeground))

        [ "4", number, "?" ] ->
            String.toInt number
                |> Maybe.andThen (\n -> Terminal.Color.toRgb (IndexedColor (clamp 0 255 n)))
                |> Maybe.map (\rgb -> osc ("4;" ++ number ++ ";" ++ Terminal.Color.toXParseColor rgb))

        _ ->
            Nothing


{-| DECRQSS: report the current value of a setting.
-}
requestSetting : String -> Terminal -> String
requestSetting setting terminal =
    let
        screen =
            activeScreen terminal

        valid value =
            "\u{001B}P1$r" ++ value ++ stringTerminator
    in
    case setting of
        "m" ->
            valid "0m"

        "r" ->
            valid (String.fromInt (screen.scrollTop + 1) ++ ";" ++ String.fromInt (screen.scrollBottom + 1) ++ "r")

        " q" ->
            valid
                ((case terminal.cursorShape of
                    CursorBlock ->
                        "2"

                    CursorUnderline ->
                        "4"

                    CursorBar ->
                        "6"
                 )
                    ++ " q"
                )

        _ ->
            "\u{001B}P0$r" ++ stringTerminator


{-| XTGETTCAP: names and values are hex encoded.
-}
requestTermcap : String -> String
requestTermcap names =
    let
        value name =
            case hexDecode name of
                "TN" ->
                    Just "xterm-256color"

                "name" ->
                    Just "xterm-256color"

                "Co" ->
                    Just "256"

                "colors" ->
                    Just "256"

                "RGB" ->
                    Just "8/8/8"

                _ ->
                    Nothing

        known =
            String.split ";" names
                |> List.filterMap (\name -> value name |> Maybe.map (\v -> name ++ "=" ++ hexEncode v))
    in
    case known of
        [] ->
            "\u{001B}P0+r" ++ names ++ stringTerminator

        _ ->
            "\u{001B}P1+r" ++ String.join ";" known ++ stringTerminator


hexDecode : String -> String
hexDecode hex =
    let
        digit char =
            String.indexes (String.fromChar (Char.toLower char)) "0123456789abcdef"
                |> List.head
                |> Maybe.withDefault 0

        decode chars =
            case chars of
                high :: low :: rest ->
                    Char.fromCode (digit high * 16 + digit low) :: decode rest

                _ ->
                    []
    in
    String.fromList (decode (String.toList hex))


hexEncode : String -> String
hexEncode text =
    let
        digit n =
            String.slice n (n + 1) "0123456789abcdef"
    in
    String.toList text
        |> List.map (\char -> digit (Char.toCode char // 16) ++ digit (modBy 16 (Char.toCode char)))
        |> String.concat



-- APPLY


applyAll : List TerminalCommand -> Terminal -> ( Terminal, List Effect )
applyAll commands terminal =
    List.foldl apply ( terminal, [] ) commands
        |> Tuple.mapSecond List.reverse


{-| Apply one command. Effects are accumulated newest first.
-}
apply : TerminalCommand -> ( Terminal, List Effect ) -> ( Terminal, List Effect )
apply command ( terminal, effects ) =
    case command of
        TerminalCommandText text ->
            ( printText text terminal, effects )

        TerminalCommandSequence sequence ->
            applySequence sequence terminal effects

        TerminalCommandSequenceAndSingleArgument sequence argument ->
            ( applySingle sequence argument terminal, effects )

        TerminalCommandSequenceAndDoubleArgument sequence argument1 argument2 ->
            ( applyDouble sequence argument1 argument2 terminal, effects )

        TerminalCommandSequenceAndTripleArgument sequence argument1 argument2 argument3 ->
            ( applyTriple sequence argument1 argument2 argument3 terminal, effects )

        TerminalCommandSequenceAndSingleStringArgument sequence argument ->
            applyString sequence argument terminal effects


applySequence : String -> Terminal -> List Effect -> ( Terminal, List Effect )
applySequence sequence terminal effects =
    let
        only next =
            ( next, effects )
    in
    case sequence of
        "\n" ->
            only (lineFeed terminal)

        "\u{000D}" ->
            only (carriageReturn terminal)

        "\u{0008}" ->
            only (cursorBack 1 terminal)

        "\t" ->
            only (tabForward 1 terminal)

        "\u{0007}" ->
            ( terminal, Bell :: effects )

        -- IND, NEL, RI
        "D" ->
            only (index terminal)

        "E" ->
            only (carriageReturn (index terminal))

        "M" ->
            only (reverseIndex terminal)

        -- HTS
        "H" ->
            only (mapScreen (\screen -> { screen | tabStops = Set.insert (cursorColumn terminal) screen.tabStops }) terminal)

        "7" ->
            only (saveCursor terminal)

        "8" ->
            only (restoreCursor terminal)

        "[s" ->
            only (saveCursor terminal)

        "[u" ->
            only (restoreCursor terminal)

        "c" ->
            only (fullReset terminal)

        "[!p" ->
            only (softReset terminal)

        "#8" ->
            only (screenAlignment terminal)

        "[H" ->
            only (cursorPosition 1 1 terminal)

        "[A" ->
            only (cursorUp 1 terminal)

        "[B" ->
            only (cursorDown 1 terminal)

        "[C" ->
            only (cursorForward 1 terminal)

        "[D" ->
            only (cursorBack 1 terminal)

        "[E" ->
            only (carriageReturn (cursorDown 1 terminal))

        "[F" ->
            only (carriageReturn (cursorUp 1 terminal))

        "[G" ->
            only (cursorToColumn 1 terminal)

        "[d" ->
            only (cursorToRow 1 terminal)

        "[I" ->
            only (tabForward 1 terminal)

        "[Z" ->
            only (tabBackward 1 terminal)

        "[K" ->
            only (eraseInLine 0 terminal)

        "[0K" ->
            only (eraseInLine 0 terminal)

        "[1K" ->
            only (eraseInLine 1 terminal)

        "[2K" ->
            only (eraseInLine 2 terminal)

        "[J" ->
            only (eraseInDisplay 0 terminal)

        "[0J" ->
            only (eraseInDisplay 0 terminal)

        "[1J" ->
            only (eraseInDisplay 1 terminal)

        "[2J" ->
            only (eraseInDisplay 2 terminal)

        "[3J" ->
            only (eraseInDisplay 3 terminal)

        "[L" ->
            only (insertLines 1 terminal)

        "[M" ->
            only (deleteLines 1 terminal)

        "[S" ->
            only (scrollUp 1 terminal)

        "[T" ->
            only (scrollDown 1 terminal)

        "[@" ->
            only (insertBlanks 1 terminal)

        "[P" ->
            only (deleteCharacters 1 terminal)

        "[X" ->
            only (eraseCharacters 1 terminal)

        "[r" ->
            only (setScrollRegion 1 0 terminal)

        "[m" ->
            only (mapPen (applySgr 0) terminal)

        "[0m" ->
            only (mapPen (applySgr 0) terminal)

        "[4m" ->
            only (mapPen (applySgr 4) terminal)

        "[49m" ->
            only (mapPen (applySgr 49) terminal)

        "[4h" ->
            only (setInsertMode True terminal)

        "[4l" ->
            only (setInsertMode False terminal)

        "[20h" ->
            only (setNewLineMode True terminal)

        "[20l" ->
            only (setNewLineMode False terminal)

        "child-exited" ->
            ( { terminal | exited = True }, ChildExited :: effects )

        _ ->
            case privateModeSequence sequence of
                Just ( mode, enabled ) ->
                    only (setPrivateMode mode enabled terminal)

                Nothing ->
                    case answer sequence terminal of
                        Just reply ->
                            ( terminal, Reply reply :: effects )

                        Nothing ->
                            only terminal


setInsertMode : Bool -> Terminal -> Terminal
setInsertMode enabled terminal =
    let
        modes =
            terminal.modes
    in
    { terminal | modes = { modes | insert = enabled } }


setNewLineMode : Bool -> Terminal -> Terminal
setNewLineMode enabled terminal =
    let
        modes =
            terminal.modes
    in
    { terminal | modes = { modes | newLine = enabled } }


{-| `[?25h` -> (25, True)
-}
privateModeSequence : String -> Maybe ( Int, Bool )
privateModeSequence sequence =
    if String.startsWith "[?" sequence then
        let
            mode =
                String.toInt (String.slice 2 -1 sequence)
        in
        if String.endsWith "h" sequence then
            Maybe.map (\number -> ( number, True )) mode

        else if String.endsWith "l" sequence then
            Maybe.map (\number -> ( number, False )) mode

        else
            Nothing

    else
        Nothing


applySingle : String -> Int -> Terminal -> Terminal
applySingle sequence argument terminal =
    case sequence of
        "[A" ->
            cursorUp argument terminal

        "[B" ->
            cursorDown argument terminal

        "[C" ->
            cursorForward argument terminal

        "[D" ->
            cursorBack argument terminal

        "[E" ->
            carriageReturn (cursorDown argument terminal)

        "[F" ->
            carriageReturn (cursorUp argument terminal)

        "[G" ->
            cursorToColumn (max 1 argument) terminal

        "[d" ->
            cursorToRow (max 1 argument) terminal

        "[I" ->
            tabForward argument terminal

        "[Z" ->
            tabBackward argument terminal

        "[@" ->
            insertBlanks argument terminal

        "[X" ->
            eraseCharacters argument terminal

        "[P" ->
            deleteCharacters argument terminal

        "[L" ->
            insertLines argument terminal

        "[M" ->
            deleteLines argument terminal

        "[S" ->
            scrollUp (max 1 argument) terminal

        "[T" ->
            scrollDown (max 1 argument) terminal

        "[m" ->
            mapPen (applySgr argument) terminal

        "[m-fg-256" ->
            mapPen (\pen -> { pen | foreground = IndexedColor (clamp 0 255 argument) }) terminal

        "[m-bg-256" ->
            mapPen (\pen -> { pen | background = IndexedColor (clamp 0 255 argument) }) terminal

        "[g" ->
            if argument == 3 then
                mapScreen (\screen -> { screen | tabStops = Set.empty }) terminal

            else
                mapScreen (\screen -> { screen | tabStops = Set.remove (cursorColumn terminal) screen.tabStops }) terminal

        "[ q" ->
            { terminal
                | cursorShape =
                    if argument == 3 || argument == 4 then
                        CursorUnderline

                    else if argument == 5 || argument == 6 then
                        CursorBar

                    else
                        CursorBlock
            }

        "[>u" ->
            pushKeyboardFlags argument terminal

        "[<u" ->
            popKeyboardFlags argument terminal

        _ ->
            terminal


applyDouble : String -> Int -> Int -> Terminal -> Terminal
applyDouble sequence argument1 argument2 terminal =
    case sequence of
        "[H" ->
            cursorPosition (max 1 argument1) (max 1 argument2) terminal

        "[r" ->
            setScrollRegion argument1 argument2 terminal

        "[m" ->
            mapPen (applySgr argument1 >> applySgr argument2) terminal

        "[=u" ->
            setKeyboardFlags argument1 argument2 terminal

        _ ->
            terminal


applyTriple : String -> Int -> Int -> Int -> Terminal -> Terminal
applyTriple sequence argument1 argument2 argument3 terminal =
    let
        color =
            RgbColor (clamp 0 255 argument1) (clamp 0 255 argument2) (clamp 0 255 argument3)
    in
    case sequence of
        "[m-fg-rgb" ->
            mapPen (\pen -> { pen | foreground = color }) terminal

        "[m-bg-rgb" ->
            mapPen (\pen -> { pen | background = color }) terminal

        _ ->
            terminal


applyString : String -> String -> Terminal -> List Effect -> ( Terminal, List Effect )
applyString sequence argument terminal effects =
    case sequence of
        "set-icon-name-and-window-title" ->
            ( { terminal | title = argument }, SetTitle argument :: effects )

        "set-window-title" ->
            ( { terminal | title = argument }, SetTitle argument :: effects )

        "hyperlink" ->
            ( mapPen (\pen -> { pen | link = argument }) terminal, effects )

        "notify" ->
            ( terminal, Notify argument :: effects )

        "clipboard-write" ->
            ( terminal, WriteClipboard argument :: effects )

        _ ->
            ( terminal, effects )



-- RESIZE


resizeLine : Int -> Line -> Line
resizeLine width line =
    let
        current =
            Array.length line.cells
    in
    if current == width then
        line

    else if current > width then
        { line | cells = repairWide defaultStyle (Array.slice 0 width line.cells) }

    else
        { line | cells = Array.append line.cells (Array.repeat (width - current) defaultBlankCell) }


resizeScreen : TerminalSize -> (Line -> Scrollback -> Scrollback) -> ( Screen, Scrollback ) -> ( Screen, Scrollback )
resizeScreen size keep ( screen, scrollback ) =
    let
        height =
            Array.length screen.lines

        shrink remaining ( lines, cursorY, kept ) =
            if remaining <= 0 then
                ( lines, cursorY, kept )

            else if Array.length lines - 1 > cursorY then
                -- there are lines below the cursor: drop the last one
                shrink (remaining - 1) ( Array.slice 0 -1 lines, cursorY, kept )

            else
                -- the cursor is on the last line: the first one scrolls away
                shrink (remaining - 1)
                    ( Array.slice 1 (Array.length lines) lines
                    , max 0 (cursorY - 1)
                    , Array.get 0 lines
                        |> Maybe.map (\line -> keep line kept)
                        |> Maybe.withDefault kept
                    )

        ( resizedLines, y, nextScrollback ) =
            if size.height < height then
                shrink (height - size.height) ( screen.lines, screen.cursor.y, scrollback )

            else
                ( Array.append screen.lines (Array.repeat (size.height - height) (blankLine size.width defaultStyle))
                , screen.cursor.y
                , scrollback
                )
    in
    ( { screen
        | lines = Array.map (resizeLine size.width) resizedLines
        , cursor = { x = clamp 0 size.width screen.cursor.x, y = clamp 0 (size.height - 1) y }
        , scrollTop = 0
        , scrollBottom = size.height - 1
      }
    , nextScrollback
    )


resize : TerminalSize -> Terminal -> Terminal
resize requested terminal =
    let
        size =
            { height = max 1 requested.height, width = max 1 requested.width }

        ( primary, scrollback ) =
            resizeScreen size pushScrollback ( terminal.primary, terminal.scrollback )

        ( alternate, _ ) =
            resizeScreen size (\_ kept -> kept) ( terminal.alternate, terminal.scrollback )
    in
    if size == terminal.size then
        terminal

    else
        { terminal
            | size = size
            , primary = primary
            , alternate = alternate
            , scrollback = scrollback
        }
