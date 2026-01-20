from .base import BaseScraper
from .clubgg import ClubGGScraper
from .ggpoker import GGPokerScraper
from .pokerstars import PokerStarsScraper

# Desktop scrapers (require Windows and additional dependencies)
try:
    from .desktop_base import DesktopBaseScraper
    from .clubgg_desktop import ClubGGDesktopScraper
    from .clubgg_desktop_nav import ClubGGNavigator
    DESKTOP_SCRAPERS_AVAILABLE = True
except ImportError:
    DesktopBaseScraper = None
    ClubGGDesktopScraper = None
    ClubGGNavigator = None
    DESKTOP_SCRAPERS_AVAILABLE = False

__all__ = [
    "BaseScraper",
    "ClubGGScraper",
    "GGPokerScraper",
    "PokerStarsScraper",
    "DesktopBaseScraper",
    "ClubGGDesktopScraper",
    "ClubGGNavigator",
    "DESKTOP_SCRAPERS_AVAILABLE",
]
