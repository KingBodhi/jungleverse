"""
Base class for desktop application scrapers.

Uses screen capture and OCR for applications that don't expose
their UI through Windows UI Automation (e.g., Unity games).
"""

import asyncio
import shutil
import subprocess
import tempfile
import time
import uuid
from abc import ABC, abstractmethod
from io import BytesIO
from pathlib import Path
from typing import Any

import os

try:
    import cv2
    import numpy as np
    import pytesseract
    import mss
    from PIL import Image, ImageGrab
    from pywinauto import Desktop
    from pywinauto.application import Application
except ImportError as e:
    raise ImportError(
        f"Desktop scraping dependencies not installed: {e}. "
        "Install with: pip install pywinauto Pillow pytesseract opencv-python mss"
    )

# Auto-detect Tesseract path if not in PATH
_tesseract_paths = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
]
for _path in _tesseract_paths:
    if os.path.exists(_path):
        pytesseract.pytesseract.tesseract_cmd = _path
        break


class DesktopBaseScraper(ABC):
    """
    Base class for scraping desktop applications using screen capture and OCR.

    Provides common functionality for:
    - Finding and connecting to desktop application windows
    - Taking screenshots of specific windows
    - OCR text extraction from screenshots
    - Image preprocessing for better OCR results
    """

    # Override in subclasses
    APP_NAME: str = ""
    EXE_PATH: str = ""
    WINDOW_TITLE_PATTERN: str = ""
    WINDOW_CLASS: str = ""

    def __init__(self):
        self.app: Application | None = None
        self.main_window = None
        # Use win32 backend - more reliable for Unity/game windows
        # UIA backend often doesn't find Unity windows properly
        self.desktop = Desktop(backend="win32")
        # Screenshot folder management
        self._screenshots_dir: Path | None = None
        self._screenshot_count = 0

    def _is_valid_window(self, window) -> bool:
        """Check if a window is valid (visible and not hidden)."""
        try:
            rect = window.rectangle()
            # Windows at (-32000, -32000) are hidden/minimized placeholder windows
            if rect.left <= -30000 or rect.top <= -30000:
                return False
            # Window should have reasonable size (at least 100x100)
            if rect.width() < 100 or rect.height() < 100:
                return False
            return True
        except Exception:
            return False

    async def find_window(self) -> bool:
        """Find the application window (skips hidden/minimized windows)."""
        try:
            windows = self.desktop.windows()
            # First pass: look for valid visible windows
            for w in windows:
                try:
                    title = w.window_text().lower()
                    class_name = w.class_name()

                    # Check if window matches our criteria
                    matches = False
                    if self.WINDOW_CLASS and class_name == self.WINDOW_CLASS:
                        matches = True
                    elif self.WINDOW_TITLE_PATTERN and self.WINDOW_TITLE_PATTERN.lower() in title:
                        matches = True

                    # Only accept if it's a valid visible window
                    if matches and self._is_valid_window(w):
                        self.main_window = w
                        return True
                except Exception:
                    continue
            return False
        except Exception:
            return False

    async def start_app(self, wait_seconds: int = 10) -> bool:
        """Start the application if not running."""
        if await self.find_window():
            return True

        if not self.EXE_PATH or not Path(self.EXE_PATH).exists():
            raise FileNotFoundError(f"Executable not found: {self.EXE_PATH}")

        # Start the application
        subprocess.Popen([self.EXE_PATH], shell=True)

        # Wait for app to start
        for _ in range(wait_seconds):
            await asyncio.sleep(1)
            if await self.find_window():
                # Additional wait for UI to fully load
                await asyncio.sleep(3)
                return True

        return False

    async def capture_window(self) -> Image.Image | None:
        """
        Capture a screenshot of the application window.

        Uses mss library for fast, reliable capture that works with
        hardware-accelerated windows (DirectX/OpenGL/Unity).

        IMPORTANT: For Unity/DirectX apps, the window MUST be visible and not
        covered by other windows. Standard GDI capture methods return black
        for hardware-accelerated content.
        """
        # Always re-find the window to get fresh handle and position
        if not await self.find_window():
            return None

        try:
            rect = self.main_window.rectangle()
            hwnd = self.main_window.handle

            # Validate window is visible (not at hidden position)
            if rect.left <= -30000 or rect.top <= -30000:
                print(f"Window at hidden position: ({rect.left}, {rect.top})")
                return None

            if rect.width() < 100 or rect.height() < 100:
                print(f"Window too small: {rect.width()}x{rect.height()}")
                return None

            # Try to bring window to front
            import ctypes
            user32 = ctypes.windll.user32
            user32.AllowSetForegroundWindow(-1)
            user32.ShowWindow(hwnd, 5)  # SW_SHOW
            user32.SetForegroundWindow(hwnd)
            user32.BringWindowToTop(hwnd)

            try:
                self.main_window.set_focus()
            except Exception:
                pass  # Focus might fail, continue anyway

            await asyncio.sleep(0.3)

            # Re-get rect after focus attempt
            rect = self.main_window.rectangle()

            # Capture using mss (screen capture)
            # Note: This captures whatever is visible at these coordinates
            with mss.mss() as sct:
                monitor = {
                    "left": rect.left,
                    "top": rect.top,
                    "width": rect.width(),
                    "height": rect.height()
                }
                screenshot = sct.grab(monitor)
                img = Image.frombytes('RGB', screenshot.size, screenshot.bgra, 'raw', 'BGRX')
                return img

        except Exception as e:
            print(f"Error capturing window: {e}")
            return None

    def _capture_with_bitblt(self, hwnd: int, width: int, height: int) -> Image.Image | None:
        """
        Capture window using BitBlt from window DC.

        This captures the window content directly, regardless of z-order
        (works even if window is partially covered).
        """
        import ctypes
        from ctypes import wintypes

        try:
            user32 = ctypes.windll.user32
            gdi32 = ctypes.windll.gdi32

            # Get the window's device context
            hwnd_dc = user32.GetDC(hwnd)
            if not hwnd_dc:
                return None

            try:
                # Create compatible DC and bitmap
                mfc_dc = gdi32.CreateCompatibleDC(hwnd_dc)
                if not mfc_dc:
                    return None

                try:
                    bitmap = gdi32.CreateCompatibleBitmap(hwnd_dc, width, height)
                    if not bitmap:
                        return None

                    try:
                        old_bitmap = gdi32.SelectObject(mfc_dc, bitmap)

                        # BitBlt from window DC to our bitmap
                        SRCCOPY = 0x00CC0020
                        gdi32.BitBlt(mfc_dc, 0, 0, width, height, hwnd_dc, 0, 0, SRCCOPY)

                        # Get bitmap data
                        class BITMAPINFOHEADER(ctypes.Structure):
                            _fields_ = [
                                ('biSize', wintypes.DWORD),
                                ('biWidth', wintypes.LONG),
                                ('biHeight', wintypes.LONG),
                                ('biPlanes', wintypes.WORD),
                                ('biBitCount', wintypes.WORD),
                                ('biCompression', wintypes.DWORD),
                                ('biSizeImage', wintypes.DWORD),
                                ('biXPelsPerMeter', wintypes.LONG),
                                ('biYPelsPerMeter', wintypes.LONG),
                                ('biClrUsed', wintypes.DWORD),
                                ('biClrImportant', wintypes.DWORD),
                            ]

                        bmi = BITMAPINFOHEADER()
                        bmi.biSize = ctypes.sizeof(BITMAPINFOHEADER)
                        bmi.biWidth = width
                        bmi.biHeight = -height  # Negative for top-down
                        bmi.biPlanes = 1
                        bmi.biBitCount = 32
                        bmi.biCompression = 0

                        buffer_size = width * height * 4
                        buffer = ctypes.create_string_buffer(buffer_size)

                        gdi32.GetDIBits(
                            mfc_dc, bitmap, 0, height,
                            buffer, ctypes.byref(bmi), 0
                        )

                        # Convert to PIL Image
                        img = Image.frombuffer('RGBA', (width, height), buffer, 'raw', 'BGRA', 0, 1)
                        return img.convert('RGB')

                    finally:
                        gdi32.SelectObject(mfc_dc, old_bitmap)
                        gdi32.DeleteObject(bitmap)
                finally:
                    gdi32.DeleteDC(mfc_dc)
            finally:
                user32.ReleaseDC(hwnd, hwnd_dc)

        except Exception as e:
            print(f"BitBlt capture failed: {e}")
            return None

    def _capture_with_printwindow(self, hwnd: int, rect) -> Image.Image | None:
        """
        Capture window using PrintWindow API.

        This works with hardware-accelerated DirectX/OpenGL windows
        that return black with standard screen capture methods.
        """
        import ctypes
        from ctypes import wintypes

        try:
            # Get window dimensions
            width = rect.width()
            height = rect.height()

            if width <= 0 or height <= 0:
                return None

            # Windows GDI constants
            PW_RENDERFULLCONTENT = 2  # Capture full content including DirectX
            SRCCOPY = 0x00CC0020

            # Get DCs
            user32 = ctypes.windll.user32
            gdi32 = ctypes.windll.gdi32

            # Get window DC
            hwnd_dc = user32.GetWindowDC(hwnd)
            if not hwnd_dc:
                return None

            try:
                # Create compatible DC and bitmap
                mfc_dc = gdi32.CreateCompatibleDC(hwnd_dc)
                if not mfc_dc:
                    return None

                try:
                    save_bitmap = gdi32.CreateCompatibleBitmap(hwnd_dc, width, height)
                    if not save_bitmap:
                        return None

                    try:
                        gdi32.SelectObject(mfc_dc, save_bitmap)

                        # Try PrintWindow with full content flag (for DirectX)
                        result = user32.PrintWindow(hwnd, mfc_dc, PW_RENDERFULLCONTENT)

                        if not result:
                            # Fallback to standard PrintWindow
                            result = user32.PrintWindow(hwnd, mfc_dc, 0)

                        if not result:
                            # Final fallback: BitBlt from screen
                            gdi32.BitBlt(mfc_dc, 0, 0, width, height, hwnd_dc, 0, 0, SRCCOPY)

                        # Create BITMAPINFOHEADER
                        class BITMAPINFOHEADER(ctypes.Structure):
                            _fields_ = [
                                ('biSize', wintypes.DWORD),
                                ('biWidth', wintypes.LONG),
                                ('biHeight', wintypes.LONG),
                                ('biPlanes', wintypes.WORD),
                                ('biBitCount', wintypes.WORD),
                                ('biCompression', wintypes.DWORD),
                                ('biSizeImage', wintypes.DWORD),
                                ('biXPelsPerMeter', wintypes.LONG),
                                ('biYPelsPerMeter', wintypes.LONG),
                                ('biClrUsed', wintypes.DWORD),
                                ('biClrImportant', wintypes.DWORD),
                            ]

                        bmi = BITMAPINFOHEADER()
                        bmi.biSize = ctypes.sizeof(BITMAPINFOHEADER)
                        bmi.biWidth = width
                        bmi.biHeight = -height  # Negative for top-down
                        bmi.biPlanes = 1
                        bmi.biBitCount = 32
                        bmi.biCompression = 0  # BI_RGB

                        # Create buffer for pixel data
                        buffer_size = width * height * 4
                        buffer = ctypes.create_string_buffer(buffer_size)

                        # Get the bitmap bits
                        gdi32.GetDIBits(
                            mfc_dc, save_bitmap, 0, height,
                            buffer, ctypes.byref(bmi), 0  # DIB_RGB_COLORS
                        )

                        # Convert to PIL Image (BGRA -> RGBA)
                        img = Image.frombuffer('RGBA', (width, height), buffer, 'raw', 'BGRA', 0, 1)

                        # Check if image is not all black (capture succeeded)
                        extrema = img.convert('L').getextrema()
                        if extrema[1] > 10:  # Max pixel value > 10 means not black
                            return img
                        else:
                            return None  # Black image, fallback needed

                    finally:
                        gdi32.DeleteObject(save_bitmap)
                finally:
                    gdi32.DeleteDC(mfc_dc)
            finally:
                user32.ReleaseDC(hwnd, hwnd_dc)

        except Exception as e:
            print(f"PrintWindow capture failed: {e}")
            return None

    async def capture_region(
        self, x: int, y: int, width: int, height: int
    ) -> Image.Image | None:
        """Capture a specific region relative to the window."""
        if not self.main_window:
            if not await self.find_window():
                return None

        try:
            rect = self.main_window.rectangle()
            abs_x = rect.left + x
            abs_y = rect.top + y

            self.main_window.set_focus()
            await asyncio.sleep(0.2)

            screenshot = ImageGrab.grab(
                bbox=(abs_x, abs_y, abs_x + width, abs_y + height)
            )
            return screenshot
        except Exception as e:
            print(f"Error capturing region: {e}")
            return None

    def preprocess_for_ocr(self, image: Image.Image) -> Image.Image:
        """
        Preprocess image for better OCR accuracy.

        Applies:
        - Grayscale conversion
        - Contrast enhancement
        - Noise reduction
        - Thresholding
        """
        # Convert to OpenCV format
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

        # Convert to grayscale
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)

        # Apply bilateral filter to reduce noise while keeping edges
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)

        # Apply adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )

        # Convert back to PIL
        return Image.fromarray(thresh)

    async def extract_text(
        self,
        image: Image.Image,
        preprocess: bool = True,
        config: str = "",
    ) -> str:
        """
        Extract text from an image using OCR.

        Args:
            image: PIL Image to process
            preprocess: Whether to apply preprocessing
            config: Tesseract configuration string

        Returns:
            Extracted text
        """
        if preprocess:
            image = self.preprocess_for_ocr(image)

        # Default config for better accuracy
        if not config:
            config = "--oem 3 --psm 6"

        text = pytesseract.image_to_string(image, config=config)
        return text.strip()

    async def extract_text_with_data(
        self,
        image: Image.Image,
        preprocess: bool = True,
    ) -> list[dict]:
        """
        Extract text with position and confidence data.

        Returns list of dicts with:
        - text: The extracted text
        - x, y, width, height: Bounding box
        - confidence: OCR confidence score
        """
        if preprocess:
            image = self.preprocess_for_ocr(image)

        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)

        results = []
        for i, text in enumerate(data["text"]):
            if text.strip():
                results.append(
                    {
                        "text": text,
                        "x": data["left"][i],
                        "y": data["top"][i],
                        "width": data["width"][i],
                        "height": data["height"][i],
                        "confidence": data["conf"][i],
                    }
                )

        return results

    async def click_at(self, x: int, y: int) -> None:
        """Click at a position relative to the window."""
        if not self.main_window:
            return

        rect = self.main_window.rectangle()
        abs_x = rect.left + x
        abs_y = rect.top + y

        # Use ctypes for more reliable clicking (avoids permission issues)
        import ctypes
        ctypes.windll.user32.SetCursorPos(int(abs_x), int(abs_y))
        ctypes.windll.user32.mouse_event(2, 0, 0, 0, 0)  # MOUSEEVENTF_LEFTDOWN
        ctypes.windll.user32.mouse_event(4, 0, 0, 0, 0)  # MOUSEEVENTF_LEFTUP

    async def press_key(self, key_code: int) -> None:
        """Press a keyboard key using virtual key code."""
        import ctypes

        # Focus the window first
        if self.main_window:
            try:
                self.main_window.set_focus()
                await asyncio.sleep(0.1)
            except Exception:
                pass

        # Key press using keybd_event
        ctypes.windll.user32.keybd_event(key_code, 0, 0, 0)  # Key down
        await asyncio.sleep(0.05)
        ctypes.windll.user32.keybd_event(key_code, 0, 2, 0)  # Key up (KEYEVENTF_KEYUP = 2)

    async def press_escape(self) -> None:
        """Press the Escape key."""
        VK_ESCAPE = 0x1B
        await self.press_key(VK_ESCAPE)
        await asyncio.sleep(0.3)

    async def press_enter(self) -> None:
        """Press the Enter key."""
        VK_RETURN = 0x0D
        await self.press_key(VK_RETURN)
        await asyncio.sleep(0.3)

    async def scroll_down(self, amount: int = 3) -> None:
        """Scroll down in the window."""
        import ctypes

        if not self.main_window:
            return

        rect = self.main_window.rectangle()
        # Position cursor in center of window
        center_x = rect.left + rect.width() // 2
        center_y = rect.top + rect.height() // 2

        ctypes.windll.user32.SetCursorPos(int(center_x), int(center_y))
        await asyncio.sleep(0.1)

        # Scroll down (negative value scrolls down)
        WHEEL_DELTA = 120
        MOUSEEVENTF_WHEEL = 0x0800
        scroll_amount = -WHEEL_DELTA * amount
        ctypes.windll.user32.mouse_event(MOUSEEVENTF_WHEEL, 0, 0, scroll_amount, 0)
        await asyncio.sleep(0.3)

    async def scroll_up(self, amount: int = 3) -> None:
        """Scroll up in the window."""
        import ctypes

        if not self.main_window:
            return

        rect = self.main_window.rectangle()
        center_x = rect.left + rect.width() // 2
        center_y = rect.top + rect.height() // 2

        ctypes.windll.user32.SetCursorPos(int(center_x), int(center_y))
        await asyncio.sleep(0.1)

        WHEEL_DELTA = 120
        MOUSEEVENTF_WHEEL = 0x0800
        scroll_amount = WHEEL_DELTA * amount
        ctypes.windll.user32.mouse_event(MOUSEEVENTF_WHEEL, 0, 0, scroll_amount, 0)
        await asyncio.sleep(0.3)

    async def save_screenshot(self, path: str | Path | None = None, prefix: str = "debug") -> str | None:
        """
        Save a screenshot for debugging.

        Args:
            path: Optional explicit path. If None, saves to the screenshots folder.
            prefix: Prefix for auto-generated filename (used when path is None)

        Returns:
            The path where the screenshot was saved, or None if failed
        """
        screenshot = await self.capture_window()
        if screenshot:
            if path is None:
                path = self.get_screenshot_path(prefix)
            screenshot.save(str(path))
            return str(path)
        return None

    async def get_window_size(self) -> tuple[int, int] | None:
        """Get the window size."""
        if not self.main_window:
            if not await self.find_window():
                return None

        rect = self.main_window.rectangle()
        return (rect.width(), rect.height())

    async def is_running(self) -> bool:
        """Check if the application is running."""
        return await self.find_window()

    def setup_screenshot_folder(self) -> Path:
        """
        Create a temporary folder for storing OCR screenshots.

        Returns:
            Path to the screenshots folder
        """
        if self._screenshots_dir is None:
            # Create unique folder name with app name and UUID
            folder_name = f"scraper_screenshots_{self.APP_NAME}_{uuid.uuid4().hex[:8]}"
            self._screenshots_dir = Path(tempfile.gettempdir()) / folder_name
            self._screenshots_dir.mkdir(parents=True, exist_ok=True)
            self._screenshot_count = 0
        return self._screenshots_dir

    def cleanup_screenshot_folder(self) -> None:
        """
        Remove the screenshots folder and all its contents.
        Should be called after scraping is complete.
        """
        if self._screenshots_dir is not None and self._screenshots_dir.exists():
            try:
                shutil.rmtree(self._screenshots_dir)
            except Exception as e:
                print(f"Warning: Could not clean up screenshots folder: {e}")
            finally:
                self._screenshots_dir = None
                self._screenshot_count = 0

    @property
    def screenshots_dir(self) -> Path | None:
        """Get the current screenshots directory path."""
        return self._screenshots_dir

    def get_screenshot_path(self, prefix: str = "capture") -> Path:
        """
        Generate a unique path for saving a screenshot.

        Args:
            prefix: Prefix for the screenshot filename

        Returns:
            Path object for the screenshot file
        """
        if self._screenshots_dir is None:
            self.setup_screenshot_folder()

        self._screenshot_count += 1
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"{prefix}_{timestamp}_{self._screenshot_count:03d}.png"
        return self._screenshots_dir / filename

    async def run(self) -> Any:
        """Run the scraper with automatic screenshot folder management."""
        try:
            # Set up screenshot folder for this scraping session
            self.setup_screenshot_folder()

            # Ensure app is running
            if not await self.is_running():
                if not await self.start_app():
                    return {
                        "success": False,
                        "error": f"Could not start or find {self.APP_NAME}",
                    }

            return await self.scrape()
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }
        finally:
            # Always clean up screenshots folder after scraping
            self.cleanup_screenshot_folder()

    @abstractmethod
    async def scrape(self) -> Any:
        """
        Implement the actual scraping logic.
        Must be overridden by subclasses.
        """
        pass
