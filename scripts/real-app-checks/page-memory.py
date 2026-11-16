"""What the real TerminalPro's page holds through a flood of output and afterwards.

Starts the app the way the Finder does (so its bundle's settings apply), prints 400,000 lines, floods
it with `yes`, stops the flood, clears the scrollback and uses it a little more; at each step prints
the page process's resident size and its physical footprint. The footprint is what Activity Monitor
shows; the resident size also counts memory already given back that the system has not needed yet.

    python3 scripts/real-app-checks/page-memory.py [/path/to/TerminalPro.app]

Without a path, the app built in this checkout. Keys are typed through System Events, and only while
the app is in front."""
import os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import TERMINAL, osa, usage, webcontent

bundle = sys.argv[1] if len(sys.argv) > 1 else TERMINAL.split("/Contents/")[0]
binary = os.path.join(bundle, "Contents/MacOS/terminal-pro")
mine = lambda: set(int(x) for x in subprocess.run(["pgrep", "-f", binary], capture_output=True, text=True).stdout.split())
before, had = webcontent(), mine()
subprocess.run(["open", "-n", bundle], check=True)
pid = None
for _ in range(40):
    time.sleep(0.25)
    new = mine() - had
    if new: pid = new.pop(); break
if not pid: raise SystemExit("the app did not start")
time.sleep(8)
pages = list(webcontent() - before)
def key(script):
    return osa('''tell application "System Events"
  set target to first process whose unix id is %d
  set frontmost of target to true
  delay 0.5
  if frontmost of target then
    %s
    return "sent"
  end if
  return "not in front, nothing typed"
end tell''' % (pid, script))
def running(name):
    def descendants(p):
        kids = subprocess.run(["pgrep", "-P", str(p)], capture_output=True, text=True).stdout.split()
        return [int(k) for k in kids] + [d for k in kids for d in descendants(int(k))]
    return [d for d in descendants(pid) if subprocess.run(["ps", "-o", "comm=", "-p", str(d)], capture_output=True, text=True).stdout.strip().split("/")[-1] == name]
start = time.time()
def say(what):
    resident = sum(usage(w)[1] for w in pages); footprint = sum(usage(w)[2] for w in pages)
    print("%5.0fs %-40s resident %4.0f MB   footprint %4.0f MB" % (time.time() - start, what, resident, footprint), flush=True)
try:
    say("idle")
    key('keystroke "seq 1 400000"\n    key code 36'); began = time.time(); time.sleep(0.4)
    while running("seq") and time.time() - began < 120: time.sleep(0.05)
    print("      400,000 lines took %.1fs" % (time.time() - began), flush=True)
    time.sleep(3); say("after 400,000 lines")
    key('keystroke "yes"\n    key code 36'); time.sleep(20); say("flooding, 20s in")
    key('key code 8 using {control down}'); time.sleep(1)
    print("      still running 1s after Ctrl+C: %s" % running("yes"), flush=True)
    time.sleep(4); say("5s after the flood ended")
    time.sleep(55); say("a minute after it ended")
    key('key code 40 using {command down}'); time.sleep(10); say("10s after clearing the scrollback")
    for _ in range(3):
        key('keystroke "seq 1 3000"\n    key code 36'); time.sleep(4)
        key('key code 40 using {command down}'); time.sleep(2)
    say("after a little more use")
    time.sleep(60); say("a minute later")
finally:
    subprocess.run(["kill", "-9", str(pid)])
