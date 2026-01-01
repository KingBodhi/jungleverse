from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..main import get_playwright
from ..scrapers.clubgg import ClubGGScraper

router = APIRouter()


class ScrapeRequest(BaseModel):
    """Request model for scraping operations."""

    url: str | None = None


class ScrapeResponse(BaseModel):
    """Response model for scraping operations."""

    success: bool
    data: dict | list | None = None
    error: str | None = None


@router.post("/clubgg", response_model=ScrapeResponse)
async def scrape_clubgg(request: ScrapeRequest | None = None):
    """
    Scrape ClubGG for poker room data.
    Uses headless browser automation to handle dynamic content.
    """
    try:
        playwright = get_playwright()
        scraper = ClubGGScraper(playwright)
        data = await scraper.run()
        return ScrapeResponse(success=True, data=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test")
async def test_browser():
    """
    Test endpoint to verify browser automation is working.
    Navigates to a simple page and returns basic info.
    """
    try:
        playwright = get_playwright()
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        await page.goto("https://example.com")
        title = await page.title()

        await browser.close()

        return {
            "success": True,
            "message": "Browser automation working",
            "test_page_title": title,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Browser automation failed: {str(e)}"
        )
