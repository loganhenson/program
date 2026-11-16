module Keys exposing (suite)

import Editor.RawKeyboard exposing (RawKey)
import Expect
import Support exposing (..)
import Terminal.Input exposing (encodeFocus, encodeKey, encodeMouse, encodePaste, encodeWheel, keyboardState)
import Terminal.Types exposing (..)
import Test exposing (..)


esc : String
esc =
    "\u{001B}"


normal : Terminal.Input.KeyboardState
normal =
    { applicationCursorKeys = False, keyboardFlags = 0 }


kitty : Terminal.Input.KeyboardState
kitty =
    { applicationCursorKeys = False, keyboardFlags = 1 }


shift : RawKey -> RawKey
shift k =
    { k | shiftKey = True }


ctrl : RawKey -> RawKey
ctrl k =
    { k | ctrlKey = True }


alt : RawKey -> RawKey
alt k =
    { k | altKey = True }


cmd : RawKey -> RawKey
cmd k =
    { k | metaKey = True }


mouse : MouseAction -> Float -> Float -> MouseEvent
mouse action x y =
    { action = action, x = x, y = y, button = 0, buttons = 0, shiftKey = False, altKey = False, ctrlKey = False, metaKey = False }


suite : Test
suite =
    describe "Keyboard, mouse, paste and focus input"
        [ test "Enter is a carriage return, like every terminal" <|
            -- programs in raw mode (Claude Code) tell Enter (CR) from Ctrl+J (LF)
            \_ ->
                encodeKey normal (key "Enter" "Enter")
                    |> Expect.equal (Just "\u{000D}")
        , test "printable keys send themselves" <|
            \_ ->
                [ key "KeyA" "a", shift (key "KeyA" "A"), key "Digit1" "1", key "Slash" "/", key "Space" " ", key "KeyE" "é" ]
                    |> List.map (encodeKey normal)
                    |> Expect.equal [ Just "a", Just "A", Just "1", Just "/", Just " ", Just "é" ]
        , test "every Ctrl+letter sends its control character" <|
            \_ ->
                String.toList "abcdefghijklmnopqrstuvwxyz"
                    |> List.map (\letter -> encodeKey normal (ctrl (key ("Key" ++ String.fromChar (Char.toUpper letter)) (String.fromChar letter))))
                    |> Expect.equal (List.range 1 26 |> List.map (\code -> Just (String.fromChar (Char.fromCode code))))
        , test "the other control characters" <|
            \_ ->
                [ ctrl (key "Space" " "), ctrl (key "BracketLeft" "["), ctrl (key "Backslash" "\\"), ctrl (key "BracketRight" "]"), ctrl (shift (key "Minus" "_")), ctrl (key "Slash" "/") ]
                    |> List.map (encodeKey normal)
                    |> Expect.equal [ Just "\u{0000}", Just esc, Just "\u{001C}", Just "\u{001D}", Just "\u{001F}", Just "\u{001F}" ]
        , test "Backspace, Tab and Escape" <|
            \_ ->
                [ key "Backspace" "Backspace", alt (key "Backspace" "Backspace"), ctrl (key "Backspace" "Backspace"), key "Tab" "Tab", shift (key "Tab" "Tab"), key "Escape" "Escape" ]
                    |> List.map (encodeKey normal)
                    |> Expect.equal [ Just "\u{007F}", Just (esc ++ "\u{007F}"), Just "\u{0008}", Just "\t", Just (esc ++ "[Z"), Just esc ]
        , test "arrow keys, and application cursor keys mode" <|
            \_ ->
                [ encodeKey normal (key "ArrowUp" "ArrowUp")
                , encodeKey normal (key "ArrowLeft" "ArrowLeft")
                , encodeKey { normal | applicationCursorKeys = True } (key "ArrowUp" "ArrowUp")
                , encodeKey normal (key "Home" "Home")
                , encodeKey { normal | applicationCursorKeys = True } (key "End" "End")
                ]
                    |> Expect.equal [ Just (esc ++ "[A"), Just (esc ++ "[D"), Just (esc ++ "OA"), Just (esc ++ "[H"), Just (esc ++ "OF") ]
        , test "modified arrow keys carry the modifier" <|
            \_ ->
                [ shift (key "ArrowUp" "ArrowUp"), ctrl (key "ArrowRight" "ArrowRight"), ctrl (shift (key "ArrowLeft" "ArrowLeft")), alt (key "ArrowUp" "ArrowUp") ]
                    |> List.map (encodeKey normal)
                    |> Expect.equal [ Just (esc ++ "[1;2A"), Just (esc ++ "[1;5C"), Just (esc ++ "[1;6D"), Just (esc ++ "[1;3A") ]
        , test "macOS word and line editing keys" <|
            \_ ->
                [ alt (key "ArrowLeft" "ArrowLeft"), alt (key "ArrowRight" "ArrowRight"), cmd (key "ArrowLeft" "ArrowLeft"), cmd (key "ArrowRight" "ArrowRight"), cmd (key "Backspace" "Backspace"), alt (key "Delete" "Delete") ]
                    |> List.map (encodeKey normal)
                    |> Expect.equal [ Just (esc ++ "b"), Just (esc ++ "f"), Just "\u{0001}", Just "\u{0005}", Just "\u{0015}", Just (esc ++ "d") ]
        , test "navigation and function keys" <|
            \_ ->
                [ key "Delete" "Delete", key "PageUp" "PageUp", key "PageDown" "PageDown", key "Insert" "Insert", key "F1" "F1", key "F4" "F4", key "F5" "F5", key "F12" "F12", shift (key "F5" "F5"), ctrl (key "Delete" "Delete") ]
                    |> List.map (encodeKey normal)
                    |> Expect.equal
                        [ Just (esc ++ "[3~"), Just (esc ++ "[5~"), Just (esc ++ "[6~"), Just (esc ++ "[2~"), Just (esc ++ "OP"), Just (esc ++ "OS"), Just (esc ++ "[15~"), Just (esc ++ "[24~"), Just (esc ++ "[15;2~"), Just (esc ++ "[3;5~") ]
        , test "Option is Meta: the key comes from the physical key, not the character macOS composes" <|
            \_ ->
                [ alt (key "KeyB" "∫"), alt (key "KeyF" "ƒ"), alt (key "KeyE" "Dead"), alt (shift (key "KeyB" "ı")), alt (key "Enter" "Enter"), alt (key "KeyB" "b") ]
                    |> List.map (encodeKey normal)
                    |> Expect.equal [ Just (esc ++ "b"), Just (esc ++ "f"), Just (esc ++ "e"), Just (esc ++ "B"), Just (esc ++ "\u{000D}"), Just (esc ++ "b") ]
        , test "a symbol typed with Option or AltGr on other layouts is sent as that symbol" <|
            -- Option+L is @ on a German keyboard, AltGr+Q is @ on Windows
            \_ ->
                [ alt (key "KeyL" "@"), alt (key "Digit5" "["), alt (ctrl (key "KeyQ" "@")) ]
                    |> List.map (encodeKey normal)
                    |> Expect.equal [ Just "@", Just "[", Just "@" ]
        , test "keys that produce nothing on their own send nothing" <|
            \_ ->
                [ key "ShiftLeft" "Shift", key "MetaLeft" "Meta", key "CapsLock" "CapsLock", cmd (key "KeyT" "t") ]
                    |> List.map (encodeKey normal)
                    |> Expect.equal [ Nothing, Nothing, Nothing, Nothing ]
        , test "with the kitty keyboard protocol, modified Enter, Tab and Escape are unambiguous" <|
            -- this is what lets Shift+Enter insert a newline in Claude Code
            \_ ->
                [ key "Enter" "Enter", shift (key "Enter" "Enter"), ctrl (key "Enter" "Enter"), shift (key "Tab" "Tab"), key "Escape" "Escape", ctrl (key "KeyC" "c"), alt (key "KeyB" "∫"), key "KeyA" "a", shift (key "KeyA" "A"), shift (key "ArrowUp" "ArrowUp") ]
                    |> List.map (encodeKey kitty)
                    |> Expect.equal
                        [ Just "\u{000D}", Just (esc ++ "[13;2u"), Just (esc ++ "[13;5u"), Just (esc ++ "[9;2u"), Just (esc ++ "[27u"), Just (esc ++ "[99;5u"), Just (esc ++ "[98;3u"), Just "a", Just "A", Just (esc ++ "[1;2A") ]
        , test "the keyboard state follows what the program asked for" <|
            \_ ->
                keyboardState (run 2 10 [ seq "[?1h", one "[>u" 1 ])
                    |> Expect.equal { applicationCursorKeys = True, keyboardFlags = 1 }
        , test "paste sends line breaks as carriage returns" <|
            \_ ->
                encodePaste False "one\ntwo\u{000D}\nthree"
                    |> Expect.equal "one\u{000D}two\u{000D}three"
        , test "bracketed paste wraps the text and cannot be ended early by the text itself" <|
            \_ ->
                encodePaste True ("a" ++ esc ++ "[201~b")
                    |> Expect.equal (esc ++ "[200~ab" ++ esc ++ "[201~")
        , test "focus reports" <|
            \_ ->
                Expect.equal [ encodeFocus True, encodeFocus False ] [ esc ++ "[I", esc ++ "[O" ]
        , test "the mouse is only reported when the program asked for it" <|
            \_ ->
                encodeMouse (run 24 80 []) (mouse MousePress 10 10)
                    |> Tuple.first
                    |> Expect.equal Nothing
        , test "mouse press and release in SGR encoding, in cells" <|
            \_ ->
                let
                    terminal =
                        run 24 80 [ seq "[?1000h", seq "[?1006h" ]

                    -- 8.4 pixels per column, 24 per row: column 3, row 2
                    press =
                        mouse MousePress 20 30
                in
                [ encodeMouse terminal press
                , encodeMouse terminal { press | action = MouseRelease }
                , encodeMouse terminal { press | button = 2, ctrlKey = True }
                , encodeMouse terminal { press | shiftKey = True }
                , encodeMouse terminal { press | action = MouseMove, buttons = 1 }

                -- Command+click opens links, it is not for the program
                , encodeMouse terminal { press | metaKey = True }
                ]
                    |> List.map Tuple.first
                    |> Expect.equal [ Just (esc ++ "[<0;3;2M"), Just (esc ++ "[<0;3;2m"), Just (esc ++ "[<18;3;2M"), Nothing, Nothing, Nothing ]
        , test "drag and motion reporting, once per cell" <|
            \_ ->
                let
                    drag =
                        run 24 80 [ seq "[?1002h", seq "[?1006h" ]

                    move =
                        mouse MouseMove 20 30
                in
                [ encodeMouse drag { move | buttons = 1 }
                , encodeMouse drag move
                , encodeMouse (run 24 80 [ seq "[?1003h", seq "[?1006h" ]) move
                , encodeMouse { drag | mouse = { cell = ( 3, 2 ), wheel = 0 } } { move | buttons = 1 }
                ]
                    |> List.map Tuple.first
                    |> Expect.equal [ Just (esc ++ "[<32;3;2M"), Nothing, Just (esc ++ "[<35;3;2M"), Nothing ]
        , test "legacy mouse encoding" <|
            \_ ->
                encodeMouse (run 24 80 [ seq "[?1000h" ]) (mouse MousePress 20 30)
                    |> Tuple.first
                    |> Expect.equal (Just (esc ++ "[M #\""))
        , test "the wheel is reported to programs that track the mouse" <|
            \_ ->
                encodeWheel (run 24 80 [ seq "[?1000h", seq "[?1006h" ]) (mouse (MouseWheel 0) 20 30) -2
                    |> Expect.equal (Just (esc ++ "[<64;3;2M" ++ esc ++ "[<64;3;2M"))
        , test "on the alternate screen the wheel scrolls full screen programs with arrow keys" <|
            \_ ->
                [ encodeWheel (run 24 80 [ seq "[?1049h" ]) (mouse (MouseWheel 0) 20 30) 2
                , encodeWheel (run 24 80 [ seq "[?1049h", seq "[?1h" ]) (mouse (MouseWheel 0) 20 30) -1
                , encodeWheel (run 24 80 []) (mouse (MouseWheel 0) 20 30) 2
                , encodeWheel (run 24 80 [ seq "[?1049h", seq "[?1007l" ]) (mouse (MouseWheel 0) 20 30) 2
                ]
                    |> Expect.equal [ Just (esc ++ "[B" ++ esc ++ "[B"), Just (esc ++ "OA"), Nothing, Nothing ]
        ]
