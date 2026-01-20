"""Find ALL ClubGG and Unity windows."""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from pywinauto import Desktop

desktop = Desktop(backend='win32')

print("=== ALL windows with 'ClubGG' in title or UnityWndClass ===\n")

count = 0
for w in desktop.windows():
    try:
        title = w.window_text()
        cls = w.class_name()
        rect = w.rectangle()

        if 'clubgg' in title.lower() or 'unity' in cls.lower():
            count += 1
            print(f"#{count} Title: '{title}'")
            print(f"    Class: {cls}")
            print(f"    Handle: {w.handle}")
            print(f"    Position: ({rect.left}, {rect.top}) to ({rect.right}, {rect.bottom})")
            print(f"    Size: {rect.width()}x{rect.height()}")
            print(f"    Visible: {w.is_visible()}")
            print()
    except Exception as e:
        pass

print(f"Total found: {count}")

# Also check for any window at the coordinates we're capturing
print("\n=== Windows near (1429, 126) ===")
for w in desktop.windows():
    try:
        rect = w.rectangle()
        # Check if window overlaps with our target area
        if (rect.left < 1969 and rect.right > 1429 and
            rect.top < 1117 and rect.bottom > 126 and
            rect.width() > 50 and rect.height() > 50):
            title = w.window_text()
            if title:
                print(f"'{title[:40]}' at ({rect.left},{rect.top}) {rect.width()}x{rect.height()}")
    except:
        pass
