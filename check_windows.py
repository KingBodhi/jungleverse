"""Check for ClubGG windows."""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from pywinauto import Desktop

desktop = Desktop(backend='win32')
windows = desktop.windows()
print(f"Total windows: {len(windows)}")
print()

# Look for ClubGG or Unity windows
for w in windows:
    try:
        title = w.window_text()
        cls = w.class_name()
        if not title:
            continue

        # Check for ClubGG-related windows
        title_lower = title.lower()
        if 'club' in title_lower or 'gg' in title_lower or cls == 'UnityWndClass':
            rect = w.rectangle()
            print(f"MATCH: '{title}'")
            print(f"  Class: {cls}")
            print(f"  Size: {rect.width()}x{rect.height()}")
            print(f"  Position: ({rect.left}, {rect.top})")
            print()
    except Exception as e:
        pass

print("--- All windows with titles ---")
for w in windows[:50]:
    try:
        title = w.window_text()
        if title:
            cls = w.class_name()
            rect = w.rectangle()
            if rect.width() > 100 and rect.height() > 100:
                print(f"{title[:35]:35} | {cls[:20]:20} | {rect.width()}x{rect.height()}")
    except:
        pass
