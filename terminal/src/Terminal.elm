module Terminal exposing (..)

import Array
import Browser.Dom exposing (getViewportOf, setViewportOf)
import Dict exposing (Dict)
import Editor exposing (initialPorts)
import Editor.Lib
import Editor.Msg
import Editor.Syntax.Types exposing (MultilineSymbol)
import Html exposing (div, text)
import Html.Attributes exposing (class, id, style)
import Json.Decode exposing (decodeValue)
import List.Extra
import Task
import Terminal.Decoders exposing (decodeTerminalCommands, decodeTerminalResized)
import Terminal.EightBitColors
import Terminal.Types exposing (Buffer, Model, Msg(..), Terminal, TerminalBuffer(..), TerminalCommand(..), TerminalSize)


init : String -> Editor.Msg.Ports -> Terminal.Types.Ports -> Model
init cwd editorPorts terminalPorts =
    { terminal =
        { size =
            { height = 4
            , width = 80
            }
        , scrollback = makeEmptyScrollbackEditor editorPorts
        , activeBuffer = Primary
        , primaryBuffer =
            makeEmptyBuffer (TerminalSize 4 80) editorPorts
        , alternateBuffer =
            makeEmptyBuffer (TerminalSize 4 80) editorPorts
        , styles = Dict.fromList []
        }
    , ports = terminalPorts
    }


makeEmptyScrollbackEditor : Editor.Msg.Ports -> Editor.Msg.Model
makeEmptyScrollbackEditor terminalPorts =
    let
        editor =
            Editor.Lib.init False
                ""
                ""
                { vimMode = False
                , showLineNumbers = False
                , padBottom = False
                , padRight = False
                , showCursor = False
                , characterWidth = 8.40625
                }
                terminalPorts

        editorTravelable =
            editor.travelable
    in
    { editor | travelable = { editorTravelable | renderableLines = [] } }


makeEmptyBuffer : TerminalSize -> Editor.Msg.Ports -> Buffer
makeEmptyBuffer size terminalPorts =
    let
        editor =
            Editor.Lib.init False
                "0"
                --(String.repeat size.height (String.repeat size.width " " ++ "\n")
                (List.repeat size.height (Editor.Lib.createRenderableLine 0 (String.repeat size.width " "))
                    |> Editor.Lib.renderableLinesToContents
                )
                -- We need the empty lines to exist to be able to change them (resize adds lines).
                { vimMode = True
                , showLineNumbers = False
                , padBottom = False
                , padRight = False
                , showCursor = True
                , characterWidth = 8.40625
                }
                terminalPorts
    in
    Buffer editor Nothing


terminalBufferPorts : Editor.Msg.Ports
terminalBufferPorts =
    initialPorts


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )

        ReceivedTerminalResized json ->
            case decodeValue decodeTerminalResized json of
                Ok { height, width } ->
                    let
                        nextTerminal =
                            case model.terminal.activeBuffer of
                                Alternate ->
                                    model.terminal

                                Primary ->
                                    let
                                        term =
                                            model.terminal

                                        editor =
                                            term.primaryBuffer.editor

                                        currentLineCount =
                                            List.length editor.travelable.renderableLines
                                    in
                                    if height > currentLineCount then
                                        let
                                            travelable =
                                                editor.travelable

                                            nextTravelable =
                                                { travelable | renderableLines = travelable.renderableLines ++ List.repeat (height - currentLineCount) (Editor.Lib.createRenderableLine 0 "") }
                                        in
                                        updateTerminalEditor { editor | travelable = nextTravelable } { term | size = { height = height, width = width } }

                                    else if height < currentLineCount then
                                        let
                                            travelable =
                                                editor.travelable

                                            nextRenderableLines =
                                                travelable.renderableLines
                                                    |> List.reverse
                                                    |> Array.fromList
                                                    |> Array.slice 0 height
                                                    |> Array.toList
                                                    |> List.reverse

                                            { x, y } =
                                                travelable.cursorPosition

                                            nextTravelable =
                                                { travelable
                                                    | renderableLines = nextRenderableLines
                                                    , cursorPosition = { x = x, y = max 0 (min (height - 1) y) }
                                                }
                                        in
                                        updateTerminalEditor { editor | travelable = nextTravelable } { term | size = { height = height, width = width } }

                                    else
                                        { term | size = { height = height, width = width } }
                    in
                    ( { model
                        | terminal = nextTerminal
                      }
                    , Cmd.none
                    )

                Err err ->
                    ( model, Cmd.none )

        ReceivedTerminalOutput json ->
            case decodeValue decodeTerminalCommands json of
                Ok commands ->
                    let
                        ( nextTerminal, msgs ) =
                            run commands model.terminal
                    in
                    ( { model
                        | terminal = nextTerminal
                      }
                    , Cmd.batch [ Cmd.map TerminalEditorMsg msgs, scrollToBottom "terminal-container" ]
                    )

                Err err ->
                    ( model, Cmd.none )

        TerminalEditorMsg editorMsg ->
            let
                term =
                    model.terminal

                ( editor, _ ) =
                    getBuffer term

                ( nextEditor, msgs ) =
                    Editor.update editorMsg editor

                nextTerminal =
                    updateTerminalEditor nextEditor term
            in
            ( { model | terminal = nextTerminal }, Cmd.batch [ Cmd.map TerminalEditorMsg msgs ] )


