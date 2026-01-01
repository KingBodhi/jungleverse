from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from enum import Enum

from ..dependencies import get_playwright
from ..models.poker import Provider, ScraperResult, GameType
from ..scrapers import ClubGGScraper, GGPokerScraper, PokerStarsScraper

router = APIRouter()


class ProviderParam(str, Enum):
    """Supported providers for scraping."""

    clubgg = "clubgg"
    ggpoker = "ggpoker"
    pokerstars = "pokerstars"
    all = "all"


class ScrapeRequest(BaseModel):
    """Request model for scraping operations."""

    provider: Optional[ProviderParam] = ProviderParam.all


class ScrapeResponse(BaseModel):
    """Response model for scraping operations."""

    success: bool
    data: Optional[dict | list] = None
    error: Optional[str] = None
    meta: Optional[dict] = None


def get_scraper(provider: ProviderParam, playwright):
    """Factory function to get the appropriate scraper."""
    scrapers = {
        ProviderParam.clubgg: ClubGGScraper,
        ProviderParam.ggpoker: GGPokerScraper,
        ProviderParam.pokerstars: PokerStarsScraper,
    }
    scraper_class = scrapers.get(provider)
    if scraper_class:
        return scraper_class(playwright)
    return None


@router.get("/providers")
async def list_providers():
    """List all available providers."""
    return {
        "providers": [
            {
                "id": "clubgg",
                "name": "ClubGG",
                "description": "ClubGG poker clubs and games",
                "status": "active",
            },
            {
                "id": "ggpoker",
                "name": "GGPoker",
                "description": "GGPoker tournament schedule",
                "status": "active",
            },
            {
                "id": "pokerstars",
                "name": "PokerStars",
                "description": "PokerStars tournament schedule",
                "status": "active",
            },
        ]
    }


@router.get("/{provider}")
async def scrape_provider(
    provider: ProviderParam,
    game_type: Optional[GameType] = Query(None, description="Filter by game type"),
    format: Optional[str] = Query("full", description="Response format: 'full' or 'minimal'"),
):
    """
    Scrape data from a specific provider.

    - **provider**: The provider to scrape (clubgg, ggpoker, pokerstars, all)
    - **game_type**: Optional filter for CASH or TOURNAMENT games
    - **format**: Response format - 'full' includes raw data, 'minimal' is condensed
    """
    try:
        playwright = get_playwright()

        if provider == ProviderParam.all:
            # Scrape all providers
            results = []
            for p in [ProviderParam.clubgg, ProviderParam.ggpoker, ProviderParam.pokerstars]:
                scraper = get_scraper(p, playwright)
                if scraper:
                    try:
                        result = await scraper.run()
                        results.append(result)
                    except Exception as e:
                        results.append({
                            "provider": p.value,
                            "success": False,
                            "error": str(e),
                        })

            return ScrapeResponse(
                success=True,
                data=results,
                meta={"providers_scraped": len(results)},
            )

        scraper = get_scraper(provider, playwright)
        if not scraper:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

        result = await scraper.run()

        # Filter by game type if specified
        if game_type and isinstance(result, dict):
            if "games" in result:
                result["games"] = [
                    g for g in result["games"]
                    if g.get("game_type") == game_type.value
                ]
            if "cash_games" in result and game_type != GameType.CASH:
                result["cash_games"] = []
            if "tournaments" in result and game_type != GameType.TOURNAMENT:
                result["tournaments"] = []

        # Format response
        if format == "minimal" and isinstance(result, dict):
            result.pop("raw_html", None)
            result.pop("raw_data", None)

        return ScrapeResponse(
            success=True,
            data=result,
            meta={
                "provider": provider.value,
                "game_type_filter": game_type.value if game_type else None,
            },
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test/browser")
async def test_browser():
    """
    Test endpoint to verify browser automation is working.
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
