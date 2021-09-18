module TestCase exposing (initModel)

import Editor
import Terminal
import Terminal.Types exposing (Model)


initModel : Model
initModel =
    Terminal.init ""
        Editor.initialPorts
        { requestPasteTerminal = \_ -> Cmd.none
        , requestCopyTerminal = \_ -> Cmd.none
        , requestRunTerminal = \_ -> Cmd.none
        , requestQuit = \_ -> Cmd.none
        }
