// click left|right|double X Y: a mouse click at screen coordinates
#include <ApplicationServices/ApplicationServices.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
int main(int argc, char **argv) {
  if (argc < 4) return 2;
  int right = strcmp(argv[1], "right") == 0;
  CGPoint point = CGPointMake(atof(argv[2]), atof(argv[3]));
  CGMouseButton button = right ? kCGMouseButtonRight : kCGMouseButtonLeft;
  CGEventRef move = CGEventCreateMouseEvent(NULL, kCGEventMouseMoved, point, kCGMouseButtonLeft);
  CGEventRef down = CGEventCreateMouseEvent(NULL, right ? kCGEventRightMouseDown : kCGEventLeftMouseDown, point, button);
  CGEventRef up = CGEventCreateMouseEvent(NULL, right ? kCGEventRightMouseUp : kCGEventLeftMouseUp, point, button);
  CGEventPost(kCGHIDEventTap, move); usleep(120000);
  CGEventPost(kCGHIDEventTap, down); usleep(70000);
  CGEventPost(kCGHIDEventTap, up);
  if (strcmp(argv[1], "double") == 0) {
    usleep(90000);
    CGEventSetIntegerValueField(down, kCGMouseEventClickState, 2);
    CGEventSetIntegerValueField(up, kCGMouseEventClickState, 2);
    CGEventPost(kCGHIDEventTap, down); usleep(70000);
    CGEventPost(kCGHIDEventTap, up);
  }
  CFRelease(move); CFRelease(down); CFRelease(up);
  return 0;
}
