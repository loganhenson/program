"""New Directory, Delete (a file, then a folder with something in it) and opening a file that is over
the editor's limits, done with real mouse clicks in the real EditorPro window.

    python3 scripts/real-app-checks/tree-actions.py

The two deleted items end up in the Trash."""
import os, shutil, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import Editor

project = os.path.realpath(tempfile.mkdtemp(prefix="tree-actions-"))
os.makedirs(os.path.join(project, "old-folder"))
open(os.path.join(project, "aaa-remove-me.txt"), "w").write("delete me\n")
open(os.path.join(project, "notes.txt"), "w").write("keep me\n")
open(os.path.join(project, "old-folder", "inner.txt"), "w").write("inside\n")
open(os.path.join(project, "too-long.txt"), "w").write("".join("line %d\n" % i for i in range(11000)))

app = Editor(project)
path = lambda name: os.path.join(project, name)
row = lambda name: 'id="%s"' % path(name)
html, wait, check = app.html, app.wait, app.check
try:
    check("the project's files are listed", wait(lambda: all(row(n) in html() for n in ["aaa-remove-me.txt", "notes.txt", "old-folder", "too-long.txt"]), 25))

    print(app.click("right", "id:" + path("notes.txt")))
    check("a right click on a file opens the menu", wait(lambda: "New Directory" in html()))
    print(app.click("left", "text:New Directory"))
    check("choosing New Directory asks for a name", wait(lambda: "vide-create-new-file-input" in html()))
    print("type the name:", app.type('keystroke "made-by-click"\n    key code 36'))
    check("the directory exists on disk", wait(lambda: os.path.isdir(path("made-by-click"))))
    check("and is listed in the tree", wait(lambda: row("made-by-click") in html()))

    for name, what in (("aaa-remove-me.txt", "file"), ("old-folder", "folder")):
        print(app.click("right", "id:" + path(name)))
        check("a right click on the %s opens the menu" % what, wait(lambda: ">Delete<" in html()))
        print(app.click("left", "text:Delete"))
        check("choosing Delete asks first", wait(lambda: "vide-delete-dialog" in html()))
        check("nothing is deleted before OK", os.path.exists(path(name)))
        print(app.click("left", "id:vide-delete-dialog", dx=10))
        check("OK removes the %s from the project" % what, wait(lambda: not os.path.exists(path(name))))
        check("and from the tree", wait(lambda: row(name) not in html()))
    check("the other files are untouched", os.path.exists(path("notes.txt")) and os.path.isdir(path("made-by-click")))

    print(app.click("double", "id:" + path("too-long.txt")))
    check("a file of 11,000 lines is refused with a message", wait(lambda: "11000 lines" in html()))
    check("and nothing of it is shown in the editor", "line 10999" not in html())
    check("the app is still running", app.p.poll() is None)
finally:
    ok = app.close()
    shutil.rmtree(project, ignore_errors=True)
sys.exit(0 if ok else 1)
