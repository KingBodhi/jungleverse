"""
ClubGG Desktop Application Scraper.

Scrapes game data from the ClubGG desktop client using screen capture and OCR.
ClubGG is a Unity-based application that doesn't expose its UI through
Windows UI Automation, so we use visual scraping techniques.
"""

import re
from datetime import datetime
from typing import Any

from PIL import Image

from ..models.poker import GameType, GameVariant, Provider
from .desktop_base import DesktopBaseScraper


class ClubGGDesktopScraper(DesktopBaseScraper):
    """
    Scraper for ClubGG desktop application.

    Uses screen capture and OCR to extract:
    - Active cash games (stakes, player counts, game types)
    - Tournament listings (buy-ins, start times, guarantees)
    - Club information
    """

    APP_NAME = "ClubGG"
    # Use launcher.exe to start ClubGG properly
    EXE_PATH = r"D:\testgg\launcher.exe"
    WINDOW_TITLE_PATTERN = "clubgg"
    WINDOW_CLASS = "UnityWndClass"

    # Common poker terms for OCR pattern matching
    STAKE_PATTERNS = [
        r"(\d+)[/\\](\d+)",  # 1/2, 2/4, etc.
        r"\$?(\d+(?:\.\d{2})?)\s*[-/]\s*\$?(\d+(?:\.\d{2})?)",  # $1-$2, $1/$2
    ]

    GAME_TYPE_PATTERNS = {
        "nlhe": GameVariant.NLHE,
        "nl holdem": GameVariant.NLHE,
        "no limit": GameVariant.NLHE,
        "plo": GameVariant.PLO,
        "omaha": GameVariant.PLO,
        "plo5": GameVariant.PLO5,
        "5 card": GameVariant.PLO5,
        "mixed": GameVariant.MIXED,
    }

    async def scrape(self) -> dict[str, Any]:
        """
        Scrape game data from ClubGG desktop client.

        Returns dict with:
        - provider: "clubgg_desktop"
        - success: bool
        - games: list of detected games
        - cash_games: parsed cash game data
        - tournaments: parsed tournament data
        - screenshot_path: path to debug screenshot
        - errors: list of any errors encountered
        """
        result = {
            "provider": "clubgg_desktop",
            "success": False,
            "games": [],
            "cash_games": [],
            "tournaments": [],
            "raw_text": "",
            "errors": [],
            "timestamp": datetime.utcnow().isoformat(),
        }

        try:
            # Capture the main window
            screenshot = await self.capture_window()
            if not screenshot:
                result["errors"].append("Could not capture ClubGG window")
                return result

            # Save debug screenshot to the managed screenshots folder
            debug_path = self.get_screenshot_path(prefix="clubgg_capture")
            screenshot.save(str(debug_path))
            result["screenshot_path"] = str(debug_path)

            # Get window dimensions
            window_size = await self.get_window_size()
            if window_size:
                result["window_size"] = {"width": window_size[0], "height": window_size[1]}

            # Extract text from full screenshot
            full_text = await self.extract_text(screenshot, preprocess=True)
            result["raw_text"] = full_text

            # Also get text with position data
            text_data = await self.extract_text_with_data(screenshot, preprocess=True)

            # Parse the extracted text for game information
            games = self._parse_games_from_text(full_text, text_data)
            result["games"] = games

            # Separate into cash games and tournaments
            for game in games:
                if game.get("game_type") == GameType.CASH.value:
                    result["cash_games"].append(game)
                elif game.get("game_type") == GameType.TOURNAMENT.value:
                    result["tournaments"].append(game)

            result["success"] = True

        except Exception as e:
            result["errors"].append(str(e))

        return result

    def _parse_games_from_text(
        self, full_text: str, text_data: list[dict]
    ) -> list[dict]:
        """
        Parse game information from OCR results.

        Looks for patterns like:
        - Stakes: "1/2", "$0.50/$1", etc.
        - Game types: "NL Hold'em", "PLO", etc.
        - Player counts: "5/9", "3 players", etc.
        - Buy-ins: "$100", "100BB", etc.
        """
        games = []
        lines = full_text.split("\n")

        for i, line in enumerate(lines):
            line_lower = line.lower().strip()
            if not line_lower:
                continue

            game = {}

            # Try to detect game variant
            for pattern, variant in self.GAME_TYPE_PATTERNS.items():
                if pattern in line_lower:
                    game["variant"] = variant.value
                    break

            # Try to detect stakes (indicates cash game)
            for pattern in self.STAKE_PATTERNS:
                match = re.search(pattern, line)
                if match:
                    try:
                        small = float(match.group(1).replace("$", ""))
                        big = float(match.group(2).replace("$", ""))
                        game["stakes"] = {
                            "small_blind": int(small * 100),  # Convert to cents
                            "big_blind": int(big * 100),
                        }
                        game["game_type"] = GameType.CASH.value
                    except (ValueError, IndexError):
                        pass
                    break

            # Try to detect player count
            player_match = re.search(r"(\d+)\s*[/\\]\s*(\d+)\s*(?:players?|seats?)?", line)
            if player_match:
                game["players"] = {
                    "current": int(player_match.group(1)),
                    "max": int(player_match.group(2)),
                }

            # Try to detect buy-in (indicates tournament)
            buyin_match = re.search(r"\$(\d+(?:\.\d{2})?)\s*(?:buy-?in|entry)?", line_lower)
            if buyin_match and "stakes" not in game:
                try:
                    buyin = float(buyin_match.group(1))
                    game["buy_in"] = int(buyin * 100)
                    game["game_type"] = GameType.TOURNAMENT.value
                except ValueError:
                    pass

            # Try to detect guarantee
            guarantee_match = re.search(
                r"(\d+(?:[,.]?\d+)?)\s*(?:k|K)?\s*(?:gtd|guaranteed)",
                line,
                re.IGNORECASE,
            )
            if guarantee_match:
                try:
                    gtd = guarantee_match.group(1).replace(",", "")
                    multiplier = 1000 if "k" in line.lower() else 1
                    game["guaranteed"] = int(float(gtd) * multiplier * 100)
                    game["game_type"] = GameType.TOURNAMENT.value
                except ValueError:
                    pass

            # Try to detect start time
            time_match = re.search(r"(\d{1,2}):(\d{2})\s*(am|pm)?", line_lower)
            if time_match:
                game["start_time_text"] = time_match.group(0)

            # Only add if we found meaningful game data
            if game.get("stakes") or game.get("buy_in") or game.get("variant"):
                game["raw_line"] = line.strip()
                game["provider"] = Provider.CLUB_GG.value
                if "variant" not in game:
                    game["variant"] = GameVariant.NLHE.value  # Default
                if "game_type" not in game:
                    game["game_type"] = GameType.CASH.value  # Default
                games.append(game)

        return games

    async def scrape_lobby_regions(self) -> dict[str, Any]:
        """
        Scrape specific regions of the lobby for more accurate data.

        This method attempts to capture and process specific UI areas
        rather than the whole window, which can improve OCR accuracy.
        """
        result = {
            "provider": "clubgg_desktop",
            "success": False,
            "regions": {},
            "errors": [],
        }

        window_size = await self.get_window_size()
        if not window_size:
            result["errors"].append("Could not get window size")
            return result

        width, height = window_size

        # Define approximate regions (these would need calibration for actual ClubGG UI)
        regions = {
            "header": (0, 0, width, int(height * 0.1)),
            "game_list": (0, int(height * 0.1), int(width * 0.7), int(height * 0.8)),
            "sidebar": (int(width * 0.7), int(height * 0.1), int(width * 0.3), int(height * 0.8)),
            "footer": (0, int(height * 0.9), width, int(height * 0.1)),
        }

        for region_name, (x, y, w, h) in regions.items():
            try:
                region_img = await self.capture_region(x, y, w, h)
                if region_img:
                    text = await self.extract_text(region_img)
                    result["regions"][region_name] = {
                        "text": text,
                        "bounds": {"x": x, "y": y, "width": w, "height": h},
                    }
            except Exception as e:
                result["errors"].append(f"Error capturing {region_name}: {e}")

        result["success"] = len(result["regions"]) > 0
        return result
