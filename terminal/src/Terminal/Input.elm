module Terminal.Input exposing
    ( KeyboardState
    , encodeFocus
    , encodeKey
    , encodeMouse
    , encodePaste
    , encodeWheel
    , escape
    , evaluateKeyboardEvent
    , keyboardState
    )

{-| Turns keyboard, mouse, paste and focus events into the bytes a program
running in the terminal expects, following xterm.
-}

import Bitwise
import Editor.RawKeyboard exposing (RawKey)
import Terminal.Screen
import Terminal.Types exposing (..)


{-| The terminal state that changes how keys are encoded.
-}
type alias KeyboardState =
    { applicationCursorKeys : Bool
    , keyboardFlags : Int
    }


keyboardState : Terminal -> KeyboardState
keyboardState terminal =
    { applicationCursorKeys = terminal.modes.applicationCursorKeys
    , keyboardFlags = Terminal.Screen.keyboardFlags terminal
    }


{-| Encode a key press for a terminal in its default state.
-}
evaluateKeyboardEvent : RawKey -> Maybe String
evaluateKeyboardEvent ev =
    encodeKey { applicationCursorKeys = False, keyboardFlags = 0 } ev


encodeKey : KeyboardState -> RawKey -> Maybe String
encodeKey state ev =
    let
        -- xterm modifier parameter: 1 + shift (1) + alt (2) + ctrl (4)
        modifiers =
            1
                + (if ev.shiftKey then
                    1

                   else
                    0
                  )
                + (if ev.altKey then
                    2

                   else
                    0
                  )
                + (if ev.ctrlKey then
                    4

                   else
                    0
                  )

        modified =
            modifiers > 1

        -- Kitty keyboard protocol, "disambiguate escape codes"
        disambiguate =
            Bitwise.and 1 state.keyboardFlags /= 0

        csiU code =
            if modified then
                escape ++ "[" ++ String.fromInt code ++ ";" ++ String.fromInt modifiers ++ "u"

            else
                escape ++ "[" ++ String.fromInt code ++ "u"
    in
    if ev.metaKey then
        commandKey ev

    else
        case ev.code of
            "Enter" ->
                Just (enter disambiguate modified csiU ev)

            "NumpadEnter" ->
                Just (enter disambiguate modified csiU ev)

            "Tab" ->
                if disambiguate && modified then
                    Just (csiU 9)

                else if ev.shiftKey then
                    Just (escape ++ "[Z")

                else if ev.altKey then
                    Just (escape ++ characterTabulation)

                else
                    Just characterTabulation

            "Backspace" ->
                if disambiguate && modified then
                    Just (csiU 127)

                else if ev.altKey then
                    -- delete the word before the cursor
                    Just (escape ++ delete)

                else if ev.ctrlKey then
                    Just backspace

                else
                    Just delete

            "Escape" ->
                if disambiguate then
                    Just (csiU 27)

                else if ev.altKey then
                    Just (escape ++ escape)

                else
                    Just escape

            "Space" ->
                if disambiguate && (ev.ctrlKey || ev.altKey) then
                    Just (csiU 32)

                else if ev.ctrlKey && ev.altKey then
                    Just (escape ++ null)

                else if ev.ctrlKey then
                    Just null

                else if ev.altKey then
                    Just (escape ++ space)

                else
                    Just space

            _ ->
                case functionKey ev.code of
                    Just key ->
                        encodeFunctionKey state disambiguate modifiers ev key

                    Nothing ->
                        encodeCharacterKey disambiguate csiU ev


enter : Bool -> Bool -> (Int -> String) -> RawKey -> String
enter disambiguate modified csiU ev =
    if disambiguate && modified then
        csiU 13

    else if ev.altKey then
        escape ++ carriageReturn

    else
        carriageReturn


{-| macOS line editing conventions for the Command key.
-}
commandKey : RawKey -> Maybe String
commandKey ev =
    if ev.ctrlKey || ev.altKey then
        Nothing

    else
        case ev.code of
            "ArrowLeft" ->
                -- start of line
                Just startOfHeading

            "ArrowRight" ->
                -- end of line
                Just enquiry

            "Backspace" ->
                -- delete to the start of the line
                Just negativeAcknowledge

            _ ->
                Nothing



-- FUNCTION KEYS


