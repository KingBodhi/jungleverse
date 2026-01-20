"""Debug window detection for ClubGG."""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from pywinauto import Desktop

desktop = Desktop(backend='win32')

print("=== All ClubGG/Unity Windows ===\n")

for w in desktop.windows():
    try:
        title = w.window_text()
        cls = w.class_name()
        rect = w.rectangle()

        # Check for ClubGG-related windows
        if 'club' in title.lower() or 'gg' in title.lower() or cls == 'UnityWndClass':
            visible = rect.left > -30000 and rect.width() > 100
            print(f"Title: '{title}'")
            print(f"  Class: {cls}")
            print(f"  Handle: {w.handle}")
            print(f"  Position: ({rect.left}, {rect.top})")
            print(f"  Size: {rect.width()}x{rect.height()}")
            print(f"  Visible: {visible}")
            print()
    except Exception as e:
        pass

print("\n=== Top Visible Windows (might be overlapping) ===\n")

count = 0
for w in desktop.windows():
    try:
        title = w.window_text()
        if not title:
            continue
        rect = w.rectangle()
        if rect.left > -1000 and rect.width() > 200 and rect.height() > 200:
            print(f"{title[:50]:50} at ({rect.left}, {rect.top}) {rect.width()}x{rect.height()}")
            count += 1
            if count >= 15:
                break
    except:
        pass