viewScrollback : Terminal -> Html.Html Msg
viewScrollback terminal =
    case terminal.activeBuffer of
        Primary ->
            let
                buffer =
                    terminal.primaryBuffer
            in
            case List.length terminal.scrollback.travelable.renderableLines of
                0 ->
                    text ""

                _ ->
                    div [ style "height" "min-content" ] [ Html.map (always NoOp) <| Editor.view terminal.scrollback ]

        Alternate ->
            text ""


view : Model -> Html.Html Msg
view model =
    div [ class "overflow-hidden" ]
        [ div [ id "terminal-container", class "w-full h-full overflow-y-scroll p-1" ]
            [ viewScrollback model.terminal
            , Html.map TerminalEditorMsg <|
                div [ id "terminal" ]
                    [ Editor.view (model.terminal |> getBuffer |> Tuple.first)
                    ]
            ]
        ]


getBuffer : Terminal -> ( Editor.Msg.Model, Maybe ( Int, Int ) )
getBuffer terminal =
    case terminal.activeBuffer of
        Primary ->
            let
                buffer =
                    terminal.primaryBuffer
            in
            ( buffer.editor, buffer.scrollRegion )

        Alternate ->
            let
                buffer =
                    terminal.alternateBuffer
            in
            ( buffer.editor, buffer.scrollRegion )


insertText : String -> Terminal -> Terminal
insertText text terminal =
    let
        ( editor, scrollRegion ) =
            getBuffer terminal

        travelable =
            editor.travelable

        { x, y } =
            editor.travelable.cursorPosition

        nextRenderableLines =
            List.Extra.updateAt y
                (\renderableLine ->
                    let
                        start =
                            String.slice 0 x renderableLine.text
                                |> String.padRight x ' '

                        middle =
                            text

                        end =
                            String.slice (x + String.length text) (String.length renderableLine.text) renderableLine.text

                        nextText =
                            start
                                ++ middle
                                ++ end
                    in
                    { renderableLine
                        | text = nextText
                        , multilineSymbols = setStyle renderableLine x (x + String.length text) terminal.styles
                    }
                )
                travelable.renderableLines

        len =
            x + String.length text

        nextX =
            if len > terminal.size.width then
                0

            else
                len

        nextY =
            if len > terminal.size.width then
                y + 1

            else
                y
    in
    updateTerminalEditor { editor | travelable = { travelable | renderableLines = nextRenderableLines, cursorPosition = { x = nextX, y = nextY } } } terminal


eraseCharacters : Int -> Terminal -> Terminal
eraseCharacters count terminal =
    let
        ( editor, scrollRegion ) =
            getBuffer terminal

        travelable =
            editor.travelable

        { x, y } =
            editor.travelable.cursorPosition

        nextRenderableLines =
            List.Extra.updateAt y
                (\renderableLine ->
                    let
                        start =
                            String.slice 0 x renderableLine.text

                        middle =
                            String.repeat count " "

                        end =
                            String.slice (x + count) terminal.size.width renderableLine.text

                        nextText =
                            start
                                ++ middle
                                ++ end
                                |> String.slice 0 terminal.size.width
                    in
                    { renderableLine
                        | text = nextText
                        , multilineSymbols = setStyle renderableLine x (x + count) terminal.styles
                    }
                )
                travelable.renderableLines
    in
    updateTerminalEditor { editor | travelable = { travelable | renderableLines = nextRenderableLines } } terminal


insertSpaces : Int -> Terminal -> Terminal
insertSpaces count terminal =
    let
        ( editor, scrollRegion ) =
            getBuffer terminal

        travelable =
            editor.travelable

        { x, y } =
            editor.travelable.cursorPosition

        nextRenderableLines =
            List.Extra.updateAt y
                (\renderableLine ->
                    let
                        start =
                            String.slice 0 x renderableLine.text

                        middle =
                            String.repeat count " "

                        end =
                            String.slice x (String.length renderableLine.text) renderableLine.text

                        nextText =
                            start
                                ++ middle
                                ++ end
                                |> String.slice 0 terminal.size.width
                    in
                    { renderableLine
                        | text = nextText
                        , multilineSymbols = setStyle renderableLine x (x + count) terminal.styles
                    }
                )
                travelable.renderableLines
    in
    updateTerminalEditor { editor | travelable = { travelable | renderableLines = nextRenderableLines } } terminal


