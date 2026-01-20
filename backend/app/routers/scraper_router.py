import sys
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from enum import Enum

from ..dependencies import get_playwright
from ..models.poker import Provider, ScraperResult, GameType
from ..scrapers import ClubGGScraper, GGPokerScraper, PokerStarsScraper
from ..scrapers import DESKTOP_SCRAPERS_AVAILABLE

if DESKTOP_SCRAPERS_AVAILABLE:
    from ..scrapers import ClubGGDesktopScraper, ClubGGNavigator

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
    """List all available providers (web and desktop)."""
    providers = [
        {
            "id": "clubgg",
            "name": "ClubGG",
            "description": "ClubGG poker clubs and games (web)",
            "type": "web",
            "status": "active",
        },
        {
            "id": "ggpoker",
            "name": "GGPoker",
            "description": "GGPoker tournament schedule",
            "type": "web",
            "status": "active",
        },
        {
            "id": "pokerstars",
            "name": "PokerStars",
            "description": "PokerStars tournament schedule",
            "type": "web",
            "status": "active",
        },
    ]

    # Add desktop providers if available
    if DESKTOP_SCRAPERS_AVAILABLE:
        providers.append({
            "id": "clubgg_desktop",
            "name": "ClubGG Desktop",
            "description": "ClubGG desktop client (screen capture + OCR)",
            "type": "desktop",
            "status": "active",
            "endpoint": "/desktop/clubgg",
        })

    return {"providers": providers}


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


# ============================================================================
# Desktop App Scraping Endpoints
# ============================================================================


class DesktopProviderParam(str, Enum):
    """Supported desktop applications for scraping."""

    clubgg = "clubgg"


@router.get("/desktop/status")
async def desktop_scraper_status():
    """
    Check if desktop scraping is available.

    Desktop scraping requires:
    - Windows operating system
    - pywinauto, Pillow, pytesseract, opencv-python packages
    - Tesseract OCR installed on the system
    """
    status = {
        "available": DESKTOP_SCRAPERS_AVAILABLE,
        "platform": sys.platform,
        "supported_apps": [],
    }

    if DESKTOP_SCRAPERS_AVAILABLE:
        status["supported_apps"] = [
            {
                "id": "clubgg",
                "name": "ClubGG Desktop",
                "description": "ClubGG poker client (screen capture + OCR)",
                "exe_path": ClubGGDesktopScraper.EXE_PATH,
            },
        ]

        # Check if Tesseract is available
        try:
            import pytesseract

            pytesseract.get_tesseract_version()
            status["tesseract_available"] = True
        except Exception as e:
            status["tesseract_available"] = False
            status["tesseract_error"] = str(e)
    else:
        status["reason"] = "Desktop scraping dependencies not installed or not on Windows"

    return status


@router.get("/desktop/clubgg/tournaments")
async def scrape_clubgg_tournaments():
    """
    Comprehensive tournament scraping with auto-navigation.

    This endpoint navigates through all tournament stages (Stage 1, Stage 2, Final Stage),
    finds tournaments with "Registering" status, expands each one to scrape detailed
    information, and returns a complete JSON response.

    **Workflow:**
    1. Navigate to Stage 1
    2. Find all tournaments with "Registering" status
    3. Click each to expand, scrape details (buy-in, GTD, start time, etc.)
    4. Press Escape to go back
    5. Scroll down to find more tournaments
    6. Repeat for Stage 2 and Final Stage

    **Requirements:**
    - ClubGG desktop app must be running and visible
    - Server must be running with Administrator privileges for click automation
    - Window must not be covered by other windows

    **Returns:**
    - stages: Object with tournaments grouped by stage
    - all_tournaments: Flat list of all tournaments
    - summary: Count totals by stage
    """
    if not DESKTOP_SCRAPERS_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Desktop scraping not available.",
        )

    try:
        navigator = ClubGGNavigator()

        if not await navigator.is_running():
            raise HTTPException(
                status_code=404,
                detail="ClubGG is not running. Please start the app first.",
            )

        result = await navigator.scrape_all_tournaments()

        return ScrapeResponse(
            success=result.get("success", False),
            data=result,
            meta={
                "provider": "clubgg_desktop",
                "scrape_method": "tournament_navigation",
                "total_tournaments": result.get("summary", {}).get("total", 0),
                "stages_scraped": list(result.get("stages", {}).keys()),
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tournament scraping failed: {str(e)}")


@router.get("/desktop/{provider}")
async def scrape_desktop_app(
    provider: DesktopProviderParam,
    start_app: bool = Query(False, description="Start the app if not running"),
    save_screenshot: bool = Query(True, description="Save debug screenshot"),
):
    """
    Scrape data from a desktop application.

    - **provider**: The desktop app to scrape (currently only 'clubgg')
    - **start_app**: Whether to start the app if it's not running
    - **save_screenshot**: Whether to save a debug screenshot

    **Note**: Desktop scraping uses screen capture and OCR, which requires:
    - The application to be visible on screen (not minimized)
    - Tesseract OCR to be installed
    - Windows operating system
    """
    if not DESKTOP_SCRAPERS_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Desktop scraping not available. Check /desktop/status for details.",
        )

    try:
        if provider == DesktopProviderParam.clubgg:
            scraper = ClubGGDesktopScraper()

            # Check if app is running
            is_running = await scraper.is_running()

            if not is_running:
                if start_app:
                    started = await scraper.start_app(wait_seconds=15)
                    if not started:
                        raise HTTPException(
                            status_code=503,
                            detail="Could not start ClubGG. Check if the executable path is correct.",
                        )
                else:
                    raise HTTPException(
                        status_code=404,
                        detail="ClubGG is not running. Start the app or set start_app=true",
                    )

            result = await scraper.run()

            return ScrapeResponse(
                success=result.get("success", False),
                data=result,
                meta={
                    "provider": "clubgg_desktop",
                    "scrape_method": "screen_capture_ocr",
                    "games_found": len(result.get("games", [])),
                    "cash_games": len(result.get("cash_games", [])),
                    "tournaments": len(result.get("tournaments", [])),
                },
            )

        raise HTTPException(status_code=400, detail=f"Unknown desktop provider: {provider}")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Desktop scraping failed: {str(e)}")


@router.post("/desktop/{provider}/screenshot")
async def capture_desktop_screenshot(
    provider: DesktopProviderParam,
    region: Optional[str] = Query(None, description="Region to capture: 'full', 'lobby', 'tables'"),
):
    """
    Capture a screenshot of the desktop application for debugging.

    Returns the screenshot path and basic OCR text extraction.
    """
    if not DESKTOP_SCRAPERS_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Desktop scraping not available.",
        )

    try:
        if provider == DesktopProviderParam.clubgg:
            scraper = ClubGGDesktopScraper()

            if not await scraper.is_running():
                raise HTTPException(
                    status_code=404,
                    detail="ClubGG is not running.",
                )

            from datetime import datetime

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            screenshot_path = f"clubgg_debug_{timestamp}.png"

            saved = await scraper.save_screenshot(screenshot_path)
            if not saved:
                raise HTTPException(
                    status_code=500,
                    detail="Could not capture screenshot",
                )

            # Also extract text for debugging
            screenshot = await scraper.capture_window()
            text = await scraper.extract_text(screenshot) if screenshot else ""

            return {
                "success": True,
                "screenshot_path": screenshot_path,
                "window_size": await scraper.get_window_size(),
                "extracted_text_preview": text[:500] if text else "",
            }

        raise HTTPException(status_code=400, detail=f"Unknown desktop provider: {provider}")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Screenshot capture failed: {str(e)}")


