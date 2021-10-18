use terminal::parse::{parse, TerminalCommand};

#[test]
fn it_can_parse_move_cursor_to_top_left_corner() {
    let result = parse("\u{1b}[H", |_output| {});

    assert_eq!(
        result,
        [TerminalCommand::TerminalCommandSequence {
            command: String::from("[H"),
        }]
    );
}

#[test]
fn it_can_parse_tab() {
    let result = parse("\n1\t2", |_output| {});

    assert_eq!(
        result,
        [
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\n"),
            },
            TerminalCommand::Text(String::from("1")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\t"),
            },
            TerminalCommand::Text(String::from("2"))
        ]
    );
}

#[test]
fn it_can_parse_normal_text() {
    let result = parse("Hello!", |_output| {});

    assert_eq!(result, [TerminalCommand::Text(String::from("Hello!"))]);
}

#[test]
fn it_can_parse_cursor_movement() {
    let result = parse("\u{1b}[1A", |_output| {});

    assert_eq!(
        result,
        [TerminalCommand::TerminalCommandSequenceAndSingleArgument {
            command: String::from("[A"),
            argument: 1,
        }]
    );
}

#[test]
fn it_can_parse_cursor_movement_by_line_col() {
    let result = parse("\u{1b}[1;2H", |_output| {});

    assert_eq!(
        result,
        [TerminalCommand::TerminalCommandSequenceAndDoubleArgument {
            command: String::from("[H"),
            argument1: 1,
            argument2: 2,
        }]
    );
}

#[test]
fn it_can_parse_color_without_leading_number() {
    let result = parse("\u{1b}[38m", |_output| {});

    assert_eq!(
        result,
        [TerminalCommand::TerminalCommandSequenceAndSingleArgument {
            command: String::from("[m"),
            argument: 38,
        }]
    );
}

#[test]
fn it_can_parse_window_scroll_down() {
    let result = parse("\u{1b}[2M", |_output| {});

    assert_eq!(
        result,
        [TerminalCommand::TerminalCommandSequenceAndSingleArgument {
            command: String::from("[M"),
            argument: 2,
        }]
    );
}

#[test]
fn it_can_parse_window_scroll_up() {
    let result = parse("\u{1b}[2D", |_output| {});

    assert_eq!(
        result,
        [TerminalCommand::TerminalCommandSequenceAndSingleArgument {
            command: String::from("[D"),
            argument: 2,
        }]
    );
}

#[test]
fn it_can_parse_insert_lines() {
    let result = parse("\u{1b}[2L", |_output| {});

    assert_eq!(
        result,
        [TerminalCommand::TerminalCommandSequenceAndSingleArgument {
            command: String::from("[L"),
            argument: 2,
        }]
    );
}

#[test]
fn it_can_parse_truecolor_background() {
    let result = parse("\u{1b}[48;2;255;254;253m", |_output| {});

    assert_eq!(
        result,
        [TerminalCommand::TerminalCommandSequenceAndTripleArgument {
            command: String::from("[m-bg-rgb"),
            argument1: 255,
            argument2: 254,
            argument3: 253,
        }]
    );
}

#[test]
fn it_can_parse_truecolor_foreground() {
    let result = parse("\u{1b}[38;2;255;254;253m", |_output| {});

    assert_eq!(
        result,
        [TerminalCommand::TerminalCommandSequenceAndTripleArgument {
            command: String::from("[m-fg-rgb"),
            argument1: 255,
            argument2: 254,
            argument3: 253,
        }]
    );
}

#[test]
fn it_can_parse_256color_background() {
    let result = parse("\u{1b}[48;5;253m", |_output| {});

    assert_eq!(
        result,
        [TerminalCommand::TerminalCommandSequenceAndSingleArgument {
            command: String::from("[m-bg-256"),
            argument: 253,
        }]
    );
}

#[test]
fn it_can_parse_256color_foreground() {
    let result = parse("\u{1b}[38;5;253m", |_output| {});

    assert_eq!(
        result,
        [TerminalCommand::TerminalCommandSequenceAndSingleArgument {
            command: String::from("[m-fg-256"),
            argument: 253,
        }]
    );
}

#[test]
fn it_can_parse_16color() {
    let result = parse("\u{1b}[01;32m➜", |_output| {});

    assert_eq!(
        result,
        [
            TerminalCommand::TerminalCommandSequenceAndDoubleArgument {
                command: String::from("[m"),
                argument1: 1,
                argument2: 32,
            },
            TerminalCommand::Text(String::from("➜"))
        ]
    );
}