insertCharacter : String -> Terminal -> Terminal
insertCharacter text terminal =
    let
        ( editor, _ ) =
            getBuffer terminal

        nextTerminal =
            if editor.travelable.cursorPosition.x == terminal.size.width then
                newLine terminal.size terminal

            else
                terminal

        ( nextEditor, _ ) =
            getBuffer nextTerminal

        travelable =
            nextEditor.travelable

        { x, y } =
            let
                cp =
                    nextEditor.travelable.cursorPosition
            in
            if cp.y > editor.travelable.cursorPosition.y || cp.x == terminal.size.width then
                { cp | x = 0, y = cp.y }

            else
                { cp | x = cp.x, y = cp.y }

        nextRenderableLines =
            List.Extra.updateAt y
                (\renderableLine ->
                    let
                        start =
                            String.slice 0 x renderableLine.text
                                |> String.padRight x ' '

                        middle =
                            text

                        end =
                            String.slice (x + String.length text) (String.length renderableLine.text) renderableLine.text

                        nextText =
                            let
                                t =
                                    start
                                        ++ middle
                                        ++ end
                            in
                            String.slice 0 (min terminal.size.width (String.length t)) t
                    in
                    { renderableLine
                        | text = nextText
                        , multilineSymbols = setStyle renderableLine x (x + 1) nextTerminal.styles
                    }
                )
                nextEditor.travelable.renderableLines
    in
    updateTerminalEditor { editor | travelable = { travelable | renderableLines = nextRenderableLines, cursorPosition = { x = x + 1, y = y } } } nextTerminal


insertLongText : String -> Terminal -> Terminal
insertLongText text state =
    String.foldl
        (\char nextState ->
            insertCharacter (String.fromChar char) nextState
        )
        state
        text


updateTerminalEditor : Editor.Msg.Model -> Terminal -> Terminal
updateTerminalEditor updatedEditor terminal =
    case terminal.activeBuffer of
        Primary ->
            let
                buf =
                    terminal.primaryBuffer
            in
            { terminal | primaryBuffer = { buf | editor = updatedEditor } }

        Alternate ->
            let
                buf =
                    terminal.alternateBuffer
            in
            { terminal | alternateBuffer = { buf | editor = updatedEditor } }


updateTerminalScrollRegion : Maybe ( Int, Int ) -> Terminal -> Terminal
updateTerminalScrollRegion updatedScrollRegion terminal =
    case terminal.activeBuffer of
        Primary ->
            let
                buf =
                    terminal.primaryBuffer
            in
            { terminal | primaryBuffer = { buf | scrollRegion = updatedScrollRegion } }

        Alternate ->
            let
                buf =
                    terminal.alternateBuffer
            in
            { terminal | alternateBuffer = { buf | scrollRegion = updatedScrollRegion } }


