# ClubGG Auto-Navigation Quick Start Guide

## Prerequisites

### 1. Install Dependencies
```bash
pip install pywinauto Pillow pytesseract opencv-python mss
```

### 2. Install Tesseract OCR
Download and install from: https://github.com/tesseract-ocr/tesseract
- Default path: `C:\Program Files\Tesseract-OCR\tesseract.exe`
- The code will auto-detect this path

### 3. ClubGG Setup
- ClubGG desktop app must be installed and running
- Window must be visible (not minimized)
- Default exe path in code: `D:\testgg\launcher.exe` (update in code if different)

## Running Methods

### Option 1: Direct Python Script (Recommended for Testing)

```bash
# From repository root
python test_desktop_scraper.py
```

This will:
- Check if ClubGG is running
- Detect current screen
- Capture and OCR the current view
- Parse games/tournaments from visible screen

### Option 2: API Endpoints (Full Auto-Navigation)

#### Start the FastAPI server:
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

#### Available Endpoints:

**1. Check Desktop Scraping Status:**
```bash
curl http://127.0.0.1:8000/api/scrapers/desktop/status
```

**2. Quick Scrape (Current Screen Only):**
```bash
curl http://127.0.0.1:8000/api/scrapers/desktop/clubgg
```

**3. Full Tournament Auto-Navigation (⭐ Main Feature):**
```bash
curl http://127.0.0.1:8000/api/scrapers/desktop/clubgg/tournaments
```

This will:
- Navigate to Stage 1, Stage 2, and Final Stage automatically
- Find all "Registering" tournaments via OCR
- Click each tournament to expand details
- Scrape buy-in, guaranteed prize, start time, player count, etc.
- Press Escape to go back
- Scroll to find more tournaments
- Return complete JSON with all tournament data

## Python Usage Example

### Basic Screen Scrape:
```python
import asyncio
from backend.app.scrapers.clubgg_desktop import ClubGGDesktopScraper

async def quick_scrape():
    scraper = ClubGGDesktopScraper()
    
    if await scraper.is_running():
        result = await scraper.run()
        print(f"Found {len(result['games'])} games")
        print(f"Screenshot: {result['screenshot_path']}")
    else:
        print("ClubGG not running!")

asyncio.run(quick_scrape())
```

### Full Auto-Navigation:
```python
import asyncio
from backend.app.scrapers.clubgg_desktop_nav import ClubGGNavigator

async def auto_navigate():
    nav = ClubGGNavigator()
    
    # Detect current screen
    screen = await nav.detect_screen()
    print(f"Current screen: {screen}")
    
    # Navigate to specific section
    await nav.navigate_to("stage_1")
    await asyncio.sleep(2)
    
    # Scrape current screen
    data = await nav.scrape_current_screen()
    print(f"Text extracted: {len(data['raw_text'])} chars")
    
    # Full tournament scraping across all stages
    result = await nav.scrape_all_tournaments()
    print(f"Total tournaments: {result['summary']['total']}")
    for stage, tournaments in result['stages'].items():
        print(f"  {stage}: {len(tournaments)} tournaments")

asyncio.run(auto_navigate())
```

## Navigation Capabilities

### Bottom Navigation Targets:
- `"club"` - Main club section
- `"live_event"` - Live events
- `"stage_1"` - Stage 1 tournaments
- `"stage_2"` - Stage 2 tournaments
- `"final_stage"` - Final stage tournaments
- `"me"` - Profile/account section

### Navigation Methods:
```python
# Navigate by clicking text (OCR-based)
await nav.click_text("tournament")

# Navigate to predefined target (with fallback coordinates)
await nav.navigate_to("stage_1")

# Go to specific sections
await nav.go_to_cash_games()
await nav.go_to_tournaments()

# Scroll functionality
await nav.scroll_down(amount=3)
await nav.scroll_up(amount=2)

# Keyboard input
await nav.press_escape()
await nav.press_enter()

# Direct coordinate clicking
await nav.click_at(120, 960)  # Click at relative position
```

## Important Notes

### Permissions:
- **Auto-navigation requires Administrator privileges** for mouse/keyboard control
- Without admin rights, it falls back to "quick scrape" (current screen only)

### ClubGG Window Requirements:
- Must be visible on screen (not minimized or covered)
- Unity/DirectX applications need to be in foreground for proper capture
- Window will be automatically brought to front before capturing

### OCR Accuracy:
- Works best with clear, high-contrast text
- Preprocessing is applied automatically (grayscale, noise reduction, thresholding)
- Text positions are detected with confidence scores

## Troubleshooting

### "Desktop scraping not available"
```bash
pip install pywinauto Pillow pytesseract opencv-python mss
```

### "Tesseract not found"
- Install Tesseract OCR: https://github.com/tesseract-ocr/tesseract
- Or manually set path in code:
```python
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Your\Path\tesseract.exe'
```

### "ClubGG window not found"
- Make sure ClubGG is running
- Check if exe path is correct in `ClubGGNavigator.EXE_PATH`
- Window title should be "ClubGG" or class "UnityWndClass"

### Screenshots are black
- Bring ClubGG window to foreground manually
- Disable any overlay software
- Check if window has capture protection (some games do)

### Navigation not clicking
- Run script/server as Administrator
- Check `await nav.check_click_permissions()` returns `True`
- Manually verify coordinates with `test_nav.py`

## Testing Without Full Navigation

If you just want to test screen capture and OCR without navigation:

```bash
python test_capture.py
```

This captures the current screen and saves screenshots for debugging.
