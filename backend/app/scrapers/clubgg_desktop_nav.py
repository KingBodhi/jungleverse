"""
ClubGG Desktop Application Scraper with Auto-Navigation.

Enhanced scraper that can navigate through the ClubGG app automatically
to find and extract game data from different screens.
"""

import asyncio
import re
from datetime import datetime
from typing import Any

from PIL import Image

from ..models.poker import GameType, GameVariant, Provider
from .desktop_base import DesktopBaseScraper


class ClubGGNavigator(DesktopBaseScraper):
    """
    Enhanced ClubGG scraper with auto-navigation.

    Can automatically:
    - Detect current screen
    - Navigate to lobby, cash games, tournaments
    - Extract game data from each section
    - Click UI elements by text or position
    """

    APP_NAME = "ClubGG"
    EXE_PATH = r"D:\testgg\launcher.exe"
    WINDOW_TITLE_PATTERN = "clubgg"
    WINDOW_CLASS = "UnityWndClass"

    # Screen identifiers - text patterns that identify each screen
    SCREEN_PATTERNS = {
        "login": ["sign in", "log in", "email", "password"],
        "profile": ["my account", "membership", "tournament tickets", "pokercraft"],
        "lobby": ["cash game", "ring game", "sit & go", "spin", "tournament"],
        "club_list": ["my clubs", "join club", "create club"],
        "cash_games": ["stakes", "players", "buy-in", "nlh", "plo", "omaha"],
        "tournaments": ["buy-in", "prize", "gtd", "starting", "registered"],
        "table": ["fold", "call", "raise", "check", "bet", "pot"],
    }

    # Navigation targets - where to click to reach each screen
    # Positions are relative to window, based on 540x991 window size
    NAV_TARGETS = {
        "club": {"text": "club", "fallback_pos": (40, 960)},
        "live_event": {"text": "live event", "fallback_pos": (120, 960)},
        "stage_1": {"text": "stage 1", "fallback_pos": (215, 960)},
        "stage_2": {"text": "stage 2", "fallback_pos": (310, 960)},
        "final_stage": {"text": "final", "fallback_pos": (415, 960)},
        "me": {"text": "me", "fallback_pos": (500, 960)},
        "cash_games": {"text": "cash", "fallback_pos": None},
        "tournaments": {"text": "tournament", "fallback_pos": None},
        "back": {"text": "back", "fallback_pos": (30, 50)},
    }

    def __init__(self):
        super().__init__()
        self.current_screen = None
        self.window_width = 0
        self.window_height = 0
        self._admin_mode = None  # None = unknown, True = has admin, False = no admin

    async def check_click_permissions(self) -> bool:
        """Check if we have permissions to send clicks to the app."""
        if self._admin_mode is not None:
            return self._admin_mode

        try:
            import ctypes
            # Try to move cursor - if this fails, we don't have permissions
            if self.main_window:
                rect = self.main_window.rectangle()
                # Just test SetCursorPos
                result = ctypes.windll.user32.SetCursorPos(rect.left + 10, rect.top + 10)
                self._admin_mode = bool(result)
            else:
                self._admin_mode = False
        except Exception:
            self._admin_mode = False

        return self._admin_mode

    async def detect_screen(self) -> str:
        """Detect which screen we're currently on."""
        screenshot = await self.capture_window()
        if not screenshot:
            return "unknown"

        text = await self.extract_text(screenshot)
        text_lower = text.lower()

        # Check each screen pattern
        for screen_name, patterns in self.SCREEN_PATTERNS.items():
            matches = sum(1 for p in patterns if p in text_lower)
            if matches >= 2:  # Need at least 2 matches
                self.current_screen = screen_name
                return screen_name

        self.current_screen = "unknown"
        return "unknown"

    async def find_text_position(self, target_text: str) -> tuple[int, int] | None:
        """Find the position of text on screen using OCR."""
        screenshot = await self.capture_window()
        if not screenshot:
            return None

        text_data = await self.extract_text_with_data(screenshot)
        target_lower = target_text.lower()

        for item in text_data:
            if target_lower in item["text"].lower():
                # Return center of the text bounding box
                x = item["x"] + item["width"] // 2
                y = item["y"] + item["height"] // 2
                return (x, y)

        return None

    async def click_text(self, target_text: str, fallback_pos: tuple[int, int] | None = None) -> bool:
        """Click on text found via OCR, or use fallback position."""
        pos = await self.find_text_position(target_text)

        if pos:
            await self.click_at(pos[0], pos[1])
            await asyncio.sleep(0.5)
            return True
        elif fallback_pos:
            await self.click_at(fallback_pos[0], fallback_pos[1])
            await asyncio.sleep(0.5)
            return True

        return False

    async def navigate_to(self, target: str) -> bool:
        """Navigate to a specific screen."""
        if target not in self.NAV_TARGETS:
            return False

        nav = self.NAV_TARGETS[target]
        success = await self.click_text(nav["text"], nav.get("fallback_pos"))

        if success:
            await asyncio.sleep(1.5)  # Wait for screen transition
            await self.detect_screen()

        return success

    async def go_to_lobby(self) -> bool:
        """Navigate to the main lobby."""
        # First try clicking "Club" in bottom nav
        await self.navigate_to("club")
        await asyncio.sleep(1)

        # Check if we're in lobby
        screen = await self.detect_screen()
        return screen in ["lobby", "club_list", "cash_games"]

    async def go_to_cash_games(self) -> bool:
        """Navigate to cash games section."""
        # First ensure we're in lobby area
        if self.current_screen not in ["lobby", "club_list"]:
            await self.go_to_lobby()

        # Look for cash games tab/button
        return await self.click_text("cash")

    async def go_to_tournaments(self) -> bool:
        """Navigate to tournaments section."""
        # First ensure we're in lobby area
        if self.current_screen not in ["lobby", "club_list"]:
            await self.go_to_lobby()

        # Look for tournaments tab/button
        clicked = await self.click_text("tournament")
        if not clicked:
            clicked = await self.click_text("mtt")
        return clicked

    async def scroll_down(self, amount: int = 300) -> None:
        """Scroll down in the current view."""
        if not self.main_window:
            return

        import ctypes

        rect = self.main_window.rectangle()
        center_x = rect.left + rect.width() // 2
        center_y = rect.top + rect.height() // 2

        # Move cursor to center and scroll
        ctypes.windll.user32.SetCursorPos(int(center_x), int(center_y))
        # MOUSEEVENTF_WHEEL = 0x0800, negative for scroll down
        ctypes.windll.user32.mouse_event(0x0800, 0, 0, -amount, 0)
        await asyncio.sleep(0.3)

    async def scroll_up(self, amount: int = 300) -> None:
        """Scroll up in the current view."""
        if not self.main_window:
            return

        import ctypes

        rect = self.main_window.rectangle()
        center_x = rect.left + rect.width() // 2
        center_y = rect.top + rect.height() // 2

        ctypes.windll.user32.SetCursorPos(int(center_x), int(center_y))
        # Positive for scroll up
        ctypes.windll.user32.mouse_event(0x0800, 0, 0, amount, 0)
        await asyncio.sleep(0.3)

    async def scrape_current_screen(self) -> dict:
        """Scrape data from the current screen."""
        screenshot = await self.capture_window()
        if not screenshot:
            return {"error": "Could not capture screen"}

        text = await self.extract_text(screenshot)
        text_data = await self.extract_text_with_data(screenshot)

        return {
            "screen": self.current_screen,
            "raw_text": text,
            "elements": text_data,
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def scrape_all_sections(self) -> dict[str, Any]:
        """
        Navigate through all sections and scrape data.

        Returns comprehensive game data from:
        - Club list
        - Cash games
        - Tournaments
        """
        result = {
            "provider": "clubgg_desktop",
            "success": False,
            "sections": {},
            "cash_games": [],
            "tournaments": [],
            "clubs": [],
            "errors": [],
            "timestamp": datetime.utcnow().isoformat(),
        }

        try:
            # Get window dimensions
            size = await self.get_window_size()
            if size:
                self.window_width, self.window_height = size

            # Detect starting screen
            start_screen = await self.detect_screen()
            result["start_screen"] = start_screen

            # Try to navigate to lobby/clubs
            print("Navigating to Club section...")
            await self.navigate_to("club")
            await asyncio.sleep(2)

            # Scrape club section
            club_data = await self.scrape_current_screen()
            result["sections"]["club"] = club_data

            # Try to find and scrape cash games
            print("Looking for cash games...")
            if await self.click_text("cash"):
                await asyncio.sleep(1.5)
                cash_data = await self.scrape_current_screen()
                result["sections"]["cash_games"] = cash_data
                result["cash_games"] = self._parse_cash_games(cash_data.get("raw_text", ""))

            # Try to find and scrape tournaments
            print("Looking for tournaments...")
            await self.navigate_to("club")  # Go back
            await asyncio.sleep(1)

            if await self.click_text("tournament"):
                await asyncio.sleep(1.5)
                tourney_data = await self.scrape_current_screen()
                result["sections"]["tournaments"] = tourney_data
                result["tournaments"] = self._parse_tournaments(tourney_data.get("raw_text", ""))

            # Check Live Events
            print("Checking Live Events...")
            await self.navigate_to("live_event")
            await asyncio.sleep(1.5)
            live_data = await self.scrape_current_screen()
            result["sections"]["live_events"] = live_data

            result["success"] = True

        except Exception as e:
            result["errors"].append(str(e))

        return result

    def _parse_cash_games(self, text: str) -> list[dict]:
        """Parse cash game information from OCR text."""
        games = []
        lines = text.split("\n")

        for line in lines:
            line_lower = line.lower()
            game = {}

            # Look for stakes pattern (e.g., "1/2", "0.5/1", "$1/$2")
            stakes_match = re.search(r"(\d+(?:\.\d+)?)\s*[/\\]\s*(\d+(?:\.\d+)?)", line)
            if stakes_match:
                game["stakes"] = {
                    "small_blind": float(stakes_match.group(1)),
                    "big_blind": float(stakes_match.group(2)),
                }

            # Look for player count (e.g., "5/9", "3/6 players")
            players_match = re.search(r"(\d+)\s*[/\\]\s*(\d+)\s*(?:player|seat)?", line_lower)
            if players_match:
                game["players"] = {
                    "current": int(players_match.group(1)),
                    "max": int(players_match.group(2)),
                }

            # Detect game type
            if "nlh" in line_lower or "holdem" in line_lower or "no limit" in line_lower:
                game["variant"] = GameVariant.NLHE.value
            elif "plo5" in line_lower or "5 card" in line_lower:
                game["variant"] = GameVariant.PLO5.value
            elif "plo" in line_lower or "omaha" in line_lower:
                game["variant"] = GameVariant.PLO.value

            if game.get("stakes") or game.get("players"):
                game["game_type"] = GameType.CASH.value
                game["provider"] = Provider.CLUB_GG.value
                game["raw_line"] = line.strip()
                games.append(game)

        return games

    def _parse_tournaments(self, text: str) -> list[dict]:
        """Parse tournament information from OCR text."""
        tournaments = []
        lines = text.split("\n")

        for line in lines:
            line_lower = line.lower()
            tourney = {}

            # Look for buy-in
            buyin_match = re.search(r"\$?\s*(\d+(?:\.\d{2})?)\s*(?:buy-?in|entry)?", line_lower)
            if buyin_match and "gtd" not in line_lower[:buyin_match.start()]:
                tourney["buy_in"] = float(buyin_match.group(1))

            # Look for guarantee
            gtd_match = re.search(r"(\d+(?:[,.]?\d+)?)\s*(?:k)?\s*(?:gtd|guaranteed)", line_lower)
            if gtd_match:
                gtd_str = gtd_match.group(1).replace(",", "")
                multiplier = 1000 if "k" in line_lower[gtd_match.start():gtd_match.end()+5] else 1
                tourney["guaranteed"] = float(gtd_str) * multiplier

            # Look for time
            time_match = re.search(r"(\d{1,2}):(\d{2})\s*(am|pm)?", line_lower)
            if time_match:
                tourney["start_time"] = time_match.group(0)

            # Look for player count
            reg_match = re.search(r"(\d+)\s*(?:registered|entries|players)", line_lower)
            if reg_match:
                tourney["registered"] = int(reg_match.group(1))

            if tourney.get("buy_in") or tourney.get("guaranteed"):
                tourney["game_type"] = GameType.TOURNAMENT.value
                tourney["provider"] = Provider.CLUB_GG.value
                tourney["raw_line"] = line.strip()
                tournaments.append(tourney)

        return tournaments

    async def scrape(self) -> dict[str, Any]:
        """Main scrape method - performs full navigation and data extraction."""
        # Check if we have click permissions
        can_click = await self.check_click_permissions()

        if can_click:
            return await self.scrape_all_sections()
        else:
            # Fall back to quick scrape without navigation
            result = await self.quick_scrape()
            result["warning"] = (
                "Auto-navigation disabled: insufficient permissions. "
                "Run as Administrator for full navigation, or manually navigate "
                "to desired screen before scraping."
            )
            return result

    async def quick_scrape(self) -> dict[str, Any]:
        """Quick scrape of current screen only, no navigation."""
        result = {
            "provider": "clubgg_desktop",
            "success": False,
            "screen": None,
            "raw_text": "",
            "games": [],
            "errors": [],
            "timestamp": datetime.utcnow().isoformat(),
        }

        try:
            screen = await self.detect_screen()
            result["screen"] = screen

            data = await self.scrape_current_screen()
            result["raw_text"] = data.get("raw_text", "")

            # Parse based on detected screen
            if screen == "cash_games":
                result["games"] = self._parse_cash_games(result["raw_text"])
            elif screen == "tournaments":
                result["games"] = self._parse_tournaments(result["raw_text"])
            else:
                # Try both parsers
                result["games"] = (
                    self._parse_cash_games(result["raw_text"]) +
                    self._parse_tournaments(result["raw_text"])
                )

            result["success"] = True

        except Exception as e:
            result["errors"].append(str(e))

        return result

    async def scrape_stage_tournaments(self, stage: str) -> list[dict]:
        """
        Scrape all registering tournaments from a specific stage.

        Workflow:
        1. Navigate to the stage
        2. Scroll and find tournaments with "Registering" status
        3. Click each to expand, scrape details, press Escape to go back
        4. Continue scrolling until no new tournaments found
        """
        tournaments = []
        seen_tournament_ids = set()
        max_scroll_attempts = 10
        scroll_attempts = 0
        last_count = 0

        print(f"Scraping {stage} tournaments...")

        # Navigate to the stage
        if not await self.navigate_to(stage):
            print(f"Failed to navigate to {stage}")
            return []

        await asyncio.sleep(1.5)

        while scroll_attempts < max_scroll_attempts:
            # Capture current screen and find tournaments
            screenshot = await self.capture_window()
            if not screenshot:
                break

            text = await self.extract_text(screenshot)
            text_data = await self.extract_text_with_data(screenshot)

            # Find "Registering" text positions
            registering_positions = []
            for item in text_data:
                if "registering" in item["text"].lower():
                    registering_positions.append({
                        "x": item["x"] + item["width"] // 2,
                        "y": item["y"] + item["height"] // 2,
                        "conf": item["confidence"],
                    })

            print(f"  Found {len(registering_positions)} registering tournaments on screen")

            # Click each registering tournament
            for pos in registering_positions:
                # Create a unique ID based on position (approximate)
                pos_id = f"{pos['x'] // 50}_{pos['y'] // 50}"
                if pos_id in seen_tournament_ids:
                    continue
                seen_tournament_ids.add(pos_id)

                # Click to expand
                print(f"  Clicking tournament at ({pos['x']}, {pos['y']})")
                await self.click_at(pos["x"], pos["y"])
                await asyncio.sleep(1.5)

                # Scrape expanded tournament details
                tourney_data = await self._scrape_expanded_tournament()
                if tourney_data:
                    tourney_data["stage"] = stage
                    tournaments.append(tourney_data)
                    print(f"  Scraped: {tourney_data.get('name', 'Unknown')}")

                # Press Escape to go back
                await self.press_escape()
                await asyncio.sleep(1)

            # Check if we found new tournaments
            if len(tournaments) == last_count:
                scroll_attempts += 1
            else:
                scroll_attempts = 0
                last_count = len(tournaments)

            # Scroll down to find more
            await self.scroll_down(amount=3)
            await asyncio.sleep(0.5)

        print(f"  Total from {stage}: {len(tournaments)} tournaments")
        return tournaments

    async def _scrape_expanded_tournament(self) -> dict | None:
        """Scrape details from an expanded tournament view."""
        screenshot = await self.capture_window()
        if not screenshot:
            return None

        text = await self.extract_text(screenshot)
        text_data = await self.extract_text_with_data(screenshot)

        tournament = {
            "raw_text": text,
            "game_type": GameType.TOURNAMENT.value,
            "provider": Provider.CLUB_GG.value,
            "status": "registering",
        }

        text_lower = text.lower()

        # Parse tournament name (usually at top)
        lines = text.split("\n")
        for line in lines[:5]:  # Check first 5 lines for name
            line = line.strip()
            if len(line) > 5 and not any(x in line.lower() for x in ["buy-in", "prize", "gtd", "$", "registering"]):
                tournament["name"] = line
                break

        # Parse buy-in
        buyin_patterns = [
            r"buy[-\s]?in[:\s]*\$?\s*([\d,]+(?:\.\d{2})?)",
            r"\$\s*([\d,]+(?:\.\d{2})?)\s*(?:buy[-\s]?in|entry)",
            r"entry[:\s]*\$?\s*([\d,]+(?:\.\d{2})?)",
        ]
        for pattern in buyin_patterns:
            match = re.search(pattern, text_lower)
            if match:
                tournament["buy_in"] = float(match.group(1).replace(",", ""))
                break

        # Parse guaranteed prize pool
        gtd_patterns = [
            r"([\d,]+(?:\.\d+)?)\s*(?:k)?\s*(?:gtd|guaranteed)",
            r"prize\s*(?:pool)?[:\s]*\$?\s*([\d,]+(?:\.\d+)?)",
        ]
        for pattern in gtd_patterns:
            match = re.search(pattern, text_lower)
            if match:
                value = float(match.group(1).replace(",", ""))
                if "k" in text_lower[match.start():match.end()+5]:
                    value *= 1000
                tournament["guaranteed"] = value
                break

        # Parse start time
        time_match = re.search(r"(\d{1,2}):(\d{2})\s*(am|pm)?", text_lower)
        if time_match:
            tournament["start_time"] = time_match.group(0)

        # Parse registered players
        reg_patterns = [
            r"(\d+)\s*(?:/\s*\d+)?\s*(?:registered|entries|players)",
            r"registered[:\s]*(\d+)",
            r"entries[:\s]*(\d+)",
        ]
        for pattern in reg_patterns:
            match = re.search(pattern, text_lower)
            if match:
                tournament["registered_players"] = int(match.group(1))
                break

        # Parse starting stack
        stack_match = re.search(r"starting\s*(?:stack)?[:\s]*([\d,]+)", text_lower)
        if stack_match:
            tournament["starting_stack"] = int(stack_match.group(1).replace(",", ""))

        # Parse blind levels
        blind_match = re.search(r"blind(?:s)?\s*(?:level)?[:\s]*(\d+)\s*(?:min|minute)", text_lower)
        if blind_match:
            tournament["blind_level_minutes"] = int(blind_match.group(1))

        # Parse game variant
        if "nlh" in text_lower or "no limit hold" in text_lower or "holdem" in text_lower:
            tournament["variant"] = GameVariant.NLHE.value
        elif "plo5" in text_lower or "5 card" in text_lower:
            tournament["variant"] = GameVariant.PLO5.value
        elif "plo" in text_lower or "omaha" in text_lower:
            tournament["variant"] = GameVariant.PLO.value

        return tournament

    async def scrape_all_tournaments(self) -> dict[str, Any]:
        """
        Comprehensive tournament scraping across all stages.

        Navigates through Stage 1, Stage 2, and Final Stage,
        finds all registering tournaments, expands each one to
        scrape detailed information, and returns a complete JSON.
        """
        result = {
            "provider": "clubgg_desktop",
            "success": False,
            "stages": {
                "stage_1": [],
                "stage_2": [],
                "final_stage": [],
            },
            "all_tournaments": [],
            "summary": {
                "total": 0,
                "by_stage": {},
            },
            "errors": [],
            "timestamp": datetime.utcnow().isoformat(),
        }

        try:
            # Check permissions
            can_click = await self.check_click_permissions()
            if not can_click:
                result["errors"].append(
                    "No click permissions. Run as Administrator for auto-navigation."
                )
                return result

            # Scrape each stage
            stages = ["stage_1", "stage_2", "final_stage"]

            for stage in stages:
                try:
                    print(f"\n=== Scraping {stage.upper()} ===")
                    tournaments = await self.scrape_stage_tournaments(stage)
                    result["stages"][stage] = tournaments
                    result["all_tournaments"].extend(tournaments)
                    result["summary"]["by_stage"][stage] = len(tournaments)
                except Exception as e:
                    result["errors"].append(f"{stage}: {str(e)}")
                    print(f"Error scraping {stage}: {e}")

            result["summary"]["total"] = len(result["all_tournaments"])
            result["success"] = True

            print(f"\n=== COMPLETE ===")
            print(f"Total tournaments scraped: {result['summary']['total']}")

        except Exception as e:
            result["errors"].append(str(e))

        return result
