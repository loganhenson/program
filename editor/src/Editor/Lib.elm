module Editor.Lib exposing (..)

import Browser.Dom
import Dict
import Editor.Constants as Constants
import Editor.Msg exposing (Config, History, HistoryIndexAndHistory, Model, Ports, RenderableLine, Selection, Symbol, Travelable)
import Editor.Styles exposing (cursorStyles, selectionStyles)
import Editor.Syntax.Language exposing (getSyntaxFromFileName)
import Editor.Words exposing (getWordUntilEnd)
import Html
import Html.Attributes
import Html.Events
import Json.Decode
import Json.Encode
import List.Extra
import Task exposing (Task)
import Tuple exposing (first, pair, second)


makeNewTravelable : String -> Travelable
makeNewTravelable contents =
    { cursorPosition = { x = 0, y = 0 }
    , renderableLines = contentsToRenderableLines contents
    , scrollLeft = 0
    , scrollTop = 0
    }


snapshotTravelableHistory : Model -> Model
snapshotTravelableHistory model =
    let
        nextHistories =
            case getCurrentHistoryIndexAndHistoryByFile model.file model of
                Just ( index, history ) ->
                    case Just model.travelable == List.Extra.getAt index history of
                        True ->
                            model.histories

                        False ->
                            let
                                ( head, tail ) =
                                    List.Extra.splitAt index history
                            in
                            Dict.update
                                model.file
                                (always (Just ( index, List.concat [ head, [ model.travelable ], tail ] )))
                                model.histories

                Nothing ->
                    model.histories
    in
    { model | histories = nextHistories }


changeFile : Model -> String -> String -> ( Model, Cmd Editor.Msg.Msg )
changeFile model file contents =
    -- Make sure we update the history of the prev file before changing (capture latest non-undoable changes)
    case getTravelableByFile file model of
        Nothing ->
            loadNewFile model file contents

        Just travelable ->
            let
                nextModel =
                    snapshotTravelableHistory model

                nextTravelable =
                    case contents == renderableLinesToContents travelable.renderableLines of
                        True ->
                            travelable

                        False ->
                            -- New contents, reset cursor/scroll positions
                            { travelable
                                | renderableLines = contentsToRenderableLines contents
                                , cursorPosition = { x = 0, y = 0 }
                                , scrollLeft = 0
                                , scrollTop = 0
                            }
            in
            ( { nextModel
                | file = file
                , syntax = getSyntaxFromFileName file
                , normalBuffer = Editor.Msg.NormalBuffer 0 "" ""
                , doubleTripleClick = ( 1, Editor.Msg.EditorCoordinate 0 0 )
                , errors = []
                , selectionState = Editor.Msg.None
                , selection = Nothing
                , travelable = nextTravelable
                , completions = []
                , selectedCompletionIndex = 0
                , symbols = []
              }
            , syncScrollPosition nextTravelable model
            )


loadNewFile : Model -> String -> String -> ( Model, Cmd Editor.Msg.Msg )
loadNewFile model file contents =
    {- Internal -}
    let
        travelable =
            makeNewTravelable contents

        nextModel =
            snapshotTravelableHistory model
    in
    ( { nextModel
        | file = file
        , syntax = getSyntaxFromFileName file
        , normalBuffer = Editor.Msg.NormalBuffer 0 "" ""
        , doubleTripleClick = ( 1, Editor.Msg.EditorCoordinate 0 0 )
        , errors = []
        , selectionState = Editor.Msg.None
        , selection = Nothing
        , travelable = travelable
        , completions = []
        , selectedCompletionIndex = 0
        , symbols = []
        , histories = Dict.insert file ( 0, [ travelable ] ) nextModel.histories
      }
    , syncScrollPosition travelable model
    )


updateMode : Editor.Msg.Mode -> ( Editor.Msg.Model, Cmd msg ) -> ( Editor.Msg.Model, Cmd msg )
updateMode mode ( state, msg ) =
    ( { state | mode = mode }
    , Cmd.batch <| msg :: []
    )


resetNormalBuffer : ( Editor.Msg.Model, Cmd msg ) -> ( Editor.Msg.Model, Cmd msg )
resetNormalBuffer ( model, msg ) =
    let
        prevNormalBuffer =
            model.normalBuffer
    in
    ( { model | normalBuffer = { prevNormalBuffer | command = "", number = 0 } }
    , Cmd.batch <| msg :: []
    )


