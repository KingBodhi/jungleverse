#!/usr/bin/env python3
"""
Poker Data Watcher Service

Monitors the VM shared folder for changes to poker client data files
and triggers parsing/ingestion when updates are detected.
"""

import os
import sys
import json
import time
import signal
import logging
import hashlib
import sqlite3
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Any
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileModifiedEvent, FileCreatedEvent

# Configuration
WATCH_DIR = os.environ.get("POKER_VM_SHARED_DIR", os.path.expanduser("~/.local/share/poker-vm/shared-data"))
API_ENDPOINT = os.environ.get("JUNGLEVERSE_API_URL", "http://localhost:3000/api/fetch-poker-data")
DEBOUNCE_SECONDS = 5
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

# Setup logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(os.path.expanduser("~/.local/share/poker-vm/watcher.log"))
    ]
)
logger = logging.getLogger(__name__)


@dataclass
class NormalizedTournament:
    """Normalized tournament data structure"""
    poker_room: str
    variant: str  # NLHE, PLO, PLO5, MIXED, OTHER
    start_time: str  # ISO format
    buyin_amount: int  # cents
    rake_amount: Optional[int] = None
    starting_stack: Optional[int] = None
    blind_level_minutes: Optional[int] = None
    reentry_policy: Optional[str] = None
    bounty_amount: Optional[int] = None
    recurring_rule: Optional[str] = None
    estimated_prize_pool: Optional[int] = None
    typical_field_size: Optional[int] = None
    external_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class NormalizedCashGame:
    """Normalized cash game data structure"""
    poker_room: str
    variant: str
    small_blind: int  # cents
    big_blind: int  # cents
    min_buyin: int  # cents
    max_buyin: int  # cents
    current_players: Optional[int] = None
    max_players: Optional[int] = None
    table_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ClientParser:
    """Base class for poker client data parsers"""

    def __init__(self, client_name: str, data_dir: Path):
        self.client_name = client_name
        self.data_dir = data_dir
        self.logger = logging.getLogger(f"parser.{client_name}")

    def parse_tournaments(self) -> List[NormalizedTournament]:
        raise NotImplementedError

    def parse_cash_games(self) -> List[NormalizedCashGame]:
        raise NotImplementedError

    def dollars_to_cents(self, amount: float) -> int:
        return int(round(amount * 100))

    def parse_variant(self, text: str) -> str:
        text_lower = text.lower()
        if "plo5" in text_lower or "5-card" in text_lower:
            return "PLO5"
        if "plo" in text_lower or "omaha" in text_lower:
            return "PLO"
        if "mixed" in text_lower or "horse" in text_lower or "8-game" in text_lower:
            return "MIXED"
        if "nlhe" in text_lower or "hold" in text_lower or "nl " in text_lower:
            return "NLHE"
        return "NLHE"  # default


class PokerStarsParser(ClientParser):
    """Parser for PokerStars client data"""

    def __init__(self, data_dir: Path):
        super().__init__("PokerStars", data_dir)

    def parse_tournaments(self) -> List[NormalizedTournament]:
        tournaments = []

        # Try to find tournament schedule XML
        schedule_files = list(self.data_dir.glob("**/schedule*.xml")) + \
                        list(self.data_dir.glob("**/tournament*.xml"))

        for schedule_file in schedule_files:
            try:
                tree = ET.parse(schedule_file)
                root = tree.getroot()

                for tourney in root.findall(".//tournament"):
                    try:
                        name = tourney.findtext("name", "")
                        buyin_text = tourney.findtext("buyIn", "0")
                        fee_text = tourney.findtext("fee", "0")
                        start_text = tourney.findtext("startTime", "")
                        game_type = tourney.findtext("gameType", "NL Hold'em")
                        guarantee = tourney.findtext("guarantee", "0")
                        tourney_id = tourney.get("id") or tourney.findtext("id", "")

                        buyin = self.dollars_to_cents(float(buyin_text))
                        fee = self.dollars_to_cents(float(fee_text))
                        gtd = self.dollars_to_cents(float(guarantee))

                        # Parse start time
                        if start_text:
                            start_time = datetime.fromisoformat(start_text.replace("Z", "+00:00"))
                        else:
                            continue

                        tournaments.append(NormalizedTournament(
                            poker_room="Pokerstars",
                            variant=self.parse_variant(game_type),
                            start_time=start_time.isoformat(),
                            buyin_amount=buyin,
                            rake_amount=fee if fee > 0 else None,
                            estimated_prize_pool=gtd if gtd > 0 else None,
                            external_id=tourney_id,
                            metadata={"source": "xml", "name": name}
                        ))

                    except Exception as e:
                        self.logger.warning(f"Failed to parse tournament element: {e}")

            except Exception as e:
                self.logger.warning(f"Failed to parse {schedule_file}: {e}")

        return tournaments

    def parse_cash_games(self) -> List[NormalizedCashGame]:
        # PokerStars lobby data is often binary, limited parsing available
        return []


