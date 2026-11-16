//! Escape sequence parser.
//!
//! This is a streaming state machine modelled on the DEC VT500 parser
//! (https://vt100.net/emu/dec_ansi_parser) with the xterm extensions modern
//! programs rely on. The important property is that *every* sequence
//! terminates: anything we do not understand is consumed and dropped, it can
//! never swallow the output that follows it.
//!
//! The parser turns a character stream into `TerminalCommand`s, which are
//! serialized to JSON and applied to the screen by the Elm `terminal` library.

use serde::{Deserialize, Serialize};

/// Longest CSI parameter/intermediate string we are willing to collect.
const MAX_CSI_LENGTH: usize = 256;
/// Longest OSC/DCS/APC payload we keep (large enough for OSC 52 clipboard
/// writes). Longer payloads are consumed up to their terminator and dropped.
const MAX_STRING_LENGTH: usize = 4 * 1024 * 1024;
/// Upper bound for REP (repeat preceding character).
const MAX_REPEAT: u32 = 65_535;

/// DEC private modes that are forwarded to the screen as `[?{mode}h` / `[?{mode}l`.
const PRIVATE_MODES: [u32; 22] = [
    1,    // DECCKM: application cursor keys
    5,    // DECSCNM: reverse video
    6,    // DECOM: origin mode
    7,    // DECAWM: auto wrap
    9,    // X10 mouse reporting
    25,   // DECTCEM: cursor visibility
    47,   // alternate screen
    1000, // mouse: button events
    1002, // mouse: button + drag events
    1003, // mouse: all motion events
    1004, // focus in/out events
    1006, // mouse: SGR encoding
    1007, // alternate scroll (wheel sends arrows on the alternate screen)
    1015, // mouse: urxvt encoding
    1016, // mouse: SGR pixel encoding
    1047, // alternate screen (clearing)
    1048, // save/restore cursor
    1049, // alternate screen + save/restore cursor
    2004, // bracketed paste
    2026, // synchronized output
    2031, // color scheme change notifications
    2048, // in-band resize notifications
];

#[derive(Serialize, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(untagged)]
pub enum TerminalCommand {
    TerminalCommandSequenceAndSingleArgument {
        command: String,
        argument: u32,
    },
    TerminalCommandSequenceAndDoubleArgument {
        command: String,
        argument1: u32,
        argument2: u32,
    },
    TerminalCommandSequenceAndTripleArgument {
        command: String,
        argument1: u32,
        argument2: u32,
        argument3: u32,
    },
    TerminalCommandSequenceAndSingleStringArgument {
        command: String,
        argument: String,
    },
    TerminalCommandSequence {
        command: String,
    },
    /// A sequence the program expects an answer to (cursor position, device
    /// attributes, colors...). The screen owns the state needed to answer, so
    /// these are forwarded like any other command and answered in order.
    TerminalCommandQuerySequence {
        command: String,
    },
    /// Only produced by the one-shot `parse` function: the input ended in the
    /// middle of a sequence. `Parser` keeps this state internally instead.
    TerminalCommandPartial(String),
    Text(String),
}

/// The control characters that are sent to the screen inside the text around
/// them (see `pack`).
pub const INLINE_CONTROLS: [&str; 5] = ["\r", "\n", "\t", "\u{8}", "\u{7}"];

/// Makes a batch of commands small for sending.
///
/// Text never contains control characters, so the commonest of those (the
/// end of a line above all) can travel inside it: `"a"`, carriage return,
/// line feed, `"b"` goes as the one string `"a\r\nb"`, and the screen takes
/// it apart again. As separate commands every line of output was three JSON
/// values, eleven times the size of what the program had printed, and a web
/// view holds on to what it was sent for a while: a program printing fast
/// cost hundreds of megabytes.
pub fn pack(commands: Vec<TerminalCommand>) -> Vec<TerminalCommand> {
    let mut packed: Vec<TerminalCommand> = Vec::with_capacity(commands.len() / 2 + 1);
    let mut text = String::new();
    for command in commands {
        match command {
            TerminalCommand::Text(part) => text.push_str(&part),
            TerminalCommand::TerminalCommandSequence { ref command } if INLINE_CONTROLS.contains(&command.as_str()) => {
                text.push_str(command)
            }
            other => {
                if !text.is_empty() {
                    packed.push(TerminalCommand::Text(std::mem::take(&mut text)));
                }
                packed.push(other);
            }
        }
    }
    if !text.is_empty() {
        packed.push(TerminalCommand::Text(text));
    }
    packed
}

