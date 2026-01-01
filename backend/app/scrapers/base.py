import asyncio
import random
from abc import ABC, abstractmethod
from typing import Any

from playwright.async_api import Browser, BrowserContext, Page, Playwright

from ..config import get_settings

settings = get_settings()


class BaseScraper(ABC):
    """
    Base class for all scrapers using Playwright for headless browser automation.

    Provides common functionality for:
    - Browser/context/page management
    - Random delays to avoid detection
    - Retry logic
    - Error handling
    """

    def __init__(self, playwright: Playwright):
        self.playwright = playwright
        self.browser: Browser | None = None
        self.context: BrowserContext | None = None
        self.page: Page | None = None

    async def start_browser(self) -> None:
        """Initialize the browser with headless configuration."""
        self.browser = await self.playwright.chromium.launch(
            headless=settings.browser_headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-gpu",
                "--disable-web-security",
            ],
        )

        # Create context with realistic viewport and user agent
        self.context = await self.browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            java_script_enabled=True,
        )

        # Set default timeout
        self.context.set_default_timeout(settings.browser_timeout)

        self.page = await self.context.new_page()

    async def close_browser(self) -> None:
        """Clean up browser resources."""
        if self.page:
            await self.page.close()
            self.page = None
        if self.context:
            await self.context.close()
            self.context = None
        if self.browser:
            await self.browser.close()
            self.browser = None

    async def random_delay(self) -> None:
        """Add a random delay to mimic human behavior."""
        delay = random.uniform(settings.scrape_delay_min, settings.scrape_delay_max)
        await asyncio.sleep(delay)

    async def navigate(self, url: str, wait_for_js: bool = True) -> None:
        """Navigate to a URL with retry logic and smart waiting."""
        if not self.page:
            raise RuntimeError("Browser not started")

        for attempt in range(settings.max_retries):
            try:
                # Use domcontentloaded instead of networkidle - much faster
                await self.page.goto(url, wait_until="domcontentloaded", timeout=20000)

                if wait_for_js:
                    # Wait for JS frameworks to render (Vue, React, Wix, etc.)
                    # Give the page time to execute JavaScript
                    await asyncio.sleep(2)

                    # Try to wait for body content to be non-empty
                    try:
                        await self.page.wait_for_function(
                            "document.body && document.body.innerText.length > 100",
                            timeout=10000
                        )
                    except Exception:
                        pass  # Continue even if this times out

                return
            except Exception as e:
                if attempt == settings.max_retries - 1:
                    raise
                print(f"Navigation attempt {attempt + 1} failed: {e}")
                await self.random_delay()

    async def wait_for_selector(self, selector: str, timeout: int | None = None) -> None:
        """Wait for an element to appear on the page."""
        if not self.page:
            raise RuntimeError("Browser not started")
        await self.page.wait_for_selector(selector, timeout=timeout)

    async def get_text(self, selector: str) -> str | None:
        """Get text content of an element."""
        if not self.page:
            raise RuntimeError("Browser not started")
        element = await self.page.query_selector(selector)
        if element:
            return await element.text_content()
        return None

    async def get_texts(self, selector: str) -> list[str]:
        """Get text content of all matching elements."""
        if not self.page:
            raise RuntimeError("Browser not started")
        elements = await self.page.query_selector_all(selector)
        texts = []
        for element in elements:
            text = await element.text_content()
            if text:
                texts.append(text.strip())
        return texts

    async def click(self, selector: str) -> None:
        """Click an element."""
        if not self.page:
            raise RuntimeError("Browser not started")
        await self.page.click(selector)

    async def screenshot(self, path: str) -> None:
        """Take a screenshot for debugging."""
        if not self.page:
            raise RuntimeError("Browser not started")
        await self.page.screenshot(path=path)

    async def run(self) -> Any:
        """Run the scraper with proper setup and teardown."""
        try:
            await self.start_browser()
            return await self.scrape()
        finally:
            await self.close_browser()

    @abstractmethod
    async def scrape(self) -> Any:
        """
        Implement the actual scraping logic.
        Must be overridden by subclasses.
        """
        pass