#[test]
fn it_can_parse_set_scroll_region() {
    let result = parse("\u{1b}[1;6r", |_output| {});

    assert_eq!(
        result,
        [TerminalCommand::TerminalCommandSequenceAndDoubleArgument {
            command: String::from("[r"),
            argument1: 1,
            argument2: 6,
        }]
    );
}

#[test]
fn it_can_parse_title() {
    let result = parse(
        "\u{1b}]2;loganhenson@Logans-MacBook-Pro:~\u{7}\u{1b}]1;~\u{7}",
        |_output| {},
    );

    assert_eq!(
        result,
        [
            TerminalCommand::TerminalCommandSequenceAndSingleStringArgument {
                command: String::from("set-window-title"),
                argument: String::from("loganhenson@Logans-MacBook-Pro:~"),
            },
            TerminalCommand::TerminalCommandSequenceAndSingleStringArgument {
                command: String::from("set-icon-name"),
                argument: String::from("~"),
            }
        ]
    );
}

#[test]
fn it_can_parse_initial_escape_sequences_from_shell() {
    let result = parse("\u{1b}[1m\u{1b}[7m%\u{1b}[27m\u{1b}[1m\u{1b}[0m                                                                                             \r \r", |_output| {});

    assert_eq!(
    result,
    [
      TerminalCommand::TerminalCommandSequenceAndSingleArgument { command: String::from("[m"), argument: 1 },
      TerminalCommand::TerminalCommandSequenceAndSingleArgument { command: String::from("[m"), argument: 7 },
      TerminalCommand::Text(String::from("%")),
      TerminalCommand::TerminalCommandSequenceAndSingleArgument { command: String::from("[m"), argument: 27 },
      TerminalCommand::TerminalCommandSequenceAndSingleArgument { command: String::from("[m"), argument: 1 },
      TerminalCommand::TerminalCommandSequenceAndSingleArgument { command: String::from("[m"), argument: 0 },
      TerminalCommand::Text(String::from("                                                                                             ")),
      TerminalCommand::TerminalCommandSequence {
        command: String::from("\r")
      },
      TerminalCommand::Text(String::from(" ")),
      TerminalCommand::TerminalCommandSequence {
        command: String::from("\r")
      },
    ]
  );
}

#[test]
fn it_can_parse_more_initial_escape_sequences_from_shell() {
    let result = parse(
        "\r\u{1b}[0m\u{1b}[27m\u{1b}[24m\u{1b}[J\u{1b}[01;32m➜  \u{1b}[36m~\u{1b}[00m \u{1b}[K",
        |_output| {},
    );

    assert_eq!(
        result,
        [
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\r")
            },
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[m"),
                argument: 0
            },
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[m"),
                argument: 27
            },
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[m"),
                argument: 24
            },
            TerminalCommand::TerminalCommandSequence {
                command: String::from("[J")
            },
            TerminalCommand::TerminalCommandSequenceAndDoubleArgument {
                command: String::from("[m"),
                argument1: 1,
                argument2: 32
            },
            TerminalCommand::Text(String::from("➜  ")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[m"),
                argument: 36
            },
            TerminalCommand::Text(String::from("~")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[m"),
                argument: 0
            },
            TerminalCommand::Text(String::from(" ")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("[K")
            },
        ]
    );
}

#[test]
fn it_can_handle_stitching_partial_escape_sequences() {
    let result = parse("\u{1b}[49m\u{1b}[48;5;", |_output| {});

    assert_eq!(
        result,
        [
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[m"),
                argument: 49
            },
            TerminalCommand::TerminalCommandPartial(String::from("\u{1b}[48;5;"))
        ]
    );
}

#[test]
fn it_can_handle_stitching_partial_escape_sequences_when_it_ends_in_an_escape() {
    let result = parse("\u{1b}[m\u{1b}", |_output| {});

    assert_eq!(
        result,
        [
            TerminalCommand::TerminalCommandSequence {
                command: String::from("[m"),
            },
            TerminalCommand::TerminalCommandPartial(String::from("\u{1b}"))
        ]
    );
}

#[test]
fn it_can_handle_long_escape_numbers_without_panic() {
    // This test exists because u16 was too small to match this
    // so the argument type changed to u32 in the enum
    let result = parse("\u{1b}[9999999D", |_output| {});

    assert_eq!(
        result,
        [TerminalCommand::TerminalCommandSequenceAndSingleArgument {
            command: String::from("[D"),
            argument: 9999999
        }]
    );
}

// Test of cursor-control characters inside ESC sequences.
#[test]
fn vt_test_1() {
    let result = parse(
    "A\u{1b}[2CB\u{1b}[2CC\u{1b}[2CD\u{1b}[2CE\u{1b}[2CF\u{1b}[2CG\u{1b}[2CH\u{1b}[2CI\u{1b}[2C\r\r\n",
    |_output| {},
  );

    assert_eq!(
        result,
        [
            TerminalCommand::Text(String::from("A")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 2
            },
            TerminalCommand::Text(String::from("B")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 2
            },
            TerminalCommand::Text(String::from("C")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 2
            },
            TerminalCommand::Text(String::from("D")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 2
            },
            TerminalCommand::Text(String::from("E")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 2
            },
            TerminalCommand::Text(String::from("F")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 2
            },
            TerminalCommand::Text(String::from("G")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 2
            },
            TerminalCommand::Text(String::from("H")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 2
            },
            TerminalCommand::Text(String::from("I")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 2
            },
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\r")
            },
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\r")
            },
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\n")
            }
        ]
    );
}