class GGPokerParser(ClientParser):
    """Parser for GGPoker client data"""

    def __init__(self, data_dir: Path):
        super().__init__("GGPoker", data_dir)

    def parse_tournaments(self) -> List[NormalizedTournament]:
        tournaments = []

        # Look for JSON lobby data
        json_files = list(self.data_dir.glob("**/lobby*.json")) + \
                    list(self.data_dir.glob("**/tournament*.json")) + \
                    list(self.data_dir.glob("**/*.json"))

        for json_file in json_files:
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    data = json.load(f)

                # Handle various JSON structures
                tourney_list = []
                if isinstance(data, dict):
                    tourney_list = data.get("tournaments", data.get("data", []))
                elif isinstance(data, list):
                    tourney_list = data

                for tourney in tourney_list:
                    if not isinstance(tourney, dict):
                        continue

                    try:
                        name = tourney.get("name", "")
                        buyin = tourney.get("buyIn", tourney.get("buyin", 0))
                        fee = tourney.get("fee", tourney.get("rake", 0))
                        start_text = tourney.get("startTime", tourney.get("start_time", ""))
                        variant = tourney.get("variant", tourney.get("gameType", "NLHE"))
                        guarantee = tourney.get("guarantee", tourney.get("gtd", 0))
                        tourney_id = tourney.get("id", tourney.get("tournamentId", ""))

                        # Convert to cents if needed
                        if isinstance(buyin, float) and buyin < 100:
                            buyin = self.dollars_to_cents(buyin)
                        if isinstance(fee, float) and fee < 100:
                            fee = self.dollars_to_cents(fee)
                        if isinstance(guarantee, float) and guarantee < 10000:
                            guarantee = self.dollars_to_cents(guarantee)

                        # Parse start time
                        if start_text:
                            if isinstance(start_text, (int, float)):
                                start_time = datetime.fromtimestamp(start_text / 1000, tz=timezone.utc)
                            else:
                                start_time = datetime.fromisoformat(start_text.replace("Z", "+00:00"))
                        else:
                            continue

                        tournaments.append(NormalizedTournament(
                            poker_room="GGpoker",
                            variant=self.parse_variant(variant),
                            start_time=start_time.isoformat(),
                            buyin_amount=int(buyin),
                            rake_amount=int(fee) if fee else None,
                            estimated_prize_pool=int(guarantee) if guarantee else None,
                            external_id=str(tourney_id) if tourney_id else None,
                            metadata={"source": "json", "name": name}
                        ))

                    except Exception as e:
                        self.logger.warning(f"Failed to parse GGPoker tournament: {e}")

            except json.JSONDecodeError:
                pass
            except Exception as e:
                self.logger.warning(f"Failed to read {json_file}: {e}")

        return tournaments

    def parse_cash_games(self) -> List[NormalizedCashGame]:
        cash_games = []

        for json_file in self.data_dir.glob("**/*.json"):
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    data = json.load(f)

                games_list = []
                if isinstance(data, dict):
                    games_list = data.get("cashGames", data.get("cash_games", data.get("tables", [])))

                for game in games_list:
                    if not isinstance(game, dict):
                        continue

                    stakes = game.get("stakes", "")
                    if "/" in stakes:
                        sb, bb = stakes.split("/")
                        sb = self.dollars_to_cents(float(sb.strip()))
                        bb = self.dollars_to_cents(float(bb.strip()))
                    else:
                        continue

                    cash_games.append(NormalizedCashGame(
                        poker_room="GGpoker",
                        variant=self.parse_variant(game.get("variant", "NLHE")),
                        small_blind=sb,
                        big_blind=bb,
                        min_buyin=sb * 20,  # Typical min
                        max_buyin=bb * 100,  # Typical max
                        current_players=game.get("players"),
                        max_players=game.get("maxPlayers", 6),
                        table_id=game.get("tableId")
                    ))

            except:
                pass

        return cash_games


