module TestCase exposing (initModel)

import Editor
import Editor.Lib as Lib
import Editor.Msg exposing (Config, Model)


initModel : String -> Config -> Model
initModel contents config =
    Lib.init True
        ""
        contents
        config
        Editor.initialPorts