#[test]
fn vt_test_2() {
    let result = parse(
    "A\u{1b}[2\u{8}CB\u{1b}[2\u{8}CC\u{1b}[2\u{8}CD\u{1b}[2\u{8}CE\u{1b}[2\u{8}CF\u{1b}[2\u{8}CG\u{1b}[2\u{8}CH\u{1b}[2\u{8}CI\u{1b}[2\u{8}C\r\r\n",
    |_output| {},
  );

    assert_eq!(
        result,
        [
            TerminalCommand::Text(String::from("A")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\u{8}")
            },
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 2
            },
            TerminalCommand::Text(String::from("B")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\u{8}")
            },
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 2
            },
            TerminalCommand::Text(String::from("C")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\u{8}")
            },
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 2
            },
            TerminalCommand::Text(String::from("D")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\u{8}")
            },
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 2
            },
            TerminalCommand::Text(String::from("E")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\u{8}")
            },
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 2
            },
            TerminalCommand::Text(String::from("F")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\u{8}")
            },
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 2
            },
            TerminalCommand::Text(String::from("G")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\u{8}")
            },
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 2
            },
            TerminalCommand::Text(String::from("H")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\u{8}")
            },
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 2
            },
            TerminalCommand::Text(String::from("I")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\u{8}")
            },
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 2
            },
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\r")
            },
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\r")
            },
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\n")
            }
        ]
    );
}

#[test]
fn vt_test_3() {
    let result = parse(
    "A \u{1b}[\r2CB\u{1b}[\r4CC\u{1b}[\r6CD\u{1b}[\r8CE\u{1b}[\r10CF\u{1b}[\r12CG\u{1b}[\r14CH\u{1b}[\r16CI\r\r\r\n",
    |_output| {},
  );

    assert_eq!(
        result,
        [
            TerminalCommand::Text(String::from("A ")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\r")
            },
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 2
            },
            TerminalCommand::Text(String::from("B")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\r")
            },
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 4
            },
            TerminalCommand::Text(String::from("C")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\r")
            },
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 6
            },
            TerminalCommand::Text(String::from("D")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\r")
            },
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 8
            },
            TerminalCommand::Text(String::from("E")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\r")
            },
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 10
            },
            TerminalCommand::Text(String::from("F")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\r")
            },
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 12
            },
            TerminalCommand::Text(String::from("G")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\r")
            },
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 14
            },
            TerminalCommand::Text(String::from("H")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\r")
            },
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[C"),
                argument: 16
            },
            TerminalCommand::Text(String::from("I")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\r")
            },
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\r")
            },
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\r")
            },
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\n")
            }
        ]
    );
}

