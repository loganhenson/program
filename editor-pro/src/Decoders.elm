module Decoders exposing (..)

import FileTree.Types exposing (..)
import Json.Decode exposing (..)
import Types exposing (VideError, VideErrorType(..))


decodeVideError : Decoder VideError
decodeVideError =
    field "message" string
        |> Json.Decode.andThen
            (\message ->
                map2 VideError
                    (field "type" (decodeVideErrorType message))
                    (field "message" string)
            )


decodeVideErrorType : String -> Decoder VideErrorType
decodeVideErrorType message =
    string
        |> Json.Decode.andThen
            (\str ->
                case str of
                    "FILE_TREE_CREATE_DIRECTORY_ALREADY_EXISTS" ->
                        succeed (FileTreeError (DirectoryAlreadyExistsError message))

                    _ ->
                        Json.Decode.fail "Unknown error type"
            )
