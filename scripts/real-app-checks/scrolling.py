"""A long session of moving through a file in the real EditorPro window.

Opens a 10,000-line file with a real double click, then moves through it thousands of times with real
key presses (40 lines down or up each, sent to the app alone), which scrolls the editor and redraws
the lines in view. Every 500 moves: the processor time the page's process used per move, its physical
footprint, and how late the page's once-a-second report of what it shows was at worst (a page that
stalls reports late). Afterwards: that keys still work, and what the page holds once it is left alone.

    python3 scripts/real-app-checks/scrolling.py typical|dense [MOVES]

`typical` is code of about 85 characters a line; `dense` is 500 characters on every line, the longest
the editor opens."""
import os, re, shutil, sys, tempfile, threading, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import Editor, usage

kind = sys.argv[1] if len(sys.argv) > 1 else "typical"
moves = int(sys.argv[2]) if len(sys.argv) > 2 else 4000
project = os.path.realpath(tempfile.mkdtemp(prefix="scrolling-"))
if kind == "typical":
    body = "\n".join('    const value%d = computeSomething(arg%d, "string literal", %d); // note %d' % (i, i, i, i) for i in range(1, 10001))
else:
    unit = 'foo(bar, 12, "s"); '
    body = "\n".join(("/* note %d */ " % i + unit * 30)[:500] for i in range(1, 10001))
open(os.path.join(project, "big.js"), "w").write(body)

app = Editor(project)
check, wait = app.check, app.wait
def drawn():
    found = [int(n) for n in re.findall(r"note (\d+)", app.text())]
    return (min(found), max(found)) if found else (0, 0)
late = {"worst": 0.0, "stop": False}
def watch_reports():
    while not late["stop"]:
        try: late["worst"] = max(late["worst"], time.time() - os.path.getmtime(app.dump))
        except OSError: pass
        time.sleep(0.1)
DOWN, UP = [21, 29, 38], [21, 29, 40]      # the keys 4, 0 and j or k

try:
    check("the project is open", wait(lambda: 'id="%s"' % os.path.join(project, "big.js") in app.html(), 25))
    print(app.click("double", "id:" + os.path.join(project, "big.js"), dx=60))
    check("the 10,000-line file is open (%d bytes)" % len(body), wait(lambda: drawn()[0] == 1 and drawn()[1] > 20), drawn())
    time.sleep(1.5)
    app.press(DOWN, 10); time.sleep(1.6)
    check("keys sent to the app move the editor", drawn()[0] > 100 and app.scrolled() > 2000, "lines %d–%d are drawn, scrolled %d pixels" % (drawn() + (app.scrolled(),)))
    if drawn()[0] <= 100: raise SystemExit("the keys did not arrive; nothing measured")

    pages = app.pages()
    page = max(pages, key=lambda w: usage(w)[0])
    threading.Thread(target=watch_reports, daemon=True).start()
    print("%6s %9s %13s %10s %14s  %s" % ("moves", "seconds", "cpu per move", "footprint", "latest report", "lines drawn"), flush=True)
    print("%6s %9s %13s %7.0f MB" % ("0", "", "", usage(page)[2]), flush=True)
    done, direction, since_turn, start = 0, DOWN, 10, time.time()
    cpu0 = usage(page)[0]; per_move = []; seen = set()
    while done < moves:
        app.press(direction, 50)
        done += 50; since_turn += 50
        seen.add(drawn())
        if since_turn >= 240: direction, since_turn = (UP if direction is DOWN else DOWN), 0      # 240 moves of 40 lines is nearly the whole file
        if done % 500 == 0:
            cpu1, _, footprint = usage(page)
            per_move.append((cpu1 - cpu0) / 500 * 1000)
            print("%6d %8.0fs %10.2f ms %7.0f MB %12.1f s  %d–%d" % ((done, time.time() - start, per_move[-1], footprint, late["worst"]) + drawn()), flush=True)
            cpu0 = cpu1; late["worst"] = 0.0
    late["stop"] = True
    for after, wait_ in ((5, 5), (30, 25), (60, 30)):
        time.sleep(wait_); print("       %2ds after the last move: footprint %4.0f MB" % (after, usage(page)[2]), flush=True)
    half = len(per_move) // 2
    first, second = sum(per_move[:half]) / half, sum(per_move[half:]) / (len(per_move) - half)
    check("the cost of a move did not grow", second < first * 1.25 + 0.3, "first half %.2f ms of processor time per move, second half %.2f ms" % (first, second))
    reach = (min(s for s, _ in seen), max(e for _, e in seen))
    check("most of the file was moved through", reach[1] - reach[0] > 5000, "lines drawn ranged from %d to %d" % reach)
    check("the app is still running", app.p.poll() is None)
    print("G:", app.type('keystroke "G"')); pressed = time.time()
    check("after it all, a key still takes the editor to the end of the file", wait(lambda: drawn()[1] == 10000, 6), "%s after %.1fs" % (drawn(), time.time() - pressed))
    print("gg:", app.type('keystroke "gg"'))
    check("and another back to the top", wait(lambda: drawn()[0] == 1, 6), drawn())
finally:
    late["stop"] = True
    ok = app.close()
    shutil.rmtree(project, ignore_errors=True)
sys.exit(0 if ok else 1)