updateNormalBuffer : Editor.Msg.NormalBuffer -> ( Editor.Msg.Model, Cmd msg ) -> ( Editor.Msg.Model, Cmd msg )
updateNormalBuffer normalBuffer ( state, msg ) =
    ( { state | normalBuffer = normalBuffer }
    , Cmd.batch <| msg :: []
    )


updateDoubleTripleClick : Editor.Msg.EditorCoordinate -> ( Editor.Msg.Model, Cmd msg ) -> ( Editor.Msg.Model, Cmd msg )
updateDoubleTripleClick cursorPosition ( model, msg ) =
    let
        previousDoubleTripleClickPosition =
            second model.doubleTripleClick

        nextDoubleTripleClickCount =
            case cursorPosition == previousDoubleTripleClickPosition of
                True ->
                    first model.doubleTripleClick + 1

                False ->
                    1

        doubleClick =
            nextDoubleTripleClickCount == 2

        tripleClick =
            nextDoubleTripleClickCount == 3

        nextDoubleTripleClick =
            if doubleClick then
                ( nextDoubleTripleClickCount, cursorPosition )

            else if tripleClick then
                ( 1, cursorPosition )

            else
                ( nextDoubleTripleClickCount, cursorPosition )

        nextSelection =
            if doubleClick then
                let
                    ( wordStart, wordEnd ) =
                        case List.Extra.getAt cursorPosition.y model.travelable.renderableLines of
                            Just renderableLine ->
                                case getWordUntilEnd <| String.slice cursorPosition.x (cursorPosition.x + 1) renderableLine.text of
                                    Just _ ->
                                        let
                                            ( backtrackedX, _ ) =
                                                List.foldl
                                                    (\char ( x, keepGoing ) ->
                                                        case keepGoing of
                                                            True ->
                                                                case getWordUntilEnd char of
                                                                    Just _ ->
                                                                        ( x - 1, True )

                                                                    Nothing ->
                                                                        ( x, False )

                                                            False ->
                                                                ( x, keepGoing )
                                                    )
                                                    ( cursorPosition.x
                                                    , True
                                                    )
                                                    (List.reverse <| String.split "" (String.slice 0 cursorPosition.x renderableLine.text))
                                        in
                                        ( backtrackedX, backtrackedX + (String.length <| Maybe.withDefault "" <| getWordUntilEnd <| String.slice backtrackedX (String.length renderableLine.text) renderableLine.text) - 1 )

                                    Nothing ->
                                        ( cursorPosition.x, cursorPosition.x )

                            Nothing ->
                                ( cursorPosition.x, cursorPosition.x )
                in
                Just ( { x = wordStart, y = cursorPosition.y }, { x = wordEnd, y = cursorPosition.y } )

            else if tripleClick then
                -- select whole line
                Just
                    ( { x = 0, y = cursorPosition.y }
                    , { x =
                            case List.Extra.getAt cursorPosition.y model.travelable.renderableLines of
                                Just renderableLine ->
                                    String.length renderableLine.text

                                Nothing ->
                                    0
                      , y = cursorPosition.y
                      }
                    )

            else
                model.selection
    in
    ( { model
        | doubleTripleClick =
            nextDoubleTripleClick
        , selection = nextSelection
      }
    , Cmd.batch <| msg :: []
    )


updateCursorPosition : Editor.Msg.EditorCoordinate -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg ) -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
updateCursorPosition cursorPosition ( model, msg ) =
    let
        travelable =
            model.travelable
    in
    ( { model
        | travelable =
            { travelable
                | cursorPosition = cursorPosition
            }
        , completions = []
      }
    , Cmd.batch <| msg :: []
    )
        |> scrollToCursor


updateSelectionState : Editor.Msg.SelectionState -> ( Editor.Msg.Model, Cmd msg ) -> ( Editor.Msg.Model, Cmd msg )
updateSelectionState selectionState ( state, msg ) =
    ( { state | selectionState = selectionState }
    , Cmd.batch <| msg :: []
    )


goForwardInHistory : ( Editor.Msg.Model, Cmd msg ) -> ( Editor.Msg.Model, Cmd msg )
goForwardInHistory ( model, cmds ) =
    let
        nextModel =
            snapshotTravelableHistory model
    in
    ( { nextModel
        | histories =
            Dict.update nextModel.file
                (Maybe.map
                    (\( index, history ) ->
                        ( min (List.length history - 1) index + 1, history )
                    )
                )
                nextModel.histories
      }
    , cmds
    )