#[derive(Clone, Copy, Eq, PartialEq, Debug)]
enum StringKind {
    Osc,
    Dcs,
    Apc,
    Pm,
    Sos,
}

impl StringKind {
    fn introducer(self) -> char {
        match self {
            StringKind::Osc => ']',
            StringKind::Dcs => 'P',
            StringKind::Apc => '_',
            StringKind::Pm => '^',
            StringKind::Sos => 'X',
        }
    }
}

#[derive(Clone, Copy, Eq, PartialEq, Debug)]
enum State {
    Ground,
    Escape,
    EscapeIntermediate,
    Csi,
    CsiIgnore,
    Str(StringKind),
}

#[derive(Clone, Copy, Eq, PartialEq, Debug)]
enum Charset {
    Ascii,
    DecSpecialGraphics,
}

/// One CSI parameter: `;` separates parameters, `:` separates sub-parameters.
type Param = Vec<Option<u32>>;

pub struct Parser {
    state: State,
    text: String,
    /// CSI parameter bytes (0x30-0x3F), including a leading private marker.
    params: String,
    /// CSI / ESC intermediate bytes (0x20-0x2F).
    intermediates: String,
    string: String,
    string_overflowed: bool,
    string_escape_pending: bool,
    charsets: [Charset; 4],
    active_charset: usize,
    last_printed: Option<char>,
}

impl Default for Parser {
    fn default() -> Self {
        Parser::new()
    }
}

impl Parser {
    pub fn new() -> Parser {
        Parser {
            state: State::Ground,
            text: String::new(),
            params: String::new(),
            intermediates: String::new(),
            string: String::new(),
            string_overflowed: false,
            string_escape_pending: false,
            charsets: [Charset::Ascii; 4],
            active_charset: 0,
            last_printed: None,
        }
    }

    /// Feed a chunk of output. Sequences may be split across chunks at any
    /// point; text is flushed at the end of every chunk.
    pub fn advance(&mut self, data: &str, output: &mut dyn FnMut(TerminalCommand)) {
        for c in data.chars() {
            self.step(c, output);
        }
        self.flush_text(output);
    }

    /// The raw text of the sequence currently being collected, if any.
    pub fn pending(&self) -> Option<String> {
        match self.state {
            State::Ground => None,
            State::Escape | State::EscapeIntermediate => {
                Some(format!("\u{1b}{}", self.intermediates))
            }
            State::Csi | State::CsiIgnore => {
                Some(format!("\u{1b}[{}{}", self.params, self.intermediates))
            }
            State::Str(kind) => Some(format!(
                "\u{1b}{}{}{}",
                kind.introducer(),
                self.string,
                if self.string_escape_pending { "\u{1b}" } else { "" }
            )),
        }
    }

    fn step(&mut self, c: char, output: &mut dyn FnMut(TerminalCommand)) {
        match self.state {
            State::Ground => self.ground(c, output),
            State::Escape => self.escape(c, output),
            State::EscapeIntermediate => self.escape_intermediate(c, output),
            State::Csi | State::CsiIgnore => self.csi(c, output),
            State::Str(kind) => self.string(kind, c, output),
        }
    }

    fn flush_text(&mut self, output: &mut dyn FnMut(TerminalCommand)) {
        if !self.text.is_empty() {
            output(TerminalCommand::Text(std::mem::take(&mut self.text)));
        }
    }

    fn enter_escape(&mut self, output: &mut dyn FnMut(TerminalCommand)) {
        self.flush_text(output);
        self.params.clear();
        self.intermediates.clear();
        self.state = State::Escape;
    }

    fn enter_string(&mut self, kind: StringKind) {
        self.string.clear();
        self.string_overflowed = false;
        self.string_escape_pending = false;
        self.state = State::Str(kind);
    }

