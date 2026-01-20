"""Capture full screen to find ClubGG."""
import mss
from PIL import Image

with mss.mss() as sct:
    # Get all monitors
    print("Monitors detected by mss:")
    for i, m in enumerate(sct.monitors):
        print(f"  Monitor {i}: {m}")

    # Capture primary monitor (index 1, 0 is "all monitors")
    screenshot = sct.grab(sct.monitors[1])
    img = Image.frombytes('RGB', screenshot.size, screenshot.bgra, 'raw', 'BGRX')

    # Resize to fit
    img.thumbnail((1280, 720), Image.Resampling.LANCZOS)
    img.save("D:/development/GitHub/jungleverse/full_screen.png")
    print(f"Saved full_screen.png - {img.size}")
