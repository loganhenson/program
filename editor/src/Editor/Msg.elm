module Editor.Msg exposing (..)

import Dict exposing (Dict)
import Editor.RawKeyboard as RawKeyboard
import Editor.Syntax.Types exposing (Syntax)
import Json.Encode


type alias ScrollLeft =
    { scrollLeft : Int
    }


type alias ScrollTop =
    { scrollTop : Int
    }


type alias Ports =
    { requestPaste : () -> Cmd Msg
    , requestRun : String -> Cmd Msg
    , requestCopy : String -> Cmd Msg
    , requestSave : String -> Cmd Msg
    , requestChange : String -> Cmd Msg
    , requestCharacterWidth : () -> Cmd Msg
    , receiveCharacterWidth : (Float -> Msg) -> Sub Msg
    , requestCompletion : CompletionRequest -> Cmd Msg
    }


type alias Range =
    { start : Position, end : Position }


type alias Position =
    { line : Int, character : Int }


type alias TextEdit =
    { newText : String
    , range : Range
    }


type alias Completion =
    { label : String, textEdit : Maybe TextEdit }


type alias CompletionRequest =
    { line : Int
    , character : Int
    , token : String
    }


type Mode
    = Insert
    | Normal


type SelectionState
    = Selecting
    | None


type alias EditorCoordinate =
    { x : Int, y : Int }


type alias Selection =
    ( EditorCoordinate, EditorCoordinate )


type alias RenderableLine =
    { key : String
    , text : String
    , errors : List Error
    , multilineSymbols : List Editor.Syntax.Types.MultilineSymbol
    }


type alias Location =
    { range : Range }


type alias Region =
    { start : Location, end : Location }


type alias Error =
    { line : Int, col : Maybe Int, message : String }


type alias Dimensions =
    { scene : { width : Int, height : Int }, viewport : { x : Int, y : Int, width : Int, height : Int }, element : { x : Float, y : Float, width : Float, height : Int } }


type alias NormalBuffer =
    { number : Int
    , command : String
    , clipboard : String
    }


type alias Config =
    { vimMode : Bool
    , showLineNumbers : Bool
    , padBottom : Bool
    , padRight : Bool
    , showCursor : Bool
    , characterWidth : Float
    }


type alias Model =
    { mode : Mode
    , file : String
    , syntax : Maybe Syntax
    , active : Bool
    , config : Config
    , normalBuffer : NormalBuffer
    , doubleTripleClick : ( Int, EditorCoordinate )
    , errors : List Error
    , selectionState : SelectionState
    , selection : Maybe Selection
    , travelable : Travelable
    , histories : Dict String HistoryIndexAndHistory
    , completions : List Completion
    , selectedCompletionIndex : Int
    , symbols : List Symbol
    , ports : Ports
    }


type alias HistoryIndexAndHistory =
    ( Int, History )


type alias History =
    List Travelable


type alias Symbol =
    { kind : Int
    , start : { line : Int, character : Int }
    , end : { line : Int, character : Int }
    }


type alias Travelable =
    { cursorPosition : EditorCoordinate
    , renderableLines : List RenderableLine
    , scrollLeft : Int
    , scrollTop : Int
    }


type Msg
    = RawKeyboardMsg RawKeyboard.Msg
    | SaveResponse Json.Encode.Value
    | PasteResponse String
    | ErrorsResponse Json.Encode.Value
    | CompletionResponse Json.Encode.Value
    | SymbolResponse Json.Encode.Value
    | MouseClick EditorCoordinate
    | MouseDown EditorCoordinate
    | MouseUp EditorCoordinate
    | FontChanged
    | WindowMouseUp ()
    | MouseMove EditorCoordinate
    | ClearSelection
    | RenderedScroll ScrollLeft
    | ContainerScroll ScrollTop
    | NoOp
