//! The parser must never get stuck: whatever a program prints, the output
//! that follows it has to reach the screen.

use terminal::parse::{parse, Parser, Stream, TerminalCommand};

fn sequence(command: &str) -> TerminalCommand {
    TerminalCommand::TerminalCommandSequence {
        command: command.to_string(),
    }
}

fn query(command: &str) -> TerminalCommand {
    TerminalCommand::TerminalCommandQuerySequence {
        command: command.to_string(),
    }
}

fn single(command: &str, argument: u32) -> TerminalCommand {
    TerminalCommand::TerminalCommandSequenceAndSingleArgument {
        command: command.to_string(),
        argument,
    }
}

fn double(command: &str, argument1: u32, argument2: u32) -> TerminalCommand {
    TerminalCommand::TerminalCommandSequenceAndDoubleArgument {
        command: command.to_string(),
        argument1,
        argument2,
    }
}

fn triple(command: &str, argument1: u32, argument2: u32, argument3: u32) -> TerminalCommand {
    TerminalCommand::TerminalCommandSequenceAndTripleArgument {
        command: command.to_string(),
        argument1,
        argument2,
        argument3,
    }
}

fn string(command: &str, argument: &str) -> TerminalCommand {
    TerminalCommand::TerminalCommandSequenceAndSingleStringArgument {
        command: command.to_string(),
        argument: argument.to_string(),
    }
}

fn text(text: &str) -> TerminalCommand {
    TerminalCommand::Text(text.to_string())
}

fn parsed(data: &str) -> Vec<TerminalCommand> {
    parse(data, |_| {})
}

