module Main exposing (main)

import Browser
import Editor.RawKeyboard as RawKeyboard
import Html exposing (div)
import Html.Attributes exposing (class)
import Keybindings exposing (handleKeybindings)
import Model exposing (Model)
import Msg exposing (Msg(..))
import PortHandlers exposing (editorPorts, terminalPorts)
import Ports
import Terminal
import Terminal.Types


type alias Flags =
    {}


init : Flags -> ( Model, Cmd Msg )
init _ =
    ( { terminal = Terminal.init "" (editorPorts "") (terminalPorts "") }
    , Ports.requestSetupTerminalResizeObserver ()
    )


update : Msg -> Model.Model -> ( Model.Model, Cmd Msg )
update msg model =
    case msg of
        RawKeyboardMsg m ->
            handleKeybindings model m

        TerminalMsg terminalMsg ->
            let
                ( nextTerminal, terminalMsgs ) =
                    Terminal.update terminalMsg model.terminal
            in
            ( { model | terminal = nextTerminal }, Cmd.map TerminalMsg terminalMsgs )


terminalSubscriptions : Sub Msg
terminalSubscriptions =
    Sub.batch
        [ Sub.map TerminalMsg <| Ports.receiveTerminalOutput Terminal.Types.ReceivedTerminalOutput
        , Sub.map TerminalMsg <| Ports.receiveTerminalResized Terminal.Types.ReceivedTerminalResized
        ]


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ terminalSubscriptions
        , Sub.map RawKeyboardMsg (RawKeyboard.subscriptions True True)
        ]


view : Model -> Html.Html Msg
view model =
    div
        [ class "w-full h-full"
        ]
        [ Html.map TerminalMsg <| Terminal.view model.terminal ]


main : Program Flags Model.Model Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }
