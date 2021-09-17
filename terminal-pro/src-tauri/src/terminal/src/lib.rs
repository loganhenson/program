extern crate serde_json;

use base64::decode;
use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};

const IGNORED_SEQUENCES: [&str; 59] = [
  "[>4;m",        // ??
  "[?12h",        // Text Cursor Enable Blinking
  "[?40h",        // ??
  "[?12l",        // Text Cursor Disable Blinking
  "[?45l",        // ?
  "[?3h",         // DECCOLM	Set Number of Columns to 132	Sets the console width to 132 columns wide.
  "[?3l",         // DECCOLM	Set Number of Columns to 80	Sets the console width to 80 columns wide.?
  "[?4l",         // ?
  "[?5l",         // ?
  "[?6l",         // ?
  "[?7l",         // ?
  "[?8l",         // ?
  "[4l",          // Reset Mode: Replace Mode (Default, https://vt100.net/docs/vt510-rm/IRM.html)
  "[4h",          // Reset Mode: Insert Mode
  "[20l",         // ?? Some line feed mode?
  "[22;2t",       // ??
  "[22;1t",       // ??
  "[22;0;0t",     // ??
  "[0%m",         // ??
  "[>4;2m",       // vim modifyOtherKeys option
  "(A",           // Set United Kingdom G0 character set ??
  ")A",           // Set United Kingdom G0 character set ??
  "(0",           // Designate Character Set – DEC Line Drawing	Enables DEC Line Drawing Mode
  "(B",           // Designate Character Set – US ASCII	Enables ASCII Mode (Default)?
  ")B",           // Set United States G0 character set ??
  "[?2004h",      // enable bracketed paste
  "[?2004l",      // disable bracketed paste
  "[200~",        // bracketed paste start
  "[201~",        // bracketed paste end
  "[?1004l",      // ??
  "[?1004h",      // ??
  "[?1000h",      // ??
  "[?1002h",      // ??
  "[?1006h",      // ??
  "[?1006;1000h", // mouse tracking ??
  "[?1006;1000l", // mouse tracking ??
  "[?1034h",      // ??
  "[?1h",         // Set cursor key to application ??
  "[?7h",         // Set cursor key to application ??
  "[?8h",         // ??
  "[?1l",         // set cursor key to cursor ??
  "[?25l",        // hide cursor
  "[?25h",        // show cursor
  "[>c",          // ??
  "[6n",          // ??
  "[23;0;0t", // restore window/icon title (https://invisible-island.net/xterm/ctlseqs/ctlseqs.html#h2-Functions-using-CSI-_-ordered-by-the-final-character_s_)
  "[23;0t",   // more title stuff
  "[112",     // reset cursor color
  "]112",     // ??
  "[0 q",     // blinking block cursor
  "[1 q",     // blinking block cursor
  "[2 q",     // solid block cursor
  "[3 q",     // blinking underscore cursor
  "[4 q",     // solid underscore cursor
  "[5 q",     // blinking vertical bar cursor
  "[6 q",     // solid vertical bar cursor
  "[0;1;7m",  // inverse and bold
  "=", // DECKPAM	Enable Keypad Application Mode	Keypad keys will emit their Application Mode sequences.
  ">", // DECKPNM	Enable Keypad Numeric Mode	Keypad keys will emit their Numeric Mode sequences.
];
const QUERY_SEQUENCES: [&str; 5] = [
  "]10;?\u{1b}\\", // OSC QUERY: Change VT100 text foreground color to ?
  "]10;?\u{7}",    // OSC QUERY: Change VT100 text foreground color to ? (bell form)
  "]11;?\u{1b}\\", // OSC QUERY: Change VT100 text background color to ?
  "]11;?\u{7}",    // OSC QUERY: Change VT100 text background color to ? (bell form)
  "[0c", // Device Attributes	Report the terminal identity. Will emit "\x1b[?1;0c", indicating "VT101 with No Options".
];
const USED_SEQUENCES: [&str; 34] = [
  "[?1049h", // use alternate buffer
  "[?1049l", // go back to main buffer
  "[?6h",    // ??
  "[?6l",    // ??
  "[J", "[0J", "[1J", "[2J", // Erase in Display
  "[K", "[0K", "[1K", "[2K", // Erase in Line
  "[m", "[L", "[P",  //
  "[M",  // Delete single line
  "[H",  // HTS	Horizontal Tab Set	Sets a tab stop in the current column the cursor is in.
  "[;H", // HTS	Horizontal Tab Set	Sets a tab stop in the current column the cursor is in.
  "[r", // set scroll region (default 1 (top) and screen height (bottom)). This is the version without the arguments.
  "#8", // fill the screen with E
  "E",  // Next Line (\n)
  "D",  // Index (\n)
  "M",  // Reverse Index (opposite of \n)
  "[@", // Insert Character
  "[X", // Erase Character
  "[A", "[B", "[C", "[D", "[E", "[F", "[G", "[S", "[T",
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
  TerminalCommandQuerySequence {
    command: String,
  },
  TerminalCommandPartial(String),
  Text(String),
}

