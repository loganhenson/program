module Terminal exposing
    ( getBuffer
    , init
    , initialPorts
    , scrollToBottom
    , update
    , view
    )

import Array
import Browser.Dom exposing (getViewportOf, setViewportOf)
import Editor
import Editor.Lib
import Editor.Msg
import Editor.Styles
import Html exposing (Html, div, span, text)
import Html.Attributes exposing (attribute, class, id, style)
import Html.Events
import Html.Keyed
import Html.Lazy
import Json.Decode as Decode exposing (Decoder, decodeValue)
import Task
import Terminal.BoxDrawing
import Terminal.Color
import Terminal.Decoders exposing (decodeTerminalCommands, decodeTerminalResized)
import Terminal.Input
import Terminal.Screen as Screen
import Terminal.Types exposing (..)


{-| Ports that do nothing. Start from these and override the ones the host
application implements, so new ports do not break existing applications.
-}
initialPorts : Ports
initialPorts =
    { requestRunTerminal = \_ -> Cmd.none
    , requestPasteTerminal = \_ -> Cmd.none
    , requestCopyTerminal = \_ -> Cmd.none
    , requestQuit = \_ -> Cmd.none
    , requestSetTitle = \_ -> Cmd.none
    , requestBell = \_ -> Cmd.none
    , requestNotify = \_ -> Cmd.none
    , requestWriteClipboard = \_ -> Cmd.none
    , requestExited = \_ -> Cmd.none
    }


{-| The editor ports are not used anymore (the terminal renders its own
screen); the argument is kept so existing applications keep compiling.
-}
init : String -> Editor.Msg.Ports -> Ports -> Model
init _ _ terminalPorts =
    { terminal = Screen.init { height = 4, width = 80 }
    , ports = terminalPorts
    }


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    let
        terminal =
            model.terminal

        send input =
            case input of
                Just bytes ->
                    model.ports.requestRunTerminal bytes

                Nothing ->
                    Cmd.none
    in
    case msg of
        NoOp ->
            ( model, Cmd.none )

        ReceivedCharacterWidth characterWidth ->
            ( { model | terminal = { terminal | characterWidth = characterWidth } }, Cmd.none )

        ReceivedTerminalResized json ->
            case decodeValue decodeTerminalResized json of
                Ok size ->
                    ( { model | terminal = Screen.resize size terminal }
                    , scrollToBottom "terminal-container"
                    )

                Err _ ->
                    ( model, Cmd.none )

        ReceivedTerminalOutput json ->
            case decodeValue decodeTerminalCommands json of
                Ok commands ->
                    let
                        ( nextTerminal, effects ) =
                            Screen.applyAll commands terminal
                    in
                    ( { model | terminal = nextTerminal }
                    , Cmd.batch [ perform model.ports effects, scrollToBottom "terminal-container" ]
                    )

                Err _ ->
                    ( model, Cmd.none )

        ReceivedPaste pasted ->
            ( model
            , Cmd.batch
                [ model.ports.requestRunTerminal (Terminal.Input.encodePaste terminal.modes.bracketedPaste pasted)
                , scrollToBottom "terminal-container"
                ]
            )

        ReceivedFocus focused ->
            ( { model | terminal = { terminal | focused = focused } }
            , if terminal.modes.focusEvents && focused /= terminal.focused then
                model.ports.requestRunTerminal (Terminal.Input.encodeFocus focused)

              else
                Cmd.none
            )

        ReceivedMouse event ->
            case event.action of
                MouseWheel delta ->
                    let
                        mouse =
                            terminal.mouse

                        distance =
                            mouse.wheel + delta

                        lines =
                            truncate (distance / 24)
                    in
                    ( { model | terminal = { terminal | mouse = { mouse | wheel = distance - toFloat (lines * 24) } } }
                    , send (Terminal.Input.encodeWheel terminal event lines)
                    )

                _ ->
                    let
                        ( report, cell ) =
                            Terminal.Input.encodeMouse terminal event

                        mouse =
                            terminal.mouse
                    in
                    ( { model | terminal = { terminal | mouse = { mouse | cell = cell } } }
                    , send report
                    )


{-| Carry out what the output asked for. All replies go out in one write, in
the order the queries came in.
-}
perform : Ports -> List Effect -> Cmd Msg
perform ports effects =
    let
        replies =
            List.filterMap
                (\effect ->
                    case effect of
                        Reply reply ->
                            Just reply

                        _ ->
                            Nothing
                )
                effects

        other effect =
            case effect of
                Reply _ ->
                    Cmd.none

                SetTitle title ->
                    ports.requestSetTitle title

                Bell ->
                    ports.requestBell ()

                Notify message ->
                    ports.requestNotify message

                WriteClipboard contents ->
                    ports.requestWriteClipboard contents

                ChildExited ->
                    ports.requestExited ()
    in
    Cmd.batch
        ((if List.isEmpty replies then
            Cmd.none

          else
            ports.requestRunTerminal (String.concat replies)
         )
            :: List.map other effects
        )