#[test]
fn vt_test_4_pretest() {
    // \u{1b}[1\u{b}AB \u{1b}[1\u{b}AC \u{1b}[1\u{b}AD \u{1b}[1\u{b}AE \u{1b}[1\u{b}AF \u{1b}[1\u{b}AG \u{1b}[1\u{b}AH \u{1b}[1\u{b}AI \u{1b}[1\u{b}APush <RETURN>
    let result = parse("A \u{1b}[1\u{b}AB", |_output| {});

    assert_eq!(
        result,
        [
            TerminalCommand::Text(String::from("A ")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[A"),
                argument: 1
            },
            TerminalCommand::Text(String::from("B")),
        ]
    );
}

#[test]
fn vt_test_4() {
    let result = parse(
    "\u{1b}[1\u{b}AB \u{1b}[1\u{b}AC \u{1b}[1\u{b}AD \u{1b}[1\u{b}AE \u{1b}[1\u{b}AF \u{1b}[1\u{b}AG \u{1b}[1\u{b}AH \u{1b}[1\u{b}AI \u{1b}[1\u{b}APush <RETURN>",
    |_output| {},
  );

    assert_eq!(
        result,
        [
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[A"),
                argument: 1
            },
            TerminalCommand::Text(String::from("B ")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[A"),
                argument: 1
            },
            TerminalCommand::Text(String::from("C ")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[A"),
                argument: 1
            },
            TerminalCommand::Text(String::from("D ")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[A"),
                argument: 1
            },
            TerminalCommand::Text(String::from("E ")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[A"),
                argument: 1
            },
            TerminalCommand::Text(String::from("F ")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[A"),
                argument: 1
            },
            TerminalCommand::Text(String::from("G ")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[A"),
                argument: 1
            },
            TerminalCommand::Text(String::from("H ")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[A"),
                argument: 1
            },
            TerminalCommand::Text(String::from("I ")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[A"),
                argument: 1
            },
            TerminalCommand::Text(String::from("Push <RETURN>"))
        ]
    );
}

#[test]
fn it_can_handle_custom_csi_for_web_mode() {
    // [web;url to run to start localhost webserver;url of localhost webserver to access
    // CLI command expected to start a server and provide url
    // e.g: php -S localhost:3000 /Users/loganhenson/vterm-tauri/index.php
    // [web;http://localhost:3000
    let result = parse(
        "\u{1b}_WEB;aHR0cDovL2xvY2FsaG9zdDozMDAw\u{0007}",
        |_output| {},
    );

    assert_eq!(
        result,
        [
            TerminalCommand::TerminalCommandSequenceAndSingleStringArgument {
                command: String::from("_WEB"),
                argument: String::from("http://localhost:3000")
            }
        ]
    );
}

#[test]
fn it_can_handle_bell_escape() {
    let result = parse("TEST\u{1b}[A\n\u{0007}", |_output| {});

    assert_eq!(
        result,
        [
            TerminalCommand::Text(String::from("TEST")),
            TerminalCommand::TerminalCommandSequence {
                command: String::from("[A"),
            },
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\n"),
            },
            TerminalCommand::TerminalCommandSequence {
                command: String::from("\u{0007}"),
            }
        ]
    );
}

#[test]
fn it_can_handle_st_terminator() {
    let result = parse("start\u{1b}]11;?\u{1b}\\\u{1b}nd", |_output| {});

    assert_eq!(
        result,
        [
            TerminalCommand::Text(String::from("start")),
            TerminalCommand::TerminalCommandQuerySequence {
                command: String::from("]11;?\u{1b}\\"),
            },
            TerminalCommand::TerminalCommandPartial(String::from("\u{1b}nd")),
        ]
    );
}

#[test]
fn it_can_handle_cursor_movement_combined_with_escape_uppercase_d() {
    let result = parse("\u{1b}[2;2H+\u{1b}[1D\u{1b}D+", |_output| {});

    assert_eq!(
        result,
        [
            TerminalCommand::TerminalCommandSequenceAndDoubleArgument {
                command: String::from("[H"),
                argument1: 2,
                argument2: 2
            },
            TerminalCommand::Text(String::from("+")),
            TerminalCommand::TerminalCommandSequenceAndSingleArgument {
                command: String::from("[D"),
                argument: 1,
            },
            TerminalCommand::TerminalCommandSequence {
                command: String::from("D")
            },
            TerminalCommand::Text(String::from("+"))
        ]
    );
}

#[test]
fn it_properly_ignores_setting_width_with_3_l() {
    let result = parse("\u{1b}[?3l\u{1b}#8", |_output| {});

    assert_eq!(
        result,
        [TerminalCommand::TerminalCommandSequence {
            command: String::from("#8"),
        }]
    );
}

#[test]
fn it_properly_handles_nested_escape_set_title() {
    let result = parse(
        "\u{1b}]2;echo -e -n \"test\u{1b}M\u{1b}M\"\u{7}",
        |_output| {},
    );

    assert_eq!(
        result,
        [
            TerminalCommand::TerminalCommandSequenceAndSingleStringArgument {
                command: String::from("set-window-title"),
                argument: String::from("echo -e -n \"test\u{1b}M\u{1b}M\"")
            }
        ]
    );
}

#[test]
fn it_properly_ignores_1a_escape() {
    let result = parse("\u{1b}[1asdf", |_output| {});

    assert_eq!(result, [TerminalCommand::Text(String::from("sdf"))]);
}

#[test]
fn it_matches_1m_escape() {
    let result = parse("\u{1b}[1m", |_output| {});

    assert_eq!(
        result,
        [TerminalCommand::TerminalCommandSequenceAndSingleArgument {
            command: String::from("[m"),
            argument: 1
        }]
    );
}

#[test]
fn it_properly_ignores_incomplete_sequence() {
    let result = parse("asdf\u{1b}[1\u{1b}", |_output| {});

    assert_eq!(result, [TerminalCommand::Text(String::from("asdf"))]);
}

#[test]
fn it_parses_example_1() {
    let result = parse("\u{1b}]1;ls\u{7}", |_output| {});

    assert_eq!(
        result,
        [
            TerminalCommand::TerminalCommandSequenceAndSingleStringArgument {
                command: String::from("set-icon-name"),
                argument: String::from("ls")
            }
        ]
    );
}

#[test]
fn it_parses_example_2() {
    let result = parse("\u{1b}]2;ls -G\u{7}\u{1b}]1;ls\u{7}", |_output| {});

    assert_eq!(
        result,
        [
            TerminalCommand::TerminalCommandSequenceAndSingleStringArgument {
                command: String::from("set-window-title"),
                argument: String::from("ls -G")
            },
            TerminalCommand::TerminalCommandSequenceAndSingleStringArgument {
                command: String::from("set-icon-name"),
                argument: String::from("ls")
            }
        ]
    );
}

#[test]
fn it_ignores_device_control_string() {
    let result = parse("\u{1b}Pzz\u{1b}\\test", |_output| {});

    assert_eq!(result, [TerminalCommand::Text(String::from("test"))]);
}

#[test]
fn it_parses_osc_foreground_and_background_bell_form() {
    let result = parse("\u{1b}]10;?\u{7}\u{1b}]11;?\u{7}", |_output| {});

    assert_eq!(
        result,
        [
            TerminalCommand::TerminalCommandQuerySequence {
                command: String::from("]10;?\u{7}"),
            },
            TerminalCommand::TerminalCommandQuerySequence {
                command: String::from("]11;?\u{7}"),
            }
        ]
    );
}

#[test]
fn it_parses_weird_vim_thing_1() {
    let result = parse("\u{1b}[>4;m", |_output| {});

    assert_eq!(result, []);
}

#[test]
fn it_parses_weird_vim_thing_2() {
    let result = parse("\u{1b}[23;2t", |_output| {});

    assert_eq!(result, []);
}

#[test]
fn it_parses_weird_vim_thing_2_number_variants() {
    let result = parse("\u{1b}[23;1t", |_output| {});

    assert_eq!(result, []);
}

#[test]
fn it_parses_text_formatting_with_bright_bold_modifier() {
    let result = parse("\u{1b}[1;38;5;203m", |_output| {});

    assert_eq!(
        result,
        [TerminalCommand::TerminalCommandSequenceAndSingleArgument {
            command: String::from("[m-fg-256"),
            argument: 203
        }]
    );
}

#[test]
fn it_parses_text_formatting_with_non_bright_bold_modifier() {
    let result = parse("\u{1b}[0;38;5;203m", |_output| {});

    assert_eq!(
        result,
        [TerminalCommand::TerminalCommandSequenceAndSingleArgument {
            command: String::from("[m-fg-256"),
            argument: 203
        }]
    );
}

#[test]
fn it_parses_delete_line_without_a_number() {
    let result = parse("\u{1b}[M", |_output| {});

    assert_eq!(
        result,
        [TerminalCommand::TerminalCommandSequence {
            command: String::from("[M"),
        }]
    );
}

#[test]
fn it_parses_delete_line_with_number() {
    let result = parse("\u{1b}[5M", |_output| {});

    assert_eq!(
        result,
        [TerminalCommand::TerminalCommandSequenceAndSingleArgument {
            command: String::from("[M"),
            argument: 5,
        }]
    );
}

#[test]
fn it_parses_text_correctly_when_ending_in_an_escape() {
    let result = parse("bin\u{1b}", |_output| {});

    assert_eq!(
        result,
        [
            TerminalCommand::Text(String::from("bin")),
            TerminalCommand::TerminalCommandPartial(String::from("\u{1b}"))
        ]
    );
}

#[test]
fn it_ignores_1000_h() {
    let result = parse("\u{1b}[?1000h", |_output| {});

    assert_eq!(result, []);
}

#[test]
fn it_ignores_1000_l() {
    let result = parse("\u{1b}[?1000l", |_output| {});

    assert_eq!(result, []);
}
