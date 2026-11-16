module Editor exposing (initialConfig, initialPorts, subscriptions, update, view, window, windowLength, windowStart)

import Browser.Events exposing (onMouseUp)
import Editor.Clipboard
import Editor.Completions
import Editor.Constants as Constants
import Editor.Errors
import Editor.Keys
import Editor.Lib
import Editor.Msg exposing (Config, Model, Msg(..), ScrollLeft, ScrollTop, SelectionState(..))
import Editor.RawKeyboard
import Editor.Save
import Editor.Styles exposing (editorContainerStyles, editorLineNumbersStyles, editorPseudoStyles, editorStyles, renderedStyles)
import Editor.Symbols
import Editor.Syntax.Types
import Editor.Syntax.Util
import Html exposing (Attribute)
import Html.Attributes exposing (id, style)
import Html.Events
import Html.Keyed
import Html.Lazy
import Json.Decode as Decode exposing (Decoder, Value)
import List
import List.Extra


initialConfig : Editor.Msg.Config
initialConfig =
    { vimMode = True
    , showLineNumbers = True
    , padBottom = True
    , padRight = True
    , showCursor = True
    , characterWidth = 8.0
    }


initialPorts : Editor.Msg.Ports
initialPorts =
    { requestPaste = \_ -> Cmd.none
    , requestRun = \_ -> Cmd.none
    , requestCopy = \_ -> Cmd.none
    , requestCompletion = \_ -> Cmd.none
    , requestChange = \_ -> Cmd.none
    , requestCharacterWidth = \_ -> Cmd.none
    , receiveCharacterWidth = \_ -> Sub.none
    , requestSave = \_ -> Cmd.none
    }


update : Editor.Msg.Msg -> Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
update msg model =
    case model.active of
        False ->
            ( model, Cmd.none )

        True ->
            let
                travelable =
                    model.travelable
            in
            case msg of
                NoOp ->
                    ( model, Cmd.none )

                FontChanged ->
                    ( model, model.ports.requestCharacterWidth () )

                Editor.Msg.RenderedScroll rendered ->
                    ( { model | travelable = { travelable | scrollLeft = rendered.scrollLeft } }, Cmd.none )

                Editor.Msg.ContainerScroll container ->
                    ( { model | travelable = { travelable | scrollTop = container.scrollTop }, viewportHeight = container.clientHeight }, Cmd.none )

                Editor.Msg.ErrorsResponse errors ->
                    Editor.Errors.update errors model

                Editor.Msg.CompletionResponse completions ->
                    Editor.Completions.update completions model

                Editor.Msg.SymbolResponse symbols ->
                    Editor.Symbols.update symbols model

                Editor.Msg.RawKeyboardMsg m ->
                    Editor.Keys.update m model

                Editor.Msg.SaveResponse json ->
                    Editor.Save.update json model

                Editor.Msg.PasteResponse string ->
                    Editor.Clipboard.paste model string
                        |> Editor.Lib.startUpdateEditor
                        |> Editor.Lib.updateSelection Nothing
                        |> Editor.Lib.withRequestChange
                        |> Editor.Lib.updateEditor model

                Editor.Msg.ClearSelection ->
                    model
                        |> Editor.Lib.startUpdateEditor
                        |> Editor.Lib.updateSelectionState Editor.Msg.None
                        |> Editor.Lib.updateSelection Nothing
                        |> Editor.Lib.updateEditor model

                Editor.Msg.WindowMouseUp _ ->
                    model
                        |> Editor.Lib.startUpdateEditor
                        |> Editor.Lib.updateSelectionState Editor.Msg.None
                        |> Editor.Lib.updateEditor model

                Editor.Msg.MouseUp _ ->
                    model
                        |> Editor.Lib.startUpdateEditor
                        |> Editor.Lib.updateSelectionState Editor.Msg.None
                        |> Editor.Lib.updateEditor model

                Editor.Msg.MouseDown _ ->
                    model
                        |> Editor.Lib.startUpdateEditor
                        |> Editor.Lib.updateSelectionState Editor.Msg.Selecting
                        |> Editor.Lib.updateSelection Nothing
                        |> Editor.Lib.updateEditor model

                Editor.Msg.MouseMove spot ->
                    case model.selectionState of
                        Editor.Msg.Selecting ->
                            let
                                lineLength =
                                    Maybe.withDefault 0 <| Maybe.map (String.length << .text) <| List.Extra.getAt spot.y model.travelable.renderableLines

                                restrictedSpot =
                                    { x = max 0 (min (lineLength - 1) spot.x)
                                    , y = max 0 spot.y
                                    }
                            in
                            case model.selection of
                                Just selection ->
                                    Editor.Lib.handleSelectionUpdate model restrictedSpot selection

                                Nothing ->
                                    model
                                        |> Editor.Lib.startUpdateEditor
                                        |> Editor.Lib.updateSelection (Just ( restrictedSpot, restrictedSpot ))
                                        |> Editor.Lib.updateEditor model

                        Editor.Msg.None ->
                            ( model
                            , Cmd.none
                            )

                Editor.Msg.MouseClick clickLocation ->
                    let
                        lineLength =
                            Maybe.withDefault 0 <| Maybe.map (String.length << .text) <| List.Extra.getAt clickLocation.y model.travelable.renderableLines

                        cursorPosition =
                            { x = min lineLength clickLocation.x
                            , y = clickLocation.y
                            }
                    in
                    model
                        |> Editor.Lib.startUpdateEditor
                        |> Editor.Lib.updateDoubleTripleClick cursorPosition
                        |> Editor.Lib.updateCursorPosition cursorPosition
                        |> Editor.Lib.addMsg (model.ports.requestCharacterWidth ())
                        |> Editor.Lib.updateEditor model


