"""What the checks in this folder share: starting the real apps and driving them."""
import json, os, re, subprocess, tempfile, time, ctypes

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
EDITOR = os.path.join(REPO, "editor-pro/src-tauri/target/release/bundle/macos/EditorPro.app/Contents/MacOS/editor-pro")
TERMINAL = os.path.join(REPO, "terminal-pro/src-tauri/target/release/bundle/macos/TerminalPro.app/Contents/MacOS/terminal-pro")
TITLE_BAR = 28
# what each bundle's Info.plist sets when the app is started from the Finder
PAGE_MEMORY = {"__XPC_JSC_forceRAMSize": "1073741824"}


def osa(script, timeout=90):
    try:
        r = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip() or ("ERROR " + r.stderr.strip())
    except subprocess.TimeoutExpired:
        return "ERROR timeout"


def helper(name):
    """A small C program of this folder, compiled when it is first needed."""
    built = os.path.join(tempfile.gettempdir(), "real-app-checks-" + name)
    source = os.path.join(HERE, name + ".c")
    if not os.path.exists(built) or os.path.getmtime(built) < os.path.getmtime(source):
        subprocess.run(["cc", "-o", built, source, "-framework", "ApplicationServices"], check=True)
    return built


def webcontent():
    out = subprocess.run(["ps", "-axo", "pid=,comm="], capture_output=True, text=True).stdout
    return set(int(l.split()[0]) for l in out.splitlines() if "WebKit.WebContent" in l)


def clean_environment():
    return {k: v for k, v in os.environ.items() if not k.startswith(("CLAUDE", "ANTHROPIC", "AWS_", "__XPC_"))}


class _RUsage(ctypes.Structure):
    _fields_ = [("uuid", ctypes.c_uint8 * 16)] + [(n, ctypes.c_uint64) for n in
        "user_time system_time pkg_idle_wkups interrupt_wkups pageins wired_size resident_size phys_footprint proc_start_abstime proc_exit_abstime child_user_time child_system_time child_pkg_idle_wkups child_interrupt_wkups child_pageins child_elapsed_abstime diskio_bytesread diskio_byteswritten".split()]
class _Timebase(ctypes.Structure):
    _fields_ = [("numer", ctypes.c_uint32), ("denom", ctypes.c_uint32)]
_libproc = ctypes.CDLL("/usr/lib/libproc.dylib")
_timebase = _Timebase(); ctypes.CDLL("/usr/lib/libSystem.dylib").mach_timebase_info(ctypes.byref(_timebase))


def usage(pid):
    """(processor seconds used so far, resident MB, physical footprint MB) of a process, from the kernel.
    The footprint is what Activity Monitor shows as Memory; the resident size also counts memory the
    process has given back that the system has not yet had a use for."""
    info = _RUsage()
    if _libproc.proc_pid_rusage(pid, 2, ctypes.byref(info)) != 0:
        return (0.0, 0.0, 0.0)
    return ((info.user_time + info.system_time) * _timebase.numer / _timebase.denom / 1e9, info.resident_size / 1048576, info.phys_footprint / 1048576)


class Editor:
    """The real EditorPro, run from the shell on a project, reporting what its page shows to a file."""
    def __init__(self, project):
        self.project = project
        self.dump = os.path.join(tempfile.mkdtemp(prefix="editor-shows-"), "page.html")
        before = webcontent()
        env = clean_environment(); env.update(PAGE_MEMORY, DEV_DIRECTORY=project, EDITOR_DOM_DUMP=self.dump)
        self.p = subprocess.Popen([EDITOR], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.pid = self.p.pid
        self.target = "first process whose unix id is %d" % self.pid
        self.results = []
        self._before = before
    def pages(self):
        return list(webcontent() - self._before)
    def html(self):
        try: return open(self.dump).read()
        except Exception: return ""
    def text(self):
        return re.sub(r"<[^>]+>", "", self.html())
    def scrolled(self):
        return int((re.findall(r"editor-container scrollTop=(\d+)", self.html()) or ["-1"])[-1])
    def wait(self, condition, seconds=8):
        end = time.time() + seconds
        while time.time() < end:
            if condition(): return True
            time.sleep(0.3)
        return condition()
    def check(self, what, ok, detail=""):
        self.results.append(bool(ok)); print(("ok   " if ok else "FAIL ") + what + ((" — " + str(detail)) if detail else ""), flush=True)
    def window(self):
        return [int(v) for v in osa('tell application "System Events" to tell (%s) to get {position of window 1, size of window 1}' % self.target).replace(" ", "").split(",")]
    def in_front(self):
        osa('tell application "System Events" to tell (%s) to set frontmost to true' % self.target); time.sleep(0.5)
        return osa('tell application "System Events" to get unix id of first process whose frontmost is true') == str(self.pid)
    def where(self, want):
        """Where something is on the screen. Nothing here can see the screen, so the page the app says it
        is showing is laid out with the app's own styles at the window's size, and measured there."""
        x, y, w, h = self.window()
        out = subprocess.run(["node", os.path.join(HERE, "where.js"), self.dump, str(w), str(h - TITLE_BAR), want], capture_output=True, text=True)
        try: r = json.loads(out.stdout.strip().splitlines()[-1])[0]
        except Exception: raise SystemExit("where.js failed: " + out.stdout[-300:] + out.stderr[-600:])
        if not r["found"]: return None
        return {"x": x + r["x"], "y": y + TITLE_BAR + r["y"], "width": r["width"], "height": r["height"], "tag": r["tag"].lower(), "window": (x, y, w, h)}
    def click(self, kind, want, dx=None):
        """A real mouse click (left, right or double), only while EditorPro is the app in front."""
        r = self.where(want)
        if not r: return "not on the page: " + want
        x, y, w, h = r["window"]
        px = r["x"] + (dx if dx is not None else min(r["width"] / 2, 90)); py = r["y"] + r["height"] / 2
        if not (x < px < x + w and y + TITLE_BAR < py < y + h): return "outside the window: %s at %d,%d" % (want, px, py)
        if not self.in_front(): return "EditorPro is not in front, nothing clicked"
        subprocess.run([helper("click"), kind, str(px), str(py)])
        return "%s click at %d,%d (%s %dx%d)" % (kind, px, py, r["tag"], r["width"], r["height"])
    def type(self, script):
        """Keys typed through System Events, only while EditorPro is the app in front."""
        return osa('''tell application "System Events"
  set target to %s
  set frontmost of target to true
  delay 0.5
  if frontmost of target then
    %s
    return "sent"
  end if
  return "not in front, nothing typed"
end tell''' % (self.target, script))
    def press(self, keycodes, times=1, interval_ms=12):
        """Key presses delivered to EditorPro alone, whatever app is in front."""
        subprocess.run([helper("keys"), str(self.pid), str(times), str(interval_ms)] + [str(k) for k in keycodes])
    def close(self):
        self.p.kill()
        print("%d of %d passed" % (sum(self.results), len(self.results)))
        return all(self.results)