    fn print(&mut self, c: char) {
        let translated = match self.charsets[self.active_charset] {
            Charset::Ascii => c,
            Charset::DecSpecialGraphics => dec_special_graphics(c),
        };
        self.text.push(translated);
        self.last_printed = Some(translated);
    }

    /// C0 control characters. These are executed wherever they appear, even
    /// in the middle of a CSI sequence, without disturbing that sequence.
    fn execute(&mut self, c: char, output: &mut dyn FnMut(TerminalCommand)) {
        let command = match c {
            // LF, VT and FF are all line feeds
            '\n' | '\u{b}' | '\u{c}' => "\n",
            '\r' => "\r",
            '\t' => "\u{9}",
            '\u{8}' => "\u{8}",
            '\u{7}' => "\u{7}",
            // SO / SI: switch between the G1 and G0 character sets
            '\u{e}' => {
                self.active_charset = 1;
                return;
            }
            '\u{f}' => {
                self.active_charset = 0;
                return;
            }
            _ => return,
        };
        self.flush_text(output);
        output(sequence(command));
    }

    fn ground(&mut self, c: char, output: &mut dyn FnMut(TerminalCommand)) {
        match c {
            '\u{1b}' => self.enter_escape(output),
            '\u{0}'..='\u{1f}' => self.execute(c, output),
            // DEL and the C1 control range are not printable
            '\u{7f}'..='\u{9f}' => (),
            _ => self.print(c),
        }
    }

    fn escape(&mut self, c: char, output: &mut dyn FnMut(TerminalCommand)) {
        match c {
            '\u{1b}' => self.enter_escape(output),
            '\u{18}' | '\u{1a}' => self.state = State::Ground,
            '\u{0}'..='\u{1f}' => self.execute(c, output),
            '[' => self.state = State::Csi,
            ']' => self.enter_string(StringKind::Osc),
            'P' => self.enter_string(StringKind::Dcs),
            '_' => self.enter_string(StringKind::Apc),
            '^' => self.enter_string(StringKind::Pm),
            'X' => self.enter_string(StringKind::Sos),
            ' '..='/' => {
                self.intermediates.push(c);
                self.state = State::EscapeIntermediate;
            }
            '0'..='~' => {
                self.state = State::Ground;
                self.escape_dispatch(c, output);
            }
            '\u{7f}' => (),
            _ => {
                self.state = State::Ground;
                self.ground(c, output);
            }
        }
    }

    fn escape_intermediate(&mut self, c: char, output: &mut dyn FnMut(TerminalCommand)) {
        match c {
            '\u{1b}' => self.enter_escape(output),
            '\u{18}' | '\u{1a}' => self.state = State::Ground,
            '\u{0}'..='\u{1f}' => self.execute(c, output),
            ' '..='/' => {
                if self.intermediates.len() < MAX_CSI_LENGTH {
                    self.intermediates.push(c);
                }
            }
            '0'..='~' => {
                self.state = State::Ground;
                self.escape_dispatch(c, output);
            }
            '\u{7f}' => (),
            _ => {
                self.state = State::Ground;
                self.ground(c, output);
            }
        }
    }

    fn escape_dispatch(&mut self, c: char, output: &mut dyn FnMut(TerminalCommand)) {
        match (self.intermediates.as_str(), c) {
            // DECSC / DECRC: save and restore the cursor
            ("", '7') => output(sequence("7")),
            ("", '8') => output(sequence("8")),
            // IND, NEL, RI
            ("", 'D') => output(sequence("D")),
            ("", 'E') => output(sequence("E")),
            ("", 'M') => output(sequence("M")),
            // HTS: set a tab stop at the cursor column
            ("", 'H') => output(sequence("H")),
            // RIS: full reset
            ("", 'c') => {
                self.charsets = [Charset::Ascii; 4];
                self.active_charset = 0;
                output(sequence("c"))
            }
            // DECID: identify, answered like primary device attributes
            ("", 'Z') => output(query("[0c")),
            // LS2 / LS3: invoke the G2 / G3 character set
            ("", 'n') => self.active_charset = 2,
            ("", 'o') => self.active_charset = 3,
            // DECALN: fill the screen with E
            ("#", '8') => output(sequence("#8")),
            // Designate the G0-G3 character sets
            ("(", _) => self.charsets[0] = charset(c),
            (")", _) => self.charsets[1] = charset(c),
            ("*", _) => self.charsets[2] = charset(c),
            ("+", _) => self.charsets[3] = charset(c),
            // Everything else (keypad modes, single shifts, ST on its own,
            // double-size lines, 7/8-bit control selection...) has no effect.
            _ => (),
        }
    }