# ============================================================================
# Desktop Navigator Endpoints (Auto-Navigation)
# ============================================================================


@router.get("/desktop/{provider}/navigate")
async def navigate_and_scrape(
    provider: DesktopProviderParam,
    mode: str = Query("full", description="Scrape mode: 'full' (navigate all sections) or 'quick' (current screen only)"),
):
    """
    Scrape desktop app with auto-navigation.

    - **mode=full**: Navigate through all sections (Club, Cash Games, Tournaments, Live Events)
    - **mode=quick**: Just scrape the current screen without navigation

    The navigator will:
    1. Detect the current screen
    2. Navigate to each section (if mode=full)
    3. Extract game data using OCR
    4. Return parsed cash games and tournaments
    """
    if not DESKTOP_SCRAPERS_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Desktop scraping not available.",
        )

    try:
        if provider == DesktopProviderParam.clubgg:
            navigator = ClubGGNavigator()

            if not await navigator.is_running():
                raise HTTPException(
                    status_code=404,
                    detail="ClubGG is not running. Please start the app first.",
                )

            if mode == "quick":
                result = await navigator.quick_scrape()
            else:
                result = await navigator.scrape_all_sections()

            return ScrapeResponse(
                success=result.get("success", False),
                data=result,
                meta={
                    "provider": "clubgg_desktop",
                    "mode": mode,
                    "scrape_method": "screen_capture_ocr_navigation",
                    "cash_games_found": len(result.get("cash_games", [])),
                    "tournaments_found": len(result.get("tournaments", [])),
                },
            )

        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Navigation scrape failed: {str(e)}")


@router.post("/desktop/{provider}/navigate/to")
async def navigate_to_section(
    provider: DesktopProviderParam,
    section: str = Query(..., description="Section to navigate to: 'club', 'live_event', 'lobby', 'me', 'cash_games', 'tournaments'"),
):
    """
    Navigate to a specific section in the desktop app.

    Available sections:
    - club: Main club/lobby area
    - live_event: Live events section
    - lobby: Game lobby
    - me: Profile/account section
    - cash_games: Cash games list
    - tournaments: Tournaments list
    """
    if not DESKTOP_SCRAPERS_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Desktop scraping not available.",
        )

    try:
        if provider == DesktopProviderParam.clubgg:
            navigator = ClubGGNavigator()

            if not await navigator.is_running():
                raise HTTPException(
                    status_code=404,
                    detail="ClubGG is not running.",
                )

            success = await navigator.navigate_to(section)
            screen = await navigator.detect_screen()

            return {
                "success": success,
                "navigated_to": section,
                "current_screen": screen,
            }

        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Navigation failed: {str(e)}")


@router.get("/desktop/{provider}/screen")
async def detect_current_screen(
    provider: DesktopProviderParam,
):
    """
    Detect which screen the desktop app is currently showing.

    Returns the detected screen type:
    - login, profile, lobby, club_list, cash_games, tournaments, table, unknown
    """
    if not DESKTOP_SCRAPERS_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Desktop scraping not available.",
        )

    try:
        if provider == DesktopProviderParam.clubgg:
            navigator = ClubGGNavigator()

            if not await navigator.is_running():
                raise HTTPException(
                    status_code=404,
                    detail="ClubGG is not running.",
                )

            screen = await navigator.detect_screen()
            data = await navigator.scrape_current_screen()

            return {
                "success": True,
                "current_screen": screen,
                "raw_text_preview": data.get("raw_text", "")[:500],
                "elements_count": len(data.get("elements", [])),
            }

        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Screen detection failed: {str(e)}")
