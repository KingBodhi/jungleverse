"""Information set data structures for CFR.

An information set groups all game states that are indistinguishable to a player.
Each info set stores cumulative regrets and cumulative strategy weights.
"""

from __future__ import annotations

import numpy as np


class InfoSetData:
    """Regret and strategy data for a single information set."""

    __slots__ = ("num_actions", "cumulative_regret", "cumulative_strategy",
                 "locked", "locked_strategy")

    def __init__(self, num_actions: int):
        self.num_actions = num_actions
        self.cumulative_regret = np.zeros(num_actions, dtype=np.float64)
        self.cumulative_strategy = np.zeros(num_actions, dtype=np.float64)
        self.locked = False
        self.locked_strategy: np.ndarray | None = None

    def get_strategy(self) -> np.ndarray:
        """Compute current strategy via regret matching.

        If locked, returns the locked strategy.
        Otherwise, positive regrets are normalized to a probability distribution.
        If all regrets are non-positive, returns uniform.
        """
        if self.locked and self.locked_strategy is not None:
            return self.locked_strategy.copy()

        positive = np.maximum(self.cumulative_regret, 0.0)
        total = positive.sum()
        if total > 0:
            return positive / total
        return np.full(self.num_actions, 1.0 / self.num_actions)

    def get_average_strategy(self) -> np.ndarray:
        """Get the average strategy (converges to Nash in zero-sum games).

        If locked, returns the locked strategy.
        """
        if self.locked and self.locked_strategy is not None:
            return self.locked_strategy.copy()

        total = self.cumulative_strategy.sum()
        if total > 0:
            return self.cumulative_strategy / total
        return np.full(self.num_actions, 1.0 / self.num_actions)

    def lock(self, strategy: np.ndarray) -> None:
        """Lock this info set to a fixed strategy."""
        assert len(strategy) == self.num_actions
        assert abs(strategy.sum() - 1.0) < 1e-6
        self.locked = True
        self.locked_strategy = strategy.copy()

    def unlock(self) -> None:
        """Unlock this info set and reset regrets for re-solving."""
        self.locked = False
        self.locked_strategy = None
        self.cumulative_regret[:] = 0.0


class InfoSetStore:
    """In-memory store for all information sets."""

    def __init__(self):
        self._store: dict[str, InfoSetData] = {}

    def get_or_create(self, key: str, num_actions: int) -> InfoSetData:
        """Get existing info set or create a new one."""
        if key not in self._store:
            self._store[key] = InfoSetData(num_actions)
        return self._store[key]

    def get(self, key: str) -> InfoSetData | None:
        return self._store.get(key)

    def __contains__(self, key: str) -> bool:
        return key in self._store

    def __len__(self) -> int:
        return len(self._store)

    def keys(self) -> list[str]:
        return list(self._store.keys())

    def items(self):
        return self._store.items()

    def get_all_strategies(self) -> dict[str, list[float]]:
        """Get average strategies for all info sets (for serialization)."""
        result = {}
        for key, data in self._store.items():
            result[key] = data.get_average_strategy().tolist()
        return result

    def lock_info_set(self, key: str, strategy: list[float]) -> bool:
        """Lock an info set to a fixed strategy. Returns False if key not found."""
        data = self._store.get(key)
        if data is None:
            return False
        data.lock(np.array(strategy, dtype=np.float64))
        return True

    def unlock_info_set(self, key: str) -> bool:
        """Unlock an info set. Returns False if key not found."""
        data = self._store.get(key)
        if data is None:
            return False
        data.unlock()
        return True

    def unlock_all(self) -> int:
        """Unlock all info sets. Returns count of unlocked sets."""
        count = 0
        for data in self._store.values():
            if data.locked:
                data.unlock()
                count += 1
        return count

    def reset_unlocked_regrets(self) -> None:
        """Reset cumulative regrets for all unlocked info sets (for re-solving)."""
        for data in self._store.values():
            if not data.locked:
                data.cumulative_regret[:] = 0.0