    fn csi(&mut self, c: char, output: &mut dyn FnMut(TerminalCommand)) {
        match c {
            '\u{1b}' => self.enter_escape(output),
            '\u{18}' | '\u{1a}' => self.state = State::Ground,
            '\u{0}'..='\u{1f}' => self.execute(c, output),
            '0'..='?' => {
                if !self.intermediates.is_empty() || self.params.len() >= MAX_CSI_LENGTH {
                    self.state = State::CsiIgnore;
                } else {
                    self.params.push(c);
                }
            }
            ' '..='/' => {
                if self.intermediates.len() >= MAX_CSI_LENGTH {
                    self.state = State::CsiIgnore;
                } else {
                    self.intermediates.push(c);
                }
            }
            '@'..='~' => {
                let ignore = self.state == State::CsiIgnore;
                self.state = State::Ground;
                if !ignore {
                    self.csi_dispatch(c, output);
                }
            }
            '\u{7f}' => (),
            _ => {
                self.state = State::Ground;
                self.ground(c, output);
            }
        }
    }

    fn csi_dispatch(&mut self, final_char: char, output: &mut dyn FnMut(TerminalCommand)) {
        let (prefix, params) = parse_params(&self.params);
        // First value of parameter `i`, if it was given.
        let p = |i: usize| -> Option<u32> { params.get(i).and_then(|param| param[0]) };
        let intermediates = self.intermediates.as_str();

        match (prefix, intermediates, final_char) {
            // Cursor movement, insert/delete/erase, scrolling, tabulation.
            // `[A` without a count, `[5A` with one.
            (None, "", 'A'..='G')
            | (None, "", 'L')
            | (None, "", 'M')
            | (None, "", 'P')
            | (None, "", 'S')
            | (None, "", 'X')
            | (None, "", '@')
            | (None, "", 'd')
            | (None, "", 'I')
            | (None, "", 'Z') => output(counted(final_char, p(0))),
            // SD: with more than one parameter this is mouse highlight tracking
            (None, "", 'T') if params.len() <= 1 => output(counted('T', p(0))),
            // HPA is the same as CHA
            (None, "", '`') => output(counted('G', p(0))),
            // CUP / HVP
            (None, "", 'H') | (None, "", 'f') => {
                if params.is_empty() {
                    output(sequence("[H"))
                } else {
                    output(double("[H", at_least_one(p(0)), at_least_one(p(1))))
                }
            }
            // ED / EL (and their selective DECSED / DECSEL variants)
            (None, "", 'J') | (Some('?'), "", 'J') => match p(0) {
                None => output(sequence("[J")),
                Some(n) if n <= 3 => output(sequence(&format!("[{}J", n))),
                Some(_) => (),
            },
            (None, "", 'K') | (Some('?'), "", 'K') => match p(0) {
                None => output(sequence("[K")),
                Some(n) if n <= 2 => output(sequence(&format!("[{}K", n))),
                Some(_) => (),
            },
            // SGR
            (None, "", 'm') => select_graphic_rendition(&params, output),
            // DECSTBM: top and bottom margins. 0 means "use the default".
            (None, "", 'r') => {
                if params.is_empty() {
                    output(sequence("[r"))
                } else {
                    output(double("[r", at_least_one(p(0)), p(1).unwrap_or(0)))
                }
            }
            // SM / RM
            (None, "", 'h') | (None, "", 'l') => {
                for param in &params {
                    match param[0] {
                        // IRM: insert mode, LNM: automatic newline
                        Some(mode @ 4) | Some(mode @ 20) => {
                            output(sequence(&format!("[{}{}", mode, final_char)))
                        }
                        _ => (),
                    }
                }
            }
            // DECSET / DECRST
            (Some('?'), "", 'h') | (Some('?'), "", 'l') => {
                for param in &params {
                    if let Some(mode) = param[0] {
                        if PRIVATE_MODES.contains(&mode) {
                            output(sequence(&format!("[?{}{}", mode, final_char)))
                        }
                    }
                }
            }
            // DSR: status and cursor position reports
            (None, "", 'n') => match p(0) {
                Some(5) => output(query("[5n")),
                Some(6) => output(query("[6n")),
                _ => (),
            },
            (Some('?'), "", 'n') => match p(0) {
                Some(6) => output(query("[?6n")),
                Some(996) => output(query("[?996n")),
                _ => (),
            },
            // DA1 / DA2 / DA3
            (None, "", 'c') if p(0).unwrap_or(0) == 0 => output(query("[0c")),
            (Some('>'), "", 'c') if p(0).unwrap_or(0) == 0 => output(query("[>c")),
            (Some('='), "", 'c') if p(0).unwrap_or(0) == 0 => output(query("[=c")),
            // XTVERSION
            (Some('>'), "", 'q') if p(0).unwrap_or(0) == 0 => output(query("[>q")),
            // DECRQM: report a mode
            (Some('?'), "$", 'p') => output(query(&format!("[?{}$p", p(0).unwrap_or(0)))),
            (None, "$", 'p') => output(query(&format!("[{}$p", p(0).unwrap_or(0)))),
            // Window manipulation: only the size reports are supported
            (None, "", 't') => match p(0) {
                Some(n @ 14) | Some(n @ 16) | Some(n @ 18) | Some(n @ 19) => {
                    output(query(&format!("[{}t", n)))
                }
                _ => (),
            },
            // Save / restore cursor (ANSI.SYS)
            (None, "", 's') if params.is_empty() => output(sequence("[s")),
            (None, "", 'u') if params.is_empty() => output(sequence("[u")),
            // Kitty keyboard protocol: query, push, pop, set
            (Some('?'), "", 'u') => output(query("[?u")),
            (Some('>'), "", 'u') => output(single("[>u", p(0).unwrap_or(0))),
            (Some('<'), "", 'u') => output(single("[<u", at_least_one(p(0)))),
            (Some('='), "", 'u') => {
                output(double("[=u", p(0).unwrap_or(0), at_least_one(p(1))))
            }
            // TBC: clear tab stops
            (None, "", 'g') => match p(0).unwrap_or(0) {
                0 => output(single("[g", 0)),
                3 => output(single("[g", 3)),
                _ => (),
            },
            // REP: repeat the preceding graphic character
            (None, "", 'b') => {
                if let Some(c) = self.last_printed {
                    let count = at_least_one(p(0)).min(MAX_REPEAT) as usize;
                    output(TerminalCommand::Text(
                        std::iter::repeat(c).take(count).collect(),
                    ))
                }
            }
            // DECSCUSR: cursor style
            (None, " ", 'q') => output(single("[ q", p(0).unwrap_or(0))),
            // DECSTR: soft reset
            (None, "!", 'p') => {
                self.charsets = [Charset::Ascii; 4];
                self.active_charset = 0;
                output(sequence("[!p"))
            }
            // Anything else is a sequence we do not act on.
            _ => (),
        }
    }

