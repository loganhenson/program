module Terminal.Types exposing (..)

import Dict exposing (Dict)
import Editor.Msg
import Json.Encode


type alias Buffer =
    { editor : Editor.Msg.Model, scrollRegion : Maybe ( Int, Int ) }


type TerminalBuffer
    = Primary
    | Alternate


type TerminalCommand
    = TerminalCommandText String
    | TerminalCommandSequence String
    | TerminalCommandSequenceAndSingleStringArgument String String
    | TerminalCommandSequenceAndSingleArgument String Int
    | TerminalCommandSequenceAndDoubleArgument String Int Int
    | TerminalCommandSequenceAndTripleArgument String Int Int Int


type alias TerminalSize =
    { height : Int, width : Int }


type alias TerminalOutput =
    List TerminalCommand


type alias Terminal =
    { size : TerminalSize
    , scrollback : Editor.Msg.Model
    , activeBuffer : TerminalBuffer
    , primaryBuffer : Buffer
    , alternateBuffer : Buffer
    , styles : Dict String String
    }


type alias Ports =
    { requestRunTerminal : String -> Cmd Msg
    , requestPasteTerminal : () -> Cmd Msg
    , requestCopyTerminal : () -> Cmd Msg
    , requestQuit : () -> Cmd Msg
    }


type alias Model =
    { terminal : Terminal
    , ports : Ports
    }


type Msg
    = ReceivedTerminalOutput Json.Encode.Value
    | ReceivedTerminalResized Json.Encode.Value
    | ReceivedCharacterWidth Float
    | TerminalEditorMsg Editor.Msg.Msg
    | NoOp
