//! How much memory the page that draws the terminal plans for.
//!
//! The page runs in the system web view, in a process of its own. Its
//! JavaScript engine sizes its heap by the machine's memory: on a 32 GB Mac
//! the page's process grew to about 600 MB during a burst of output and
//! stayed there, because the engine keeps the heap it has grown. Told to plan
//! for a 1 GB machine, the same burst leaves it near 325 MB, at the same
//! speed.
//!
//! The engine reads the figure from its process's environment, and that
//! process is given every variable of the app's that starts with `__XPC_`,
//! with the prefix taken off. The variable has to be there when the app
//! starts (setting it in `main` is too late), so each app's `Info.plist`
//! carries it as `LSEnvironment`. A web view that does not know the option
//! ignores it.

use std::ffi::OsStr;

/// The variable, as it is named in the app's own environment.
pub const VARIABLE: &str = "__XPC_JSC_forceRAMSize";

/// The memory the page's engine is told the machine has.
pub const PLANNED_BYTES: u64 = 1024 * 1024 * 1024;

/// Whether a variable of the app's environment is passed on to a shell. The
/// figure above is for the app's own page: a shell that inherited it would
/// hand it to every program started from it.
pub fn is_for_shells(name: &OsStr) -> bool {
    name != OsStr::new(VARIABLE)
}

/// Whether an `Info.plist` sets the figure. (The tests check each app's.)
pub fn is_set_in(info_plist: &str) -> bool {
    let compact: String = info_plist.split_whitespace().collect();
    compact.contains(&format!(
        "<key>LSEnvironment</key><dict><key>{}</key><string>{}</string>",
        VARIABLE, PLANNED_BYTES
    ))
}