    fn string(&mut self, kind: StringKind, c: char, output: &mut dyn FnMut(TerminalCommand)) {
        if self.string_escape_pending {
            self.string_escape_pending = false;
            if c == '\\' {
                // ESC \ is the string terminator
                return self.string_dispatch(kind, "\u{1b}\\", output);
            }
            // Any other escape is kept as part of the payload. Shells that
            // echo the command line into the window title produce these.
            self.string_push('\u{1b}');
        }

        match c {
            '\u{1b}' => self.string_escape_pending = true,
            '\u{7}' if kind == StringKind::Osc || kind == StringKind::Apc => {
                self.string_dispatch(kind, "\u{7}", output)
            }
            '\u{9c}' => self.string_dispatch(kind, "\u{1b}\\", output),
            '\u{18}' | '\u{1a}' => self.state = State::Ground,
            _ => self.string_push(c),
        }
    }

    fn string_push(&mut self, c: char) {
        if self.string.len() < MAX_STRING_LENGTH {
            self.string.push(c);
        } else {
            self.string_overflowed = true;
        }
    }

    fn string_dispatch(
        &mut self,
        kind: StringKind,
        terminator: &str,
        output: &mut dyn FnMut(TerminalCommand),
    ) {
        self.state = State::Ground;
        let payload = std::mem::take(&mut self.string);
        if self.string_overflowed {
            return;
        }

        match kind {
            StringKind::Osc => operating_system_command(&payload, terminator, output),
            StringKind::Dcs => {
                // DECRQSS (request selection or setting) and XTGETTCAP
                if payload.starts_with("$q") || payload.starts_with("+q") {
                    output(query(&format!("P{}", payload)))
                }
            }
            StringKind::Apc => {
                if let Some(encoded) = payload.strip_prefix("WEB;") {
                    if let Some(url) = decode_base64(encoded).and_then(|b| String::from_utf8(b).ok())
                    {
                        output(string_argument("_WEB", &url))
                    }
                }
            }
            StringKind::Pm | StringKind::Sos => (),
        }
    }
}

