from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from playwright.async_api import async_playwright

from .config import get_settings
from .dependencies import set_playwright, get_playwright
from .routers import scraper_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - start/stop Playwright."""
    # Startup: Initialize Playwright
    pw = await async_playwright().start()
    set_playwright(pw)
    print("Playwright initialized")

    yield

    # Shutdown: Close Playwright
    playwright = get_playwright()
    if playwright:
        await playwright.stop()
        print("Playwright stopped")


app = FastAPI(
    title=settings.app_name,
    description="Backend API for scraping poker room data with headless browser automation",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(scraper_router.router, prefix="/api/scrapers", tags=["scrapers"])


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": settings.app_name}


@app.get("/health")
async def health():
    """Detailed health check."""
    from .dependencies import playwright_instance
    return {
        "status": "healthy",
        "playwright": playwright_instance is not None,
        "settings": {
            "headless": settings.browser_headless,
            "timeout": settings.browser_timeout,
        },
    }
