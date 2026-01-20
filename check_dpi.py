"""Check DPI scaling and try alternative capture."""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import ctypes
from ctypes import wintypes
from pywinauto import Desktop
from PIL import Image
import mss

# Check DPI awareness
try:
    awareness = ctypes.c_int()
    ctypes.windll.shcore.GetProcessDpiAwareness(0, ctypes.byref(awareness))
    print(f"Process DPI Awareness: {awareness.value}")
    # 0 = unaware, 1 = system aware, 2 = per-monitor aware
except:
    print("Could not get DPI awareness")

# Get system DPI
user32 = ctypes.windll.user32
try:
    # Make process DPI aware
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except:
    pass

hdc = user32.GetDC(0)
dpi_x = ctypes.windll.gdi32.GetDeviceCaps(hdc, 88)  # LOGPIXELSX
dpi_y = ctypes.windll.gdi32.GetDeviceCaps(hdc, 90)  # LOGPIXELSY
user32.ReleaseDC(0, hdc)
print(f"System DPI: {dpi_x} x {dpi_y} (100% = 96)")
print(f"Scaling factor: {dpi_x / 96 * 100:.0f}%")

# Find ClubGG
desktop = Desktop(backend='win32')
clubgg = None
for w in desktop.windows():
    try:
        if w.window_text() == 'ClubGG' and w.class_name() == 'UnityWndClass':
            clubgg = w
            break
    except:
        pass

if not clubgg:
    print("ClubGG not found!")
    sys.exit(1)

rect = clubgg.rectangle()
print(f"\nClubGG rect: ({rect.left}, {rect.top}) to ({rect.right}, {rect.bottom})")
print(f"Size: {rect.width()}x{rect.height()}")

# Try capturing with DPI-adjusted coordinates
scale = dpi_x / 96
adjusted_left = int(rect.left * scale)
adjusted_top = int(rect.top * scale)
adjusted_width = int(rect.width() * scale)
adjusted_height = int(rect.height() * scale)

print(f"\nAdjusted for DPI: ({adjusted_left}, {adjusted_top}) {adjusted_width}x{adjusted_height}")

# Capture both ways
with mss.mss() as sct:
    # Original coordinates
    monitor1 = {"left": rect.left, "top": rect.top, "width": rect.width(), "height": rect.height()}
    ss1 = sct.grab(monitor1)
    img1 = Image.frombytes('RGB', ss1.size, ss1.bgra, 'raw', 'BGRX')
    img1.save("D:/development/GitHub/jungleverse/capture_original.png")
    print(f"Saved capture_original.png")

    # Adjusted coordinates
    monitor2 = {"left": adjusted_left, "top": adjusted_top, "width": adjusted_width, "height": adjusted_height}
    ss2 = sct.grab(monitor2)
    img2 = Image.frombytes('RGB', ss2.size, ss2.bgra, 'raw', 'BGRX')
    img2.save("D:/development/GitHub/jungleverse/capture_adjusted.png")
    print(f"Saved capture_adjusted.png")