/// Parse a complete chunk of output in one go.
///
/// If the input ends in the middle of a sequence the remainder is reported as
/// a `TerminalCommandPartial` so the caller can prepend it to the next chunk.
/// Long-running consumers should hold on to a `Parser` (or a `Stream`) instead.
pub fn parse(data: &str, mut output: impl FnMut(TerminalCommand) -> ()) -> Vec<TerminalCommand> {
    let mut collected: Vec<TerminalCommand> = vec![];
    let mut parser = Parser::new();

    {
        let mut collect = |command: TerminalCommand| {
            collected.push(command.clone());
            output(command);
        };
        parser.advance(data, &mut collect);

        if let Some(pending) = parser.pending() {
            collect(TerminalCommand::TerminalCommandPartial(pending));
        }
    }

    collected
}

/// Decodes raw PTY bytes and parses them, keeping all state across reads.
///
/// Invalid UTF-8 becomes U+FFFD instead of stalling the stream, and a
/// multi-byte character split across two reads is stitched back together.
pub struct Stream {
    parser: Parser,
    incomplete: Vec<u8>,
}

impl Default for Stream {
    fn default() -> Self {
        Stream::new()
    }
}

impl Stream {
    pub fn new() -> Stream {
        Stream {
            parser: Parser::new(),
            incomplete: vec![],
        }
    }

    pub fn feed(&mut self, bytes: &[u8]) -> Vec<TerminalCommand> {
        let mut commands: Vec<TerminalCommand> = vec![];
        let text = self.decode(bytes);
        self.parser
            .advance(&text, &mut |command| commands.push(command));
        commands
    }

    fn decode(&mut self, bytes: &[u8]) -> String {
        let mut buffer = std::mem::take(&mut self.incomplete);
        buffer.extend_from_slice(bytes);

        let mut text = String::with_capacity(buffer.len());
        let mut rest: &[u8] = &buffer;
        loop {
            match std::str::from_utf8(rest) {
                Ok(valid) => {
                    text.push_str(valid);
                    break;
                }
                Err(error) => {
                    let (valid, after) = rest.split_at(error.valid_up_to());
                    // valid_up_to guarantees this is valid UTF-8
                    text.push_str(std::str::from_utf8(valid).unwrap_or(""));
                    match error.error_len() {
                        Some(length) => {
                            text.push('\u{fffd}');
                            rest = &after[length..];
                        }
                        None => {
                            // A character cut off by the end of this read
                            self.incomplete = after.to_vec();
                            break;
                        }
                    }
                }
            }
        }
        text
    }
}

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

fn string_argument(command: &str, argument: &str) -> TerminalCommand {
    TerminalCommand::TerminalCommandSequenceAndSingleStringArgument {
        command: command.to_string(),
        argument: argument.to_string(),
    }
}

