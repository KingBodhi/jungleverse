"""Node locking for exploitative strategy computation.

Node locking allows fixing a player's strategy at specific info sets,
then re-running CFR to find the best counter-strategy. This is how
solvers compute exploitative adjustments against non-GTO opponents.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from .info_set import InfoSetStore


@dataclass
class NodeLockSpec:
    """Specification for locking one or more info sets."""
    locks: dict[str, list[float]] = field(default_factory=dict)
    # info_set_key -> strategy probabilities


class NodeLocker:
    """Manages node locking and re-solving for exploitative strategies."""

    def __init__(self, info_store: InfoSetStore):
        self.info_store = info_store
        self._lock_history: list[NodeLockSpec] = []

    def apply_locks(self, spec: NodeLockSpec) -> dict[str, bool]:
        """Apply node locks from a spec. Returns dict of key -> success."""
        results = {}
        for key, strategy in spec.locks.items():
            results[key] = self.info_store.lock_info_set(key, strategy)
        self._lock_history.append(spec)
        return results

    def prepare_for_resolve(self) -> None:
        """Reset unlocked info set regrets in preparation for re-solving.

        Locked info sets keep their fixed strategies.
        Unlocked info sets get fresh regrets so CFR can find the
        best counter-strategy against the locked nodes.
        """
        self.info_store.reset_unlocked_regrets()

    def rollback_last(self) -> int:
        """Undo the most recent lock operation. Returns count of unlocked sets."""
        if not self._lock_history:
            return 0
        last = self._lock_history.pop()
        count = 0
        for key in last.locks:
            if self.info_store.unlock_info_set(key):
                count += 1
        return count

    def rollback_all(self) -> int:
        """Undo all locks. Returns count of unlocked sets."""
        count = self.info_store.unlock_all()
        self._lock_history.clear()
        return count

    def get_locked_keys(self) -> list[str]:
        """Get all currently locked info set keys."""
        locked = []
        for key, data in self.info_store.items():
            if data.locked:
                locked.append(key)
        return locked

    @staticmethod
    def make_always_action(num_actions: int, action_index: int) -> list[float]:
        """Create a strategy that always takes one action (for convenience)."""
        strategy = [0.0] * num_actions
        strategy[action_index] = 1.0
        return strategy

    @staticmethod
    def make_uniform(num_actions: int) -> list[float]:
        """Create a uniform strategy (for convenience)."""
        return [1.0 / num_actions] * num_actions
