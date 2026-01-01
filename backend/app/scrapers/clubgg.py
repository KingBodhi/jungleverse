import re
from datetime import datetime
from typing import Any

from playwright.async_api import Playwright

from .base import BaseScraper
from ..models.poker import (
    Provider,
    GameType,
    GameVariant,
    PokerGame,
    Stakes,
    TournamentInfo,
    CashGame,
    Tournament,
)


class ClubGGScraper(BaseScraper):
    """
    Scraper for ClubGG poker room data.

    ClubGG is a Wix-based site that requires JavaScript rendering.
    This scraper uses Playwright to handle dynamic content.
    """

    BASE_URL = "https://www.clubgg.com"
    PROVIDER = Provider.CLUB_GG

    def __init__(self, playwright: Playwright):
        super().__init__(playwright)

    async def scrape(self) -> dict[str, Any]:
        """
        Scrape ClubGG for poker room/club data.

        Returns:
            Dictionary containing scraped poker room data
        """
        result = {
            "provider": self.PROVIDER.value,
            "success": False,
            "timestamp": datetime.now().isoformat(),
            "source": "web",
            "games": [],
            "cash_games": [],
            "tournaments": [],
            "errors": [],
            "warnings": [],
        }

        try:
            # Navigate to the main page
            await self.navigate(self.BASE_URL)
            await self.random_delay()

            # Wait for Wix content to load
            # Wix sites typically have this structure
            try:
                await self.wait_for_selector("[data-mesh-id]", timeout=10000)
            except Exception:
                result["warnings"].append("Wix mesh containers not found")

            if not self.page:
                result["errors"].append("Page not initialized")
                return result

            # Get page title
            title = await self.page.title()
            result["page_title"] = title

            # Try to find tournament/schedule sections
            # ClubGG typically shows tournaments and cash games in different sections

            # Look for any text content that contains poker-related keywords
            body_content = await self.page.content()

            # Extract games from page content
            games = await self._extract_games_from_content(body_content)
            result["games"] = [g.model_dump() for g in games]

            # Try to find specific sections
            tournaments = await self._scrape_tournaments()
            result["tournaments"] = [t.model_dump() for t in tournaments]

            cash_games = await self._scrape_cash_games()
            result["cash_games"] = [c.model_dump() for c in cash_games]

            # If no games found, try alternative methods
            if not games and not tournaments and not cash_games:
                result["warnings"].append(
                    "No games found via DOM parsing. "
                    "ClubGG may have changed structure or uses client-side rendering."
                )
                # Try to extract from embedded JSON
                embedded_games = await self._extract_from_embedded_json()
                if embedded_games:
                    result["games"] = [g.model_dump() for g in embedded_games]

            result["success"] = True
            result["game_count"] = len(result["games"]) + len(result["tournaments"]) + len(result["cash_games"])

        except Exception as e:
            result["errors"].append(str(e))
            result["success"] = False

        return result

    async def _extract_games_from_content(self, html_content: str) -> list[PokerGame]:
        """Extract games from HTML content using regex patterns."""
        games = []

        # Pattern for buy-ins: $55, $109, etc.
        buyin_pattern = r'\$(\d+(?:,\d{3})*)\s*(?:buy-?in|entry|GTD)?'

        # Pattern for stakes: 1/2, 2/5, 5/10
        stakes_pattern = r'(\d+)/(\d+)\s*(?:NL|PLO)?'

        # Pattern for times: 8:00 PM, 20:00
        time_pattern = r'(\d{1,2}):(\d{2})\s*(AM|PM)?'

        # Find buy-ins (tournaments)
        for match in re.finditer(buyin_pattern, html_content, re.IGNORECASE):
            buyin = int(match.group(1).replace(',', ''))
            if 10 <= buyin <= 10000:  # Reasonable buy-in range
                games.append(PokerGame(
                    provider=self.PROVIDER,
                    game_type=GameType.TOURNAMENT,
                    variant=GameVariant.NLHE,
                    tournament=TournamentInfo(
                        buy_in=buyin * 100,  # Convert to cents
                        start_time=datetime.now(),
                        name=f"${buyin} Tournament",
                    ),
                    is_running=False,
                ))

        # Find stakes (cash games)
        for match in re.finditer(stakes_pattern, html_content):
            sb = int(match.group(1))
            bb = int(match.group(2))
            if sb < bb and sb <= 100 and bb <= 200:  # Reasonable stakes
                games.append(PokerGame(
                    provider=self.PROVIDER,
                    game_type=GameType.CASH,
                    variant=GameVariant.NLHE,
                    stakes=Stakes(
                        small_blind=sb * 100,  # Convert to cents
                        big_blind=bb * 100,
                    ),
                    is_running=True,
                ))

        return games

    async def _scrape_tournaments(self) -> list[Tournament]:
        """Scrape tournament listings."""
        tournaments = []

        if not self.page:
            return tournaments

        # Common selectors for tournament elements on Wix sites
        selectors = [
            "[data-hook*='tournament']",
            "[class*='tournament']",
            "[class*='schedule']",
            "[class*='event']",
            ".tournament-item",
            ".schedule-item",
        ]

        for selector in selectors:
            try:
                elements = await self.page.query_selector_all(selector)
                for element in elements:
                    text = await element.text_content()
                    if text:
                        tournament = self._parse_tournament_text(text)
                        if tournament:
                            tournaments.append(tournament)
            except Exception:
                continue

        return tournaments

    async def _scrape_cash_games(self) -> list[CashGame]:
        """Scrape cash game listings."""
        cash_games = []

        if not self.page:
            return cash_games

        # Look for cash game indicators
        selectors = [
            "[data-hook*='cash']",
            "[class*='cash-game']",
            "[class*='ring-game']",
            "[class*='stakes']",
        ]

        for selector in selectors:
            try:
                elements = await self.page.query_selector_all(selector)
                for element in elements:
                    text = await element.text_content()
                    if text:
                        cash_game = self._parse_cash_game_text(text)
                        if cash_game:
                            cash_games.append(cash_game)
            except Exception:
                continue

        return cash_games

    async def _extract_from_embedded_json(self) -> list[PokerGame]:
        """Extract games from embedded JSON in script tags."""
        games = []

        if not self.page:
            return games

        try:
            # Get all script content
            scripts = await self.page.query_selector_all("script")
            for script in scripts:
                content = await script.text_content()
                if not content:
                    continue

                # Look for embedded data patterns
                patterns = [
                    r'window\.__PRELOADED_STATE__\s*=\s*({.*?});',
                    r'"tournaments"\s*:\s*(\[.*?\])',
                    r'"games"\s*:\s*(\[.*?\])',
                ]

                for pattern in patterns:
                    match = re.search(pattern, content, re.DOTALL)
                    if match:
                        try:
                            import json
                            data = json.loads(match.group(1))
                            # Parse the data structure
                            if isinstance(data, list):
                                for item in data:
                                    game = self._parse_json_game(item)
                                    if game:
                                        games.append(game)
                        except Exception:
                            continue

        except Exception:
            pass

        return games

    def _parse_tournament_text(self, text: str) -> Tournament | None:
        """Parse tournament info from text."""
        # Look for buy-in
        buyin_match = re.search(r'\$(\d+(?:,\d{3})*)', text)
        if not buyin_match:
            return None

        buyin = int(buyin_match.group(1).replace(',', ''))

        # Look for guarantee
        gtd_match = re.search(r'\$?([\d,]+)\s*(?:k|K)?\s*(?:GTD|guaranteed)', text, re.IGNORECASE)
        guaranteed = None
        if gtd_match:
            guaranteed = int(gtd_match.group(1).replace(',', ''))
            if 'k' in text.lower() or 'K' in text:
                guaranteed *= 1000
            guaranteed *= 100  # Convert to cents

        # Determine variant
        variant = GameVariant.NLHE
        if re.search(r'PLO5|5-?card', text, re.IGNORECASE):
            variant = GameVariant.PLO5
        elif re.search(r'PLO|omaha', text, re.IGNORECASE):
            variant = GameVariant.PLO

        return Tournament(
            provider=self.PROVIDER,
            variant=variant,
            name=text[:100].strip(),
            buy_in=buyin * 100,
            start_time=datetime.now(),
            guaranteed_prize=guaranteed,
        )

    def _parse_cash_game_text(self, text: str) -> CashGame | None:
        """Parse cash game info from text."""
        # Look for stakes pattern
        stakes_match = re.search(r'(\d+)/(\d+)', text)
        if not stakes_match:
            return None

        sb = int(stakes_match.group(1))
        bb = int(stakes_match.group(2))

        # Determine variant
        variant = GameVariant.NLHE
        if re.search(r'PLO5|5-?card', text, re.IGNORECASE):
            variant = GameVariant.PLO5
        elif re.search(r'PLO|omaha', text, re.IGNORECASE):
            variant = GameVariant.PLO

        return CashGame(
            provider=self.PROVIDER,
            variant=variant,
            stakes=Stakes(
                small_blind=sb * 100,
                big_blind=bb * 100,
            ),
        )

    def _parse_json_game(self, data: dict) -> PokerGame | None:
        """Parse a game from JSON data."""
        try:
            # Determine if tournament or cash
            is_tournament = bool(
                data.get('buyIn') or data.get('buyin') or
                data.get('buy_in') or data.get('startTime')
            )

            if is_tournament:
                buyin = data.get('buyIn') or data.get('buyin') or data.get('buy_in', 0)
                return PokerGame(
                    provider=self.PROVIDER,
                    game_type=GameType.TOURNAMENT,
                    variant=GameVariant.NLHE,
                    tournament=TournamentInfo(
                        buy_in=int(buyin) * 100,
                        start_time=datetime.now(),
                        name=data.get('name', ''),
                    ),
                )
            else:
                sb = data.get('smallBlind') or data.get('sb', 0)
                bb = data.get('bigBlind') or data.get('bb', 0)
                if sb and bb:
                    return PokerGame(
                        provider=self.PROVIDER,
                        game_type=GameType.CASH,
                        variant=GameVariant.NLHE,
                        stakes=Stakes(
                            small_blind=int(sb) * 100,
                            big_blind=int(bb) * 100,
                        ),
                    )
        except Exception:
            pass

        return None