run : List TerminalCommand -> Terminal -> ( Terminal, Cmd Editor.Msg.Msg )
run commands model =
    let
        nextTerminal =
            List.foldl
                (\command terminal ->
                    let
                        ( editor, scrollRegion ) =
                            getBuffer terminal

                        travelable =
                            editor.travelable

                        { x, y } =
                            travelable.cursorPosition
                    in
                    case command of
                        TerminalCommandSequenceAndSingleStringArgument sequence arg ->
                            case sequence of
                                "set-icon-name-and-window-title" ->
                                    terminal

                                "set-icon-name" ->
                                    terminal

                                "set-window-title" ->
                                    terminal

                                _ ->
                                    terminal

                        TerminalCommandText text ->
                            if text == "" then
                                terminal

                            else if (x + String.length text) < terminal.size.width then
                                insertText text terminal

                            else
                                insertLongText text terminal

                        TerminalCommandSequenceAndDoubleArgument sequence arg1 arg2 ->
                            case sequence of
                                "[H" ->
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = arg2 - 1, y = arg1 - 1 } } } terminal

                                "[r" ->
                                    -- Set scroll region
                                    updateTerminalScrollRegion (Just ( arg1, arg2 )) terminal

                                "[m" ->
                                    { terminal | styles = terminal.styles |> Dict.insert "font-weight" "bold" |> Dict.insert "color" (getAnsiColor arg2) }

                                unhandled ->
                                    --let
                                    --    debug =
                                    --        Debug.log "UNHANDLED" ( unhandled, ( arg1, arg2 ) )
                                    --in
                                    terminal

                        TerminalCommandSequenceAndSingleArgument sequence argument ->
                            case sequence of
                                "[A" ->
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = x, y = max 0 (y - max 1 argument) } } } terminal

                                "[B" ->
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = x, y = min (model.size.height - 1) (y + max 1 argument) } } } terminal

                                "[C" ->
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = min terminal.size.width (x + max 1 argument), y = y } } } terminal

                                "[D" ->
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = max 0 (x - max 1 argument), y = y } } } terminal

                                "[E" ->
                                    -- Cursor Next Line
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = 0, y = min (model.size.height - 1) (y + max 1 argument) } } } terminal

                                "[F" ->
                                    -- Cursor Previous Line
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = 0, y = max 0 (y - max 1 argument) } } } terminal

                                "[G" ->
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = max 0 (max 1 argument - 1), y = y } } } terminal

                                "[d" ->
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = x, y = min (model.size.height - 1) (max 1 argument - 1) } } } terminal

                                "[@" ->
                                    insertSpaces argument terminal

                                "[X" ->
                                    eraseCharacters argument terminal

                                "[P" ->
                                    --Number of characters to delete (default = 1).
                                    let
                                        nextRenderableLines =
                                            List.Extra.updateAt y
                                                (\renderableLine ->
                                                    { renderableLine | text = deleteCharacters x argument renderableLine.text }
                                                )
                                                travelable.renderableLines
                                    in
                                    updateTerminalEditor { editor | travelable = { travelable | renderableLines = nextRenderableLines } } terminal

                                "[L" ->
                                    -- Insert Line(s)
                                    insertLines argument terminal

                                "[M" ->
                                    -- Delete Line(s)
                                    deleteLines argument terminal

                                "[T" ->
                                    -- Scroll down argument lines
                                    let
                                        len =
                                            List.length travelable.renderableLines
                                    in
                                    let
                                        nextRenderableLines =
                                            List.concat
                                                [ List.repeat argument (Editor.Lib.createRenderableLine 0 "")
                                                , travelable.renderableLines
                                                ]
                                                |> Array.fromList
                                                |> Array.slice 0 len
                                                |> Array.toList
                                    in
                                    updateTerminalEditor { editor | travelable = { travelable | renderableLines = nextRenderableLines } } terminal

                                "[S" ->
                                    -- Scroll up argument lines
                                    let
                                        len =
                                            List.length travelable.renderableLines
                                    in
                                    let
                                        nextRenderableLines =
                                            List.concat
                                                [ travelable.renderableLines
                                                , List.repeat argument (Editor.Lib.createRenderableLine 0 "")
                                                ]
                                                |> Array.fromList
                                                |> Array.slice argument (len + argument)
                                                |> Array.toList
                                    in
                                    updateTerminalEditor { editor | travelable = { travelable | renderableLines = nextRenderableLines } } terminal

                                "[m-fg-256" ->
                                    { terminal
                                        | styles =
                                            terminal.styles
                                                |> Dict.insert
                                                    "color"
                                                    ("#" ++ Terminal.EightBitColors.getColorByNumber argument)
                                                |> Dict.insert
                                                    "font-weight"
                                                    "normal"
                                    }

                                "[m-bg-256" ->
                                    { terminal
                                        | styles =
                                            terminal.styles
                                                |> Dict.insert
                                                    "background"
                                                    ("#" ++ Terminal.EightBitColors.getColorByNumber argument)
                                                |> Dict.insert "font-weight" "normal"
                                    }

                                "[m" ->
                                    { terminal | styles = setAnsiStyle argument terminal.styles }

                                unhandled ->
                                    --let
                                    --    debug =
                                    --        Debug.log "UNHANDLED" ( unhandled, argument )
                                    --in
                                    terminal

                        TerminalCommandSequenceAndTripleArgument sequence arg1 arg2 arg3 ->
                            case sequence of
                                "[m-bg-rgb" ->
                                    { terminal
                                        | styles =
                                            terminal.styles
                                                |> Dict.insert "background"
                                                    ("rgb("
                                                        ++ String.fromInt arg1
                                                        ++ ","
                                                        ++ String.fromInt arg2
                                                        ++ ","
                                                        ++ String.fromInt arg3
                                                        ++ ")"
                                                    )
                                    }

                                "[m-fg-rgb" ->
                                    { terminal
                                        | styles =
                                            terminal.styles
                                                |> Dict.insert "color"
                                                    ("rgb("
                                                        ++ String.fromInt arg1
                                                        ++ ","
                                                        ++ String.fromInt arg2
                                                        ++ ","
                                                        ++ String.fromInt arg3
                                                        ++ ")"
                                                    )
                                    }

                                unhandled ->
                                    --let
                                    --    debug =
                                    --        Debug.log "UNHANDLED" ( unhandled, ( arg1, arg2, arg3 ) )
                                    --in
                                    terminal

                        TerminalCommandSequence sequence ->
                            case sequence of
                                "\n" ->
                                    newLine model.size terminal

                                "E" ->
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = 0, y = y + 1 } } } terminal

                                "D" ->
                                    index model.size terminal

                                "M" ->
                                    reverseIndex model.size terminal

                                "\u{0008}" ->
                                    -- \b
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = max 0 (x - 1), y = y } } } terminal

                                "\u{000D}" ->
                                    -- \r
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = 0, y = y } } } terminal

                                "#8" ->
                                    updateTerminalEditor
                                        { editor
                                            | travelable =
                                                { travelable
                                                    | renderableLines = Editor.Lib.contentsToRenderableLines (String.repeat model.size.height (String.repeat model.size.width "E" ++ "\n"))
                                                    , cursorPosition = { x = 0, y = 0 }
                                                }
                                        }
                                        terminal

                                "[E" ->
                                    -- Cursor Next Line
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = 0, y = min (model.size.height - 1) (y + 1) } } } terminal

                                "[F" ->
                                    -- Cursor Previoous Line
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = 0, y = max 0 (y - 1) } } } terminal

                                "[H" ->
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = 0, y = 0 } } } terminal

                                "[K" ->
                                    -- Clear line from cursor right (same as [0K)
                                    let
                                        nextRenderableLines =
                                            eraseLineFromCursorToEnd model.size.width x y travelable.renderableLines
                                    in
                                    updateTerminalEditor { editor | travelable = { travelable | renderableLines = nextRenderableLines } } terminal

                                "[0K" ->
                                    -- Clear line from cursor right
                                    let
                                        nextRenderableLines =
                                            eraseLineFromCursorToEnd model.size.width x y travelable.renderableLines
                                    in
                                    updateTerminalEditor { editor | travelable = { travelable | renderableLines = nextRenderableLines } } terminal

                                "[1K" ->
                                    -- Clear line from start to cursor
                                    let
                                        nextRenderableLines =
                                            eraseLineFromStartToCursor model.size.width x y travelable.renderableLines
                                    in
                                    updateTerminalEditor { editor | travelable = { travelable | renderableLines = nextRenderableLines } } terminal

                                "[2K" ->
                                    -- Clear entire line
                                    let
                                        nextRenderableLines =
                                            List.Extra.updateAt y
                                                (\renderableLine ->
                                                    { renderableLine | text = String.repeat model.size.width " " }
                                                )
                                                travelable.renderableLines
                                    in
                                    updateTerminalEditor { editor | travelable = { travelable | renderableLines = nextRenderableLines } } terminal

                                "[L" ->
                                    insertLines 1 terminal

                                "[M" ->
                                    deleteLines 1 terminal

                                "[J" ->
                                    -- Clear screen from cursor to end (same as [0J)
                                    let
                                        nextRenderableLines =
                                            eraseLineFromCursorToEnd model.size.width x y travelable.renderableLines
                                                |> List.Extra.updateIfIndex (\i -> i > y)
                                                    (\line ->
                                                        { line | text = String.repeat model.size.width " ", multilineSymbols = [] }
                                                    )
                                    in
                                    updateTerminalEditor { editor | travelable = { travelable | renderableLines = nextRenderableLines } } terminal

                                "[0J" ->
                                    -- Clear screen from cursor to end
                                    let
                                        nextRenderableLines =
                                            eraseLineFromCursorToEnd model.size.width x y travelable.renderableLines
                                                |> List.Extra.updateIfIndex (\i -> i > y)
                                                    (\line ->
                                                        { line | text = String.repeat model.size.width " ", multilineSymbols = [] }
                                                    )
                                    in
                                    updateTerminalEditor { editor | travelable = { travelable | renderableLines = nextRenderableLines } } terminal

                                "[1J" ->
                                    -- Clear from start to cursor
                                    let
                                        nextRenderableLines =
                                            eraseLineFromStartToCursor model.size.width x y travelable.renderableLines
                                                |> List.Extra.updateIfIndex (\i -> i < y) (\line -> { line | text = String.repeat model.size.width " ", multilineSymbols = [] })
                                    in
                                    updateTerminalEditor { editor | travelable = { travelable | renderableLines = nextRenderableLines } } terminal

                                "[2J" ->
                                    -- Clear entire screen
                                    updateTerminalEditor { editor | travelable = { travelable | renderableLines = Editor.Lib.contentsToRenderableLines (String.repeat model.size.height (String.repeat model.size.width " " ++ "\n")) } } terminal

                                "[?1049h" ->
                                    -- Switch to new alternate buffer
                                    { terminal | activeBuffer = Alternate, alternateBuffer = makeEmptyBuffer terminal.size terminalBufferPorts }

                                "[?1049l" ->
                                    -- Switch to primary buffer
                                    { terminal | activeBuffer = Primary }

                                -- Underline mode
                                "[4m" ->
                                    { terminal | styles = terminal.styles |> Dict.insert "text-decoration" "underline" }

                                -- Reset Style
                                "[0m" ->
                                    { terminal | styles = Dict.fromList [] }

                                -- Reset Style
                                "[49m" ->
                                    { terminal | styles = Dict.fromList [] }

                                -- Reset Style
                                "[m" ->
                                    { terminal | styles = Dict.fromList [] }

                                "[A" ->
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = x, y = max 0 (y - 1) } } } terminal

                                "[B" ->
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = x, y = min (model.size.height - 1) (y + 1) } } } terminal

                                "[C" ->
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = x + 1, y = y } } } terminal

                                "[D" ->
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = max 0 (x - 1), y = y } } } terminal

                                "[G" ->
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = 0, y = y } } } terminal

                                "[d" ->
                                    updateTerminalEditor { editor | travelable = { travelable | cursorPosition = { x = x, y = 0 } } } terminal

                                "[@" ->
                                    insertSpaces 1 terminal

                                "[X" ->
                                    eraseCharacters 1 terminal

                                "[P" ->
                                    --Number of characters to delete (default = 1).
                                    let
                                        nextRenderableLines =
                                            List.Extra.updateAt y
                                                (\renderableLine ->
                                                    { renderableLine | text = deleteCharacters x 1 renderableLine.text }
                                                )
                                                travelable.renderableLines
                                    in
                                    updateTerminalEditor { editor | travelable = { travelable | renderableLines = nextRenderableLines } } terminal

                                unhandled ->
                                    --let
                                    --    debug =
                                    --        Debug.log "UNHANDLED" unhandled
                                    --in
                                    terminal
                )
                model
                commands

        ( nextTerminalEditor, _ ) =
            getBuffer nextTerminal

        ( nextEditor, editorMsgs ) =
            Editor.Lib.startUpdateEditor { nextTerminalEditor | travelable = nextTerminalEditor.travelable }
                |> Editor.Lib.updateCursorPosition nextTerminalEditor.travelable.cursorPosition
                |> Editor.Lib.updateEditor nextTerminalEditor
    in
    ( updateTerminalEditor nextEditor nextTerminal, editorMsgs )


