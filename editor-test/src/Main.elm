module Main exposing (main)

import Browser
import Dict exposing (Dict)
import Editor exposing (initialPorts)
import Editor.Lib
import Editor.Msg
import Html exposing (div, text)
import Html.Attributes exposing (class)
import Html.Events exposing (onClick)
import Ports


type alias Flags =
    {}


type alias Model =
    { editor : Maybe Editor.Msg.Model, file : Maybe String, files : Dict String String }


type Msg
    = EditorMsg Editor.Msg.Msg
    | ActivateFile String String
    | FileChanged String
    | NoOp


init : Flags -> ( Model, Cmd Msg )
init _ =
    ( { editor = Nothing
      , file = Nothing
      , files = files
      }
    , Cmd.none
    )


ports : Editor.Msg.Ports
ports =
    { initialPorts
        | requestPaste = Ports.requestPaste
        , requestRun = \_ -> Cmd.none
        , requestCopy = Ports.requestCopy
        , requestCompletion = \_ -> Cmd.none
        , requestChange = \contents -> Ports.requestChange contents
        , requestCharacterWidth = Ports.requestCharacterWidth
        , receiveCharacterWidth = Ports.receiveCharacterWidth
        , requestSave = \_ -> Cmd.none
    }


main : Program Flags Model Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ Sub.map EditorMsg <| Ports.receiveSave Editor.Msg.SaveResponse
        , Sub.map EditorMsg <| Ports.receivePaste Editor.Msg.PasteResponse
        , Sub.map EditorMsg <| Ports.receiveErrors Editor.Msg.ErrorsResponse
        , Ports.receiveChange FileChanged
        , case model.editor of
            Just editor ->
                Sub.map EditorMsg <| Editor.subscriptions editor

            Nothing ->
                Sub.none
        ]


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        EditorMsg m ->
            case model.editor of
                Just editor ->
                    let
                        ( newEditor, msgs ) =
                            Editor.update m editor
                    in
                    ( { model | editor = Just newEditor }, Cmd.map EditorMsg msgs )

                Nothing ->
                    ( model, Cmd.none )

        FileChanged contents ->
            case model.file of
                Just file ->
                    ( { model | files = Dict.update file (always (Just contents)) model.files }, Cmd.none )

                Nothing ->
                    ( model, Cmd.none )

        ActivateFile file contents ->
            let
                ( nextEditor, msgs ) =
                    case model.editor of
                        Just editor ->
                            Editor.Lib.changeFile editor file contents

                        Nothing ->
                            ( Editor.Lib.init
                                True
                                file
                                contents
                                { vimMode = True
                                , showLineNumbers = True
                                , padBottom = True
                                , padRight = True
                                , showCursor = True
                                , characterWidth = 8.40625
                                }
                                ports
                            , Cmd.none
                            )
            in
            ( { model
                | file = Just file
                , editor = Just nextEditor
              }
            , Cmd.map EditorMsg msgs
            )

        NoOp ->
            ( model, Cmd.none )


view : Model -> Html.Html Msg
view model =
    div [ class "p-4" ]
        [ div [ class "flex justify-around mb-6" ]
            (Dict.values <|
                Dict.map
                    (\file contents ->
                        div [ onClick (ActivateFile file contents) ] [ text file ]
                    )
                    model.files
            )
        , case model.editor of
            Just editor ->
                div [ class "h-64 w-128" ]
                    [ Html.map EditorMsg <| Editor.view editor
                    ]

            Nothing ->
                text ""
        ]


type alias File =
    { file : String, contents : String }


files : Dict String String
files =
    Dict.fromList
        [ ( "test.js", """
let mass = 5;

function getFuelByMass(mass) {
    return (mass / 3)
}

console.log(mass)
        """ )
        , ( "test.php"
          , """<?php
$fn1 = fn($x) => $x + $y;

$fn2 = function ($x) use ($y) {
    return $x + $y;
};

function getFuelByMass($mass) {
    return ($mass / 3)
}"""
          )
        , ( "test.elm"
          , """module Editor.Mode.Insert.Handlers.DownArrow exposing (handle)

import Editor.Lib
import Editor.Msg
import Editor.VerticalMovement as VerticalMovement


handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg ) handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )handle : Editor.Msg.Model -> ( Editor.Msg.Model, Cmd Editor.Msg.Msg )
handle model =
   let
       { x, y } =
           Editor.Lib.currentCursorPosition model.travelable.cursorPositions

               """
          )
        , ( "test.json"
          , """{
     "type": "application",
     "source-directories": [
         "src",
         "../src"
     ],
     "elm-version": "0.19.1",
     "dependencies": {
         "direct": {
             "capitalist/elm-octicons": "2.3.0",
             "elm/browser": "1.0.1",
             "elm/core": "1.0.0",
             "elm/html": "1.0.0",
             "elm/http": "1.0.0",
             "elm/json": "1.1.3",
             "elm/regex": "1.0.0",
             "elm-community/list-extra": "8.1.0",
             "elm-community/string-extra": "4.0.0",
             "hecrj/html-parser": "2.4.0"
         },
         "indirect": {
             "elm/parser": "1.1.0",
             "elm/svg": "1.0.1",
             "elm/time": "1.0.0",
             "elm/url": "1.0.0",
             "elm/virtual-dom": "1.0.2",
             "rtfeldman/elm-hex": "1.0.0"
         }
     },
     "test-dependencies": {
         "direct": {},
         "indirect": {}
     }
}
"""
          )
        ]