/// Sequences modern programs send. Some we act on, some we ignore, none may
/// swallow what comes after them.
const SEQUENCES: &[&str] = &[
    // erase
    "\x1b[J", "\x1b[0J", "\x1b[1J", "\x1b[2J", "\x1b[3J", "\x1b[K", "\x1b[1K", "\x1b[2K", "\x1b[?2J",
    // cursor
    "\x1b[H", "\x1b[5H", "\x1b[5;10H", "\x1b[;10H", "\x1b[5;10f", "\x1b[A", "\x1b[10A", "\x1b[G", "\x1b[5`",
    "\x1b[5d", "\x1b[3a", "\x1b[3e", "\x1b7", "\x1b8", "\x1b[s", "\x1b[u", "\x1b[2I", "\x1b[Z", "\x1bH",
    "\x1b[g", "\x1b[3g",
    // editing and scrolling
    "\x1b[5@", "\x1b[5P", "\x1b[5X", "\x1b[2L", "\x1b[2M", "\x1b[2S", "\x1b[2T", "\x1b[r", "\x1b[2;20r",
    "\x1b[5r", "\x1bD", "\x1bE", "\x1bM", "\x1b[3b",
    // colors and attributes
    "\x1b[m", "\x1b[0m", "\x1b[1;31m", "\x1b[0;1;31m", "\x1b[38;5;196m", "\x1b[38;5;196;1m",
    "\x1b[38;2;1;2;3m", "\x1b[38;2;1;2;3;48;2;4;5;6m", "\x1b[38:2::1:2:3m", "\x1b[38:5:196m",
    "\x1b[4:3m", "\x1b[58:2::255:0:0m", "\x1b[58;5;9m", "\x1b[22;23;24;27;29;39;49m", "\x1b[38m",
    "\x1b[1;2;3;4;5;7;8;9;21;53m", "\x1b[90;107m",
    // modes
    "\x1b[?25l", "\x1b[?25h", "\x1b[?1049h", "\x1b[?1049l", "\x1b[?47h", "\x1b[?1047l", "\x1b[?1048h",
    "\x1b[?1h", "\x1b[?7l", "\x1b[?6h", "\x1b[?12h", "\x1b[?1000h", "\x1b[?1000;1006h",
    "\x1b[?1002;1003;1004;1005;1006;1015;1016l", "\x1b[?2004h", "\x1b[?2026h", "\x1b[?2026l",
    "\x1b[?2027h", "\x1b[?2031h", "\x1b[?2048h", "\x1b[?9001h", "\x1b[4h", "\x1b[4l", "\x1b[20h",
    "\x1b[?1;3;4;5l", "\x1b[?1049;2004;25h", "\x1b=", "\x1b>", "\x1b[!p", "\x1bc",
    // queries
    "\x1b[c", "\x1b[0c", "\x1b[>c", "\x1b[>0c", "\x1b[=c", "\x1b[5n", "\x1b[6n", "\x1b[?6n", "\x1b[?996n",
    "\x1b[>q", "\x1b[>0q", "\x1b[?u", "\x1b[?2026$p", "\x1b[4$p", "\x1b[14t", "\x1b[16t", "\x1b[18t",
    "\x1b[22;0t", "\x1b[23;2t", "\x1b[x", "\x1bZ",
    // keyboard protocols
    "\x1b[>1u", "\x1b[>31u", "\x1b[<u", "\x1b[<2u", "\x1b[=1;1u", "\x1b[>4;2m", "\x1b[>4m", "\x1b[>4;m",
    // cursor style
    "\x1b[ q", "\x1b[0 q", "\x1b[6 q",
    // character sets
    "\x1b(B", "\x1b(0", "\x1b)0", "\x1b*A", "\x1b+B", "\x1b%G", "\x1b F", "\x1b#3", "\x1b#8", "\x0e", "\x0f",
    "\x1bN", "\x1bO", "\x1bn", "\x1bo", "\x1b|", "\x1b}", "\x1b~",
    // operating system commands, both terminators
    "\x1b]0;title\x07", "\x1b]0;title\x1b\\", "\x1b]0;\x07", "\x1b]1;icon\x07", "\x1b]2;title\x1b\\",
    "\x1b]7;file://host/tmp\x1b\\", "\x1b]7;file://host/tmp\x07", "\x1b]8;;https://example.com\x1b\\",
    "\x1b]8;id=1;https://example.com\x07", "\x1b]8;;\x1b\\", "\x1b]9;hello\x07", "\x1b]9;4;1;50\x07",
    "\x1b]9;4;0\x1b\\", "\x1b]777;notify;title;body\x07", "\x1b]99;i=1;hello\x1b\\", "\x1b]10;?\x07",
    "\x1b]11;?\x1b\\", "\x1b]12;?\x07", "\x1b]4;1;?\x07", "\x1b]4;1;rgb:ff/00/00\x07", "\x1b]104\x07",
    "\x1b]110\x07", "\x1b]111\x07", "\x1b]112\x07", "\x1b]52;c;aGVsbG8=\x07", "\x1b]52;c;?\x07",
    "\x1b]52;c;!!!\x07", "\x1b]133;A\x07", "\x1b]133;D;0\x1b\\", "\x1b]633;A\x07", "\x1b]1337;SetMark\x07",
    "\x1b]1337;File=inline=1:AAAA\x07", "\x1b]\x07", "\x1b]notanumber\x07",
    // device control, application program command, privacy message, start of string
    "\x1bP+q544e\x1b\\", "\x1bP$qm\x1b\\", "\x1bP$q q\x1b\\", "\x1bPq#0;2;0;0;0#0~~\x1b\\", "\x1bP1000p\x1b\\",
    "\x1bPtmux;\x1b\x1b]0;x\x07\x1b\\", "\x1b_Gi=31,s=1,v=1,a=q,t=d,f=24;AAAA\x1b\\", "\x1b_WEB;!!!\x07",
    "\x1b^private\x1b\\", "\x1bXstring\x1b\\",
    // things nobody defined
    "\x1b[1;2;3y", "\x1b[?1;2;3y", "\x1b[>1;2;3y", "\x1b[1;2;3 y", "\x1b[<1;2;3M", "\x1b[999999999999999999999A",
    "\x1b[;;;;;;;;;;m", "\x1b[1:2:3:4:5:6:7m", "\x1b[?", "\x1b[1\x18", "\x1b[1\x1a", "\x1b\x18", "\x1b]0;x\x18",
    "\x7f", "\u{80}\u{9b}\u{9f}", "\x00\x01\x02\x03\x04\x05\x06",
];