cleanMultilineSymbols : Editor.Msg.RenderableLine -> Int -> Editor.Msg.RenderableLine
cleanMultilineSymbols renderableLine start =
    -- need to MERGE styles symbols into the most granular
    { renderableLine
        | multilineSymbols = List.Extra.filterNot (\line -> line.start == start) renderableLine.multilineSymbols
    }


scrollToBottom : String -> Cmd Msg
scrollToBottom id =
    getViewportOf id
        |> Task.andThen (\info -> setViewportOf id 0 info.scene.height)
        |> Task.attempt (\_ -> NoOp)


insertLines : Int -> Terminal -> Terminal
insertLines number terminal =
    let
        ( editor, scrollRegion ) =
            getBuffer terminal

        travelable =
            editor.travelable

        { x, y } =
            editor.travelable.cursorPosition

        renderableLines =
            editor.travelable.renderableLines

        ( start, end ) =
            Maybe.withDefault ( 1, terminal.size.height ) scrollRegion

        nextTravelable =
            -- Newline at start
            let
                ( head, _ ) =
                    List.Extra.splitAt (start - 1) renderableLines

                ( _, tail ) =
                    List.Extra.splitAt end renderableLines

                region =
                    renderableLines
                        |> Array.fromList
                        |> Array.slice (start - 1) end
                        |> Array.toList

                nextRenderableLines =
                    List.concat
                        [ head
                        , List.repeat number (Editor.Lib.createRenderableLine 0 "")
                            ++ (region
                                    |> List.reverse
                                    |> List.tail
                                    |> Maybe.withDefault region
                                    |> List.reverse
                               )
                        , tail
                        ]
            in
            { travelable | renderableLines = nextRenderableLines }

        nextEditor =
            { editor | travelable = nextTravelable }
    in
    updateTerminalEditor nextEditor terminal