scrollToBottom : String -> Cmd Msg
scrollToBottom elementId =
    -- Two rAF-equivalent ticks: first task lets layout settle (getViewportOf forces
    -- a measurement), second sets the scroll position to the (now correct) scene
    -- height. The previous one-shot chain raced against layout in wry 0.54.
    getViewportOf elementId
        |> Task.andThen
            (\_ ->
                getViewportOf elementId
                    |> Task.andThen (\info -> setViewportOf elementId 0 info.scene.height)
            )
        |> Task.attempt (\_ -> NoOp)



-- COMPATIBILITY


{-| The active screen as an editor model: one line of text per row and the
cursor position, plus the scroll region (1 based, only when one is set).
-}
getBuffer : Terminal -> ( Editor.Msg.Model, Maybe ( Int, Int ) )
getBuffer terminal =
    let
        screen =
            Screen.activeScreen terminal

        editor =
            Editor.Lib.init False
                "0"
                ""
                { vimMode = True
                , showLineNumbers = False
                , padBottom = False
                , padRight = False
                , showCursor = terminal.modes.cursorVisible
                , characterWidth = terminal.characterWidth
                }
                Editor.initialPorts

        travelable =
            editor.travelable

        scrollRegion =
            if screen.scrollTop == 0 && screen.scrollBottom == terminal.size.height - 1 then
                Nothing

            else
                Just ( screen.scrollTop + 1, screen.scrollBottom + 1 )
    in
    ( { editor
        | travelable =
            { travelable
                | renderableLines = List.indexedMap Editor.Lib.createRenderableLine (Screen.screenText terminal)
                , cursorPosition = screen.cursor
            }
      }
    , scrollRegion
    )



-- VIEW


lineHeight : Int
lineHeight =
    24


view : Model -> Html Msg
view model =
    let
        terminal =
            model.terminal
    in
    div [ class "w-full h-full overflow-hidden", style "width" "100%", style "height" "100%", style "overflow" "hidden" ]
        [ Html.node "style" [] [ text stylesheet ]
        , div
            [ id "terminal-container"
            , class "w-full h-full overflow-y-scroll p-1 terminal"
            ]
            [ span [ id "character-width", class "terminal-measure" ] [ text "0" ]
            , case terminal.activeBuffer of
                Primary ->
                    Html.Lazy.lazy2 viewScrollback terminal.size.width terminal.scrollback

                Alternate ->
                    text ""
            , viewScreen terminal
            ]
        ]


{-| Built once: the view hands the very same string to the virtual DOM on
every frame, so there is nothing to compare.
-}
stylesheet : String
stylesheet =
    Editor.Styles.editorPseudoStyles ++ styles ++ Terminal.BoxDrawing.styles


styles : String
styles =
    """
    .terminal {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        padding: 4px;
        overflow-x: hidden;
        overflow-y: scroll;
        position: relative;
        font-family: "JetBrainsMono Nerd Font Mono", Monaco, monospace;
        font-size: var(--font-size);
        line-height: var(--line-height);
        font-variant-ligatures: none;
        color: var(--text-color);
        background: var(--background-color);
        cursor: text;
        user-select: text;
        -webkit-user-select: text;
    }

    .terminal-measure {
        position: absolute;
        left: -500px;
        visibility: hidden;
    }

    .terminal-screen {
        position: relative;
    }

    .terminal-row {
        height: var(--line-height);
        white-space: pre;
        overflow: hidden;
    }

    .terminal-scrollback .terminal-row {
        height: auto;
        min-height: var(--line-height);
        white-space: break-spaces;
        word-break: break-all;
        line-break: anywhere;
    }

    /* The box characters that are still taken from the font (double lines,
       diagonals) are stretched to the full height of the row so that they
       connect from one row to the next. --terminal-box-stretch is the row
       height divided by the height the font draws them at; the application
       can measure and set it. */
    .terminal-row .box {
        display: inline-block;
        transform: scaleY(var(--terminal-box-stretch, 1.3));
    }

    /* A character that is not plain ASCII gets a cell of its own, so a glyph
       from a fallback font cannot push the rest of the line off the grid. */
    .terminal-row .w1, .terminal-row .w2 {
        display: inline-block;
        height: var(--line-height);
        vertical-align: top;
        overflow: visible;
    }

    .terminal-row .w1 { width: 1ch; }
    .terminal-row .w2 { width: 2ch; }

    .terminal-cursor {
        position: absolute;
        height: var(--line-height);
        box-sizing: border-box;
        pointer-events: none;
    }

    .terminal-cursor.block { background: var(--cursor-color); }
    .terminal-cursor.block.unfocused { background: transparent; border: 1px solid var(--cursor-color); }
    .terminal-cursor.underline { border-bottom: 2px solid var(--text-color); }
    .terminal-cursor.bar { border-left: 2px solid var(--text-color); }

    /* Links open with Command+click (see terminal/js/dom.js) */
    body.terminal-links-active .terminal [data-href] { cursor: pointer; }
    """