#[test]
fn output_after_any_sequence_still_reaches_the_screen() {
    for sequence in SEQUENCES {
        // `[?` ends in the middle of a sequence on purpose: the marker text
        // below then completes it instead of being printed
        if *sequence == "\x1b[?" {
            continue;
        }
        let result = parsed(&format!("{}marker", sequence));
        assert!(
            !result
                .iter()
                .any(|command| matches!(command, TerminalCommand::TerminalCommandPartial(_))),
            "{:?} left the parser in the middle of a sequence: {:?}",
            sequence,
            result
        );
        // after selecting the line drawing set the marker is drawn with it
        let marker = if *sequence == "\x1b(0" { "└▒⎼┐␊⎼" } else { "marker" };
        match result.last() {
            Some(TerminalCommand::Text(text)) => assert!(
                text.ends_with(marker),
                "{:?} swallowed the text after it: {:?}",
                sequence,
                result
            ),
            other => panic!("{:?} swallowed the text after it: {:?}", sequence, other),
        }
    }
}

#[test]
fn unknown_sequences_are_consumed_whole_instead_of_leaking_onto_the_screen() {
    for sequence in [
        "\x1b[1;2;3y",
        "\x1b[?9001h",
        "\x1b[>4;2m",
        "\x1b]133;A\x07",
        "\x1b_Gi=31;AAAA\x1b\\",
        "\x1bPq#0~~\x1b\\",
        "\x1b^private\x1b\\",
        "\x1b(B",
        "\x1b=",
    ] {
        assert_eq!(parsed(&format!("{}marker", sequence)), [text("marker")], "{:?}", sequence);
    }
}

/// Merge neighbouring text commands: where a chunk ends is not meaningful.
fn merged(commands: Vec<TerminalCommand>) -> Vec<TerminalCommand> {
    let mut result: Vec<TerminalCommand> = vec![];
    for command in commands {
        match (result.last_mut(), &command) {
            (Some(TerminalCommand::Text(previous)), TerminalCommand::Text(next)) => previous.push_str(next),
            _ => result.push(command),
        }
    }
    result
}

#[test]
fn splitting_the_stream_anywhere_gives_the_same_commands() {
    let stream: String = SEQUENCES
        .iter()
        .filter(|sequence| **sequence != "\x1b[?")
        .map(|sequence| format!("{}text 日本語 🎉 é ", sequence))
        .collect();
    let bytes = stream.as_bytes();

    let mut whole = Stream::new();
    let expected = merged(whole.feed(bytes));

    for chunk_size in [1, 2, 3, 5, 7, 16, 61, 1024] {
        let mut stream = Stream::new();
        let mut commands = vec![];
        for chunk in bytes.chunks(chunk_size) {
            commands.extend(stream.feed(chunk));
        }
        assert_eq!(merged(commands), expected, "chunks of {} bytes", chunk_size);
    }
}

#[test]
fn a_character_split_across_two_reads_is_put_back_together() {
    let mut stream = Stream::new();
    let bytes = "日本".as_bytes();
    assert_eq!(stream.feed(&bytes[0..2]), []);
    assert_eq!(stream.feed(&bytes[2..4]), [text("日")]);
    assert_eq!(stream.feed(&bytes[4..]), [text("本")]);
}

#[test]
fn invalid_utf8_does_not_stall_the_stream() {
    let mut stream = Stream::new();
    assert_eq!(
        merged(stream.feed(b"a\xff\xfeb\xc3(c")),
        [text("a\u{fffd}\u{fffd}b\u{fffd}(c")]
    );
    // and the stream keeps working afterwards
    assert_eq!(stream.feed(b"\x1b[1mok"), [single("[m", 1), text("ok")]);
}