deleteLines : Int -> Terminal -> Terminal
deleteLines number terminal =
    let
        ( editor, scrollRegion ) =
            getBuffer terminal

        travelable =
            editor.travelable

        { x, y } =
            editor.travelable.cursorPosition

        renderableLines =
            editor.travelable.renderableLines

        ( start, end ) =
            Maybe.withDefault ( 1, terminal.size.height + 1 ) scrollRegion

        nextTravelable =
            let
                ( head, _ ) =
                    List.Extra.splitAt (start - 1) renderableLines

                ( _, tail ) =
                    List.Extra.splitAt end renderableLines

                region =
                    renderableLines
                        |> Array.fromList
                        |> Array.slice (start - 1) end
                        |> Array.toList

                nextRenderableLines =
                    List.concat
                        [ head
                        , region
                            ++ List.repeat number (Editor.Lib.createRenderableLine 0 (String.repeat terminal.size.width " "))
                            |> Array.fromList
                            |> Array.slice number (List.length region + number)
                            |> Array.toList
                        , tail
                        ]
            in
            { travelable | renderableLines = nextRenderableLines }

        nextEditor =
            { editor | travelable = nextTravelable }
    in
    updateTerminalEditor nextEditor terminal


newLine : TerminalSize -> Terminal -> Terminal
newLine { height } terminal =
    let
        ( editor, scrollRegion ) =
            getBuffer terminal

        travelable =
            editor.travelable

        { x, y } =
            editor.travelable.cursorPosition

        renderableLines =
            editor.travelable.renderableLines

        ( start, end ) =
            Maybe.withDefault ( 1, height ) scrollRegion

        -- Alternate buffer has no scrollback, so handle it differently
        nextScrollback =
            case terminal.activeBuffer of
                Alternate ->
                    terminal.scrollback

                Primary ->
                    case y + 1 == end of
                        True ->
                            let
                                scrollbackEditor =
                                    terminal.scrollback

                                addToScrollback =
                                    List.head renderableLines
                                        |> Maybe.map (\h -> [ h ])
                                        |> Maybe.withDefault []

                                scrollbackTravelable =
                                    scrollbackEditor.travelable
                            in
                            { scrollbackEditor | travelable = { scrollbackTravelable | renderableLines = List.concat [ scrollbackTravelable.renderableLines, addToScrollback ] } }

                        _ ->
                            terminal.scrollback

        nextTravelable =
            if y + 1 == end then
                -- Newline at end
                let
                    ( head, _ ) =
                        List.Extra.splitAt (start - 1) renderableLines

                    ( _, tail ) =
                        List.Extra.splitAt end renderableLines

                    region =
                        renderableLines
                            |> Array.fromList
                            |> Array.slice (start - 1) end
                            |> Array.toList

                    nextRenderableLines =
                        List.concat
                            [ head
                            , (region
                                |> List.tail
                                |> Maybe.withDefault region
                              )
                                ++ [ Editor.Lib.createRenderableLine 0 (String.repeat terminal.size.width " ") ]
                            , tail
                            ]
                in
                { travelable | cursorPosition = { x = x, y = min (height - 1) (y + 1) }, renderableLines = nextRenderableLines }

            else if y + 1 == start && start /= 1 && end /= height then
                -- Newline at start
                let
                    ( head, _ ) =
                        List.Extra.splitAt (start - 1) renderableLines

                    ( _, tail ) =
                        List.Extra.splitAt end renderableLines

                    region =
                        renderableLines
                            |> Array.fromList
                            |> Array.slice (start - 1) end
                            |> Array.toList

                    nextRenderableLines =
                        List.concat
                            [ head
                            , [ Editor.Lib.createRenderableLine 0 (String.repeat terminal.size.width " ") ]
                                ++ (region
                                        |> List.reverse
                                        |> List.tail
                                        |> Maybe.withDefault region
                                        |> List.reverse
                                   )
                            , tail
                            ]
                in
                { travelable | cursorPosition = { x = x, y = min (height - 1) (y + 1) }, renderableLines = nextRenderableLines }

            else
                { travelable | cursorPosition = { x = x, y = y + 1 }, renderableLines = renderableLines }

        nextEditor =
            { editor | travelable = nextTravelable }

        nextTerminal =
            updateTerminalEditor nextEditor terminal
    in
    { nextTerminal | scrollback = nextScrollback }


