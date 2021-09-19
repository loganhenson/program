module FileTree.Decoders exposing (..)

import FileTree.Types exposing (..)
import Json.Decode exposing (..)


decodeJsonFile : Decoder File
decodeJsonFile =
    map2 File
        (field "path" string)
        (field "contents" string)


decodeFilesJson : Decoder FileTreeAndFlat
decodeFilesJson =
    map2 FileTreeAndFlat
        (field "tree" decodeFileTree)
        (field "flat" (list decodeFileOrDirectory))


decodeFileOrDirectory : Decoder FileOrDirectory
decodeFileOrDirectory =
    map3 FileOrDirectory
        (field "path" string)
        (field "name" string)
        (field "type" decodeFileOrDirectoryType)


decodeFileOrDirectoryType : Decoder FileOrDirectoryType
decodeFileOrDirectoryType =
    string
        |> andThen
            (\str ->
                case str of
                    "file" ->
                        succeed FileOrDirectoryFile

                    "directory" ->
                        succeed FileOrDirectoryDirectory

                    _ ->
                        fail "unknown type (allowed: 'file'|'directory')"
            )


decodeFileTree : Decoder FileTree
decodeFileTree =
    map4 FileTree
        (field "path" string)
        (field "name" string)
        (field "type" decodeFileOrDirectoryType)
        (maybe <|
            field "children"
                (map Children
                    (list (lazy (\_ -> decodeFileTree)))
                )
        )


decodeFiles : Value -> Result Error FileTreeAndFlat
decodeFiles files =
    decodeValue decodeFilesJson files
