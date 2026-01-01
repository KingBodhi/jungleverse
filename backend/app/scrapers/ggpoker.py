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
    Tournament,
)


class GGPokerScraper(BaseScraper):
    """
    Scraper for GGPoker tournament schedule.

    GGPoker uses a Vue.js SPA with Swiper for carousels.
    Tournament data is loaded dynamically.
    """

    BASE_URL = "https://www.ggpoker.com"
    TOURNAMENTS_URL = "https://www.ggpoker.com/tournaments"
    SCHEDULE_URL = "https://www.ggpoker.com/promotions/tournament-schedule"
    PROVIDER = Provider.GG_POKER

    def __init__(self, playwright: Playwright):
        super().__init__(playwright)

    async def scrape(self) -> dict[str, Any]:
        """
        Scrape GGPoker for tournament data.

        Returns:
            Dictionary containing scraped tournament data
        """
        result = {
            "provider": self.PROVIDER.value,
            "success": False,
            "timestamp": datetime.now().isoformat(),
            "source": "web",
            "games": [],
            "tournaments": [],
            "errors": [],
            "warnings": [],
        }

        try:
            # Try the tournaments page first
            await self.navigate(self.TOURNAMENTS_URL)
            await self.random_delay()

            if not self.page:
                result["errors"].append("Page not initialized")
                return result

            # Wait for Vue app to mount
            try:
                await self.wait_for_selector("[page-container]", timeout=15000)
            except Exception:
                result["warnings"].append("Page container not found, trying alternative selectors")

            # Wait for tournament content to load
            try:
                await self.page.wait_for_load_state("networkidle", timeout=15000)
            except Exception:
                pass

            # Get page title
            title = await self.page.title()
            result["page_title"] = title

            # Try multiple extraction methods
            tournaments = []

            # Method 1: Look for swiper slides (tournament carousels)
            swiper_tournaments = await self._scrape_swiper_tournaments()
            tournaments.extend(swiper_tournaments)

            # Method 2: Look for section containers with tournament info
            section_tournaments = await self._scrape_section_tournaments()
            tournaments.extend(section_tournaments)

            # Method 3: Extract from page content
            content = await self.page.content()
            content_tournaments = self._extract_from_content(content)
            tournaments.extend(content_tournaments)

            # Method 4: Try to intercept API calls or find embedded data
            api_tournaments = await self._extract_from_scripts()
            tournaments.extend(api_tournaments)

            # Deduplicate tournaments
            seen = set()
            unique_tournaments = []
            for t in tournaments:
                key = (t.name, t.buy_in, t.start_time.isoformat() if t.start_time else "")
                if key not in seen:
                    seen.add(key)
                    unique_tournaments.append(t)

            result["tournaments"] = [t.model_dump() for t in unique_tournaments]
            result["games"] = [
                PokerGame(
                    provider=self.PROVIDER,
                    game_type=GameType.TOURNAMENT,
                    variant=t.variant,
                    tournament=TournamentInfo(
                        buy_in=t.buy_in,
                        start_time=t.start_time,
                        guaranteed_prize=t.guaranteed_prize,
                        name=t.name,
                    ),
                ).model_dump()
                for t in unique_tournaments
            ]

            result["success"] = True
            result["tournament_count"] = len(unique_tournaments)

        except Exception as e:
            result["errors"].append(str(e))
            result["success"] = False

        return result

    async def _scrape_swiper_tournaments(self) -> list[Tournament]:
        """Scrape tournaments from Swiper carousel slides."""
        tournaments = []

        if not self.page:
            return tournaments

        # GGPoker uses Swiper for tournament carousels
        selectors = [
            ".swiper-slide",
            "[class*='swiper'] > div",
            "[slider] .slide",
        ]

        for selector in selectors:
            try:
                slides = await self.page.query_selector_all(selector)
                for slide in slides:
                    text = await slide.text_content()
                    if text and self._looks_like_tournament(text):
                        tournament = self._parse_tournament_text(text)
                        if tournament:
                            tournaments.append(tournament)
            except Exception:
                continue

        return tournaments

    async def _scrape_section_tournaments(self) -> list[Tournament]:
        """Scrape tournaments from section containers."""
        tournaments = []

        if not self.page:
            return tournaments

        # Look for tournament sections
        selectors = [
            "[section-container]",
            "[key-visual-tournaments]",
            ".tournament-card",
            ".event-card",
            "[class*='tournament']",
            "[class*='event']",
        ]

        for selector in selectors:
            try:
                sections = await self.page.query_selector_all(selector)
                for section in sections:
                    text = await section.text_content()
                    if text and self._looks_like_tournament(text):
                        tournament = self._parse_tournament_text(text)
                        if tournament:
                            tournaments.append(tournament)
            except Exception:
                continue

        return tournaments

    def _extract_from_content(self, html: str) -> list[Tournament]:
        """Extract tournaments from HTML content."""
        tournaments = []

        # Look for buy-in patterns with context
        pattern = r'(\$[\d,]+(?:K)?)\s*(?:buy-?in|entry|GTD|guaranteed|tournament)'
        matches = re.finditer(pattern, html, re.IGNORECASE)

        for match in matches:
            buyin_str = match.group(1)
            buyin = self._parse_money(buyin_str)
            if 10 <= buyin <= 100000:  # Reasonable buy-in range in dollars
                tournaments.append(Tournament(
                    provider=self.PROVIDER,
                    variant=GameVariant.NLHE,
                    name=f"${buyin} Tournament",
                    buy_in=buyin * 100,
                    start_time=datetime.now(),
                ))

        return tournaments

    async def _extract_from_scripts(self) -> list[Tournament]:
        """Extract tournament data from embedded scripts."""
        tournaments = []

        if not self.page:
            return tournaments

        try:
            scripts = await self.page.query_selector_all("script")
            for script in scripts:
                content = await script.text_content()
                if not content:
                    continue

                # Look for tournament data patterns
                patterns = [
                    r'"tournaments"\s*:\s*(\[.*?\])',
                    r'"schedule"\s*:\s*(\[.*?\])',
                    r'"events"\s*:\s*(\[.*?\])',
                    r'window\.__INITIAL_DATA__\s*=\s*({.*?});',
                ]

                for pattern in patterns:
                    match = re.search(pattern, content, re.DOTALL)
                    if match:
                        try:
                            import json
                            data = json.loads(match.group(1))
                            if isinstance(data, list):
                                for item in data:
                                    t = self._parse_json_tournament(item)
                                    if t:
                                        tournaments.append(t)
                            elif isinstance(data, dict):
                                for key in ['tournaments', 'schedule', 'events']:
                                    if key in data and isinstance(data[key], list):
                                        for item in data[key]:
                                            t = self._parse_json_tournament(item)
                                            if t:
                                                tournaments.append(t)
                        except Exception:
                            continue

        except Exception:
            pass

        return tournaments

    def _looks_like_tournament(self, text: str) -> bool:
        """Check if text looks like tournament info."""
        keywords = ['$', 'buy-in', 'gtd', 'guaranteed', 'tournament', 'nlhe', 'plo']
        text_lower = text.lower()
        return any(kw in text_lower for kw in keywords)

    def _parse_tournament_text(self, text: str) -> Tournament | None:
        """Parse tournament info from text."""
        if not text:
            return None

        # Look for buy-in
        buyin_match = re.search(r'\$[\s]*([\d,]+)(?:K)?', text, re.IGNORECASE)
        if not buyin_match:
            return None

        buyin = self._parse_money(buyin_match.group(0))
        if buyin < 1 or buyin > 100000:
            return None

        # Look for guarantee
        gtd_match = re.search(r'\$?([\d,]+)(?:K|M)?\s*(?:GTD|guaranteed)', text, re.IGNORECASE)
        guaranteed = None
        if gtd_match:
            guaranteed = self._parse_money(gtd_match.group(0))
            guaranteed *= 100  # Convert to cents

        # Look for name
        name_match = re.search(r'([A-Za-z][\w\s\-]+(?:Championship|Series|Main Event|Daily|Weekly|Sunday|Saturday))', text)
        name = name_match.group(1).strip() if name_match else f"${buyin} Tournament"

        # Look for time
        time_match = re.search(r'(\d{1,2}):(\d{2})\s*(AM|PM|ET|PT|UTC)?', text, re.IGNORECASE)
        start_time = datetime.now()
        if time_match:
            try:
                hour = int(time_match.group(1))
                minute = int(time_match.group(2))
                period = time_match.group(3)
                if period and period.upper() == 'PM' and hour < 12:
                    hour += 12
                start_time = start_time.replace(hour=hour, minute=minute)
            except Exception:
                pass

        # Determine variant
        variant = GameVariant.NLHE
        text_lower = text.lower()
        if 'plo5' in text_lower or '5-card' in text_lower:
            variant = GameVariant.PLO5
        elif 'plo' in text_lower or 'omaha' in text_lower:
            variant = GameVariant.PLO
        elif 'mixed' in text_lower:
            variant = GameVariant.MIXED

        return Tournament(
            provider=self.PROVIDER,
            variant=variant,
            name=name[:100],
            buy_in=buyin * 100,
            start_time=start_time,
            guaranteed_prize=guaranteed,
        )

    def _parse_money(self, text: str) -> int:
        """Parse money string to integer (dollars)."""
        # Remove $ and commas
        clean = re.sub(r'[$,\s]', '', text)

        # Handle K/M suffixes
        multiplier = 1
        if 'K' in text.upper():
            multiplier = 1000
            clean = clean.replace('K', '').replace('k', '')
        elif 'M' in text.upper():
            multiplier = 1000000
            clean = clean.replace('M', '').replace('m', '')

        try:
            return int(float(clean) * multiplier)
        except ValueError:
            return 0

    def _parse_json_tournament(self, data: dict) -> Tournament | None:
        """Parse tournament from JSON data."""
        try:
            buyin = data.get('buyIn') or data.get('buyin') or data.get('buy_in') or data.get('entryFee', 0)
            if isinstance(buyin, str):
                buyin = self._parse_money(buyin)
            else:
                buyin = int(buyin)

            if buyin < 1:
                return None

            name = data.get('name') or data.get('title') or f"${buyin} Tournament"

            start_time = datetime.now()
            if 'startTime' in data or 'start_time' in data:
                time_str = data.get('startTime') or data.get('start_time')
                try:
                    start_time = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
                except Exception:
                    pass

            guaranteed = data.get('guarantee') or data.get('guaranteed') or data.get('gtd')
            if guaranteed:
                if isinstance(guaranteed, str):
                    guaranteed = self._parse_money(guaranteed) * 100
                else:
                    guaranteed = int(guaranteed) * 100

            variant = GameVariant.NLHE
            variant_str = str(data.get('variant') or data.get('game') or '').lower()
            if 'plo5' in variant_str:
                variant = GameVariant.PLO5
            elif 'plo' in variant_str or 'omaha' in variant_str:
                variant = GameVariant.PLO

            return Tournament(
                provider=self.PROVIDER,
                variant=variant,
                tournament_id=str(data.get('id', '')),
                name=name[:100],
                buy_in=buyin * 100,
                start_time=start_time,
                guaranteed_prize=guaranteed,
            )

        except Exception:
            return None
