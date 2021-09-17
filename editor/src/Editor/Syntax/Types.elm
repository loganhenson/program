module Editor.Syntax.Types exposing (Error, MultilineSymbol, Symbol, Syntax, SyntaxMatch, Token)


type alias Error =
    { line : Int, col : Maybe Int, message : String }


type alias Symbol =
    { name : String
    , kind : Int
    , start : { line : Int, character : Int }
    , end : { line : Int, character : Int }
    }


type alias MultilineSymbol =
    { kind : Int
    , start : Int
    , end : Maybe Int
    , styles : List ( String, String )
    }


type alias SyntaxMatch =
    { class : String, regex : String }


type alias Syntax =
    List SyntaxMatch


type alias Token =
    { index : Int, class : String, styles : List ( String, String ), length : Int }
