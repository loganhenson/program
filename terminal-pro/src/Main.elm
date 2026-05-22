module Main exposing (main)

import Browser
import Editor.RawKeyboard as RawKeyboard
import Html exposing (Html, div, text)
import Html.Attributes exposing (class, classList, style)
import Json.Decode
import Json.Encode
import Keybindings exposing (handleKeybindings)
import List.Extra
import Model exposing (Model, TerminalTab)
import Msg exposing (Msg(..))
import PortHandlers exposing (editorPorts, terminalPorts)
import Ports
import Process
import Tabs.Tabs
import Task
import Terminal
import Terminal.Types


type alias Flags =
    { directory : String }


init : Flags -> ( Model, Cmd Msg )
init { directory } =
    let
        ( model, openCmd ) =
            openTerminal
                { home = directory
                , terminals = []
                , activeTerminalIndex = 0
                , terminalCounter = 0
                }
    in
    ( model
    , Cmd.batch
        [ openCmd
        , Ports.requestSetupTerminalResizeObserver ()
        , Ports.requestCharacterWidth ()
        ]
    )


{-| Append a new terminal session, focus it, and tell Rust to spawn the
PTY. Returns the updated model plus the open + setActiveContext cmds.
-}
openTerminal : Model -> ( Model, Cmd Msg )
openTerminal model =
    let
        newId =
            "term-" ++ String.fromInt model.terminalCounter

        newTerminalModel =
            Terminal.init model.home (editorPorts model.home) (terminalPorts model.home)

        newTab =
            { id = newId, terminal = newTerminalModel, closeArmed = False }

        nextModel =
            { model
                | terminals = model.terminals ++ [ newTab ]
                , activeTerminalIndex = List.length model.terminals
                , terminalCounter = model.terminalCounter + 1
            }
    in
    ( nextModel
    , Cmd.batch
        [ Ports.requestOpenTerminal
            (Json.Encode.object
                [ ( "terminalId", Json.Encode.string newId )
                , ( "cwd", Json.Encode.string model.home )
                ]
            )
        , emitActiveContext nextModel
        ]
    )


emitActiveContext : Model -> Cmd Msg
emitActiveContext model =
    let
        activeId =
            List.Extra.getAt model.activeTerminalIndex model.terminals
                |> Maybe.map .id
    in
    Ports.setActiveContext
        (Json.Encode.object
            [ ( "terminalId"
              , case activeId of
                    Just id ->
                        Json.Encode.string id

                    Nothing ->
                        Json.Encode.null
              )
            ]
        )


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        RawKeyboardMsg m ->
            handleKeybindings model m

        TerminalMsg terminalMsg ->
            case List.Extra.getAt model.activeTerminalIndex model.terminals of
                Nothing ->
                    ( model, Cmd.none )

                Just tab ->
                    let
                        ( nextTerminal, terminalMsgs ) =
                            Terminal.update terminalMsg tab.terminal
                    in
                    ( mapTerminalById tab.id (\t -> { t | terminal = nextTerminal }) model
                    , Cmd.map TerminalMsg terminalMsgs
                    )

        TerminalMsgFor terminalId terminalMsg ->
            case List.Extra.find (\tt -> tt.id == terminalId) model.terminals of
                Nothing ->
                    ( model, Cmd.none )

                Just tab ->
                    let
                        ( nextTerminal, terminalMsgs ) =
                            Terminal.update terminalMsg tab.terminal
                    in
                    ( mapTerminalById terminalId (\t -> { t | terminal = nextTerminal }) model
                    , Cmd.map (TerminalMsgFor terminalId) terminalMsgs
                    )

        OpenTerminal ->
            openTerminal model

        SelectTerminal idx ->
            if idx == model.activeTerminalIndex then
                ( disarmCloses model, Cmd.none )

            else
                let
                    nextModel =
                        { model | activeTerminalIndex = idx } |> disarmCloses
                in
                ( nextModel, emitActiveContext nextModel )

        CloseTerminalRequested idx ->
            ( armCloseAt idx model
            , Process.sleep 3000 |> Task.perform (\_ -> DisarmCloseTick)
            )

        CloseTerminalConfirmed idx ->
            case List.Extra.getAt idx model.terminals of
                Nothing ->
                    ( disarmCloses model, Cmd.none )

                Just closingTab ->
                    let
                        remainingTerms =
                            List.Extra.removeAt idx model.terminals

                        nextActiveIdx =
                            if List.isEmpty remainingTerms then
                                0

                            else if idx < model.activeTerminalIndex then
                                model.activeTerminalIndex - 1

                            else if idx == model.activeTerminalIndex then
                                min model.activeTerminalIndex (List.length remainingTerms - 1)

                            else
                                model.activeTerminalIndex

                        nextModel =
                            { model
                                | terminals = remainingTerms
                                , activeTerminalIndex = max 0 nextActiveIdx
                            }
                                |> disarmCloses

                        ( withNext, openCmd ) =
                            if List.isEmpty remainingTerms then
                                openTerminal nextModel

                            else
                                ( nextModel, Cmd.none )
                    in
                    ( withNext
                    , Cmd.batch
                        [ Ports.requestCloseTerminal
                            (Json.Encode.object
                                [ ( "terminalId", Json.Encode.string closingTab.id ) ]
                            )
                        , openCmd
                        , emitActiveContext withNext
                        ]
                    )

        DisarmCloseTick ->
            ( disarmCloses model, Cmd.none )

        NoOp ->
            ( model, Cmd.none )


