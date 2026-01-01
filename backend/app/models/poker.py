from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel


class GameType(str, Enum):
    CASH = "CASH"
    TOURNAMENT = "TOURNAMENT"


class GameVariant(str, Enum):
    NLHE = "NLHE"
    PLO = "PLO"
    PLO5 = "PLO5"
    MIXED = "MIXED"
    OTHER = "OTHER"


class Provider(str, Enum):
    POKERSTARS = "POKERSTARS"
    GG_POKER = "GG_POKER"
    POKER_888 = "POKER_888"
    PARTY_POKER = "PARTY_POKER"
    WPT_GLOBAL = "WPT_GLOBAL"
    WSOP_ONLINE = "WSOP_ONLINE"
    CLUB_GG = "CLUB_GG"
    OTHER = "OTHER"


class Stakes(BaseModel):
    small_blind: int  # in cents
    big_blind: int  # in cents
    ante: Optional[int] = None


class TournamentInfo(BaseModel):
    buy_in: int  # in cents
    start_time: datetime
    guaranteed_prize: Optional[int] = None  # in cents
    max_players: Optional[int] = None
    name: Optional[str] = None
    tournament_id: Optional[str] = None


class PokerGame(BaseModel):
    """Unified model for poker games across all providers."""

    provider: Provider
    game_type: GameType
    variant: GameVariant = GameVariant.NLHE

    # Cash game fields
    stakes: Optional[Stakes] = None

    # Tournament fields
    tournament: Optional[TournamentInfo] = None

    # Common fields
    player_count: int = 0
    is_running: bool = False
    table_count: Optional[int] = None

    # Metadata
    club_id: Optional[str] = None
    club_name: Optional[str] = None
    raw_data: Optional[dict] = None


class CashGame(BaseModel):
    """Cash game specific model."""

    provider: Provider
    variant: GameVariant
    stakes: Stakes
    player_count: int = 0
    table_count: int = 1
    is_running: bool = True
    club_id: Optional[str] = None
    club_name: Optional[str] = None


class Tournament(BaseModel):
    """Tournament specific model."""

    provider: Provider
    variant: GameVariant
    tournament_id: Optional[str] = None
    name: str
    buy_in: int  # cents
    start_time: datetime
    guaranteed_prize: Optional[int] = None  # cents
    current_entries: int = 0
    max_entries: Optional[int] = None
    is_running: bool = False
    late_reg_open: bool = False


class ScraperResult(BaseModel):
    """Result from a scraper run."""

    success: bool
    provider: Provider
    timestamp: datetime
    source: str = "web"  # 'web', 'api', 'mock'
    games: list[PokerGame] = []
    cash_games: list[CashGame] = []
    tournaments: list[Tournament] = []
    errors: list[str] = []
    warnings: list[str] = []
    raw_html: Optional[str] = None  # For debugging
