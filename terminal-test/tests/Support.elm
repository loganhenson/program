module Support exposing
    ( cellAt
    , cursor
    , effects
    , key
    , one
    , rows
    , run
    , screen
    , seq
    , str
    , styleAt
    , three
    , two
    , txt
    )

{-| Helpers for writing terminal tests in terms of the commands the parser
produces: `run 4 20 [ txt "hello", seq "[K" ]`.
-}

import Array
import Editor.RawKeyboard exposing (RawKey)
import Terminal.Screen as Screen
import Terminal.Types exposing (..)


txt : String -> TerminalCommand
txt =
    TerminalCommandText


seq : String -> TerminalCommand
seq =
    TerminalCommandSequence


one : String -> Int -> TerminalCommand
one =
    TerminalCommandSequenceAndSingleArgument


two : String -> Int -> Int -> TerminalCommand
two =
    TerminalCommandSequenceAndDoubleArgument


three : String -> Int -> Int -> Int -> TerminalCommand
three =
    TerminalCommandSequenceAndTripleArgument


str : String -> String -> TerminalCommand
str =
    TerminalCommandSequenceAndSingleStringArgument


{-| A terminal of the given height and width after the commands.
-}
run : Int -> Int -> List TerminalCommand -> Terminal
run height width commands =
    Screen.applyAll commands (Screen.init { height = height, width = width })
        |> Tuple.first


effects : Int -> Int -> List TerminalCommand -> List Effect
effects height width commands =
    Screen.applyAll commands (Screen.init { height = height, width = width })
        |> Tuple.second


{-| The rows of the screen, without the padding at the end of each row.
-}
rows : Terminal -> List String
rows terminal =
    List.map String.trimRight (Screen.screenText terminal)


{-| The whole screen as one string, without trailing blank rows.
-}
screen : Terminal -> String
screen terminal =
    rows terminal
        |> String.join "\n"
        |> String.trimRight


cursor : Terminal -> ( Int, Int )
cursor terminal =
    let
        position =
            (Screen.activeScreen terminal).cursor
    in
    ( position.x, position.y )


cellAt : Int -> Int -> Terminal -> Maybe Cell
cellAt x y terminal =
    Array.get y (Screen.activeScreen terminal).lines
        |> Maybe.andThen (\line -> Array.get x line.cells)


styleAt : Int -> Int -> Terminal -> Style
styleAt x y terminal =
    cellAt x y terminal
        |> Maybe.map .style
        |> Maybe.withDefault Screen.defaultStyle


{-| A key press without modifiers: `key "KeyA" "a"`.
-}
key : String -> String -> RawKey
key code character =
    { key = character
    , code = code
    , shiftKey = False
    , altKey = False
    , ctrlKey = False
    , metaKey = False
    }
