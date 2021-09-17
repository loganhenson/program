module Terminal.Input exposing (escape, evaluateKeyboardEvent)

import Editor.RawKeyboard exposing (RawKey)


evaluateKeyboardEvent : RawKey -> Maybe String
evaluateKeyboardEvent ev =
    case ev.code of
        "Backspace" ->
            if ev.shiftKey then
                Just backspace
                -- ^H

            else if ev.altKey then
                Just (escape ++ delete)
                -- \e ^?

            else
                Just delete

        -- ^?
        "Tab" ->
            if ev.shiftKey then
                Just (escape ++ "[Z")

            else
                Just characterTabulation

        "Enter" ->
            if ev.altKey then
                Just (escape ++ lineFeed)

            else
                Just lineFeed

        "Escape" ->
            if ev.altKey then
                Just (escape ++ escape)

            else
                Just escape

        "Space" ->
            Just space

        "ArrowLeft" ->
            if not (ev.shiftKey || ev.altKey || ev.ctrlKey || ev.metaKey) then
                Just (escape ++ "[D")

            else
                Nothing

        "ArrowRight" ->
            if not (ev.shiftKey || ev.altKey || ev.ctrlKey || ev.metaKey) then
                Just (escape ++ "[C")

            else
                Nothing

        "ArrowUp" ->
            if not (ev.shiftKey || ev.altKey || ev.ctrlKey || ev.metaKey) then
                Just (escape ++ "[A")

            else
                Nothing

        "ArrowDown" ->
            if not (ev.shiftKey || ev.altKey || ev.ctrlKey || ev.metaKey) then
                Just (escape ++ "[B")

            else
                Nothing

        _ ->
            if ev.ctrlKey && not (ev.shiftKey || ev.altKey || ev.metaKey) then
                case ev.code of
                    "KeyC" ->
                        Just endOfText

                    "KeyR" ->
                        Just deviceControlTwo

                    "KeyA" ->
                        Just startOfHeading

                    "KeyE" ->
                        Just enquiry

                    "Digit8" ->
                        Just delete

                    "BracketLeft" ->
                        Just escape

                    "Backslash" ->
                        Just fileSeparator

                    "BracketRight" ->
                        Just groupSeparator

                    _ ->
                        Nothing

            else if ev.key == "_" && ev.ctrlKey then
                Just unitSeparator

            else if String.length ev.key == 1 then
                Just ev.key

            else
                Nothing


null =
    -- (Caret = ^@, C = \0)
    "\u{0000}"


startOfHeading =
    -- (Caret = ^A)
    "\u{0001}"


startOfText =
    -- (Caret = ^B)
    "\u{0002}"


endOfText =
    -- (Caret = ^C)
    "\u{0003}"


endOfTransmission =
    -- (Caret = ^D)
    "\u{0004}"


enquiry =
    -- Enquiry (Caret = ^E)
    "\u{0005}"


acknowledge =
    -- Acknowledge (Caret = ^F)
    "\u{0006}"


bell =
    -- Bell (Caret = ^G, C = \a)
    "\u{0007}"


backspace =
    -- Backspace (Caret = ^H, C = \b)
    "\u{0008}"


characterTabulation =
    -- Character Tabulation, Horizontal Tabulation (Caret = ^I, C = \t)
    "\t"


lineFeed =
    -- Line Feed (Caret = ^J, C = \n)
    "\n"


lineTabulation =
    -- Line Tabulation, Vertical Tabulation (Caret = ^K, C = \v)
    "\u{000B}"


formFeed =
    -- Form Feed (Caret = ^L, C = \f)
    "\u{000C}"


carriageReturn =
    -- Carriage Return (Caret = ^M, C = \r)
    "\u{000D}"


shiftOut =
    -- Shift Out (Caret = ^N)
    "\u{000E}"


shiftIn =
    -- Shift In (Caret = ^O)
    "\u{000F}"


dataLinkEscape =
    -- Data Link Escape (Caret = ^P)
    "\u{0010}"


deviceControlOne =
    -- Device Control One (XON) (Caret = ^Q)
    "\u{0011}"


deviceControlTwo =
    -- Device Control Two (Caret = ^R)
    "\u{0012}"


deviceControlThree =
    -- Device Control Three (XOFF) (Caret = ^S)
    "\u{0013}"


deviceControlFour =
    -- Device Control Four (Caret = ^T)
    "\u{0014}"


negativeAcknowledge =
    -- Negative Acknowledge (Caret = ^U)
    "\u{0015}"


synchronousIdle =
    -- Synchronous Idle (Caret = ^V)
    "\u{0016}"


endOfTransmissionBlock =
    -- End of Transmission Block (Caret = ^W)
    "\u{0017}"


cancel =
    -- Cancel (Caret = ^X)
    "\u{0018}"


endOfMedium =
    -- End of Medium (Caret = ^Y)
    "\u{0019}"


substitute =
    -- Substitute (Caret = ^Z)
    "\u{001A}"


escape =
    -- Escape (Caret = ^[, C = \e)
    "\u{001B}"


fileSeparator =
    -- File Separator (Caret = ^\)
    "\u{001C}"


groupSeparator =
    -- Group Separator (Caret = ^])
    "\u{001D}"


recordSeparator =
    -- Record Separator (Caret = ^^)
    "\u{001E}"


unitSeparator =
    -- Unit Separator (Caret = ^_)
    "\u{001F}"


space =
    -- Space
    " "


delete =
    -- Delete (Caret = ^?)
    "\u{007F}"