{-| Scrollback lines are whole lines; the browser wraps them at the width of
the screen, so they follow the window when it is resized. (The extra pixel
keeps a line of exactly that many columns from wrapping early.)
-}
viewScrollback : Int -> Scrollback -> Html Msg
viewScrollback width scrollback =
    Html.Keyed.node "div"
        [ class "terminal-scrollback"
        , style "width" ("calc(" ++ String.fromInt width ++ "ch + 1px)")
        ]
        ((scrollback.current :: scrollback.blocks)
            |> List.reverse
            |> List.map (\block -> ( String.fromInt block.id, Html.Lazy.lazy viewScrollbackBlock block ))
        )


viewScrollbackBlock : ScrollbackBlock -> Html Msg
viewScrollbackBlock block =
    div []
        (List.foldl
            (\line rows -> viewRow False line.wrapped (List.concatMap breakable line.spans) :: rows)
            []
            block.lines
        )


{-| A run of stretched characters is one box that cannot be broken. In the
scrollback, where the browser wraps lines, each gets a box of its own.
-}
breakable : Span -> List Span
breakable spanData =
    if spanData.stretch && not spanData.fixed && spanData.columns > 1 then
        String.toList spanData.text
            |> List.map (\char -> { spanData | text = String.fromChar char, columns = 1 })

    else
        [ spanData ]


viewScreen : Terminal -> Html Msg
viewScreen terminal =
    let
        screen =
            Screen.activeScreen terminal

        reverseVideo =
            terminal.modes.reverseVideo
    in
    div
        ([ id "terminal"
         , class "terminal-screen"
         , style "height" (String.fromInt (terminal.size.height * lineHeight) ++ "px")
         ]
            ++ mouseEvents terminal
        )
        (Array.foldr
            (\line rows -> Html.Lazy.lazy2 viewLine reverseVideo line :: rows)
            [ viewCursor terminal ]
            screen.lines
        )


viewLine : Bool -> Line -> Html Msg
viewLine reverseVideo line =
    viewRow reverseVideo line.wrapped (Screen.lineSpans line)


{-| `data-wrapped` marks a row that continues on the next row, so copying
text can join it back into one line.
-}
viewRow : Bool -> Bool -> List Span -> Html Msg
viewRow reverseVideo wrapped spans =
    div
        (if wrapped then
            [ class "terminal-row", attribute "data-wrapped" "true" ]

         else
            [ class "terminal-row" ]
        )
        (List.map (viewSpan reverseVideo) spans)


viewSpan : Bool -> Span -> Html Msg
viewSpan reverseVideo spanData =
    let
        cellClass =
            if not spanData.fixed then
                if spanData.stretch then
                    [ class "box" ]

                else
                    []

            else if spanData.columns == 2 then
                [ class "w2" ]

            else if spanData.stretch then
                [ class "w1 box" ]

            else
                case String.uncons spanData.text of
                    Just ( char, "" ) ->
                        if Terminal.BoxDrawing.isDrawn (Char.toCode char) then
                            -- lines and blocks the terminal draws itself
                            [ class ("w1 " ++ Terminal.BoxDrawing.className (Char.toCode char)) ]

                        else
                            [ class "w1" ]

                    _ ->
                        [ class "w1" ]
    in
    span (cellClass ++ styleAttributes reverseVideo spanData.style) [ text spanData.text ]


styleAttributes : Bool -> Style -> List (Html.Attribute Msg)
styleAttributes reverseVideo cellStyle =
    if cellStyle == Screen.defaultStyle && not reverseVideo then
        []

    else
        let
            has attribute =
                Screen.hasAttribute attribute cellStyle

            inverse =
                has Screen.attributeInverse /= reverseVideo

            foreground =
                Terminal.Color.toCss cellStyle.foreground

            background =
                Terminal.Color.toCss cellStyle.background

            ( color, backgroundColor ) =
                if inverse then
                    ( Just (Maybe.withDefault "var(--background-color)" background)
                    , Just (Maybe.withDefault "var(--text-color)" foreground)
                    )

                else
                    ( foreground, background )

            decorations =
                List.filterMap identity
                    [ if has Screen.attributeUnderline || has Screen.attributeDoubleUnderline || cellStyle.link /= "" then
                        Just "underline"

                      else
                        Nothing
                    , if has Screen.attributeStrike then
                        Just "line-through"

                      else
                        Nothing
                    , if has Screen.attributeOverline then
                        Just "overline"

                      else
                        Nothing
                    ]

            optional condition attributes =
                if condition then
                    attributes

                else
                    []
        in
        List.concat
            [ if has Screen.attributeInvisible then
                [ style "color" "transparent" ]

              else
                case color of
                    Just value ->
                        [ style "color" value ]

                    Nothing ->
                        []
            , case backgroundColor of
                Just value ->
                    [ style "background" value ]

                Nothing ->
                    []
            , optional (has Screen.attributeBold) [ style "font-weight" "bold" ]
            , optional (has Screen.attributeDim) [ style "opacity" "0.6" ]
            , optional (has Screen.attributeItalic) [ style "font-style" "italic" ]
            , optional (not (List.isEmpty decorations)) [ style "text-decoration" (String.join " " decorations) ]
            , optional (has Screen.attributeDoubleUnderline) [ style "text-decoration-style" "double" ]
            , optional (cellStyle.link /= "")
                [ style "text-decoration-style" "dotted"
                , attribute "data-href" cellStyle.link
                , Html.Attributes.title cellStyle.link
                ]
            ]