{-| Only the lines around what can be seen are drawn; the rest of the file
is two empty blocks of the right height, above and below, so that the
scrollbar and every position stay what they were.

Drawing every line made a file of 10,000 lines 190,000 elements: it took
most of a second to open or to switch back to, and every key typed was laid
out against all of them.

-}
type alias Window =
    { start : Int, end : Int, above : Int, below : Int }


{-| How tall the visible part is taken to be before it is known (it is
known from the first time the editor is scrolled): generously, because what
matters is that it is never taller than this.
-}
unknownViewportHeight : Int
unknownViewportHeight =
    3200


{-| Lines drawn beyond the visible part on either side, so that scrolling
shows text and not the empty block while the next window is being drawn, and
so that a window made taller is still filled.
-}
windowMarginLines : Int
windowMarginLines =
    40


{-| The window moves in steps of this many lines, so that scrolling within a
step draws nothing new.
-}
windowStepLines : Int
windowStepLines =
    20


{-| The first line of the window for a scroll position.
-}
windowStart : Int -> Int
windowStart scrollTop =
    max 0 ((scrollTop // Constants.lineHeight - windowMarginLines) // windowStepLines * windowStepLines)


{-| How many lines the window holds for a visible part of this height (0:
not known yet). In whole steps, like the start.
-}
windowLength : Int -> Int
windowLength viewportHeight =
    let
        visible =
            (if viewportHeight > 0 then
                viewportHeight

             else
                unknownViewportHeight
            )
                // Constants.lineHeight
                + 1
    in
    ((visible + 2 * windowMarginLines + windowStepLines) // windowStepLines + 1) * windowStepLines


{-| The window of so many lines that starts at a line, in a file of so many
lines.
-}
window : Int -> Int -> Int -> Window
window start length numberOfLines =
    let
        -- a scroll position from before the file got shorter
        first =
            clamp 0 (max 0 (numberOfLines - length)) start

        end =
            min numberOfLines (first + length)
    in
    { start = first
    , end = end
    , above = first * Constants.lineHeight
    , below = (numberOfLines - end) * Constants.lineHeight
    }


spacer : Int -> Html.Html msg
spacer height =
    Html.div [ Html.Attributes.style "height" (String.fromInt height ++ "px") ] []


viewLineNumbers : Config -> Int -> Int -> List Editor.Msg.RenderableLine -> Html.Html msg
viewLineNumbers config start length renderableLines =
    let
        numberOfLines =
            List.length renderableLines

        drawn =
            window start length numberOfLines
    in
    Html.div
        ([ Html.Attributes.style "width" ((String.fromFloat <| Editor.Lib.getEditorLineNumbersWidth config.characterWidth numberOfLines) ++ "px")
         ]
            ++ editorLineNumbersStyles config
        )
        (spacer drawn.above
            :: List.map (\index -> Html.div [] [ Html.text (String.fromInt index) ]) (List.range (drawn.start + 1) drawn.end)
            ++ [ spacer drawn.below ]
        )


viewRendered : Config -> Int -> Int -> Maybe Editor.Syntax.Types.Syntax -> List Editor.Msg.RenderableLine -> Html.Html Msg
viewRendered config start length syntax renderableLines =
    let
        numberOfLines =
            List.length renderableLines

        drawn =
            window start length numberOfLines
    in
    Html.Keyed.node "div"
        ([ onScrollX Editor.Msg.RenderedScroll
         , id "editor-rendered"
         , style "width" ("calc(100% - " ++ ((String.fromFloat <| Editor.Lib.getEditorLineNumbersWidth config.characterWidth numberOfLines) ++ "px"))
         ]
            ++ renderedStyles config
        )
        (( "above", spacer drawn.above )
            :: (renderableLines
                    |> List.drop drawn.start
                    |> List.take (drawn.end - drawn.start)
                    |> List.indexedMap (\index line -> viewKeyedLine config syntax (drawn.start + index) line)
               )
            ++ [ ( "below", spacer drawn.below ) ]
        )


viewKeyedLine : Config -> Maybe Editor.Syntax.Types.Syntax -> Int -> Editor.Msg.RenderableLine -> ( String, Html.Html Msg )
viewKeyedLine config syntax lineNumber renderableLine =
    ( renderableLine.key
    , Html.Lazy.lazy4 viewLine config syntax lineNumber renderableLine
    )


onScrollX : (ScrollLeft -> msg) -> Html.Attribute msg
onScrollX tagger =
    Html.Events.on "scroll" (Decode.map tagger (Decode.map ScrollLeft (Decode.at [ "target", "scrollLeft" ] Decode.int)))


onScrollY : (ScrollTop -> msg) -> Html.Attribute msg
onScrollY tagger =
    Html.Events.on "scroll"
        (Decode.map tagger
            (Decode.map2 ScrollTop
                (Decode.at [ "target", "scrollTop" ] Decode.int)
                (Decode.oneOf [ Decode.at [ "target", "clientHeight" ] Decode.int, Decode.succeed 0 ])
            )
        )


viewLine : Config -> Maybe Editor.Syntax.Types.Syntax -> Int -> Editor.Msg.RenderableLine -> Html.Html Msg
viewLine config syntax lineNumber renderableLine =
    Html.div
        [ Html.Attributes.style "height" (String.fromInt Constants.lineHeight ++ "px")
        , Html.Attributes.style "min-width" "fit-content"
        , Html.Attributes.style "padding-right"
            (if config.padRight then
                "250px"

             else
                ""
            )
        , Editor.Lib.mouseEventToEditorPosition "click" Editor.Msg.MouseClick lineNumber config.characterWidth
        , Editor.Lib.mouseEventToEditorPosition "mousedown" Editor.Msg.MouseDown lineNumber config.characterWidth
        , Editor.Lib.mouseEventToEditorPosition "mousemove" Editor.Msg.MouseMove lineNumber config.characterWidth
        , Editor.Lib.mouseEventToEditorPosition "mouseup" Editor.Msg.MouseUp lineNumber config.characterWidth
        ]
        [ Html.Lazy.lazy4 Editor.Syntax.Util.viewLine syntax renderableLine.text renderableLine.multilineSymbols renderableLine.errors
        ]


viewEditor : Editor.Msg.Model -> Html.Html Msg
viewEditor model =
    let
        { x, y } =
            model.travelable.cursorPosition
    in
    Html.div
        ([ Html.Attributes.class "editor"
         , Html.Attributes.id "editor"
         , Html.Attributes.classList
            [ ( "mode--normal", model.mode == Editor.Msg.Normal )
            , ( "mode--insert", model.mode == Editor.Msg.Insert )
            , ( "mode--visual-line", model.mode == Editor.Msg.VisualLine )
            ]
         , Html.Attributes.style "min-height" ((String.fromInt <| Constants.lineHeight * List.length model.travelable.renderableLines) ++ "px")
         ]
            ++ editorStyles model.config (Editor.Lib.getEditorLineNumbersWidth model.config.characterWidth (List.length model.travelable.renderableLines))
        )
        [ Html.node "style" [] [ Html.text editorPseudoStyles ]
        , Html.span [ Html.Attributes.id "character-width", Html.Attributes.style "position" "absolute", Html.Attributes.style "left" "500px", Html.Attributes.style "visibility" "hidden" ]
            [ Html.text "0"
            ]
        , Html.Lazy.lazy5 viewRendered model.config (windowStart model.travelable.scrollTop) (windowLength model.viewportHeight) model.syntax model.travelable.renderableLines
        , Html.Lazy.lazy4 Editor.Lib.renderCursor
            model.config
            model.travelable.cursorPosition
            model.travelable.scrollLeft
            (case List.length model.completions > 0 of
                True ->
                    Editor.Lib.renderCompletions
                        model.selectedCompletionIndex
                        model.completions

                False ->
                    Html.text ""
            )
        , Html.Lazy.lazy3 Editor.Lib.renderSelection model.config.characterWidth model.selection model.travelable.scrollLeft
        ]



-- Used in UserLand


view : Editor.Msg.Model -> Html.Html Msg
view model =
    Html.div
        ([ onScrollY Editor.Msg.ContainerScroll
         , id "editor-container"
         ]
            ++ editorContainerStyles model.active
        )
        [ case model.config.showLineNumbers of
            True ->
                Html.Lazy.lazy4 viewLineNumbers model.config (windowStart model.travelable.scrollTop) (windowLength model.viewportHeight) model.travelable.renderableLines

            False ->
                Html.text ""
        , Html.Lazy.lazy viewEditor model
        ]


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ Sub.map Editor.Msg.RawKeyboardMsg (Editor.RawKeyboard.subscriptions True False)
        , case model.selectionState of
            Selecting ->
                onMouseUp (Decode.map Editor.Msg.WindowMouseUp (Decode.succeed ()))

            None ->
                Sub.none
        ]
