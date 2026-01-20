"""Capture monitor 2 to find ClubGG."""
import mss
from PIL import Image

with mss.mss() as sct:
    print("Monitors:")
    for i, m in enumerate(sct.monitors):
        print(f"  {i}: {m}")

    # Capture monitor 2 (second display)
    if len(sct.monitors) > 2:
        screenshot = sct.grab(sct.monitors[2])
        img = Image.frombytes('RGB', screenshot.size, screenshot.bgra, 'raw', 'BGRX')
        img.thumbnail((1280, 800), Image.Resampling.LANCZOS)
        img.save("D:/development/GitHub/jungleverse/monitor2.png")
        print(f"Saved monitor2.png - {img.size}")
    else:
        print("No second monitor detected")