#[test]
fn random_bytes_never_panic_and_the_parser_recovers() {
    let mut state: u32 = 0x2545_f491;
    let mut bytes = vec![];
    for _ in 0..200_000 {
        state ^= state << 13;
        state ^= state >> 17;
        state ^= state << 5;
        // lean towards the bytes escape sequences are made of
        bytes.push(match state % 7 {
            0 => 0x1b,
            1 => b'[',
            2 => b';',
            3 => b']',
            _ => (state >> 8) as u8,
        });
    }
    let mut stream = Stream::new();
    for chunk in bytes.chunks(4096) {
        stream.feed(chunk);
    }
    // CAN aborts whatever sequence the noise left open
    assert_eq!(stream.feed(b"\x18\x1b[2Jdone"), [sequence("[2J"), text("done")]);
}

#[test]
fn an_oversized_string_sequence_is_dropped_but_ends_at_its_terminator() {
    let huge = "x".repeat(5 * 1024 * 1024);
    let mut parser = Parser::new();
    let mut commands = vec![];
    parser.advance(&format!("\x1b]0;{}\x07after", huge), &mut |command| commands.push(command));
    assert_eq!(commands, [text("after")]);
}

#[test]
fn queries_are_forwarded_for_the_screen_to_answer() {
    assert_eq!(parsed("\x1b[6n"), [query("[6n")]);
    assert_eq!(parsed("\x1b[5n"), [query("[5n")]);
    assert_eq!(parsed("\x1b[?6n"), [query("[?6n")]);
    assert_eq!(parsed("\x1b[c"), [query("[0c")]);
    assert_eq!(parsed("\x1b[0c"), [query("[0c")]);
    assert_eq!(parsed("\x1bZ"), [query("[0c")]);
    assert_eq!(parsed("\x1b[>c"), [query("[>c")]);
    assert_eq!(parsed("\x1b[>0q"), [query("[>q")]);
    assert_eq!(parsed("\x1b[?u"), [query("[?u")]);
    assert_eq!(parsed("\x1b[?2026$p"), [query("[?2026$p")]);
    assert_eq!(parsed("\x1b[18t"), [query("[18t")]);
    assert_eq!(parsed("\x1b]11;?\x07"), [query("]11;?\x07")]);
    assert_eq!(parsed("\x1b]4;5;?\x1b\\"), [query("]4;5;?\x1b\\")]);
    assert_eq!(parsed("\x1bP$qm\x1b\\"), [query("P$qm")]);
    assert_eq!(parsed("\x1bP+q544e\x1b\\"), [query("P+q544e")]);
    // what Claude Code sends when it starts: order is kept
    assert_eq!(
        parsed("\x1b[>0q\x1b[?u\x1b[c"),
        [query("[>q"), query("[?u"), query("[0c")]
    );
}

#[test]
fn private_modes_are_forwarded_one_by_one() {
    assert_eq!(
        parsed("\x1b[?1000;1006h"),
        [sequence("[?1000h"), sequence("[?1006h")]
    );
    assert_eq!(
        parsed("\x1b[?25l\x1b[?2004h\x1b[?2026h\x1b[?1004h"),
        [sequence("[?25l"), sequence("[?2004h"), sequence("[?2026h"), sequence("[?1004h")]
    );
    // modes we have no use for are dropped
    assert_eq!(parsed("\x1b[?12h\x1b[?9001h"), []);
}