viewCursor : Terminal -> Html Msg
viewCursor terminal =
    let
        screen =
            Screen.activeScreen terminal

        x =
            clamp 0 (terminal.size.width - 1) screen.cursor.x

        wide =
            Array.get screen.cursor.y screen.lines
                |> Maybe.andThen (\line -> Array.get x line.cells)
                |> Maybe.map (\cell -> cell.width == 2)
                |> Maybe.withDefault False

        shape =
            case terminal.cursorShape of
                CursorBlock ->
                    "block"

                CursorUnderline ->
                    "underline"

                CursorBar ->
                    "bar"
    in
    if terminal.modes.cursorVisible then
        span
            [ class
                ("terminal-cursor cursor "
                    ++ shape
                    ++ (if terminal.focused then
                            ""

                        else
                            " unfocused"
                       )
                )
            , style "left" (String.fromInt x ++ "ch")
            , style "top" (String.fromInt (screen.cursor.y * lineHeight) ++ "px")
            , style "width"
                (if wide then
                    "2ch"

                 else
                    "1ch"
                )
            ]
            []

    else
        text ""



-- MOUSE


{-| Mouse events are only listened to when the program asked for them, so
selecting text with the mouse keeps working everywhere else. The wheel is
taken over on the alternate screen, where there is no scrollback to scroll.
-}
mouseEvents : Terminal -> List (Html.Attribute Msg)
mouseEvents terminal =
    let
        tracking =
            terminal.modes.mouseTracking /= MouseOff

        on name action =
            Html.Events.custom name
                (mouseDecoder action
                    |> Decode.map
                        (\event ->
                            { message = ReceivedMouse event
                            , stopPropagation = False
                            , preventDefault = not (event.shiftKey || event.metaKey)
                            }
                        )
                )

        wheel =
            Html.Events.custom "wheel"
                (Decode.field "deltaY" Decode.float
                    |> Decode.andThen (\delta -> mouseDecoder (MouseWheel delta))
                    |> Decode.map
                        (\event ->
                            { message = ReceivedMouse event
                            , stopPropagation = False
                            , preventDefault = True
                            }
                        )
                )
    in
    List.concat
        [ if tracking then
            [ on "mousedown" MousePress
            , on "mouseup" MouseRelease
            , on "mousemove" MouseMove
            , on "contextmenu" MouseMove
            ]

          else
            []
        , if tracking || (terminal.activeBuffer == Alternate && terminal.modes.alternateScroll) then
            [ wheel ]

          else
            []
        ]


{-| The position is relative to the screen element: rows and cells are not
positioned, so their offset parent is the (relatively positioned) screen.
-}
mouseDecoder : MouseAction -> Decoder MouseEvent
mouseDecoder action =
    Decode.map8
        (\offsetX offsetY left top button buttons ( shiftKey, metaKey ) ( altKey, ctrlKey ) ->
            { action = action
            , x = left + offsetX
            , y = top + offsetY
            , button = button
            , buttons = buttons
            , shiftKey = shiftKey
            , altKey = altKey
            , ctrlKey = ctrlKey
            , metaKey = metaKey
            }
        )
        (Decode.field "offsetX" Decode.float)
        (Decode.field "offsetY" Decode.float)
        (Decode.at [ "target", "offsetLeft" ] Decode.float)
        (Decode.at [ "target", "offsetTop" ] Decode.float)
        (Decode.field "button" Decode.int)
        (Decode.field "buttons" Decode.int)
        (Decode.map2 Tuple.pair
            (Decode.field "shiftKey" Decode.bool)
            (Decode.field "metaKey" Decode.bool)
        )
        (Decode.map2 Tuple.pair
            (Decode.field "altKey" Decode.bool)
            (Decode.field "ctrlKey" Decode.bool)
        )
