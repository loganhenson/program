module FuzzyFinder.Model exposing (..)


type alias Model =
    { fuzzyFinderInputValue : String
    , fuzzyFinderHighlightedIndex : Int
    , fuzzyFindResults : List String
    }