index : TerminalSize -> Terminal -> Terminal
index { height } terminal =
    let
        ( editor, scrollRegion ) =
            getBuffer terminal

        travelable =
            editor.travelable

        { x, y } =
            editor.travelable.cursorPosition

        renderableLines =
            editor.travelable.renderableLines

        nextTravelable =
            { travelable | cursorPosition = { x = x, y = min terminal.size.height (y + 1) }, renderableLines = renderableLines }

        nextEditor =
            { editor | travelable = nextTravelable }
    in
    updateTerminalEditor nextEditor terminal



-- TODO:
{--
    /// Reverse Index.
    ///
    /// Move the active position to the same horizontal position on the
    /// preceding line. If the active position is at the top margin, a scroll
    /// down is performed.
--}


reverseIndex : TerminalSize -> Terminal -> Terminal
reverseIndex { height } terminal =
    let
        ( editor, scrollRegion ) =
            getBuffer terminal

        travelable =
            editor.travelable

        { x, y } =
            editor.travelable.cursorPosition

        renderableLines =
            editor.travelable.renderableLines
    in
    case y == 0 of
        True ->
            -- Newline at end
            let
                ( start, end ) =
                    Maybe.withDefault ( 1, height ) scrollRegion

                ( head, _ ) =
                    List.Extra.splitAt (start - 1) renderableLines

                ( _, tail ) =
                    List.Extra.splitAt end renderableLines

                region =
                    renderableLines
                        |> Array.fromList
                        |> Array.slice (start - 1) end
                        |> Array.toList

                nextRenderableLines =
                    List.concat
                        [ head
                        , (region
                            |> List.tail
                            |> Maybe.withDefault region
                          )
                            ++ [ Editor.Lib.createRenderableLine 0 (String.repeat terminal.size.width " ") ]
                        , tail
                        ]

                nextTravelable =
                    { travelable | cursorPosition = { x = x, y = max 0 (y - 1) }, renderableLines = nextRenderableLines }

                nextEditor =
                    { editor | travelable = nextTravelable }
            in
            updateTerminalEditor nextEditor terminal

        False ->
            let
                nextTravelable =
                    { travelable | cursorPosition = { x = x, y = max 0 (y - 1) }, renderableLines = renderableLines }

                nextEditor =
                    { editor | travelable = nextTravelable }
            in
            updateTerminalEditor nextEditor terminal


