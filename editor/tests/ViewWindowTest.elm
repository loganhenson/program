module ViewWindowTest exposing (suite)

{-| A big file is drawn as the lines around what can be seen, not all of it.
-}

import Editor
import Editor.Constants as Constants
import Editor.Msg
import Expect
import Html.Attributes
import Test exposing (..)
import Test.Html.Query as Query
import Test.Html.Selector exposing (attribute, id, text)
import TestCase exposing (initModel)


file : Int -> Editor.Msg.Model
file lines =
    initModel (List.range 1 lines |> List.map (\n -> "line number " ++ String.fromInt n) |> String.join "\n") Editor.initialConfig


scrolledTo : Int -> Editor.Msg.Model -> Editor.Msg.Model
scrolledTo line model =
    let
        travelable =
            model.travelable
    in
    { model | travelable = { travelable | scrollTop = line * Constants.lineHeight } }


rendered : Editor.Msg.Model -> Query.Single Editor.Msg.Msg
rendered model =
    Editor.view model |> Query.fromHtml |> Query.find [ id "editor-rendered" ]


{-| How many elements the text is made of (the lines drawn, and the two
empty blocks around them).
-}
drawn : Editor.Msg.Model -> Query.Single Editor.Msg.Msg -> Expect.Expectation
drawn _ =
    Query.children [] >> Query.count (Expect.atMost 400)


suite : Test
suite =
    describe "A big file"
        [ test "is not drawn in full" <|
            \_ -> file 10000 |> rendered |> Query.children [] |> Query.count (Expect.atMost 400)
        , test "a small file is drawn in full" <|
            \_ -> file 40 |> rendered |> Query.children [] |> Query.count (Expect.equal 42)
        , test "at the top, the first lines are there and far ones are not" <|
            \_ ->
                file 10000
                    |> rendered
                    |> Expect.all
                        [ Query.has [ text "line number 1" ]
                        , Query.has [ text "line number 100" ]
                        , Query.hasNot [ text "line number 5000" ]
                        ]
        , test "scrolled to the middle, the lines there are drawn, with some to spare on both sides" <|
            \_ ->
                file 10000
                    |> scrolledTo 5000
                    |> rendered
                    |> Expect.all
                        [ Query.has [ text "line number 5001" ]
                        , Query.has [ text "line number 4970" ]
                        , Query.has [ text "line number 5100" ]
                        , Query.hasNot [ text "line number 2" ]
                        , Query.hasNot [ text "line number 9999" ]
                        ]
        , test "scrolled to the end, the last lines are drawn" <|
            \_ ->
                file 10000
                    |> scrolledTo 9990
                    |> rendered
                    |> Expect.all
                        [ Query.has [ text "line number 10000" ]
                        , Query.has [ text "line number 9900" ]
                        ]
        , test "what is not drawn still takes up its height, so the scrollbar and positions do not move" <|
            \_ ->
                List.concatMap
                    (\scroll ->
                        let
                            w =
                                Editor.window (Editor.windowStart (scroll * Constants.lineHeight)) (Editor.windowLength 900) 10000
                        in
                        [ w.above + (w.end - w.start) * Constants.lineHeight + w.below ]
                    )
                    [ 0, 1, 59, 60, 61, 500, 5000, 9990, 10000, 20000 ]
                    |> List.all ((==) (10000 * Constants.lineHeight))
                    |> Expect.equal True
        , test "the lines around any scroll position are inside the window" <|
            \_ ->
                List.map
                    (\firstVisible ->
                        let
                            w =
                                Editor.window (Editor.windowStart (firstVisible * Constants.lineHeight)) (Editor.windowLength 900) 10000

                            -- a window 900 pixels tall
                            lastVisible =
                                min 9999 (firstVisible + 900 // Constants.lineHeight + 1)
                        in
                        w.start <= firstVisible && lastVisible < w.end
                    )
                    (List.range 0 9900)
                    |> List.all identity
                    |> Expect.equal True
        , test "the window only moves in steps, so most scrolling draws nothing new" <|
            \_ ->
                List.range 0 600
                    |> List.map (\px -> Editor.windowStart (2000 * Constants.lineHeight + px))
                    |> List.foldl (\start seen -> if List.member start seen then seen else start :: seen) []
                    |> List.length
                    |> Expect.atMost 2
        , test "a scroll position left over from a longer file does not empty the view" <|
            \_ ->
                file 50
                    |> scrolledTo 8000
                    |> rendered
                    |> Expect.all
                        [ Query.has [ text "line number 1" ]
                        , Query.has [ text "line number 50" ]
                        ]
        , test "a taller editor gets a longer window, a short one a short window" <|
            \_ ->
                Expect.all
                    [ \_ -> Editor.windowLength 2400 |> Expect.greaterThan (Editor.windowLength 600)
                    , \_ -> Editor.windowLength 600 |> Expect.atMost 160

                    -- before the height is known the window is long enough for any screen
                    , \_ -> Editor.windowLength 0 |> Expect.atLeast (3000 // Constants.lineHeight)
                    ]
                    ()
        , test "the line numbers are drawn for the same lines" <|
            \_ ->
                Editor.view (file 10000 |> scrolledTo 5000)
                    |> Query.fromHtml
                    |> Expect.all
                        [ Query.has [ text "5001" ]
                        , Query.hasNot [ text "9999" ]
                        ]
        ]
