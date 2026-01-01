from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from playwright.async_api import async_playwright, Playwright

from .config import get_settings
from .routers import scraper_router

settings = get_settings()

# Global playwright instance
playwright_instance: Playwright | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - start/stop Playwright."""
    global playwright_instance

    # Startup: Initialize Playwright
    pw = await async_playwright().start()
    playwright_instance = pw
    print("Playwright initialized")

    yield

    # Shutdown: Close Playwright
    if playwright_instance:
        await playwright_instance.stop()
        print("Playwright stopped")


def get_playwright() -> Playwright:
    """Get the global Playwright instance."""
    if playwright_instance is None:
        raise RuntimeError("Playwright not initialized")
    return playwright_instance


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
    return {
        "status": "healthy",
        "playwright": playwright_instance is not None,
        "settings": {
            "headless": settings.browser_headless,
            "timeout": settings.browser_timeout,
        },
    }
