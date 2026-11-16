module TestCase exposing (initModel)

import Editor
import Terminal
import Terminal.Types exposing (Model)


initModel : Model
initModel =
    Terminal.init "" Editor.initialPorts Terminal.initialPorts
