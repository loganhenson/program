module Workspace.Lib exposing
    ( active
    , addOrFocus
    , empty
    , findByPath
    , findIndexByPath
    , mapActive
    , mapActiveWithCmd
    , mapWorkspaceByPath
    , removeAt
    )

import FuzzyFinder.FuzzyFinder
import List.Extra
import Model exposing (Model)
import Types exposing (Focused(..))
import Workspace.Types exposing (Workspace)


{-| Return the currently-active workspace, if there is one.
-}
active : Model -> Maybe Workspace
active model =
    List.Extra.getAt model.activeIndex model.workspaces


{-| Apply a pure transform to the active workspace. No-op when the model
has no workspaces.
-}
mapActive : (Workspace -> Workspace) -> Model -> Model
mapActive f model =
    { model
        | workspaces = List.Extra.updateAt model.activeIndex f model.workspaces
    }


{-| Apply a transform that also produces a Cmd to the active workspace.
Cmd.none returned when there is no active workspace.
-}
mapActiveWithCmd : (Workspace -> ( Workspace, Cmd msg )) -> Model -> ( Model, Cmd msg )
mapActiveWithCmd f model =
    case active model of
        Just ws ->
            let
                ( nextWs, cmd ) =
                    f ws
            in
            ( { model
                | workspaces = List.Extra.setAt model.activeIndex nextWs model.workspaces
              }
            , cmd
            )

        Nothing ->
            ( model, Cmd.none )


{-| A freshly-created workspace for the given project path, with all
per-workspace state at its initial values.
-}
empty : String -> Workspace
empty projectPath =
    { projectPath = projectPath
    , editor = Nothing
    , fileHistory = []
    , activeFile = Nothing
    , terminal = Nothing
    , terminalShowing = True
    , fileTree = Nothing
    , fileTreeShowing = False
    , focused = FileTree
    , fuzzyFinder = FuzzyFinder.FuzzyFinder.init
    , closeArmed = False
    }


findIndexByPath : String -> Model -> Maybe Int
findIndexByPath path model =
    List.Extra.findIndex (\ws -> ws.projectPath == path) model.workspaces


findByPath : String -> Model -> Maybe Workspace
findByPath path model =
    List.Extra.find (\ws -> ws.projectPath == path) model.workspaces


{-| Apply a pure transform to whichever workspace has `path` as its
projectPath. Useful for routing incoming Tauri events to the right tab
regardless of which one is currently active.
-}
mapWorkspaceByPath : String -> (Workspace -> Workspace) -> Model -> Model
mapWorkspaceByPath path f model =
    case findIndexByPath path model of
        Just idx ->
            { model | workspaces = List.Extra.updateAt idx f model.workspaces }

        Nothing ->
            model


{-| If the path is already an open workspace, switch focus to it. Otherwise
append a fresh workspace and focus it.
-}
addOrFocus : String -> Model -> Model
addOrFocus path model =
    case findIndexByPath path model of
        Just idx ->
            { model | activeIndex = idx }

        Nothing ->
            let
                next =
                    model.workspaces ++ [ empty path ]
            in
            { model | workspaces = next, activeIndex = List.length next - 1 }


{-| Remove the workspace at `idx` and reposition `activeIndex` so the
nearest remaining tab becomes active (or 0 when none remain).
-}
removeAt : Int -> Model -> Model
removeAt idx model =
    let
        next =
            List.Extra.removeAt idx model.workspaces

        nextActive =
            if List.length next == 0 then
                0

            else if idx < model.activeIndex then
                model.activeIndex - 1

            else if idx == model.activeIndex then
                min model.activeIndex (List.length next - 1)

            else
                model.activeIndex
    in
    { model | workspaces = next, activeIndex = max 0 nextActive }
