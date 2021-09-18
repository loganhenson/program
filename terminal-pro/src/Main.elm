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
    { directory : String }


init : Flags -> ( Model, Cmd Msg )
init { directory } =
    ( { terminal = Terminal.init directory (editorPorts directory) (terminalPorts directory) }
    , Cmd.batch [ Ports.requestSetupTerminalResizeObserver (), Ports.requestCharacterWidth () ]
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


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.batch
        [ Sub.map TerminalMsg <| Ports.receiveTerminalOutput Terminal.Types.ReceivedTerminalOutput
        , Sub.map TerminalMsg <| Ports.receiveTerminalResized Terminal.Types.ReceivedTerminalResized
        , Sub.map TerminalMsg <| Ports.receiveCharacterWidth Terminal.Types.ReceivedCharacterWidth
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