mapTerminalById : String -> (TerminalTab -> TerminalTab) -> Model -> Model
mapTerminalById id f model =
    { model
        | terminals =
            List.map
                (\tt ->
                    if tt.id == id then
                        f tt

                    else
                        tt
                )
                model.terminals
    }


armCloseAt : Int -> Model -> Model
armCloseAt idx model =
    { model
        | terminals =
            List.indexedMap
                (\i tt -> { tt | closeArmed = i == idx })
                model.terminals
    }


disarmCloses : Model -> Model
disarmCloses model =
    { model | terminals = List.map (\tt -> { tt | closeArmed = False }) model.terminals }


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.batch
        [ Ports.receiveTerminalOutput
            (\envelope ->
                case decodeTerminalEnvelope (Json.Decode.field "data" Json.Decode.value) envelope of
                    Ok ( termId, data ) ->
                        TerminalMsgFor termId (Terminal.Types.ReceivedTerminalOutput data)

                    Err _ ->
                        NoOp
            )
        , Ports.receiveTerminalResized
            (\envelope ->
                case decodeTerminalEnvelope (Json.Decode.field "size" Json.Decode.value) envelope of
                    Ok ( termId, size ) ->
                        TerminalMsgFor termId (Terminal.Types.ReceivedTerminalResized size)

                    Err _ ->
                        NoOp
            )
        , Sub.map TerminalMsg <| Ports.receiveCharacterWidth Terminal.Types.ReceivedCharacterWidth
        , Sub.map RawKeyboardMsg (RawKeyboard.subscriptions True True)
        ]


decodeTerminalEnvelope : Json.Decode.Decoder a -> Json.Decode.Value -> Result Json.Decode.Error ( String, a )
decodeTerminalEnvelope innerDecoder envelope =
    Json.Decode.decodeValue
        (Json.Decode.map2 Tuple.pair
            (Json.Decode.field "terminalId" Json.Decode.string)
            innerDecoder
        )
        envelope


view : Model -> Html.Html Msg
view model =
    div [ class "flex flex-col w-full h-full" ]
        [ terminalTabBar model
        , viewActiveTerminal model
        ]


terminalTabBar : Model -> Html.Html Msg
terminalTabBar model =
    let
        items =
            List.indexedMap
                (\i tt ->
                    { label = "Terminal " ++ String.fromInt (i + 1)
                    , tooltip = Just tt.id
                    , closeArmed = tt.closeArmed
                    }
                )
                model.terminals
    in
    Tabs.Tabs.view
        { tabs = items
        , activeIndex = model.activeTerminalIndex
        , onSelect = SelectTerminal
        , onClose = CloseTerminalRequested
        , onConfirmClose = CloseTerminalConfirmed
        , onAdd = OpenTerminal
        , addTooltip = "Open another terminal"
        }


viewActiveTerminal : Model -> Html.Html Msg
viewActiveTerminal model =
    case List.Extra.getAt model.activeTerminalIndex model.terminals of
        Just activeTab ->
            div
                -- Terminal.view brings its own #terminal-container scroll
                -- context; an extra overflow-y: scroll out here stacks
                -- scrollbars and fights the terminal's autoscroll.
                [ style "flex" "1 1 auto"
                , style "min-height" "0"
                , style "overflow" "hidden"
                ]
                [ Html.map TerminalMsg <| Terminal.view activeTab.terminal ]

        Nothing ->
            text ""


main : Program Flags Model Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }
