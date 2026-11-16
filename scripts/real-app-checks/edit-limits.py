"""An edit that would take a file past what the editor opens is refused, in the real EditorPro window.

    python3 scripts/real-app-checks/edit-limits.py

Types into a line that is one character short of the longest the editor holds, and adds a line to a
file that already has as many as it holds."""
import os, re, shutil, sys, tempfile, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import Editor

project = os.path.realpath(tempfile.mkdtemp(prefix="edit-limits-"))
open(os.path.join(project, "long-line.txt"), "w").write("x" * 499 + "\nsecond line\n")
open(os.path.join(project, "many-lines.txt"), "w").write("".join("line %d\n" % i for i in range(1, 10001)))

app = Editor(project)
check, wait, html = app.check, app.wait, app.html
path = lambda name: os.path.join(project, name)
# the first line as the page shows it
first_line = lambda: max((len(m) for m in re.findall(r">(x[xabc]*|[abc]+x+)<", html())), default=0)
try:
    check("the project is open", wait(lambda: 'id="%s"' % path("long-line.txt") in html(), 25))
    print(app.click("double", "id:" + path("long-line.txt"), dx=60))
    check("the file with a 499-character line is open", wait(lambda: first_line() == 499), first_line())
    print("type three characters:", app.type('keystroke "iabc"'))
    check("the line takes one more character and stops at 500", wait(lambda: first_line() == 500) and not wait(lambda: first_line() > 500, 2), first_line())
    check("and says why", wait(lambda: "lines of up to 500 characters" in html()), re.findall(r"The editor holds[^<]*", html())[:1])
    app.type("key code 53")

    print(app.click("double", "id:" + path("many-lines.txt"), dx=60))
    check("the file with 10,000 lines is open", wait(lambda: "line 1<" in html() or "line 1\n" in app.text()))
    print("to the end, and open a line below:", app.type('keystroke "Go"'))
    check("the line is not added, and it says why", wait(lambda: "files of up to 10000 lines" in html()), re.findall(r"The editor holds files[^<]*", html())[:1])
    time.sleep(1.2)
    check("the last line is still line 10000", "line 10000" in app.text() and "line 10001" not in app.text())
    check("the app is still running", app.p.poll() is None)
finally:
    ok = app.close()
    shutil.rmtree(project, ignore_errors=True)
sys.exit(0 if ok else 1)
