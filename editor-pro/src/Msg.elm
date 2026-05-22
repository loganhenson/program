module Msg exposing (..)

import Browser.Dom as Dom
import Editor.Msg
import Editor.RawKeyboard as RawKeyboard
import FileTree.Types
import Json.Encode
import Notification.Types
import Terminal.Types
import Time


type Msg
    = EditorMsg Editor.Msg.Msg
    | FileTreeMsg FileTree.Types.Msg
    | RequestActivateFileOrDirectory String
    | ActivateFile Json.Encode.Value
    | ActivateDirectory String
    | FuzzyFindProjects String
    | FuzzyFindInProjectFileOrDirectory String
    | ReceivedFuzzyFindResults (List String)
    | ReceivedNotification Json.Encode.Value
    | DismissNotification Notification.Types.Notification
    | RequestOpenProject String
    | ReceivedFileTree Json.Encode.Value
    | ReceivedVideError Json.Encode.Value
    | TerminalMsg Terminal.Types.Msg
    | FocusElementByIdResult (Result Dom.Error ())
    | FocusEditor
    | FocusFileTree
    | FocusTerminal
    | RawKeyboardMsg RawKeyboard.Msg
    | RequestPickProjectFolder
    | PickedProjectFolder (Maybe String)
    | ReceivedRecentProjects (List String)
    | NotificationReceivedAt Notification.Types.Notification Time.Posix
    | NotificationTick Time.Posix
    | ExternalFileChange Json.Encode.Value
    | ExternalFileDelete String