type FunctionKey
    = -- ESC [ A, or ESC O A in application cursor keys mode
      CursorKey String
      -- ESC O P
    | Ss3Key String
      -- ESC [ 3 ~
    | TildeKey Int


functionKey : String -> Maybe FunctionKey
functionKey code =
    case code of
        "ArrowUp" ->
            Just (CursorKey "A")

        "ArrowDown" ->
            Just (CursorKey "B")

        "ArrowRight" ->
            Just (CursorKey "C")

        "ArrowLeft" ->
            Just (CursorKey "D")

        "Home" ->
            Just (CursorKey "H")

        "End" ->
            Just (CursorKey "F")

        "F1" ->
            Just (Ss3Key "P")

        "F2" ->
            Just (Ss3Key "Q")

        "F3" ->
            Just (Ss3Key "R")

        "F4" ->
            Just (Ss3Key "S")

        "Insert" ->
            Just (TildeKey 2)

        "Delete" ->
            Just (TildeKey 3)

        "PageUp" ->
            Just (TildeKey 5)

        "PageDown" ->
            Just (TildeKey 6)

        "F5" ->
            Just (TildeKey 15)

        "F6" ->
            Just (TildeKey 17)

        "F7" ->
            Just (TildeKey 18)

        "F8" ->
            Just (TildeKey 19)

        "F9" ->
            Just (TildeKey 20)

        "F10" ->
            Just (TildeKey 21)

        "F11" ->
            Just (TildeKey 23)

        "F12" ->
            Just (TildeKey 24)

        _ ->
            Nothing


encodeFunctionKey : KeyboardState -> Bool -> Int -> RawKey -> FunctionKey -> Maybe String
encodeFunctionKey state disambiguate modifiers ev key =
    let
        modified =
            modifiers > 1

        onlyAlt =
            ev.altKey && not (ev.shiftKey || ev.ctrlKey)
    in
    case key of
        CursorKey final ->
            if onlyAlt && not disambiguate && final == "D" then
                -- Option+Left: back one word
                Just (escape ++ "b")

            else if onlyAlt && not disambiguate && final == "C" then
                -- Option+Right: forward one word
                Just (escape ++ "f")

            else if modified then
                Just (escape ++ "[1;" ++ String.fromInt modifiers ++ final)

            else if state.applicationCursorKeys then
                Just (escape ++ "O" ++ final)

            else
                Just (escape ++ "[" ++ final)

        Ss3Key final ->
            if modified then
                Just (escape ++ "[1;" ++ String.fromInt modifiers ++ final)

            else
                Just (escape ++ "O" ++ final)

        TildeKey number ->
            if onlyAlt && not disambiguate && number == 3 then
                -- Option+Delete: delete the word after the cursor
                Just (escape ++ "d")

            else if modified then
                Just (escape ++ "[" ++ String.fromInt number ++ ";" ++ String.fromInt modifiers ++ "~")

            else
                Just (escape ++ "[" ++ String.fromInt number ++ "~")



-- CHARACTER KEYS


{-| The character a key produces on a US layout without modifiers, from the
physical key code.
-}
baseCharacter : String -> Maybe Char
baseCharacter code =
    if String.startsWith "Key" code && String.length code == 4 then
        String.dropLeft 3 code
            |> String.toLower
            |> String.uncons
            |> Maybe.map Tuple.first

    else if String.startsWith "Digit" code && String.length code == 6 then
        String.dropLeft 5 code
            |> String.uncons
            |> Maybe.map Tuple.first

    else
        case code of
            "Minus" ->
                Just '-'

            "Equal" ->
                Just '='

            "BracketLeft" ->
                Just '['

            "BracketRight" ->
                Just ']'

            "Backslash" ->
                Just '\\'

            "Semicolon" ->
                Just ';'

            "Quote" ->
                Just '\''

            "Backquote" ->
                Just '`'

            "Comma" ->
                Just ','

            "Period" ->
                Just '.'

            "Slash" ->
                Just '/'

            _ ->
                Nothing


{-| The control character for Ctrl + a physical key.
-}
controlCharacter : String -> Maybe String
controlCharacter code =
    let
        fromCode number =
            Just (String.fromChar (Char.fromCode number))
    in
    case baseCharacter code of
        Just char ->
            if Char.isAlpha char then
                -- Ctrl+A is 1 ... Ctrl+Z is 26
                fromCode (Char.toCode char - 96)

            else
                case char of
                    '2' ->
                        fromCode 0

                    '3' ->
                        fromCode 27

                    '4' ->
                        fromCode 28

                    '5' ->
                        fromCode 29

                    '6' ->
                        fromCode 30

                    '7' ->
                        fromCode 31

                    '8' ->
                        fromCode 127

                    '[' ->
                        fromCode 27

                    '\\' ->
                        fromCode 28

                    ']' ->
                        fromCode 29

                    '-' ->
                        fromCode 31

                    '/' ->
                        fromCode 31

                    '`' ->
                        fromCode 0

                    _ ->
                        Nothing

        Nothing ->
            Nothing


isAsciiPrintable : String -> Bool
isAsciiPrintable key =
    case String.uncons key of
        Just ( char, "" ) ->
            Char.toCode char >= 0x20 && Char.toCode char < 0x7F

        _ ->
            False


isSingleCharacter : String -> Bool
isSingleCharacter key =
    case String.uncons key of
        Just ( _, "" ) ->
            True

        _ ->
            False


encodeCharacterKey : Bool -> (Int -> String) -> RawKey -> Maybe String
encodeCharacterKey disambiguate csiU ev =
    let
        base =
            baseCharacter ev.code

        baseString =
            base
                |> Maybe.map
                    (\char ->
                        if ev.shiftKey then
                            String.fromChar (Char.toUpper char)

                        else
                            String.fromChar char
                    )

        -- The layout turned the modifier into a different printable ASCII
        -- character (AltGr, or Option on non US layouts: Option+L is @ on a
        -- German keyboard). That character is what the user wants to type.
        composedSymbol =
            (ev.altKey && isAsciiPrintable ev.key)
                && (Maybe.map (String.toLower << String.fromChar) base /= Just (String.toLower ev.key))
    in
    if composedSymbol then
        Just ev.key

    else if ev.ctrlKey || ev.altKey then
        if disambiguate then
            Maybe.map (csiU << Char.toCode) base

        else if ev.ctrlKey && ev.altKey then
            Maybe.map (\control -> escape ++ control) (controlCharacter ev.code)

        else if ev.ctrlKey then
            controlCharacter ev.code

        else
            -- Alt/Option is Meta: ESC followed by the key. On macOS `ev.key`
            -- is the character Option composes (Option+B is ∫), so the key
            -- itself comes from the physical key code.
            case baseString of
                Just character ->
                    Just (escape ++ character)

                Nothing ->
                    if isSingleCharacter ev.key then
                        Just (escape ++ ev.key)

                    else
                        Nothing

    else if isSingleCharacter ev.key then
        Just ev.key

    else
        Nothing



-- PASTE, FOCUS


{-| Line breaks are sent as carriage returns, like the Enter key. With
bracketed paste the program can tell pasted text from typed text.
-}
encodePaste : Bool -> String -> String
encodePaste bracketed text =
    let
        normalized =
            text
                |> String.replace "\u{000D}\n" "\u{000D}"
                |> String.replace "\n" "\u{000D}"
    in
    if bracketed then
        (escape ++ "[200~")
            -- pasted text must not be able to end the paste early
            ++ String.replace (escape ++ "[201~") "" normalized
            ++ (escape ++ "[201~")

    else
        normalized


encodeFocus : Bool -> String
encodeFocus focused =
    if focused then
        escape ++ "[I"

    else
        escape ++ "[O"



-- MOUSE


mouseCell : Terminal -> MouseEvent -> ( Int, Int )
mouseCell terminal event =
    ( clamp 1 terminal.size.width (floor (event.x / max 1 terminal.characterWidth) + 1)
    , clamp 1 terminal.size.height (floor (event.y / 24) + 1)
    )


{-| The report for a mouse event, if the program asked for it, and the cell
the event happened in. Holding Shift bypasses reporting so text can still be
selected.
-}
encodeMouse : Terminal -> MouseEvent -> ( Maybe String, ( Int, Int ) )
encodeMouse terminal event =
    let
        cell =
            mouseCell terminal event

        tracking =
            terminal.modes.mouseTracking

        heldButton =
            if Bitwise.and 1 event.buttons /= 0 then
                0

            else if Bitwise.and 4 event.buttons /= 0 then
                1

            else if Bitwise.and 2 event.buttons /= 0 then
                2

            else
                3

        sgr =
            terminal.modes.mouseEncoding == MouseEncodingSgr || terminal.modes.mouseEncoding == MouseEncodingSgrPixels

        button =
            case event.action of
                MousePress ->
                    if event.button <= 2 then
                        Just event.button

                    else
                        Nothing

                MouseRelease ->
                    if tracking == MouseX10 || event.button > 2 then
                        Nothing

                    else if sgr then
                        Just event.button

                    else
                        Just 3

                MouseMove ->
                    if cell == terminal.mouse.cell then
                        Nothing

                    else if tracking == MouseAnyMotion || (tracking == MouseDrag && heldButton /= 3) then
                        Just (heldButton + 32)

                    else
                        Nothing

                MouseWheel delta ->
                    if tracking == MouseX10 then
                        Nothing

                    else if delta < 0 then
                        Just 64

                    else
                        Just 65

        modifierBits =
            if tracking == MouseX10 then
                0

            else
                (if event.altKey then
                    8

                 else
                    0
                )
                    + (if event.ctrlKey then
                        16

                       else
                        0
                      )
    in
    -- Shift (select text) and Command (open a link) keep the click for the
    -- terminal itself
    if tracking == MouseOff || event.shiftKey || event.metaKey then
        ( Nothing, cell )

    else
        ( Maybe.andThen (\code -> mouseReport terminal event cell (code + modifierBits)) button
        , cell
        )


mouseReport : Terminal -> MouseEvent -> ( Int, Int ) -> Int -> Maybe String
mouseReport terminal event ( column, row ) code =
    let
        final =
            if event.action == MouseRelease then
                "m"

            else
                "M"
    in
    case terminal.modes.mouseEncoding of
        MouseEncodingSgr ->
            Just (escape ++ "[<" ++ String.fromInt code ++ ";" ++ String.fromInt column ++ ";" ++ String.fromInt row ++ final)

        MouseEncodingSgrPixels ->
            Just
                (escape
                    ++ "[<"
                    ++ String.fromInt code
                    ++ ";"
                    ++ String.fromInt (max 1 (round event.x + 1))
                    ++ ";"
                    ++ String.fromInt (max 1 (round event.y + 1))
                    ++ final
                )

        MouseEncodingUrxvt ->
            Just (escape ++ "[" ++ String.fromInt (code + 32) ++ ";" ++ String.fromInt column ++ ";" ++ String.fromInt row ++ "M")

        MouseEncodingDefault ->
            if column > 223 || row > 223 then
                Nothing

            else
                Just
                    (escape
                        ++ "[M"
                        ++ String.fromList
                            [ Char.fromCode (code + 32)
                            , Char.fromCode (column + 32)
                            , Char.fromCode (row + 32)
                            ]
                    )


{-| What a wheel movement of `lines` lines (negative is up) sends. Programs
that track the mouse get wheel reports; other full screen programs (less,
man, vim) get arrow keys so the wheel scrolls them.
-}
encodeWheel : Terminal -> MouseEvent -> Int -> Maybe String
encodeWheel terminal event lines =
    let
        count =
            min 10 (abs lines)

        direction =
            if lines < 0 then
                -1

            else
                1
    in
    if count == 0 then
        Nothing

    else if terminal.modes.mouseTracking /= MouseOff && not (event.shiftKey || event.metaKey) then
        encodeMouse terminal { event | action = MouseWheel direction }
            |> Tuple.first
            |> Maybe.map (String.repeat count)

    else if terminal.activeBuffer == Alternate && terminal.modes.alternateScroll then
        let
            introducer =
                if terminal.modes.applicationCursorKeys then
                    escape ++ "O"

                else
                    escape ++ "["

            arrow =
                if lines < 0 then
                    introducer ++ "A"

                else
                    introducer ++ "B"
        in
        Just (String.repeat count arrow)

    else
        Nothing



-- CONTROL CHARACTERS


null : String
null =
    -- (Caret = ^@, C = \0)
    "\u{0000}"


startOfHeading : String
startOfHeading =
    -- (Caret = ^A)
    "\u{0001}"


enquiry : String
enquiry =
    -- Enquiry (Caret = ^E)
    "\u{0005}"


backspace : String
backspace =
    -- Backspace (Caret = ^H, C = \b)
    "\u{0008}"


characterTabulation : String
characterTabulation =
    -- Character Tabulation, Horizontal Tabulation (Caret = ^I, C = \t)
    "\t"


carriageReturn : String
carriageReturn =
    -- Carriage Return (Caret = ^M, C = \r)
    "\u{000D}"


negativeAcknowledge : String
negativeAcknowledge =
    -- Negative Acknowledge (Caret = ^U)
    "\u{0015}"


escape : String
escape =
    -- Escape (Caret = ^[, C = \e)
    "\u{001B}"


space : String
space =
    -- Space
    " "


delete : String
delete =
    -- Delete (Caret = ^?)
    "\u{007F}"
