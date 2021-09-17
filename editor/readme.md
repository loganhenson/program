# Editor

This is a standalone text/code editor written in Elm.

# Contributing
> Install Dependencies
```
npm i
```

## Build And Run Elm Editor Locally (Via elm-live)
```
npm run start
```

## Run tests
```
npm run test
```

## Styling

```css
/** How to override internals **/
:root {
    /*--font-size: 14px !important;*/
    /*--line-height: 24px !important;*/
    /*--text-color: #d4d4d4 !important;*/
    /*--background-color: #1e1e1e !important;*/
    /*--cursor-color: rgba(255, 255, 255, 0.36) !important;*/
    /*--selection-color: rgba(58, 119, 215, 0.36) !important;*/
    /*--error-color: rgba(255, 0, 0, 0.6) !important;*/
    /*--error-text-color: white !important;*/
}

/** Example Syntax Highlighting **/
.syntax-variable {
    color: rgb(152,	118, 170)
}
.syntax-string,
.syntax-multiline-string {
    color: rgb(43, 179, 103);
}
.syntax-import,
.syntax-module-export,
.syntax-case,
.syntax-of,
.syntax-if,
.syntax-then,
.syntax-else,
.syntax-let,
.syntax-in {
    color: darkorange;
}
.syntax-function-def,
.syntax-function-type-sig {
    color: #f5ff66;
}
.syntax-module {
    color: lightgreen;
}
.syntax-comment,
.syntax-multiline-comment {
    color: lightslategrey;
}
.syntax-parens,
.syntax-equals,
.syntax-comma,
.syntax-open-brace,
.syntax-close-brace,
.syntax-open-bracket,
.syntax-close-bracket,
.syntax-pipe,
.syntax-backslash,
.syntax-number {
    color: cornflowerblue;
}
.syntax-skinny-arrow,
.syntax-left-compose,
.syntax-right-compose,
.syntax-forward-slash,
.syntax-minus,
.syntax-plus,
.syntax-star,
.syntax-double-colon,
.syntax-percent {
    color: indianred;
}
```
