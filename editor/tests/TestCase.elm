module TestCase exposing (initModel)

import Editor.Lib as Lib
import Editor.Msg exposing (Config, Model)


initModel : String -> Config -> Model
initModel contents config =
    Lib.init True
        ""
        contents
        config
        { requestPaste = \_ -> Cmd.none
        , requestRun = \_ -> Cmd.none
        , requestCopy = \_ -> Cmd.none
        , requestSave = \_ -> Cmd.none
        , requestChange = \_ -> Cmd.none
        , requestCompletion = \_ -> Cmd.none
        }