goBackwardInHistory : ( Editor.Msg.Model, Cmd msg ) -> ( Editor.Msg.Model, Cmd msg )
goBackwardInHistory ( model, cmds ) =
    ( { model
        | histories =
            Dict.update model.file
                (Maybe.map
                    (\( index, history ) ->
                        ( max 0 (index - 1), history )
                    )
                )
                model.histories
      }
    , cmds
    )


{-| Internal.
-}
addMsg : Cmd msg -> ( Editor.Msg.Model, Cmd msg ) -> ( Editor.Msg.Model, Cmd msg )
addMsg message ( model, msg ) =
    ( model
    , Cmd.batch <| msg :: [ message ]
    )


updateSelection : Maybe Editor.Msg.Selection -> ( Editor.Msg.Model, Cmd msg ) -> ( Editor.Msg.Model, Cmd msg )
updateSelection selection ( model, msg ) =
    ( { model | selection = selection }
    , Cmd.batch <| msg :: []
    )


updateCompletions : List Editor.Msg.Completion -> ( Editor.Msg.Model, Cmd msg ) -> ( Editor.Msg.Model, Cmd msg )
updateCompletions completions ( state, msg ) =
    ( { state | completions = completions }
    , Cmd.batch <| msg :: []
    )


updateSelectedCompletionIndex : Int -> ( Editor.Msg.Model, Cmd msg ) -> ( Editor.Msg.Model, Cmd msg )
updateSelectedCompletionIndex selectedCompletionIndex ( model, msg ) =
    ( { model | selectedCompletionIndex = selectedCompletionIndex }
    , msg
    )


updateErrors : List Editor.Msg.Error -> ( Editor.Msg.Model, Cmd msg ) -> ( Editor.Msg.Model, Cmd msg )
updateErrors errors ( model, msg ) =
    let
        travelable =
            model.travelable
    in
    case errors == model.errors of
        True ->
            ( model, Cmd.batch <| msg :: [] )

        False ->
            let
                nextRenderableLines =
                    List.indexedMap
                        (\lineNumber renderableLine ->
                            let
                                lineErrors =
                                    List.filter (\err -> err.line == lineNumber) errors
                            in
                            { renderableLine | errors = lineErrors }
                        )
                        model.travelable.renderableLines
            in
            ( { model | errors = errors, travelable = { travelable | renderableLines = nextRenderableLines } }
            , Cmd.batch <| msg :: []
            )


getTravelableByFile : String -> Model -> Maybe Travelable
getTravelableByFile file model =
    case getCurrentHistoryIndexAndHistoryByFile file model of
        Just ( index, history ) ->
            List.Extra.getAt index history

        Nothing ->
            Nothing


previousCursorPositionsForCurrentFile : Model -> List Editor.Msg.EditorCoordinate
previousCursorPositionsForCurrentFile model =
    getCurrentHistoryIndexAndHistoryByFile model.file model
        |> Maybe.map second
        |> Maybe.map (List.map .cursorPosition)
        |> Maybe.withDefault []


getCurrentHistoryIndexAndHistoryByFile : String -> Model -> Maybe HistoryIndexAndHistory
getCurrentHistoryIndexAndHistoryByFile file model =
    Dict.get file model.histories


updateSymbols : List Symbol -> ( Editor.Msg.Model, Cmd msg ) -> ( Editor.Msg.Model, Cmd msg )
updateSymbols symbols ( model, msg ) =
    let
        travelable =
            model.travelable

        historyIndex =
            getCurrentHistoryIndexAndHistoryByFile model.file model
                |> Maybe.map first
    in
    case symbols == model.symbols && historyIndex == Just 0 of
        True ->
            ( model, Cmd.batch <| msg :: [] )

        False ->
            let
                nextRenderableLines =
                    List.indexedMap
                        (\lineNumber renderableLine ->
                            let
                                lineSymbols =
                                    List.filter (\symbol -> symbol.start.line <= lineNumber && symbol.end.line >= lineNumber && symbol.kind >= 100) symbols
                                        |> List.map
                                            (\symbol ->
                                                if lineNumber == symbol.start.line && lineNumber == symbol.end.line then
                                                    -- single line multiline thing
                                                    { kind = symbol.kind, start = symbol.start.character, end = Just symbol.end.character, styles = [] }

                                                else if lineNumber > symbol.start.line && lineNumber < symbol.end.line then
                                                    -- middle of multiline thing
                                                    { kind = symbol.kind, start = 0, end = Nothing, styles = [] }

                                                else if lineNumber == symbol.start.line && lineNumber < symbol.end.line then
                                                    -- top line of multiline thing
                                                    { kind = symbol.kind, start = symbol.start.character, end = Nothing, styles = [] }

                                                else
                                                    -- bottom line of multiline thing
                                                    { kind = symbol.kind, start = 0, end = Just symbol.end.character, styles = [] }
                                            )
                            in
                            { renderableLine | multilineSymbols = lineSymbols }
                        )
                        model.travelable.renderableLines
            in
            ( { model | symbols = symbols, travelable = { travelable | renderableLines = nextRenderableLines } }
            , msg
            )


