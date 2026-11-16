module Terminal.Width exposing (charWidth, isEmojiPresentationSelector, widensWithEmojiPresentation)

{-| How many columns a character occupies: 0 for combining characters,
2 for East Asian wide characters and emoji, 1 for everything else.
-}


charWidth : Char -> Int
charWidth char =
    let
        code =
            Char.toCode char
    in
    if code < 0x0300 then
        -- Fast path: ASCII and Latin
        1

    else if isCombining code then
        0

    else if isWide code then
        2

    else
        1


{-| U+FE0F asks for the emoji form of the preceding character.
-}
isEmojiPresentationSelector : Char -> Bool
isEmojiPresentationSelector char =
    Char.toCode char == 0xFE0F


{-| Symbols that are one column wide as text but two as an emoji, like ⚠ + U+FE0F.
-}
widensWithEmojiPresentation : String -> Bool
widensWithEmojiPresentation text =
    case String.uncons text of
        Just ( char, _ ) ->
            let
                code =
                    Char.toCode char
            in
            (code == 0xA9)
                || (code == 0xAE)
                || (code == 0x203C)
                || (code == 0x2049)
                || (code == 0x2122)
                || (code == 0x2139)
                || inRange 0x2194 0x21AA code
                || inRange 0x2300 0x23FF code
                || inRange 0x24C2 0x24C2 code
                || inRange 0x25AA 0x27BF code
                || inRange 0x2934 0x2935 code
                || inRange 0x2B05 0x2B55 code
                || (code == 0x3030)
                || (code == 0x303D)
                || (code == 0x3297)
                || (code == 0x3299)
                || inRange 0x0001F000 0x0001FAFF code

        Nothing ->
            False


inRange : Int -> Int -> Int -> Bool
inRange low high code =
    code >= low && code <= high


isCombining : Int -> Bool
isCombining code =
    if code < 0x1100 then
        inRange 0x0300 0x036F code
            || inRange 0x0483 0x0489 code
            || inRange 0x0591 0x05BD code
            || (code == 0x05BF)
            || inRange 0x05C1 0x05C2 code
            || inRange 0x05C4 0x05C5 code
            || (code == 0x05C7)
            || inRange 0x0610 0x061A code
            || inRange 0x064B 0x065F code
            || (code == 0x0670)
            || inRange 0x06D6 0x06DC code
            || inRange 0x06DF 0x06E4 code
            || inRange 0x06E7 0x06E8 code
            || inRange 0x06EA 0x06ED code
            || (code == 0x0711)
            || inRange 0x0730 0x074A code
            || inRange 0x07A6 0x07B0 code
            || inRange 0x0900 0x0902 code
            || (code == 0x093A)
            || (code == 0x093C)
            || inRange 0x0941 0x0948 code
            || (code == 0x094D)
            || inRange 0x0951 0x0957 code
            || inRange 0x0962 0x0963 code
            || (code == 0x0E31)
            || inRange 0x0E34 0x0E3A code
            || inRange 0x0E47 0x0E4E code
            || (code == 0x0EB1)
            || inRange 0x0EB4 0x0EBC code
            || inRange 0x0EC8 0x0ECD code

    else
        inRange 0x1AB0 0x1AFF code
            || inRange 0x1DC0 0x1DFF code
            || inRange 0x200B 0x200F code
            || inRange 0x202A 0x202E code
            || inRange 0x2060 0x2064 code
            || inRange 0x20D0 0x20F0 code
            || inRange 0x302A 0x302D code
            || inRange 0x3099 0x309A code
            || inRange 0xFE00 0xFE0F code
            || inRange 0xFE20 0xFE2F code
            || (code == 0xFEFF)
            || inRange 0x0001F3FB 0x0001F3FF code
            || inRange 0x000E0020 0x000E007F code
            || inRange 0x000E0100 0x000E01EF code


isWide : Int -> Bool
isWide code =
    if code < 0x1100 then
        False

    else if code < 0x00010000 then
        inRange 0x1100 0x115F code
            || inRange 0x231A 0x231B code
            || inRange 0x2329 0x232A code
            || inRange 0x23E9 0x23EC code
            || (code == 0x23F0)
            || (code == 0x23F3)
            || inRange 0x25FD 0x25FE code
            || inRange 0x2614 0x2615 code
            || inRange 0x2648 0x2653 code
            || (code == 0x267F)
            || (code == 0x2693)
            || (code == 0x26A1)
            || inRange 0x26AA 0x26AB code
            || inRange 0x26BD 0x26BE code
            || inRange 0x26C4 0x26C5 code
            || (code == 0x26CE)
            || (code == 0x26D4)
            || (code == 0x26EA)
            || inRange 0x26F2 0x26F3 code
            || (code == 0x26F5)
            || (code == 0x26FA)
            || (code == 0x26FD)
            || (code == 0x2705)
            || inRange 0x270A 0x270B code
            || (code == 0x2728)
            || (code == 0x274C)
            || (code == 0x274E)
            || inRange 0x2753 0x2755 code
            || (code == 0x2757)
            || inRange 0x2795 0x2797 code
            || (code == 0x27B0)
            || (code == 0x27BF)
            || inRange 0x2B1B 0x2B1C code
            || (code == 0x2B50)
            || (code == 0x2B55)
            || inRange 0x2E80 0x303E code
            || inRange 0x3041 0x33FF code
            || inRange 0x3400 0x4DBF code
            || inRange 0x4E00 0x9FFF code
            || inRange 0xA000 0xA4CF code
            || inRange 0xA960 0xA97F code
            || inRange 0xAC00 0xD7A3 code
            || inRange 0xF900 0xFAFF code
            || inRange 0xFE10 0xFE19 code
            || inRange 0xFE30 0xFE6F code
            || inRange 0xFF00 0xFF60 code
            || inRange 0xFFE0 0xFFE6 code

    else
        inRange 0x00016FE0 0x00018AFF code
            || inRange 0x0001B000 0x0001B2FF code
            || (code == 0x0001F004)
            || (code == 0x0001F0CF)
            || (code == 0x0001F18E)
            || inRange 0x0001F191 0x0001F19A code
            || inRange 0x0001F200 0x0001F2FF code
            || inRange 0x0001F300 0x0001F64F code
            || inRange 0x0001F680 0x0001F6FF code
            || inRange 0x0001F7E0 0x0001F7EB code
            || inRange 0x0001F90C 0x0001F9FF code
            || inRange 0x0001FA70 0x0001FAFF code
            || inRange 0x00020000 0x0003FFFD code