#[test]
fn every_form_of_color_is_understood() {
    assert_eq!(parsed("\x1b[38;2;1;2;3m"), [triple("[m-fg-rgb", 1, 2, 3)]);
    assert_eq!(parsed("\x1b[48:2::1:2:3m"), [triple("[m-bg-rgb", 1, 2, 3)]);
    assert_eq!(parsed("\x1b[48:2:1:2:3m"), [triple("[m-bg-rgb", 1, 2, 3)]);
    assert_eq!(parsed("\x1b[38:5:196m"), [single("[m-fg-256", 196)]);
    assert_eq!(
        parsed("\x1b[1;38;2;1;2;3;48;5;4;4m"),
        [single("[m", 1), triple("[m-fg-rgb", 1, 2, 3), single("[m-bg-256", 4), single("[m", 4)]
    );
    assert_eq!(parsed("\x1b[0;1;31m"), [single("[m", 0), single("[m", 1), single("[m", 31)]);
    // curly underline is an underline, 4:0 turns it off
    assert_eq!(parsed("\x1b[4:3m"), [single("[m", 4)]);
    assert_eq!(parsed("\x1b[4:0m"), [single("[m", 24)]);
    // the underline color is accepted and ignored, without eating what follows
    assert_eq!(parsed("\x1b[58:2::255:0:0;1m"), [single("[m", 1)]);
    assert_eq!(parsed("\x1b[58;5;9;1m"), [single("[m", 1)]);
    // out of range values are clamped
    assert_eq!(parsed("\x1b[38;2;999;0;0m"), [triple("[m-fg-rgb", 255, 0, 0)]);
    assert_eq!(parsed("\x1b[;31m"), [double("[m", 0, 31)]);
}

#[test]
fn operating_system_commands() {
    assert_eq!(parsed("\x1b]0;both\x1b\\"), [string("set-icon-name-and-window-title", "both")]);
    assert_eq!(parsed("\x1b]2;\x07"), [string("set-window-title", "")]);
    assert_eq!(
        parsed("\x1b]8;id=a;https://example.com\x1b\\link\x1b]8;;\x1b\\"),
        [string("hyperlink", "https://example.com"), text("link"), string("hyperlink", "")]
    );
    assert_eq!(parsed("\x1b]52;c;aGVsbG8gd29ybGQ=\x07"), [string("clipboard-write", "hello world")]);
    // reading the clipboard is never answered
    assert_eq!(parsed("\x1b]52;c;?\x07"), []);
    assert_eq!(parsed("\x1b]9;build finished\x07"), [string("notify", "build finished")]);
    assert_eq!(parsed("\x1b]777;notify;Build;finished\x07"), [string("notify", "Build: finished")]);
    // progress reports are not notifications
    assert_eq!(parsed("\x1b]9;4;1;50\x07"), []);
    assert_eq!(parsed("\x1b]7;file://host/tmp\x1b\\"), [string("set-working-directory", "file://host/tmp")]);
}

#[test]
fn line_drawing_character_set() {
    assert_eq!(parsed("\x1b(0lqk\x1b(Blqk"), [text("┌─┐"), text("lqk")]);
    // shift out / shift in switch to G1 and back
    assert_eq!(parsed("\x1b)0a\x0ea\x0fa"), [text("a▒a")]);
}

#[test]
fn repeat_preceding_character() {
    assert_eq!(parsed("ab\x1b[3b"), [text("ab"), text("bbb")]);
    assert_eq!(parsed("\x1b[3b"), []);
}

#[test]
fn cursor_addressing_defaults() {
    assert_eq!(parsed("\x1b[5H"), [double("[H", 5, 1)]);
    assert_eq!(parsed("\x1b[;7H"), [double("[H", 1, 7)]);
    assert_eq!(parsed("\x1b[;H"), [double("[H", 1, 1)]);
    assert_eq!(parsed("\x1b[0;0f"), [double("[H", 1, 1)]);
    assert_eq!(parsed("\x1b[5r"), [double("[r", 5, 0)]);
    assert_eq!(parsed("\x1b[r"), [sequence("[r")]);
}

#[test]
fn form_feed_and_vertical_tab_are_line_feeds() {
    assert_eq!(parsed("a\x0bb\x0cc"), [text("a"), sequence("\n"), text("b"), sequence("\n"), text("c")]);
}

// ── What is sent to the screen ────────────────────────────────────────────

use terminal::parse::{pack, INLINE_CONTROLS};