pub fn parse(data: &str, mut output: impl FnMut(TerminalCommand) -> ()) -> Vec<TerminalCommand> {
  let mut collected: Vec<TerminalCommand> = vec![];

  // println!("{:?}", data);

  let mut mid_sequence = false;
  let mut subcollector = "".to_string();
  let escape = String::from("\u{1b}");
  let fake_escape = String::from("\u{b}");
  let length = data.chars().count() - 1;

  for (index, char) in data.chars().enumerate() {
    // println!("{:?}, {:?}", mid_sequence, char);

    if mid_sequence && String::from(char) == fake_escape {
      continue;
    }

    if !mid_sequence && String::from(char) == escape {
      if subcollector.len() != 0 {
        // Handle Raw Output
        let command = TerminalCommand::Text(subcollector.clone());
        collected.push(command.clone());
        output(command);
        subcollector = "".to_string();
      }

      if index == length {
        let command = TerminalCommand::TerminalCommandPartial(String::from("\u{1b}"));
        collected.push(command.clone());
        output(command);
        subcollector = "".to_string();
        continue;
      }

      mid_sequence = true;

      continue;
    }

    subcollector.push(char);

    if mid_sequence {
      // Handle Ignored Sequences
      if IGNORED_SEQUENCES.iter().any(|v| v == &subcollector) {
        subcollector = "".to_string();
        mid_sequence = false;
        continue;
      }

      // Handle query sequences
      if QUERY_SEQUENCES.iter().any(|v| v == &subcollector) {
        let command = TerminalCommand::TerminalCommandQuerySequence {
          command: subcollector.to_string(),
        };
        collected.push(command.clone());
        output(command);

        subcollector = "".to_string();
        mid_sequence = false;
        continue;
      }

      // Handle raw sequences
      if USED_SEQUENCES.iter().any(|v| v == &subcollector) {
        let command = TerminalCommand::TerminalCommandSequence {
          command: subcollector.to_string(),
        };
        collected.push(command.clone());
        output(command);

        subcollector = "".to_string();
        mid_sequence = false;
        continue;
      }

      /* CSI - Control Sequence Introducer - Commands */
      /* ESC [ */

      // Handle commands with arguments
      // Regex, don't use * in captures, as that will change the match order

      // Esc[${Value}A	: Move cursor Value amount in ABCD direction
      lazy_static! {
        static ref REGEX_MOVE_CURSOR: Regex =
          Regex::new(r"^\[([0-9]+)([ABCDEFGLMPSTXmd@])$").unwrap();
      }
      match REGEX_MOVE_CURSOR.captures(&subcollector) {
        Some(matches) => {
          let command = TerminalCommand::TerminalCommandSequenceAndSingleArgument {
            command: String::from("[".to_owned() + matches.get(2).map_or("", |m| m.as_str())),
            argument: matches.get(1).map_or(0, |m| m.as_str().parse().unwrap()),
          };
          collected.push(command.clone());
          output(command);
          subcollector = "".to_string();
          mid_sequence = false;
          continue;
        }
        None => (),
      }

      // Esc[${Value};${Value}H	: Move cursor to line Value and column Value
      lazy_static! {
        static ref REGEX_MOVE_CURSOR_TO_LINE_COL: Regex =
          Regex::new(r"^\[([0-9]+);([0-9]+)[H|f]$").unwrap();
      }
      match REGEX_MOVE_CURSOR_TO_LINE_COL.captures(&subcollector) {
        Some(matches) => {
          let command = TerminalCommand::TerminalCommandSequenceAndDoubleArgument {
            command: String::from("[H"),
            argument1: matches.get(1).map_or(0, |m| m.as_str().parse().unwrap()),
            argument2: matches.get(2).map_or(0, |m| m.as_str().parse().unwrap()),
          };
          collected.push(command.clone());
          output(command);
          subcollector = "".to_string();
          mid_sequence = false;
          continue;
        }
        None => (),
      }

      //[48;2;r;g;bm TrueColor Background
      lazy_static! {
        static ref REGEX_TRUECOLOR_BACKGROUND: Regex =
          Regex::new(r"^\[(?:[0-9]+;)?48;2;([0-9]+);([0-9]+);([0-9]+)m$").unwrap();
      }
      match REGEX_TRUECOLOR_BACKGROUND.captures(&subcollector) {
        Some(matches) => {
          let command = TerminalCommand::TerminalCommandSequenceAndTripleArgument {
            command: String::from("[m-bg-rgb"),
            argument1: matches.get(1).map_or(0, |m| m.as_str().parse().unwrap()),
            argument2: matches.get(2).map_or(0, |m| m.as_str().parse().unwrap()),
            argument3: matches.get(3).map_or(0, |m| m.as_str().parse().unwrap()),
          };
          collected.push(command.clone());
          output(command);
          subcollector = "".to_string();
          mid_sequence = false;
          continue;
        }
        None => (),
      }

      //[38;2;r;g;bm TrueColor Foreground
      lazy_static! {
        static ref REGEX_TRUECOLOR_FOREGROUND: Regex =
          Regex::new(r"^\[(?:[0-9]+;)?38;2;([0-9]+);([0-9]+);([0-9]+)m$").unwrap();
      }
      match REGEX_TRUECOLOR_FOREGROUND.captures(&subcollector) {
        Some(matches) => {
          let command = TerminalCommand::TerminalCommandSequenceAndTripleArgument {
            command: String::from("[m-fg-rgb"),
            argument1: matches.get(1).map_or(0, |m| m.as_str().parse().unwrap()),
            argument2: matches.get(2).map_or(0, |m| m.as_str().parse().unwrap()),
            argument3: matches.get(3).map_or(0, |m| m.as_str().parse().unwrap()),
          };
          collected.push(command.clone());
          output(command);
          subcollector = "".to_string();
          mid_sequence = false;
          continue;
        }
        None => (),
      }

      // 38; -> foreground, 48 -> background
      // 2; -> rgb, 5 -> 256 color
      //[38;5;130m (256 Color Foreground)
      lazy_static! {
        static ref REGEX_256COLOR_BACKGROUND: Regex =
          Regex::new(r"^\[(?:[0-9]+;)?48;5;([0-9]+)m$").unwrap();
      }
      match REGEX_256COLOR_BACKGROUND.captures(&subcollector) {
        Some(matches) => {
          let command = TerminalCommand::TerminalCommandSequenceAndSingleArgument {
            command: String::from("[m-bg-256"),
            argument: matches.get(1).map_or(0, |m| m.as_str().parse().unwrap()),
          };
          collected.push(command.clone());
          output(command);
          subcollector = "".to_string();
          mid_sequence = false;
          continue;
        }
        None => (),
      }

      lazy_static! {
        static ref REGEX_256COLOR_FOREGROUND: Regex =
          Regex::new(r"^\[(?:[0-9]+;)?38;5;([0-9]+)m$").unwrap();
      }
      match REGEX_256COLOR_FOREGROUND.captures(&subcollector) {
        Some(matches) => {
          let command = TerminalCommand::TerminalCommandSequenceAndSingleArgument {
            command: String::from("[m-fg-256"),
            argument: matches.get(1).map_or(0, |m| m.as_str().parse().unwrap()),
          };
          collected.push(command.clone());
          output(command);
          subcollector = "".to_string();
          mid_sequence = false;
          continue;
        }
        None => (),
      }

      //[01;32m 16 colors
      lazy_static! {
        static ref REGEX_16COLOR: Regex = Regex::new(r"^\[([0-9]+);([0-9]+)m$").unwrap();
      }
      match REGEX_16COLOR.captures(&subcollector) {
        Some(matches) => {
          let command = TerminalCommand::TerminalCommandSequenceAndDoubleArgument {
            command: String::from("[m"),
            argument1: matches.get(1).map_or(0, |m| m.as_str().parse().unwrap()),
            argument2: matches.get(2).map_or(0, |m| m.as_str().parse().unwrap()),
          };
          collected.push(command.clone());
          output(command);
          subcollector = "".to_string();
          mid_sequence = false;
          continue;
        }
        None => (),
      }

      //[1;6r Set top and bottom lines of a window (DECSTBM, set scroll region)
      lazy_static! {
        static ref REGEX_SET_SCROLL_REGION: Regex = Regex::new(r"^\[([0-9]+);([0-9]+)r$").unwrap();
      }
      match REGEX_SET_SCROLL_REGION.captures(&subcollector) {
        Some(matches) => {
          let command = TerminalCommand::TerminalCommandSequenceAndDoubleArgument {
            command: String::from("[r"),
            argument1: matches.get(1).map_or(0, |m| m.as_str().parse().unwrap()),
            argument2: matches.get(2).map_or(0, |m| m.as_str().parse().unwrap()),
          };
          collected.push(command.clone());
          output(command);
          subcollector = "".to_string();
          mid_sequence = false;
          continue;
        }
        None => (),
      }

      /* Application Programming Commands */
      /* ESC _ */

      lazy_static! {
        static ref REGEX_WEB: Regex = Regex::new(r"^_WEB;([^\x1B]+)\a$").unwrap();
      }
      match REGEX_WEB.captures(&subcollector) {
        Some(matches) => {
          let command = TerminalCommand::TerminalCommandSequenceAndSingleStringArgument {
            command: String::from("_WEB"),
            argument: std::str::from_utf8(
              &decode(matches.get(1).unwrap().as_str().to_string()).unwrap(),
            )
            .unwrap()
            .to_string(),
          };
          collected.push(command.clone());
          output(command);
          subcollector = "".to_string();
          mid_sequence = false;
          continue;
        }
        None => (),
      }

      // Catchall ISC (Ignores a bunch of lowercase ISC sequences)
      lazy_static! {
        static ref REGEX_CATCH_ALL_ISC: Regex = Regex::new(r"^\[([0-9]+)([a-z]{1})$").unwrap();
      }
      match REGEX_CATCH_ALL_ISC.captures(&subcollector) {
        Some(_) => {
          subcollector = "".to_string();
          mid_sequence = false;
          continue;
        }
        None => (),
      }

      // Catchall ISC 2
      lazy_static! {
        static ref REGEX_CATCH_ALL_ISC2: Regex = Regex::new(r"^\[([0-9]+)\x1B$").unwrap();
      }
      match REGEX_CATCH_ALL_ISC2.captures(&subcollector) {
        Some(_) => {
          subcollector = "".to_string();
          mid_sequence = false;
          continue;
        }
        None => (),
      }

      // Catchall DCS 2
      lazy_static! {
        static ref REGEX_CATCH_ALL_DCS: Regex = Regex::new(r"^P([^\x1B]+)\x1B\\$").unwrap();
      }
      match REGEX_CATCH_ALL_DCS.captures(&subcollector) {
        Some(_) => {
          subcollector = "".to_string();
          mid_sequence = false;
          continue;
        }
        None => (),
      }

      // Catchall ??
      lazy_static! {
        static ref REGEX_CATCH_MYSTERY: Regex = Regex::new(r"^\[([0-9]+);([0-9]+)t$").unwrap();
      }
      match REGEX_CATCH_MYSTERY.captures(&subcollector) {
        Some(_) => {
          subcollector = "".to_string();
          mid_sequence = false;
          continue;
        }
        None => (),
      }

      /* OSC - OPERATING SYSTEM COMMANDS */
      /* ESC ] */

      // Titles
      // matches[1] == 0 -> Set icon name and window title to string
      // matches[1] == 1 -> Set icon name to string
      // matches[1] == 2 -> Set window title to string
      // matches[1] == 7 -> ??? No clue.
      lazy_static! {
        static ref REGEX_SET_TITLE_AND_ICON: Regex = Regex::new(r"^]([0127]);([^\a]+)\a$").unwrap();
      }
      match REGEX_SET_TITLE_AND_ICON.captures(&subcollector) {
        Some(matches) => {
          let kind = match matches.get(1).unwrap().as_str() {
            "0" => "set-icon-name-and-window-title",
            "1" => "set-icon-name",
            "2" => "set-window-title",
            _ => "set-mystery-title", // (7)
          };
          let command = TerminalCommand::TerminalCommandSequenceAndSingleStringArgument {
            command: kind.to_string(),
            argument: matches.get(2).unwrap().as_str().to_string(),
          };
          collected.push(command.clone());
          output(command);
          subcollector = "".to_string();
          mid_sequence = false;
          continue;
        }
        None => (),
      }

      /* ASCII CONTROL CHARACTERS */
      /* Handle \r inside escape sequences */
      if subcollector.ends_with("\r") {
        let command = TerminalCommand::TerminalCommandSequence {
          command: String::from("\r"),
        };
        collected.push(command.clone());
        output(command);
        subcollector = subcollector.trim_end_matches("\r").to_string();
        continue;
      }

      // Handle \n inside escape sequences
      if subcollector.ends_with("\n") {
        let command = TerminalCommand::TerminalCommandSequence {
          command: String::from("\n"),
        };
        collected.push(command.clone());
        output(command);
        subcollector = subcollector.trim_end_matches("\n").to_string();
        continue;
      }

      // Handle \b inside escape sequences
      if subcollector.ends_with("\u{8}") {
        let command = TerminalCommand::TerminalCommandSequence {
          command: String::from("\u{8}"),
        };
        collected.push(command.clone());
        output(command);
        subcollector = subcollector.trim_end_matches("\u{8}").to_string();
        continue;
      }

      // if data.chars().nth(index + 1) == Option::Some('\u{1b}') {
      //   if !QUERY_SEQUENCES
      //     .iter()
      //     .any(|v| v == &format!("{}{}", subcollector, "\u{1b}\\".to_owned()))
      //   {
      //     // The title command could potentially trigger this...
      //     println!("POTENTIALLY NOT MATCHED: {:?}", subcollector);
      //   }
      // }
    } else {
      /* NESTED ASCII CONTROL CHARACTERS */
      /* These aren't prefixed with \u{1b} */
      // Handle \r
      if subcollector.ends_with("\r") {
        let sub = subcollector.trim_end_matches("\r");
        if sub.len() != 0 {
          let command = TerminalCommand::Text(sub.to_string());
          collected.push(command.clone());
          output(command)
        }

        let command = TerminalCommand::TerminalCommandSequence {
          command: String::from("\r"),
        };
        collected.push(command.clone());
        output(command);
        subcollector = "".to_string();
        mid_sequence = false;
        continue;
      }

      // Handle \n
      if subcollector == "\n" {
        let command = TerminalCommand::TerminalCommandSequence {
          command: String::from("\n"),
        };
        collected.push(command.clone());
        output(command);
        subcollector = "".to_string();
        mid_sequence = false;
        continue;
      }

      // Handle \a
      if subcollector == "\u{7}" {
        let command = TerminalCommand::TerminalCommandSequence {
          command: String::from("\u{7}"),
        };
        collected.push(command.clone());
        output(command);
        subcollector = "".to_string();
        mid_sequence = false;
        continue;
      }

      // Handle \b
      if subcollector.ends_with("\u{8}") {
        let sub = subcollector.trim_end_matches("\u{8}");
        if sub.len() != 0 {
          let command = TerminalCommand::Text(sub.to_string());
          collected.push(command.clone());
          output(command)
        }

        let command = TerminalCommand::TerminalCommandSequence {
          command: String::from("\u{8}"),
        };
        collected.push(command.clone());
        output(command);
        subcollector = "".to_string();
        mid_sequence = false;
        continue;
      }
    }

    if index == length && subcollector.len() != 0 {
      // Handle incomplete sequence
      if mid_sequence {
        let command =
          TerminalCommand::TerminalCommandPartial("\u{1b}".to_owned() + &subcollector.clone());
        collected.push(command.clone());
        output(command.clone());
        subcollector = "".to_string();
      } else {
        // Handle Raw Output
        let command = TerminalCommand::Text(subcollector.clone());
        collected.push(command.clone());
        output(command);
        subcollector = "".to_string();
      }
    }
  }

  return collected;
}