updateRenderableLines : List Editor.Msg.RenderableLine -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg ) -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
updateRenderableLines renderableLines ( model, msg ) =
    let
        travelable =
            model.travelable
    in
    ( { model | travelable = { travelable | renderableLines = renderableLines } }
    , msg
    )
        |> withRequestChange


withRequestChange : ( Editor.Msg.Model, Cmd Editor.Msg.Msg ) -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
withRequestChange ( model, msg ) =
    ( model, msg )
        |> addMsg (renderableLinesToContents model.travelable.renderableLines |> model.ports.requestChange)


updateEditor : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg ) -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
updateEditor model ( nextModel, msg ) =
    let
        currentHistoryIndex =
            getCurrentHistoryIndexAndHistoryByFile model.file model
                |> Maybe.map first

        nextCurrentHistoryIndexAndHistory =
            getCurrentHistoryIndexAndHistoryByFile model.file nextModel

        -- Only changed by undo/redo
        hasHistoryChange =
            currentHistoryIndex /= Maybe.map first nextCurrentHistoryIndexAndHistory

        nextTravelable =
            case ( hasHistoryChange, nextCurrentHistoryIndexAndHistory ) of
                ( True, Just ( nextHistoryIndex, nextHistory ) ) ->
                    case List.Extra.getAt nextHistoryIndex nextHistory of
                        Just historicalTravelable ->
                            historicalTravelable

                        Nothing ->
                            model.travelable

                _ ->
                    nextModel.travelable

        updatedNextHistory =
            case ( nextModel.travelable.cursorPosition.y /= model.travelable.cursorPosition.y, nextCurrentHistoryIndexAndHistory ) of
                ( True, Just ( nextHistoryIndex, nextHistory ) ) ->
                    let
                        ( head, tail ) =
                            List.Extra.splitAt nextHistoryIndex nextHistory
                    in
                    Just ( nextHistoryIndex, List.concat [ head, [ nextTravelable ], tail ] )

                ( False, Just ( nextHistoryIndex, nextHistory ) ) ->
                    Just ( nextHistoryIndex, nextHistory )

                _ ->
                    Nothing

        requestChangeMessage =
            case hasHistoryChange of
                True ->
                    renderableLinesToContents nextTravelable.renderableLines |> model.ports.requestChange

                False ->
                    Cmd.none
    in
    ( { nextModel
        | travelable = nextTravelable
        , histories = Dict.update model.file (always updatedNextHistory) model.histories
      }
    , Cmd.batch
        [ msg
        , requestChangeMessage
        , syncScrollPosition nextTravelable model
        ]
    )


scrollToCursor : ( Editor.Msg.Model, Cmd Editor.Msg.Msg ) -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
scrollToCursor ( model, msg ) =
    ( model, msg )
        |> addMsg
            (Cmd.batch
                [ Browser.Dom.getViewportOf "editor-rendered"
                    |> Task.andThen
                        (\rendered ->
                            let
                                cursorColumn =
                                    toFloat model.travelable.cursorPosition.x * Constants.characterWidth
                            in
                            if cursorColumn < rendered.viewport.x then
                                Browser.Dom.setViewportOf "editor-rendered" cursorColumn rendered.viewport.height

                            else if cursorColumn > rendered.viewport.x + rendered.viewport.width - Constants.characterWidth then
                                Browser.Dom.setViewportOf "editor-rendered" (cursorColumn - rendered.viewport.width + Constants.characterWidth) rendered.viewport.height

                            else
                                Task.succeed ()
                        )
                    |> Task.attempt (\_ -> Editor.Msg.NoOp)
                , Browser.Dom.getViewportOf "editor-container"
                    |> Task.andThen
                        (\container ->
                            let
                                cursorLine =
                                    toFloat model.travelable.cursorPosition.y
                                        * toFloat Constants.lineHeight

                                lineHeight =
                                    toFloat Constants.lineHeight
                            in
                            if cursorLine < toFloat model.travelable.scrollTop then
                                Browser.Dom.setViewportOf "editor-container" container.viewport.width (toFloat model.travelable.cursorPosition.y * lineHeight)

                            else if cursorLine > toFloat model.travelable.scrollTop + container.viewport.height - toFloat Constants.lineHeight then
                                Browser.Dom.setViewportOf "editor-container" container.viewport.width (cursorLine - container.viewport.height + lineHeight)

                            else
                                Task.succeed ()
                        )
                    |> Task.attempt (\_ -> Editor.Msg.NoOp)
                ]
            )


