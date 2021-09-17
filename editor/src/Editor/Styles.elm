module Editor.Styles exposing (..)

import Editor.Constants
import Editor.Msg exposing (Config)
import Html
import Html.Attributes exposing (class, style)


editorContainerStyles : Bool -> List (Html.Attribute msg)
editorContainerStyles active =
    [ style "font-family" "JetBrainsMono Nerd Font Mono, Monaco, monospace"

    -- this makes each character's rendered width 8.4px
    , style "font-size" "var(--font-size)"
    , style "line-height" "var(--line-height)"
    , style "color" "var(--text-color)"
    , style "margin" "0"

    --
    , style "background" "var(--background-color)"
    , style "flex" "3"
    , style "width" "100%"
    , style "height" "100%"
    , style "overflow-x" "hidden"
    , style "overflow-y" "scroll"
    , style "display" "flex"
    , case active of
        True ->
            style "user-select" "none"

        False ->
            style "user-select" "text"
    ]


renderedStyles : Config -> List (Html.Attribute msg)
renderedStyles config =
    [ case config.padRight of
        True ->
            style "padding-right" "250px"

        False ->
            style "padding-right" "0"
    , case config.padBottom of
        True ->
            style "padding-bottom" "250px"

        False ->
            style "padding-bottom" "0"
    , style "height" "100%"
    , style "flex" "1"
    , style "overflow" "hidden"
    , style "margin-top" "0"
    , style "white-space" "pre"
    , style "color" "var(--text-color)"
    , style "overflow-x" "scroll"
    ]


cursorStyles : List (Html.Attribute msg)
cursorStyles =
    [ style "background" "var(--background-color)"
    , style "pointer-events" "none"
    ]


editorLineNumbersStyles : Config -> List (Html.Attribute msg)
editorLineNumbersStyles config =
    [ style "color" "rgba(255, 255, 255, 0.25)"
    , case config.padBottom of
        True ->
            style "padding-bottom" "250px"

        False ->
            style "padding-bottom" "0"
    , style "min-height" "100%"
    , style "height" "fit-content"
    , style "margin-right" (String.fromFloat Editor.Constants.lineNumbersRightMargin ++ "px")
    , style "min-width" "40px"
    , style "text-align" "center"
    , style "background" "#333333"
    , style "z-index" "1"
    ]


selectionStyles : List (Html.Attribute msg)
selectionStyles =
    [ style "position" "absolute"
    , style "background" "var(--selection-color)"
    , style "pointer-events" "none"
    ]


editorStyles : Config -> Float -> List (Html.Attribute msg)
editorStyles config lineNumbersWidth =
    [ style "display" "flex"
    , style "min-height" "100%"
    , style "height" "fit-content"
    , case config.showLineNumbers of
        True ->
            style "width" ("calc(100% - " ++ String.fromFloat lineNumbersWidth ++ "px)")

        False ->
            style "width" "100%"
    , style "position" "relative"
    , style "cursor" "text"
    ]


editorPseudoStyles : String
editorPseudoStyles =
    """
    :root {
        /**
         * font ratio is usually 0.6 * font-size = width of monospace character
         */
        --font-size: 14px;
        --line-height: 24px;
        --text-color: #d4d4d4;
        --background-color: #1e1e1e;
        --completion-background-color: #635c5c;
        --completion-selected-background-color: #2b6cb0;
        --cursor-color: rgba(255, 255, 255, 0.36);
        --selection-color: rgba(58, 119, 215, 0.36);
        --error-color: rgba(255, 0, 0, 0.6);
        --error-message-background-color: #2d3748;
        --error-text-color: white;
    }

    .error {
         border-bottom: 1px solid var(--error-color);
         position: relative;
         padding-bottom: 3px;
    }

    .error:hover .message, .message:hover {
        display: block;
        overflow: scroll;
        max-height: 250px;
        max-width: 500px;
    }

    .error .message {
        z-index: 1;
        top: 100%;
        color: white;
        position: absolute;
        left: 0;
        user-select: text;
        white-space: pre;
        display: none;
        width: max-content;
        background: var(--error-message-background-color);
        padding: 10px;
    }

    /** Normal mode cursor **/
    .mode--normal .cursor::before {
        content: " ";
        white-space: pre;
        position: absolute;
        height: var(--line-height);
        border-bottom: 1px solid white;
        background: var(--cursor-color);
    }

    /** Insert mode cursor **/
    .mode--insert .cursor::before {
        content: " ";
        position: absolute;
        height: var(--line-height);
        border-left: 2px solid var(--cursor-color);
        background: transparent;
    }

    .mode--insert .cursor-at-end::after {
        content: " ";
        margin-left: -1px;
        border-left: 2px solid var(--cursor-color);
    }
    """
