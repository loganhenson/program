# Checks in the real apps

The test suites drive the frontends in a browser and the backends on their own. These scripts check
the things that only show in the real, bundled apps: real clicks in the real window, what the page's
process holds, and long sessions. They are run by hand, on a Mac, after building the bundles:

    (cd editor-pro && npm run build)      # or: npx tauri build --bundles app
    (cd terminal-pro && npm run build)

| script | what it does |
|---|---|
| `tree-actions.py` | New Directory, Delete (file and folder, to the Trash) and opening a file over the editor's limits, with real mouse clicks |
| `edit-limits.py` | typing past the longest line the editor holds, and adding a line to a file that is full: refused, with a message |
| `scrolling.py typical\|dense [MOVES]` | moves through a 10,000-line file thousands of times; processor time per move, the page's footprint, and whether the page ever stalls |
| `page-memory.py [TerminalPro.app]` | the terminal page's resident size and physical footprint through a flood and afterwards |

How they work:

- Nothing here can see the screen. EditorPro, started with `EDITOR_DOM_DUMP=/some/file`, writes what
  its page shows to that file once a second. `where.js` lays that page out with the app's own styles
  at the window's size to find where things are, and `click.c` clicks there.
- Clicks and typed text go to whatever is in front, so each is only sent after checking that the app
  under test is. `keys.c` delivers key presses to one process alone.
- The terminal that runs them needs the Accessibility permission (System Settings, Privacy & Security).
- EditorPro is run from the shell on a project in the temporary folder. Do not `open` a freshly built
  EditorPro on a project under Desktop or Documents: macOS then asks whether the new build may read
  that folder, and until the question is answered everything else reading it waits.
- `page-memory.py` types into the app for about three minutes and `scrolling.py` runs for about four;
  `tree-actions.py` moves the pointer. Leave the machine alone while they run.

## What they showed (0.5.4, a 32 GB Mac)

- `page-memory.py`: footprint 34 MB idle, 289 MB during a flood, 190 MB five seconds after it, 119 MB
  a minute later (with ten thousand lines of scrollback), 83 MB after clearing the scrollback. The
  resident size stays near 330 MB throughout: it counts pages the process has already let go of.
- `scrolling.py typical 4000`: 24 ms of processor time per 40-line move from the first 500 moves to the
  last, the page never more than 1.0 s between reports. The footprint is about 120 MB before, about
  1 GB while moving twenty times a second (some 480 MB of it the web view's painted tiles), and back
  under 100 MB five seconds after the last move.
- `scrolling.py dense 2000`: 70 ms per move, flat; footprint about 300 MB while moving, 108 MB after.