syncScrollPosition : Travelable -> Model -> Cmd Editor.Msg.Msg
syncScrollPosition nextTravelable model =
    Cmd.batch
        [ case nextTravelable.scrollLeft /= model.travelable.scrollLeft of
            True ->
                Browser.Dom.getViewportOf "editor-rendered"
                    |> Task.andThen
                        (\container -> Browser.Dom.setViewportOf "editor-rendered" (toFloat nextTravelable.scrollLeft) container.scene.height)
                    |> Task.attempt (\_ -> Editor.Msg.NoOp)

            False ->
                Cmd.none
        , case nextTravelable.scrollTop /= model.travelable.scrollTop of
            True ->
                Browser.Dom.getViewportOf "editor-container"
                    |> Task.andThen
                        (\container -> Browser.Dom.setViewportOf "editor-container" container.scene.width (toFloat nextTravelable.scrollTop))
                    |> Task.attempt (\_ -> Editor.Msg.NoOp)

            False ->
                Cmd.none
        ]


createRenderableLine : Int -> String -> RenderableLine
createRenderableLine lengthOfRenderableLines text =
    RenderableLine (String.fromInt (lengthOfRenderableLines + 1)) text [] []


encodeTravelable : Editor.Msg.Travelable -> Json.Encode.Value
encodeTravelable travelable =
    Json.Encode.object
        [ ( "cursorPosition"
          , Json.Encode.object
                [ ( "x", Json.Encode.int travelable.cursorPosition.x )
                , ( "y", Json.Encode.int travelable.cursorPosition.y )
                ]
          )
        , ( "scrollTop", Json.Encode.int travelable.scrollTop )
        , ( "scrollLeft", Json.Encode.int travelable.scrollLeft )
        , ( "renderableLines"
          , encodeJsonRenderableLines travelable.renderableLines
          )
        ]


encodeJsonRenderableLines : List Editor.Msg.RenderableLine -> Json.Encode.Value
encodeJsonRenderableLines renderableLines =
    Json.Encode.list
        (\{ text } ->
            Json.Encode.object
                [ ( "text", Json.Encode.string text )
                ]
        )
        renderableLines


contentsToRenderableLines : String -> List Editor.Msg.RenderableLine
contentsToRenderableLines contents =
    List.indexedMap createRenderableLine <| String.lines contents


renderableLinesToContents : List Editor.Msg.RenderableLine -> String
renderableLinesToContents renderableLines =
    let
        length =
            List.length renderableLines - 1
    in
    List.Extra.indexedFoldl
        (\index renderableLine acc ->
            let
                ending =
                    case length == index of
                        True ->
                            ""

                        False ->
                            "\n"
            in
            acc ++ renderableLine.text ++ ending
        )
        ""
        renderableLines


init : Bool -> String -> String -> Config -> Ports -> Editor.Msg.Model
init active file contents config ports =
    let
        travelable =
            makeNewTravelable contents
    in
    { mode =
        case config.vimMode of
            True ->
                Editor.Msg.Normal

            False ->
                Editor.Msg.Insert
    , file = file
    , syntax = getSyntaxFromFileName file
    , config = config
    , normalBuffer = Editor.Msg.NormalBuffer 0 "" ""
    , active = active
    , doubleTripleClick = ( 1, Editor.Msg.EditorCoordinate 0 0 )
    , errors = []
    , selectionState = Editor.Msg.None
    , selection = Nothing
    , travelable = travelable
    , histories = Dict.fromList [ ( file, ( 0, [ travelable ] ) ) ]
    , completions = []
    , selectedCompletionIndex = 0
    , symbols = []
    , ports = ports
    }


