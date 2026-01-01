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
    TournamentInfo,
    Tournament,
)


class PokerStarsScraper(BaseScraper):
    """
    Scraper for PokerStars tournament schedule.

    PokerStars has multiple regional sites. This targets the main .com site
    and the tournament schedule pages.
    """

    BASE_URL = "https://www.pokerstars.com"
    SCHEDULE_URL = "https://www.pokerstars.com/poker/tournaments/"
    PROVIDER = Provider.POKERSTARS

    def __init__(self, playwright: Playwright):
        super().__init__(playwright)

    async def scrape(self) -> dict[str, Any]:
        """
        Scrape PokerStars for tournament data.

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
            # Navigate to tournaments page
            await self.navigate(self.SCHEDULE_URL)
            await self.random_delay()

            if not self.page:
                result["errors"].append("Page not initialized")
                return result

            # Wait for content to load
            try:
                await self.page.wait_for_load_state("networkidle", timeout=15000)
            except Exception:
                pass

            # Get page title
            title = await self.page.title()
            result["page_title"] = title

            # Try multiple extraction methods
            tournaments = []

            # Method 1: Look for tournament tables
            table_tournaments = await self._scrape_tournament_tables()
            tournaments.extend(table_tournaments)

            # Method 2: Look for tournament cards/tiles
            card_tournaments = await self._scrape_tournament_cards()
            tournaments.extend(card_tournaments)

            # Method 3: Extract from page content
            content = await self.page.content()
            content_tournaments = self._extract_from_content(content)
            tournaments.extend(content_tournaments)

            # Method 4: Look for embedded JSON data
            json_tournaments = await self._extract_from_scripts()
            tournaments.extend(json_tournaments)

            # Deduplicate
            seen = set()
            unique_tournaments = []
            for t in tournaments:
                key = (t.name, t.buy_in)
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

    async def _scrape_tournament_tables(self) -> list[Tournament]:
        """Scrape tournaments from HTML tables."""
        tournaments = []

        if not self.page:
            return tournaments

        # Look for tournament tables
        selectors = [
            "table.tournament-schedule",
            "table[class*='tournament']",
            ".schedule-table",
            "table tbody tr",
        ]

        for selector in selectors:
            try:
                rows = await self.page.query_selector_all(selector)
                for row in rows:
                    text = await row.text_content()
                    if text and self._looks_like_tournament(text):
                        tournament = self._parse_tournament_text(text)
                        if tournament:
                            tournaments.append(tournament)
            except Exception:
                continue

        return tournaments

    async def _scrape_tournament_cards(self) -> list[Tournament]:
        """Scrape tournaments from card/tile layouts."""
        tournaments = []

        if not self.page:
            return tournaments

        selectors = [
            ".tournament-card",
            ".event-card",
            "[class*='tournament-item']",
            "[class*='schedule-item']",
            "[data-tournament]",
        ]

        for selector in selectors:
            try:
                cards = await self.page.query_selector_all(selector)
                for card in cards:
                    text = await card.text_content()
                    if text and self._looks_like_tournament(text):
                        tournament = self._parse_tournament_text(text)
                        if tournament:
                            tournaments.append(tournament)
            except Exception:
                continue

        return tournaments

    def _extract_from_content(self, html: str) -> list[Tournament]:
        """Extract tournaments from raw HTML content."""
        tournaments = []

        # Pattern for PokerStars tournament entries
        # Usually format: "Time | Name | Buy-in | Guarantee"
        patterns = [
            # $55 buy-in pattern
            r'\$(\d+(?:\.\d{2})?)\s*(?:\+\s*\$[\d.]+)?\s*(?:buy-?in|entry)',
            # Tournament name with buy-in
            r'([A-Z][\w\s\-]+)\s+\$(\d+(?:\.\d{2})?)',
        ]

        for pattern in patterns:
            for match in re.finditer(pattern, html, re.IGNORECASE):
                try:
                    if len(match.groups()) == 1:
                        buyin = float(match.group(1))
                        name = f"${int(buyin)} Tournament"
                    else:
                        name = match.group(1).strip()
                        buyin = float(match.group(2))

                    if 1 <= buyin <= 50000:  # Reasonable range
                        tournaments.append(Tournament(
                            provider=self.PROVIDER,
                            variant=GameVariant.NLHE,
                            name=name[:100],
                            buy_in=int(buyin * 100),
                            start_time=datetime.now(),
                        ))
                except Exception:
                    continue

        return tournaments

    async def _extract_from_scripts(self) -> list[Tournament]:
        """Extract tournaments from embedded JSON in scripts."""
        tournaments = []

        if not self.page:
            return tournaments

        try:
            scripts = await self.page.query_selector_all("script")
            for script in scripts:
                content = await script.text_content()
                if not content:
                    continue

                # Look for tournament data
                patterns = [
                    r'"tournaments"\s*:\s*(\[.*?\])',
                    r'"schedule"\s*:\s*(\[.*?\])',
                    r'"events"\s*:\s*(\[.*?\])',
                    r'tournamentData\s*=\s*(\[.*?\]);',
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
                        except Exception:
                            continue

        except Exception:
            pass

        return tournaments

    def _looks_like_tournament(self, text: str) -> bool:
        """Check if text contains tournament indicators."""
        if not text:
            return False
        keywords = ['$', 'buy-in', 'gtd', 'guaranteed', 'tournament', 'sat', 'satellite']
        text_lower = text.lower()
        return any(kw in text_lower for kw in keywords)

    def _parse_tournament_text(self, text: str) -> Tournament | None:
        """Parse tournament info from text."""
        if not text:
            return None

        # Look for buy-in
        buyin_match = re.search(r'\$\s*([\d,]+(?:\.\d{2})?)', text)
        if not buyin_match:
            return None

        buyin_str = buyin_match.group(1).replace(',', '')
        try:
            buyin = float(buyin_str)
        except ValueError:
            return None

        if buyin < 0.5 or buyin > 50000:
            return None

        # Look for guarantee
        gtd_match = re.search(r'\$?([\d,]+(?:K|M)?)\s*(?:GTD|guaranteed)', text, re.IGNORECASE)
        guaranteed = None
        if gtd_match:
            gtd_str = gtd_match.group(1).replace(',', '')
            multiplier = 1
            if 'K' in gtd_str.upper():
                multiplier = 1000
                gtd_str = gtd_str.replace('K', '').replace('k', '')
            elif 'M' in gtd_str.upper():
                multiplier = 1000000
                gtd_str = gtd_str.replace('M', '').replace('m', '')
            try:
                guaranteed = int(float(gtd_str) * multiplier * 100)
            except ValueError:
                pass

        # Extract name - look for descriptive text
        name_patterns = [
            r'([A-Z][\w\s\-]+(?:Sunday|Daily|Weekly|Championship|Series|Main Event|Turbo|Hyper))',
            r'#\d+[:\s]+([A-Za-z][\w\s\-]+)',
        ]

        name = f"${int(buyin)} Tournament"
        for pattern in name_patterns:
            name_match = re.search(pattern, text)
            if name_match:
                name = name_match.group(1).strip()
                break

        # Determine variant
        variant = GameVariant.NLHE
        text_lower = text.lower()
        if 'plo5' in text_lower or '5-card' in text_lower:
            variant = GameVariant.PLO5
        elif 'plo' in text_lower or 'omaha' in text_lower:
            variant = GameVariant.PLO
        elif 'mixed' in text_lower or 'horse' in text_lower:
            variant = GameVariant.MIXED

        # Look for time
        time_match = re.search(r'(\d{1,2}):(\d{2})\s*(AM|PM|ET|PT)?', text, re.IGNORECASE)
        start_time = datetime.now()
        if time_match:
            try:
                hour = int(time_match.group(1))
                minute = int(time_match.group(2))
                period = time_match.group(3)
                if period and period.upper() in ('PM', 'ET') and hour < 12:
                    hour += 12
                start_time = start_time.replace(hour=hour % 24, minute=minute)
            except Exception:
                pass

        return Tournament(
            provider=self.PROVIDER,
            variant=variant,
            name=name[:100],
            buy_in=int(buyin * 100),
            start_time=start_time,
            guaranteed_prize=guaranteed,
        )

    def _parse_json_tournament(self, data: dict) -> Tournament | None:
        """Parse tournament from JSON data."""
        try:
            buyin = data.get('buyIn') or data.get('buyin') or data.get('buy_in') or data.get('entryFee', 0)
            if isinstance(buyin, str):
                buyin = float(buyin.replace('$', '').replace(',', ''))
            else:
                buyin = float(buyin)

            if buyin < 0.5:
                return None

            name = data.get('name') or data.get('title') or data.get('tournamentName') or f"${int(buyin)} Tournament"

            start_time = datetime.now()
            time_field = data.get('startTime') or data.get('start_time') or data.get('startDate')
            if time_field:
                try:
                    if isinstance(time_field, int):
                        start_time = datetime.fromtimestamp(time_field / 1000)
                    else:
                        start_time = datetime.fromisoformat(str(time_field).replace('Z', '+00:00'))
                except Exception:
                    pass

            guaranteed = data.get('guarantee') or data.get('guaranteed') or data.get('prizePool')
            if guaranteed:
                if isinstance(guaranteed, str):
                    guaranteed = float(guaranteed.replace('$', '').replace(',', '')) * 100
                else:
                    guaranteed = int(guaranteed * 100)

            variant = GameVariant.NLHE
            variant_str = str(data.get('variant') or data.get('gameType') or data.get('game') or '').lower()
            if 'plo5' in variant_str:
                variant = GameVariant.PLO5
            elif 'plo' in variant_str or 'omaha' in variant_str:
                variant = GameVariant.PLO
            elif 'mixed' in variant_str:
                variant = GameVariant.MIXED

            return Tournament(
                provider=self.PROVIDER,
                variant=variant,
                tournament_id=str(data.get('id') or data.get('tournamentId') or ''),
                name=str(name)[:100],
                buy_in=int(buyin * 100),
                start_time=start_time,
                guaranteed_prize=int(guaranteed) if guaranteed else None,
            )

        except Exception:
            return None
