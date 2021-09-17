module TestCase exposing (initModel)

import Terminal
import Terminal.Types exposing (Model)


initModel : Model
initModel =
    Terminal.init ""
        { requestPaste = \_ -> Cmd.none
        , requestRun = \_ -> Cmd.none
        , requestCopy = \_ -> Cmd.none
        , requestCompletion =
            \completionRequest ->
                Cmd.none
        , requestChange =
            \code ->
                Cmd.none
        , requestSave =
            \code ->
                Cmd.none
        }
        { requestPasteTerminal = \_ -> Cmd.none
        , requestCopyTerminal = \_ -> Cmd.none
        , requestRunTerminal = \_ -> Cmd.none
        , requestQuit = \_ -> Cmd.none
        }
