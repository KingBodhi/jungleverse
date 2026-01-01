from playwright.async_api import Playwright

# Global playwright instance
playwright_instance: Playwright | None = None


def set_playwright(pw: Playwright) -> None:
    """Set the global Playwright instance."""
    global playwright_instance
    playwright_instance = pw


def get_playwright() -> Playwright:
    """Get the global Playwright instance."""
    if playwright_instance is None:
        raise RuntimeError("Playwright not initialized")
    return playwright_instance