getEditorLineNumbersWidth : Int -> Float
getEditorLineNumbersWidth numberOfLines =
    max 40 ((*) Constants.characterWidth <| toFloat <| String.length (String.fromInt <| numberOfLines))
        + Constants.lineNumbersRightMargin


mouseEventToEditorPosition : String -> (Editor.Msg.EditorCoordinate -> msg) -> Int -> Html.Attribute msg
mouseEventToEditorPosition event msg lineNumber =
    Html.Events.custom event <|
        Json.Decode.map (\message -> { message = message, preventDefault = False, stopPropagation = False }) <|
            Json.Decode.map
                (\x ->
                    msg
                        { x = round ((toFloat x - (Constants.characterWidth / 2)) / Constants.characterWidth)
                        , y = lineNumber
                        }
                )
                (Json.Decode.field "offsetX" Json.Decode.int)


renderCursor : Editor.Msg.Config -> Editor.Msg.EditorCoordinate -> Int -> Html.Html msg -> Html.Html msg
renderCursor config cursorPositions scrollLeft renderedCompletions =
    case config.showCursor of
        False ->
            Html.text ""

        True ->
            let
                { x, y } =
                    cursorPositions
            in
            Html.span
                ([ Html.Attributes.class "cursor"
                 , Html.Attributes.style "position" "absolute"
                 , Html.Attributes.style "left" ((String.fromFloat <| (toFloat x * Constants.characterWidth) - toFloat scrollLeft) ++ "px")
                 , Html.Attributes.style "top" (String.fromInt (y * Constants.lineHeight) ++ "px")
                 ]
                    ++ cursorStyles
                )
                [ renderedCompletions
                ]


renderCompletions : Int -> List Editor.Msg.Completion -> Html.Html msg
renderCompletions selectedCompletionIndex completions =
    Html.div
        [ Html.Attributes.style "position" "absolute"
        , Html.Attributes.style "top" (String.fromInt Constants.lineHeight ++ "px")
        , Html.Attributes.style "background" "var(--completion-background-color)"
        , Html.Attributes.style "width" "max-content"
        , Html.Attributes.style "display" "flex"
        , Html.Attributes.style "flex-direction" "column"
        ]
        (List.indexedMap
            (\index completion ->
                Html.div
                    [ Html.Attributes.style "padding" "0 8px"
                    , Html.Attributes.style "background"
                        (if selectedCompletionIndex == index then
                            "var(--completion-selected-background-color)"

                         else
                            ""
                        )
                    ]
                    [ Html.text completion.label ]
            )
            completions
        )