/// `[A` when no count was given, `[A` with the count otherwise.
fn counted(final_char: char, count: Option<u32>) -> TerminalCommand {
    let command = format!("[{}", final_char);
    match count {
        None => sequence(&command),
        Some(n) => single(&command, n),
    }
}

fn at_least_one(value: Option<u32>) -> u32 {
    value.unwrap_or(1).max(1)
}

/// Split CSI parameter bytes into an optional private marker (`?`, `>`, `<`,
/// `=`) and the list of parameters.
fn parse_params(raw: &str) -> (Option<char>, Vec<Param>) {
    let (prefix, body) = match raw.chars().next() {
        Some(c @ '<'..='?') => (Some(c), &raw[1..]),
        _ => (None, raw),
    };

    if body.is_empty() {
        return (prefix, vec![]);
    }

    let params = body
        .split(';')
        .map(|param| param.split(':').map(parse_number).collect())
        .collect();

    (prefix, params)
}

fn parse_number(digits: &str) -> Option<u32> {
    if digits.is_empty() {
        return None;
    }

    let mut value: u32 = 0;
    for c in digits.chars() {
        // A stray private marker in the middle of the parameters
        let digit = c.to_digit(10)?;
        value = value.saturating_mul(10).saturating_add(digit);
    }
    Some(value)
}

fn select_graphic_rendition(params: &[Param], output: &mut dyn FnMut(TerminalCommand)) {
    if params.is_empty() {
        return output(sequence("[m"));
    }

    let mut commands: Vec<TerminalCommand> = vec![];
    let mut all_plain = true;
    let mut i = 0;

    while i < params.len() {
        let param = &params[i];
        let code = param[0].unwrap_or(0);

        match code {
            // Extended colors: 38 foreground, 48 background, 58 underline.
            // Without a color specification there is nothing to select.
            38 | 48 | 58 if param.len() > 1 || i + 1 < params.len() => {
                all_plain = false;
                let color = if param.len() > 1 {
                    // 38:5:n, 38:2:r:g:b and 38:2:colorspace:r:g:b
                    let sub = |j: usize| param.get(j).copied().flatten().unwrap_or(0);
                    match param[1] {
                        Some(5) => Some(ExtendedColor::Indexed(sub(2))),
                        Some(2) if param.len() >= 6 => {
                            Some(ExtendedColor::Rgb(sub(3), sub(4), sub(5)))
                        }
                        Some(2) => Some(ExtendedColor::Rgb(sub(2), sub(3), sub(4))),
                        _ => None,
                    }
                } else {
                    // 38;5;n and 38;2;r;g;b
                    let value = |j: usize| params.get(i + j).and_then(|p| p[0]).unwrap_or(0);
                    match params.get(i + 1).and_then(|p| p[0]) {
                        Some(5) => {
                            let color = ExtendedColor::Indexed(value(2));
                            i += 2;
                            Some(color)
                        }
                        Some(2) => {
                            let color = ExtendedColor::Rgb(value(2), value(3), value(4));
                            i += 4;
                            Some(color)
                        }
                        _ => {
                            // Unknown color space: the rest cannot be interpreted
                            i = params.len();
                            None
                        }
                    }
                };

                let target = match code {
                    38 => Some("fg"),
                    48 => Some("bg"),
                    // The underline color is accepted but not rendered
                    _ => None,
                };

                match (target, color) {
                    (Some(target), Some(ExtendedColor::Indexed(index))) => commands.push(single(
                        &format!("[m-{}-256", target),
                        index.min(255),
                    )),
                    (Some(target), Some(ExtendedColor::Rgb(r, g, b))) => commands.push(triple(
                        &format!("[m-{}-rgb", target),
                        r.min(255),
                        g.min(255),
                        b.min(255),
                    )),
                    _ => (),
                }
            }
            // 4:0 turns the underline off, 4:1-4:5 pick an underline style
            4 if param.len() > 1 => {
                all_plain = false;
                commands.push(single(
                    "[m",
                    if param[1] == Some(0) { 24 } else { 4 },
                ))
            }
            _ => commands.push(single("[m", code)),
        }

        i += 1;
    }

    // Two plain attributes are sent as one command: `[1;32m` -> ("[m", 1, 32)
    if all_plain && params.len() == 2 {
        let code = |i: usize| params[i][0].unwrap_or(0);
        return output(double("[m", code(0), code(1)));
    }

    for command in commands {
        output(command);
    }
}