/// What the screen does with a packed batch: text is cut at the control
/// characters it carries, which become commands again.
fn unpack(packed: &[TerminalCommand]) -> Vec<TerminalCommand> {
    let mut commands = vec![];
    for command in packed {
        match command {
            TerminalCommand::Text(text) => {
                let mut run = String::new();
                for c in text.chars() {
                    let as_text = c.to_string();
                    if INLINE_CONTROLS.contains(&as_text.as_str()) {
                        if !run.is_empty() {
                            commands.push(TerminalCommand::Text(std::mem::take(&mut run)));
                        }
                        commands.push(TerminalCommand::TerminalCommandSequence { command: as_text });
                    } else {
                        run.push(c);
                    }
                }
                if !run.is_empty() {
                    commands.push(TerminalCommand::Text(run));
                }
            }
            other => commands.push(other.clone()),
        }
    }
    commands
}

/// Text that the parser gave in pieces is one run after a round trip: for
/// comparing, join neighbouring pieces of text.
fn joined(commands: Vec<TerminalCommand>) -> Vec<TerminalCommand> {
    let mut out: Vec<TerminalCommand> = vec![];
    for command in commands {
        match (out.last_mut(), command) {
            (Some(TerminalCommand::Text(last)), TerminalCommand::Text(more)) => last.push_str(&more),
            (_, command) => out.push(command),
        }
    }
    out
}

#[test]
fn packing_a_line_of_output_makes_it_one_string() {
    let commands = Stream::new().feed("first line\r\nsecond\tline\r\n".as_bytes());
    assert_eq!(pack(commands), vec![TerminalCommand::Text("first line\r\nsecond\tline\r\n".to_string())]);
}

#[test]
fn packing_keeps_everything_else_where_it_was() {
    let commands = Stream::new().feed("plain \x1b[1;31mred\x1b[0m\r\n\x1b[2Jafter".as_bytes());
    let packed = pack(commands.clone());
    assert_eq!(packed.len(), 7, "{:?}", packed);
    assert_eq!(packed[0], TerminalCommand::Text("plain ".to_string()));
    assert_eq!(packed[2], TerminalCommand::Text("red".to_string()));
    assert_eq!(packed[4], TerminalCommand::Text("\r\n".to_string()));
    assert_eq!(joined(unpack(&packed)), joined(commands));
}

#[test]
fn packing_and_unpacking_gives_back_the_same_commands_for_any_output() {
    // deterministic pseudo random output: text, control characters and escape sequences
    let pieces = [
        "text", " ", "\r", "\n", "\t", "\u{8}", "\u{7}", "\x1b[m", "\x1b[1;32m", "\x1b[2K", "\x1b[10;20H", "\x1b]0;title\x07",
        "é✓", "\x1b[?25l", "\u{b}", "x",
    ];
    let mut seed: u64 = 0x2545F4914F6CDD1D;
    for _ in 0..300 {
        let mut output = String::new();
        for _ in 0..40 {
            seed ^= seed << 13;
            seed ^= seed >> 7;
            seed ^= seed << 17;
            output.push_str(pieces[(seed % pieces.len() as u64) as usize]);
        }
        let commands = Stream::new().feed(output.as_bytes());
        let packed = pack(commands.clone());
        assert_eq!(joined(unpack(&packed)), joined(commands), "for {:?}", output);
        assert!(packed.len() <= joined(Stream::new().feed(output.as_bytes())).len());
    }
}

#[test]
fn what_is_sent_for_plain_output_is_not_much_bigger_than_the_output() {
    let output = "y\r\n".repeat(5000);
    let commands = Stream::new().feed(output.as_bytes());
    let unpacked_size = serde_json::to_string(&commands).unwrap().len();
    let packed_size = serde_json::to_string(&pack(commands)).unwrap().len();
    // escaping \r and \n doubles them; nothing more
    assert!(packed_size < output.len() * 2, "{} bytes are sent for {} bytes of output", packed_size, output.len());
    assert!(unpacked_size > packed_size * 5, "packing saved less than expected: {} -> {}", unpacked_size, packed_size);
}
