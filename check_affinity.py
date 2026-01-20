"""Check ClubGG display affinity."""
import ctypes
from pywinauto import Desktop

user32 = ctypes.windll.user32

desktop = Desktop(backend='win32')
for w in desktop.windows():
    try:
        if w.window_text() == 'ClubGG':
            hwnd = w.handle
            print(f"ClubGG hwnd: {hwnd}")

            # Check DisplayAffinity
            affinity = ctypes.c_uint32()
            result = user32.GetWindowDisplayAffinity(hwnd, ctypes.byref(affinity))
            print(f"GetWindowDisplayAffinity result: {result}")
            print(f"Affinity value: {affinity.value}")
            print(f"  0 = None (capturable)")
            print(f"  1 = WDA_MONITOR (capture protected)")
            print(f"  17 = WDA_EXCLUDEFROMCAPTURE (hidden from capture)")
            break
    except Exception as e:
        print(f"Error: {e}")
