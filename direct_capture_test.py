"""Direct capture test for ClubGG."""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from pywinauto import Desktop
from PIL import Image
import mss

desktop = Desktop(backend='win32')

# Find ClubGG
clubgg = None
for w in desktop.windows():
    try:
        title = w.window_text()
        cls = w.class_name()
        rect = w.rectangle()
        if (title == 'ClubGG' or cls == 'UnityWndClass') and rect.left > -30000 and rect.width() > 100:
            clubgg = w
            break
    except:
        pass

if not clubgg:
    print("ClubGG not found!")
    sys.exit(1)

rect = clubgg.rectangle()
print(f"ClubGG window:")
print(f"  Handle: {clubgg.handle}")
print(f"  Position: ({rect.left}, {rect.top})")
print(f"  Size: {rect.width()}x{rect.height()}")
print(f"  Right/Bottom: ({rect.right}, {rect.bottom})")

# Capture with mss
print(f"\nCapturing region: left={rect.left}, top={rect.top}, width={rect.width()}, height={rect.height()}")

with mss.mss() as sct:
    monitor = {
        "left": rect.left,
        "top": rect.top,
        "width": rect.width(),
        "height": rect.height()
    }
    screenshot = sct.grab(monitor)
    img = Image.frombytes('RGB', screenshot.size, screenshot.bgra, 'raw', 'BGRX')
    img.save("D:/development/GitHub/jungleverse/direct_capture.png")
    print(f"Saved to direct_capture.png ({img.size})")

# Check if image is black
gray = img.convert('L')
extrema = gray.getextrema()
print(f"Image brightness range: {extrema[0]} to {extrema[1]}")
if extrema[1] < 20:
    print("WARNING: Image appears to be mostly black!")
