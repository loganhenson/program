// keys PID REPEAT INTERVAL_MS KEYCODE...: press the given keys, REPEAT times over, in one process only.
// The key events are delivered to that process directly: whatever app is in front gets none of them.
#include <ApplicationServices/ApplicationServices.h>
#include <stdlib.h>
#include <unistd.h>
int main(int argc, char **argv) {
  if (argc < 5) return 2;
  pid_t pid = atoi(argv[1]);
  int repeat = atoi(argv[2]), interval = atoi(argv[3]);
  for (int r = 0; r < repeat; r++) {
    for (int k = 4; k < argc; k++) {
      CGKeyCode code = (CGKeyCode)atoi(argv[k]);
      CGEventRef down = CGEventCreateKeyboardEvent(NULL, code, true);
      CGEventRef up = CGEventCreateKeyboardEvent(NULL, code, false);
      CGEventSetFlags(down, 0); CGEventSetFlags(up, 0);
      CGEventPostToPid(pid, down); usleep(6000);
      CGEventPostToPid(pid, up); usleep(6000);
      CFRelease(down); CFRelease(up);
    }
    usleep(interval * 1000);
  }
  return 0;
}
