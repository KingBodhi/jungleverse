"""Restore and focus ClubGG window."""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import ctypes
from pywinauto import Desktop

SW_RESTORE = 9
SW_SHOW = 5
SW_SHOWNORMAL = 1

desktop = Desktop(backend='win32')

for w in desktop.windows():
    try:
        title = w.window_text()
        cls = w.class_name()
        if title == 'ClubGG' or cls == 'UnityWndClass':
            hwnd = w.handle
            print(f"Found: '{title}' (hwnd={hwnd})")

            # Restore window if minimized
            ctypes.windll.user32.ShowWindow(hwnd, SW_RESTORE)

            # Bring to foreground
            ctypes.windll.user32.SetForegroundWindow(hwnd)

            # Check new position
            import time
            time.sleep(1)
            rect = w.rectangle()
            print(f"New size: {rect.width()}x{rect.height()}")
            print(f"New position: ({rect.left}, {rect.top})")
            break
    except Exception as e:
        print(f"Error: {e}")
