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
            Terminal.init model.home (editorPorts model.home) (terminalPorts newId model.home)

        newTab =
            { id = newId, terminal = newTerminalModel, closeArmed = False, attention = False }

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
        active =
            List.Extra.getAt model.activeTerminalIndex model.terminals
    in
    Ports.setActiveContext
        (Json.Encode.object
            [ ( "terminalId"
              , case active of
                    Just tab ->
                        Json.Encode.string tab.id

                    Nothing ->
                        Json.Encode.null
              )

            -- the window takes the title the shell set for the active tab
            , ( "title"
              , active
                    |> Maybe.map (\tab -> tab.terminal.terminal.title)
                    |> Maybe.withDefault ""
                    |> Json.Encode.string
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
                    updateTerminal tab terminalMsg model

        TerminalMsgFor terminalId terminalMsg ->
            case List.Extra.find (\tt -> tt.id == terminalId) model.terminals of
                Nothing ->
                    ( model, Cmd.none )

                Just tab ->
                    updateTerminal tab terminalMsg model

        OpenTerminal ->
            openTerminal model

        SelectTerminal idx ->
            if idx == model.activeTerminalIndex then
                ( disarmCloses model, Cmd.none )

            else
                let
                    nextModel =
                        { model
                            | activeTerminalIndex = idx
                            , terminals = List.indexedMap (\i tt -> if i == idx then { tt | attention = False } else tt) model.terminals
                        }
                            |> disarmCloses
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


{-| Run a message through one terminal, then react to what changed: a shell
that exited closes its tab (and the app with the last one), and a new title
on the active tab becomes the window title.
-}
updateTerminal : TerminalTab -> Terminal.Types.Msg -> Model -> ( Model, Cmd Msg )
updateTerminal tab terminalMsg model =
    let
        ( nextTerminal, terminalMsgs ) =
            Terminal.update terminalMsg tab.terminal

        isActive =
            List.Extra.getAt model.activeTerminalIndex model.terminals
                |> Maybe.map (\active -> active.id == tab.id)
                |> Maybe.withDefault False

        -- a bell in a background tab marks the tab until it is looked at
        rang =
            nextTerminal.terminal.bells /= tab.terminal.terminal.bells

        nextModel =
            mapTerminalById tab.id
                (\t -> { t | terminal = nextTerminal, attention = t.attention || (rang && not isActive) })
                model

        commands =
            Cmd.map (TerminalMsgFor tab.id) terminalMsgs
    in
    if nextTerminal.terminal.exited && not tab.terminal.terminal.exited then
        if List.length model.terminals <= 1 then
            ( nextModel, Cmd.batch [ commands, Ports.requestQuit () ] )

        else
            case List.Extra.findIndex (\tt -> tt.id == tab.id) model.terminals of
                Just index ->
                    update (CloseTerminalConfirmed index) nextModel
                        |> Tuple.mapSecond (\closing -> Cmd.batch [ commands, closing ])

                Nothing ->
                    ( nextModel, commands )

    else if isActive && nextTerminal.terminal.title /= tab.terminal.terminal.title then
        ( nextModel, Cmd.batch [ commands, emitActiveContext nextModel ] )

    else
        ( nextModel, commands )


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
        , Sub.map TerminalMsg <| Ports.receiveTerminalPaste Terminal.Types.ReceivedPaste
        , Sub.map TerminalMsg <| Ports.receiveTerminalFocus Terminal.Types.ReceivedFocus
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
                    { label =
                        (if tt.attention then
                            "● "

                         else
                            ""
                        )
                            ++ (if String.isEmpty tt.terminal.terminal.title then
                                    "Terminal " ++ String.fromInt (i + 1)

                                else
                                    tt.terminal.terminal.title
                               )
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