setStyle : Editor.Msg.RenderableLine -> Int -> Int -> Dict String String -> List MultilineSymbol
setStyle renderableLine start end styles =
    List.foldl
        (\i acc ->
            Dict.insert i
                { kind = 1000
                , start = i
                , end = Just (i + 1)
                , styles = Dict.toList styles
                }
                acc
        )
        (Dict.fromList (List.foldl (\s acc -> ( s.start, s ) :: acc) [] renderableLine.multilineSymbols))
        (List.range start (end - 1))
        |> Dict.values


getAnsiStyleBold : Int -> List ( String, String )
getAnsiStyleBold number =
    [ ( "color", getAnsiColor number ), ( "font-weight", "bold" ) ]


setAnsiStyle : Int -> Dict String String -> Dict String String
setAnsiStyle number styles =
    -- SGR parameters: https://en.wikipedia.org/wiki/ANSI_escape_code
    if number == 0 then
        styles
            |> Dict.insert "color" ""
            |> Dict.insert "background" ""
            |> Dict.insert "text-decoration" "none"
            |> Dict.insert "font-weight" "normal"

    else if 30 <= number && number <= 37 || 90 <= number && number <= 97 then
        styles |> Dict.insert "color" (getAnsiColor number) |> Dict.insert "font-weight" "normal"

    else if number == 39 then
        styles |> Dict.insert "color" ""

    else if number == 49 then
        styles |> Dict.insert "background" ""

    else
        styles |> Dict.insert "background" (getAnsiColor number) |> Dict.insert "font-weight" "normal"


getAnsiColor : Int -> String
getAnsiColor number =
    case number of
        30 ->
            "black"

        40 ->
            "black"

        31 ->
            -- red
            "rgb(194,54,33)"

        41 ->
            -- red
            "rgb(194,54,33)"

        32 ->
            -- green
            "rgb(37,188,36)"

        42 ->
            -- green
            "rgb(37,188,36)"

        33 ->
            -- yellow
            "rgb(173,173,39)"

        43 ->
            -- yellow
            "rgb(173,173,39)"

        34 ->
            -- blue
            "rgb(73,46,225)"

        44 ->
            -- blue
            "rgb(73,46,225)"

        35 ->
            -- magenta
            "rgb(211,56,211)"

        45 ->
            -- magenta
            "rgb(211,56,211)"

        36 ->
            -- cyan
            "rgb(51,187,200)"

        46 ->
            -- cyan
            "rgb(51,187,200)"

        37 ->
            -- white
            "rgb(203,204,205)"

        47 ->
            -- white
            "rgb(203,204,205)"

        90 ->
            -- bright black
            "rgb(129,131,131)"

        100 ->
            -- bright black
            "rgb(129,131,131)"

        91 ->
            -- bright red
            "rbg(252,57,31)"

        101 ->
            -- bright red
            "rbg(252,57,31)"

        92 ->
            -- bright green
            "rgb(49,231,34)"

        102 ->
            -- bright green
            "rgb(49,231,34)"

        93 ->
            -- bright yellow
            "rgb(234,236,35)"

        103 ->
            -- bright yellow
            "rgb(234,236,35)"

        94 ->
            -- bright blue
            "rgb(88,51,255)"

        104 ->
            -- bright blue
            "rgb(88,51,255)"

        95 ->
            -- bright magenta
            "rgb(249,53,248)"

        105 ->
            -- bright magenta
            "rgb(249,53,248)"

        96 ->
            -- bright cyan
            "rgb(20,240,240)"

        106 ->
            -- bright cyan
            "rgb(20,240,240)"

        97 ->
            -- bright white
            "rgb(233,235,235)"

        107 ->
            -- bright white
            "rgb(233,235,235)"

        _ ->
            ""


deleteCharacters : Int -> Int -> String -> String
deleteCharacters x n text =
    let
        start =
            String.slice 0 x text

        end =
            String.slice (x + n) (String.length text) text
    in
    String.padRight n ' ' (start ++ end)


eraseLineFromStartToCursor : Int -> Int -> Int -> List Editor.Msg.RenderableLine -> List Editor.Msg.RenderableLine
eraseLineFromStartToCursor width x y renderableLines =
    List.Extra.updateAt y
        (\renderableLine ->
            { renderableLine | text = String.repeat x " " ++ String.slice x width renderableLine.text }
        )
        renderableLines


eraseLineFromCursorToEnd : Int -> Int -> Int -> List Editor.Msg.RenderableLine -> List Editor.Msg.RenderableLine
eraseLineFromCursorToEnd width x y renderableLines =
    List.Extra.updateAt y
        (\renderableLine ->
            { renderableLine | text = String.slice 0 x renderableLine.text ++ String.repeat (width - x) " " }
        )
        renderableLines