enum ExtendedColor {
    Indexed(u32),
    Rgb(u32, u32, u32),
}

fn operating_system_command(
    payload: &str,
    terminator: &str,
    output: &mut dyn FnMut(TerminalCommand),
) {
    let (code, rest) = match payload.split_once(';') {
        Some((code, rest)) => (code, rest),
        None => (payload, ""),
    };

    match code {
        "0" => output(string_argument("set-icon-name-and-window-title", rest)),
        "1" => output(string_argument("set-icon-name", rest)),
        "2" => output(string_argument("set-window-title", rest)),
        // file://host/path of the shell's working directory
        "7" => output(string_argument("set-working-directory", rest)),
        // Hyperlink: `8;params;uri`. An empty uri closes the link.
        "8" => {
            let uri = rest.split_once(';').map(|(_, uri)| uri).unwrap_or("");
            output(string_argument("hyperlink", uri))
        }
        // Desktop notifications. `9;4;...` is a progress report, not a message.
        "9" => {
            if !rest.starts_with("4;") && !rest.is_empty() {
                output(string_argument("notify", rest))
            }
        }
        "777" => {
            if let Some(message) = rest.strip_prefix("notify;") {
                output(string_argument("notify", &message.replacen(';', ": ", 1)))
            }
        }
        // Color queries. Setting colors is not supported.
        "4" | "10" | "11" | "12" => {
            if rest == "?" || rest.ends_with(";?") {
                output(query(&format!("]{}{}", payload, terminator)))
            }
        }
        // Clipboard: `52;selection;base64`. Reading the clipboard (`?`) is
        // deliberately not answered.
        "52" => {
            if let Some((_, data)) = rest.split_once(';') {
                if data != "?" {
                    if let Some(text) = decode_base64(data).and_then(|b| String::from_utf8(b).ok())
                    {
                        output(string_argument("clipboard-write", &text))
                    }
                }
            }
        }
        _ => (),
    }
}

fn charset(designator: char) -> Charset {
    match designator {
        '0' | '2' => Charset::DecSpecialGraphics,
        _ => Charset::Ascii,
    }
}

/// The DEC Special Graphics character set (line drawing).
fn dec_special_graphics(c: char) -> char {
    match c {
        '_' => ' ',
        '`' => '◆',
        'a' => '▒',
        'b' => '␉',
        'c' => '␌',
        'd' => '␍',
        'e' => '␊',
        'f' => '°',
        'g' => '±',
        'h' => '␤',
        'i' => '␋',
        'j' => '┘',
        'k' => '┐',
        'l' => '┌',
        'm' => '└',
        'n' => '┼',
        'o' => '⎺',
        'p' => '⎻',
        'q' => '─',
        'r' => '⎼',
        's' => '⎽',
        't' => '├',
        'u' => '┤',
        'v' => '┴',
        'w' => '┬',
        'x' => '│',
        'y' => '≤',
        'z' => '≥',
        '{' => 'π',
        '|' => '≠',
        '}' => '£',
        '~' => '·',
        _ => c,
    }
}

fn decode_base64(encoded: &str) -> Option<Vec<u8>> {
    let mut decoded: Vec<u8> = Vec::with_capacity(encoded.len() * 3 / 4);
    let mut buffer: u32 = 0;
    let mut bits = 0;

    for c in encoded.chars() {
        let value = match c {
            'A'..='Z' => c as u32 - 'A' as u32,
            'a'..='z' => c as u32 - 'a' as u32 + 26,
            '0'..='9' => c as u32 - '0' as u32 + 52,
            '+' | '-' => 62,
            '/' | '_' => 63,
            '=' | '\n' | '\r' | ' ' => continue,
            _ => return None,
        };
        buffer = (buffer << 6) | value;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            decoded.push((buffer >> bits) as u8);
            buffer &= (1 << bits) - 1;
        }
    }

    Some(decoded)
}