class Poker888Parser(ClientParser):
    """Parser for 888Poker client data"""

    def __init__(self, data_dir: Path):
        super().__init__("888Poker", data_dir)

    def parse_tournaments(self) -> List[NormalizedTournament]:
        tournaments = []

        for xml_file in self.data_dir.glob("**/*.xml"):
            try:
                tree = ET.parse(xml_file)
                root = tree.getroot()

                for tourney in root.findall(".//tournament"):
                    try:
                        name = tourney.findtext("name", "")
                        buyin_text = tourney.findtext("buyin", "0")
                        start_text = tourney.findtext("start", "")
                        game = tourney.findtext("game", "NLHE")
                        guarantee = tourney.findtext("guarantee", "0")
                        tourney_id = tourney.findtext("id", "")

                        buyin = self.dollars_to_cents(float(buyin_text))
                        gtd = self.dollars_to_cents(float(guarantee))

                        # 888 often uses milliseconds timestamp
                        if start_text and start_text.isdigit():
                            start_time = datetime.fromtimestamp(int(start_text) / 1000, tz=timezone.utc)
                        else:
                            continue

                        tournaments.append(NormalizedTournament(
                            poker_room="888Poker",
                            variant=self.parse_variant(game),
                            start_time=start_time.isoformat(),
                            buyin_amount=buyin,
                            estimated_prize_pool=gtd if gtd > 0 else None,
                            external_id=tourney_id,
                            metadata={"source": "xml", "name": name}
                        ))

                    except Exception as e:
                        self.logger.warning(f"Failed to parse 888 tournament: {e}")

            except:
                pass

        return tournaments

    def parse_cash_games(self) -> List[NormalizedCashGame]:
        return []


class DataWatcherHandler(FileSystemEventHandler):
    """Handles file system events for poker data files"""

    def __init__(self, callback):
        super().__init__()
        self.callback = callback
        self.last_trigger = 0
        self.pending_changes = set()

    def on_modified(self, event):
        if event.is_directory:
            return
        self._handle_change(event.src_path)

    def on_created(self, event):
        if event.is_directory:
            return
        self._handle_change(event.src_path)

    def _handle_change(self, path: str):
        # Filter for relevant files
        if not self._is_relevant_file(path):
            return

        self.pending_changes.add(path)

        # Debounce - wait for changes to settle
        current_time = time.time()
        if current_time - self.last_trigger > DEBOUNCE_SECONDS:
            self.last_trigger = current_time
            # Trigger callback after short delay
            time.sleep(DEBOUNCE_SECONDS)
            if self.pending_changes:
                changed = list(self.pending_changes)
                self.pending_changes.clear()
                self.callback(changed)

    def _is_relevant_file(self, path: str) -> bool:
        relevant_extensions = {".xml", ".json", ".db", ".sqlite", ".dat", ".txt"}
        return Path(path).suffix.lower() in relevant_extensions


