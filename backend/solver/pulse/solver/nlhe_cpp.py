"""
Python wrapper for the C++ NLHE solver.

This module provides a bridge between the existing Python manager/API
and the high-performance C++ CFR+ implementation.
"""

from typing import Optional, Callable, Dict, List, Tuple
from dataclasses import dataclass
import logging

# Try to import C++ module
try:
    import nlhe_solver_cpp
    CPP_AVAILABLE = True
except ImportError:
    CPP_AVAILABLE = False
    nlhe_solver_cpp = None

from .cards import parse_range, card_to_str
from .models import SolveStatus

logger = logging.getLogger(__name__)


@dataclass
class NLHECppConfig:
    """Configuration for C++ NLHE solver."""
    board: str  # e.g., "Qs9d2c"
    range_p0: str  # e.g., "AA,KK,AKs"
    range_p1: str
    pot: float
    stack: float
    bet_sizes: List[float]  # e.g., [0.33, 0.67, 1.0]
    max_raises: int = 3
    max_runouts: int = 6


@dataclass
class NLHECppResult:
    """Result from C++ solver."""
    ev_p0: float
    exploitability: float
    completed_iterations: int
    total_info_sets: int
    cancelled: bool
    error: Optional[str]
    strategies: Dict[str, Tuple[List[str], List[float], bool]]  # key -> (actions, probs, locked)


def is_cpp_available() -> bool:
    """Check if C++ solver is available."""
    return CPP_AVAILABLE


def _expand_range_to_combos(range_str: str) -> List[str]:
    """
    Expand a range string like "AA,KK,AKs" into specific combos.
    Returns list of 4-char strings like ["AhAs", "AhAd", ...]
    """
    combos = []
    hands = parse_range(range_str)

    for hand in hands:
        # hand is a tuple of two card integers
        c1, c2 = hand
        c1_str = card_to_str(c1)
        c2_str = card_to_str(c2)
        combos.append(c1_str + c2_str)

    return combos


class NLHECppSolver:
    """
    Wrapper around the C++ NLHE solver.

    Maintains state for node locking and re-solving.
    """

    def __init__(self, config: NLHECppConfig):
        if not CPP_AVAILABLE:
            raise RuntimeError("C++ solver module not available")

        self.config = config

        # Expand ranges to combos
        range_p0_combos = _expand_range_to_combos(config.range_p0)
        range_p1_combos = _expand_range_to_combos(config.range_p1)

        if not range_p0_combos:
            raise ValueError(f"Invalid or empty range for player 0: {config.range_p0}")
        if not range_p1_combos:
            raise ValueError(f"Invalid or empty range for player 1: {config.range_p1}")

        logger.info(f"Creating C++ solver with {len(range_p0_combos)} x {len(range_p1_combos)} combos")

        # Create C++ solver instance
        self._solver = nlhe_solver_cpp.NLHESolver(
            config.board,
            range_p0_combos,
            range_p1_combos,
            config.pot,
            config.stack,
            config.bet_sizes,
            config.max_raises,
            config.max_runouts
        )

        self._last_result: Optional[NLHECppResult] = None

    def solve(
        self,
        num_iterations: int,
        callback: Optional[Callable[[int, int, int, float], bool]] = None,
        callback_interval: int = 100
    ) -> NLHECppResult:
        """
        Run CFR+ solver for specified iterations.

        Args:
            num_iterations: Number of CFR iterations to run
            callback: Optional callback(iter, completed, total, ev) -> bool
                     Return False to cancel
            callback_interval: How often to call the callback

        Returns:
            NLHECppResult with solve results
        """
        # Run solver
        cpp_result = self._solver.solve(num_iterations, callback, callback_interval)

        # Convert strategies
        strategies = {}
        for entry in self._solver.get_strategies():
            strategies[entry.info_set_key] = (
                entry.actions,
                entry.probabilities,
                entry.is_locked
            )

        result = NLHECppResult(
            ev_p0=cpp_result.ev_p0,
            exploitability=cpp_result.exploitability,
            completed_iterations=cpp_result.completed_iterations,
            total_info_sets=cpp_result.total_info_sets,
            cancelled=cpp_result.cancelled,
            error=cpp_result.error if cpp_result.error else None,
            strategies=strategies
        )

        self._last_result = result
        return result

    def apply_locks(self, locks: Dict[str, List[float]]) -> Dict[str, bool]:
        """
        Apply node locks for exploitative re-solving.

        Args:
            locks: Dict mapping info_set_key to fixed strategy probabilities

        Returns:
            Dict mapping info_set_key to success status
        """
        return self._solver.apply_locks(locks)

    def unlock_all(self):
        """Remove all node locks."""
        self._solver.unlock_all()

    def prepare_for_resolve(self):
        """Reset regrets on unlocked nodes for re-solving."""
        self._solver.prepare_for_resolve()

    def get_strategies(self) -> Dict[str, Tuple[List[str], List[float], bool]]:
        """Get all strategies."""
        strategies = {}
        for entry in self._solver.get_strategies():
            strategies[entry.info_set_key] = (
                entry.actions,
                entry.probabilities,
                entry.is_locked
            )
        return strategies

    def get_info_set_keys(self) -> List[str]:
        """Get all info set keys."""
        return self._solver.get_info_set_keys()

    def num_info_sets(self) -> int:
        """Get number of info sets."""
        return self._solver.num_info_sets()

    def tree_stats(self):
        """Get tree statistics."""
        return self._solver.tree_stats()


def solve_nlhe_cpp(
    config: NLHECppConfig,
    num_iterations: int,
    callback: Optional[Callable[[int, int, int, float], bool]] = None,
    callback_interval: int = 100
) -> NLHECppResult:
    """
    Convenience function to solve NLHE without maintaining state.

    For one-shot solves without node locking.
    """
    solver = NLHECppSolver(config)
    return solver.solve(num_iterations, callback, callback_interval)