renderSelection : Maybe Editor.Msg.Selection -> Int -> Html.Html msg
renderSelection selection scrollLeft =
    case selection of
        Just ( start, end ) ->
            case start.y == end.y of
                True ->
                    Html.div
                        ([ Html.Attributes.style "left"
                            ((String.fromFloat <|
                                (if start.x <= end.x then
                                    toFloat start.x * Constants.characterWidth

                                 else
                                    toFloat end.x * Constants.characterWidth
                                )
                                    - toFloat scrollLeft
                             )
                                ++ "px"
                            )
                         , Html.Attributes.style "top" (String.fromInt (start.y * Constants.lineHeight) ++ "px")
                         , Html.Attributes.style "width" ((String.fromFloat <| toFloat (abs (start.x - end.x) + 1) * Constants.characterWidth) ++ "px")
                         , Html.Attributes.style "height" (String.fromInt Constants.lineHeight ++ "px")
                         ]
                            ++ selectionStyles
                        )
                        []

                False ->
                    let
                        left =
                            (if start.y < end.y || start.y == end.y then
                                toFloat start.x * Constants.characterWidth

                             else
                                0
                            )
                                - toFloat scrollLeft
                    in
                    Html.div
                        []
                        [ -- start line
                          Html.div
                            ([ Html.Attributes.style "left"
                                ((String.fromFloat <| left) ++ "px")
                             , Html.Attributes.style "top" (String.fromInt (start.y * Constants.lineHeight) ++ "px")
                             , Html.Attributes.style "width"
                                (if start.y < end.y || start.y == end.y then
                                    "calc(100% - " ++ String.fromFloat left ++ "px)"

                                 else
                                    (String.fromFloat <| toFloat (start.x + 1) * Constants.characterWidth) ++ "px"
                                )
                             , Html.Attributes.style "height" (String.fromInt Constants.lineHeight ++ "px")
                             ]
                                ++ selectionStyles
                            )
                            []

                        -- middle lines
                        , Html.div
                            ([ Html.Attributes.style "left" "0"
                             , Html.Attributes.style "top"
                                (String.fromInt
                                    (((if start.y < end.y then
                                        start.y

                                       else
                                        end.y
                                      )
                                        + 1
                                     )
                                        * Constants.lineHeight
                                    )
                                    ++ "px"
                                )
                             , Html.Attributes.style "width" "100%"
                             , Html.Attributes.style "height" ((String.fromInt <| (*) Constants.lineHeight <| max 0 <| (abs <| end.y - start.y) - 1) ++ "px")
                             ]
                                ++ selectionStyles
                            )
                            []

                        -- end line
                        , Html.div
                            ([ Html.Attributes.style "left"
                                ((String.fromFloat <|
                                    (if start.y < end.y || start.y == end.y then
                                        0

                                     else
                                        toFloat end.x * Constants.characterWidth
                                    )
                                        - toFloat scrollLeft
                                 )
                                    ++ "px"
                                )
                             , Html.Attributes.style "top" (String.fromInt (end.y * Constants.lineHeight) ++ "px")
                             , Html.Attributes.style "width"
                                (if start.y < end.y || start.y == end.y then
                                    (String.fromFloat <| toFloat (end.x + 1) * Constants.characterWidth) ++ "px"

                                 else
                                    "100%"
                                )
                             , Html.Attributes.style "height" (String.fromInt Constants.lineHeight ++ "px")
                             ]
                                ++ selectionStyles
                            )
                            []
                        ]

        Nothing ->
            Html.div [] []


orderSelectionCoordinates ( a, b ) =
    ( getTopCoordinate a b, getBottomCoordinate a b )


getBottomCoordinate a b =
    case getTopCoordinate b a == a of
        True ->
            b

        False ->
            a


getTopCoordinate a b =
    if a.y < b.y then
        a

    else if a.y == b.y then
        if a.x < b.x then
            a

        else
            b

    else
        b


handleSelectionUpdate : Editor.Msg.Model -> Editor.Msg.EditorCoordinate -> Selection -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
handleSelectionUpdate model spot selection =
    let
        ( start, _ ) =
            selection
    in
    model
        |> startUpdateEditor
        |> updateSelection (Just ( start, spot ))
        |> updateCursorPosition spot
        |> updateEditor model


runHandler : (Editor.Msg.Model -> ( Editor.Msg.Model, Cmd msg )) -> ( Editor.Msg.Model, Cmd msg ) -> ( Editor.Msg.Model, Cmd msg )
runHandler handler =
    \( model, msgs ) ->
        let
            ( nextModel, _ ) =
                handler model
        in
        ( nextModel, msgs )


startUpdateEditor : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd msg )
startUpdateEditor =
    (\b a -> (\aa bb -> ( aa, bb )) a b) Cmd.none



--decodeJsonEditorCoordinate : Json.Decode.Decoder Editor.Msg.EditorCoordinate
--decodeJsonEditorCoordinate =
--    Json.Decode.map2 Editor.Msg.EditorCoordinate
--        (Json.Decode.field "x" Json.Decode.int)
--        (Json.Decode.field "y" Json.Decode.int)
--decodeJsonRenderableLine : Json.Decode.Decoder Editor.Msg.RenderableLine
--decodeJsonRenderableLine =
--    Json.Decode.map3 Editor.Msg.RenderableLine
--        (Json.Decode.field "text" Json.Decode.string)
--        (Json.Decode.field "key" Json.Decode.string)
--        (Json.Decode.succeed Nothing)
--decodeJsonRenderableLines : Json.Decode.Decoder (List Editor.Msg.RenderableLine)
--decodeJsonRenderableLines =
--    Json.Decode.list decodeJsonRenderableLine
--decodeJsonTravelable : Json.Decode.Decoder Editor.Msg.Travelable
--decodeJsonTravelable =
--    Json.Decode.map2 Editor.Msg.Travelable
--        (Json.Decode.field "cursorPositions" (Json.Decode.list decodeJsonEditorCoordinate))
--        (Json.Decode.field "renderableLines" decodeJsonRenderableLines)
