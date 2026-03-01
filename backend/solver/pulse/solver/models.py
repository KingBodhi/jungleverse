"""Pydantic request/response models for the solver API."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class GameVariant(str, Enum):
    KUHN = "kuhn"
    LEDUC = "leduc"
    NLHE_SUBGAME = "nlhe_subgame"


class SolveStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


# --- Request Models ---

class SolveRequest(BaseModel):
    variant: GameVariant
    num_iterations: int = Field(default=1000, ge=1, le=1_000_000)
    # NLHE-specific fields (ignored for Kuhn/Leduc)
    board: Optional[str] = None         # e.g. "Qs9d2c"
    range_p0: Optional[str] = None      # e.g. "AA,KK,QQ,AKs"
    range_p1: Optional[str] = None
    pot: Optional[float] = None
    stack: Optional[float] = None
    bet_sizes: Optional[list[float]] = None  # fractions of pot, e.g. [0.33, 0.5, 1.0]


class NodeLockRequest(BaseModel):
    solve_id: str
    locks: dict[str, list[float]]  # info_set_key -> strategy probs
    resolve_iterations: int = Field(default=1000, ge=1, le=1_000_000)


class StrategyQuery(BaseModel):
    info_set_keys: Optional[list[str]] = None  # None = all
    prefix: Optional[str] = None  # filter by prefix


# --- Response Models ---

class SolveResponse(BaseModel):
    solve_id: str
    status: SolveStatus
    variant: GameVariant
    num_iterations: int
    progress: float = 0.0  # 0.0 to 1.0
    ev_p0: Optional[float] = None
    exploitability: Optional[float] = None
    num_info_sets: int = 0
    error: Optional[str] = None


class StrategyEntry(BaseModel):
    info_set_key: str
    actions: list[str]
    probabilities: list[float]
    is_locked: bool = False


class StrategyResponse(BaseModel):
    solve_id: str
    strategies: list[StrategyEntry]
    total_info_sets: int


class InfoSetsResponse(BaseModel):
    solve_id: str
    info_set_keys: list[str]
    total: int


class EVComparisonResponse(BaseModel):
    solve_id: str
    gto_ev_p0: float
    gto_ev_p1: float
    br_ev_p0: float
    br_ev_p1: float
    exploitability: float


class NodeLockResponse(BaseModel):
    solve_id: str
    locks_applied: dict[str, bool]
    status: SolveStatus
    resolve_iterations: int