class PokerDataWatcher:
    """Main watcher service that coordinates parsing and ingestion"""

    def __init__(self, watch_dir: str):
        self.watch_dir = Path(watch_dir)
        self.observer = Observer()
        self.running = False
        self.parsers: Dict[str, ClientParser] = {}

        # Initialize parsers for each client
        self._init_parsers()

    def _init_parsers(self):
        client_dirs = {
            "pokerstars": PokerStarsParser,
            "ggpoker": GGPokerParser,
            "888poker": Poker888Parser,
        }

        for client_name, parser_class in client_dirs.items():
            client_dir = self.watch_dir / client_name
            if client_dir.exists():
                self.parsers[client_name] = parser_class(client_dir)
                logger.info(f"Initialized parser for {client_name}")

    def _on_changes(self, changed_files: List[str]):
        """Called when relevant files change"""
        logger.info(f"Detected {len(changed_files)} file changes")

        # Determine which clients were affected
        affected_clients = set()
        for path in changed_files:
            for client in self.parsers.keys():
                if client in path.lower():
                    affected_clients.add(client)

        # Parse affected clients and collect data
        all_tournaments = []
        all_cash_games = []

        for client in affected_clients:
            parser = self.parsers.get(client)
            if not parser:
                continue

            logger.info(f"Parsing {client} data...")

            try:
                tournaments = parser.parse_tournaments()
                all_tournaments.extend(tournaments)
                logger.info(f"  Found {len(tournaments)} tournaments")
            except Exception as e:
                logger.error(f"  Tournament parsing failed: {e}")

            try:
                cash_games = parser.parse_cash_games()
                all_cash_games.extend(cash_games)
                logger.info(f"  Found {len(cash_games)} cash games")
            except Exception as e:
                logger.error(f"  Cash game parsing failed: {e}")

        # Output results
        if all_tournaments or all_cash_games:
            self._output_results(all_tournaments, all_cash_games)

    def _output_results(self, tournaments: List[NormalizedTournament], cash_games: List[NormalizedCashGame]):
        """Output parsed results to JSON files for ingestion"""
        output_dir = self.watch_dir / "_parsed"
        output_dir.mkdir(exist_ok=True)

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

        if tournaments:
            tourney_file = output_dir / f"tournaments_{timestamp}.json"
            with open(tourney_file, "w") as f:
                json.dump([asdict(t) for t in tournaments], f, indent=2)
            logger.info(f"Wrote {len(tournaments)} tournaments to {tourney_file}")

        if cash_games:
            cash_file = output_dir / f"cashgames_{timestamp}.json"
            with open(cash_file, "w") as f:
                json.dump([asdict(g) for g in cash_games], f, indent=2)
            logger.info(f"Wrote {len(cash_games)} cash games to {cash_file}")

    def start(self):
        """Start the file watcher"""
        if not self.watch_dir.exists():
            logger.error(f"Watch directory does not exist: {self.watch_dir}")
            return

        handler = DataWatcherHandler(self._on_changes)
        self.observer.schedule(handler, str(self.watch_dir), recursive=True)
        self.observer.start()
        self.running = True

        logger.info(f"Started watching: {self.watch_dir}")
        logger.info(f"Active parsers: {list(self.parsers.keys())}")

    def stop(self):
        """Stop the file watcher"""
        self.observer.stop()
        self.observer.join()
        self.running = False
        logger.info("Watcher stopped")

    def run_once(self):
        """Run a single parse of all client data (no watching)"""
        logger.info("Running one-time parse of all client data...")

        all_tournaments = []
        all_cash_games = []

        for client, parser in self.parsers.items():
            logger.info(f"Parsing {client}...")

            try:
                tournaments = parser.parse_tournaments()
                all_tournaments.extend(tournaments)
                logger.info(f"  {len(tournaments)} tournaments")
            except Exception as e:
                logger.error(f"  Tournament error: {e}")

            try:
                cash_games = parser.parse_cash_games()
                all_cash_games.extend(cash_games)
                logger.info(f"  {len(cash_games)} cash games")
            except Exception as e:
                logger.error(f"  Cash game error: {e}")

        self._output_results(all_tournaments, all_cash_games)

        return {
            "tournaments": len(all_tournaments),
            "cash_games": len(all_cash_games)
        }


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Poker Client Data Watcher")
    parser.add_argument("--watch-dir", default=WATCH_DIR, help="Directory to watch")
    parser.add_argument("--once", action="store_true", help="Run once and exit (no watching)")
    args = parser.parse_args()

    watcher = PokerDataWatcher(args.watch_dir)

    if args.once:
        results = watcher.run_once()
        print(f"Parsed {results['tournaments']} tournaments and {results['cash_games']} cash games")
        return

    # Setup signal handlers
    def signal_handler(sig, frame):
        logger.info("Shutdown signal received")
        watcher.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Start watching
    watcher.start()

    try:
        while watcher.running:
            time.sleep(1)
    except KeyboardInterrupt:
        watcher.stop()


if __name__ == "__main__":
    main()
