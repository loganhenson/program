module Terminal.Types exposing (..)

import Array exposing (Array)
import Editor.Msg
import Json.Encode
import Set exposing (Set)


{-| Kept for consumers of `Terminal.getBuffer`: the active screen projected
onto an editor model (lines of text and a cursor position).
-}
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



-- CELLS


type Color
    = DefaultColor
    | IndexedColor Int
    | RgbColor Int Int Int


{-| `attributes` is a bit set, see the `attribute*` values in `Terminal.Screen`.
-}
type alias Style =
    { foreground : Color
    , background : Color
    , attributes : Int
    , link : String
    }


{-| One column of the grid.

`width` is 1 for a normal character, 2 for the first column of a wide
character and 0 for the second column of a wide character (`char` is "" then).
Combining characters are appended to the `char` of the cell they modify.

-}
type alias Cell =
    { char : String
    , width : Int
    , style : Style
    }


{-| `wrapped` is set when the line continues on the next one because the text
ran into the right margin (as opposed to an explicit line feed).
-}
type alias Line =
    { cells : Array Cell
    , wrapped : Bool
    }


type alias Cursor =
    { x : Int, y : Int }


type alias SavedCursor =
    { cursor : Cursor
    , pen : Style
    , origin : Bool
    , autoWrap : Bool
    }


{-| `cursor.x` can be equal to the width of the screen: the cursor is then
past the last column and the next character wraps to the following line.

`scrollTop` and `scrollBottom` are the first and last row (0 based, inclusive)
of the scroll region.

-}
type alias Screen =
    { lines : Array Line
    , cursor : Cursor
    , saved : Maybe SavedCursor
    , scrollTop : Int
    , scrollBottom : Int
    , keyboardFlags : List Int
    , tabStops : Set Int
    }



-- SCROLLBACK


{-| A run of text with one style, `columns` wide.

Runs of plain ASCII are grouped into one span. Every other character gets a
span of its own with `fixed` set, so the view can force it onto the grid even
when the font falls back to a glyph with a different width.

-}
type alias Span =
    { text : String
    , columns : Int
    , style : Style
    , fixed : Bool
    }


type alias ScrollbackLine =
    { spans : List Span
    , wrapped : Bool
    }


{-| Lines are kept in blocks so the view only has to look at the block that
changed. `lines` is newest first.
-}
type alias ScrollbackBlock =
    { id : Int
    , lines : List ScrollbackLine
    , count : Int
    }


type alias Scrollback =
    { blocks : List ScrollbackBlock
    , current : ScrollbackBlock
    }



-- MODES


type MouseTracking
    = MouseOff
    | MouseX10
    | MouseButtons
    | MouseDrag
    | MouseAnyMotion


type MouseEncoding
    = MouseEncodingDefault
    | MouseEncodingSgr
    | MouseEncodingUrxvt
    | MouseEncodingSgrPixels


type alias Modes =
    { applicationCursorKeys : Bool
    , autoWrap : Bool
    , origin : Bool
    , insert : Bool
    , newLine : Bool
    , cursorVisible : Bool
    , reverseVideo : Bool
    , bracketedPaste : Bool
    , focusEvents : Bool
    , mouseTracking : MouseTracking
    , mouseEncoding : MouseEncoding
    , alternateScroll : Bool
    , synchronizedOutput : Bool
    }


{-| DECSCUSR cursor shapes.
-}
type CursorShape
    = CursorBlock
    | CursorUnderline
    | CursorBar


type alias Terminal =
    { size : TerminalSize
    , activeBuffer : TerminalBuffer
    , primary : Screen
    , alternate : Screen
    , scrollback : Scrollback
    , pen : Style
    , modes : Modes
    , cursorShape : CursorShape
    , title : String
    , characterWidth : Float
    , focused : Bool
    , mouse : MouseState
    , exited : Bool
    }


{-| `cell` is the last cell a mouse report was sent for, `wheel` the scroll
distance in pixels that has not added up to a full line yet.
-}
type alias MouseState =
    { cell : ( Int, Int )
    , wheel : Float
    }



-- EFFECTS


{-| Things the terminal asks the outside world to do while applying output.
-}
type Effect
    = Reply String
    | SetTitle String
    | Bell
    | Notify String
    | WriteClipboard String
    | ChildExited



-- INPUT


{-| `MouseWheel` carries the vertical scroll distance in pixels.
-}
type MouseAction
    = MousePress
    | MouseRelease
    | MouseMove
    | MouseWheel Float


{-| `x` and `y` are pixels relative to the top left corner of the screen.
`button` is the DOM button number (0 left, 1 middle, 2 right) and `buttons`
the DOM bit set of buttons held down.
-}
type alias MouseEvent =
    { action : MouseAction
    , x : Float
    , y : Float
    , button : Int
    , buttons : Int
    , shiftKey : Bool
    , altKey : Bool
    , ctrlKey : Bool
    }


type alias Ports =
    { requestRunTerminal : String -> Cmd Msg
    , requestPasteTerminal : () -> Cmd Msg
    , requestCopyTerminal : () -> Cmd Msg
    , requestQuit : () -> Cmd Msg
    , requestSetTitle : String -> Cmd Msg
    , requestBell : () -> Cmd Msg
    , requestNotify : String -> Cmd Msg
    , requestWriteClipboard : String -> Cmd Msg
    , requestExited : () -> Cmd Msg
    }


type alias Model =
    { terminal : Terminal
    , ports : Ports
    }


type Msg
    = ReceivedTerminalOutput Json.Encode.Value
    | ReceivedTerminalResized Json.Encode.Value
    | ReceivedCharacterWidth Float
    | ReceivedPaste String
    | ReceivedFocus Bool
    | ReceivedMouse MouseEvent
    | NoOp
