"""CFR+ solver — Counterfactual Regret Minimization with regret floor.

CFR+ improves on vanilla CFR by flooring cumulative regrets at zero after each
update, which prevents large negative regrets from slowing convergence.

Uses alternating traversal: on each iteration, only one player's regrets
are updated, which reduces variance.
"""

from __future__ import annotations

import logging
from typing import Callable

import numpy as np

from .game_tree import ActionNode, ChanceNode, GameNode, TerminalNode
from .info_set import InfoSetStore

logger = logging.getLogger(__name__)


class CFRPlusSolver:
    """CFR+ solver for two-player zero-sum poker games."""

    def __init__(self, root: GameNode, info_store: InfoSetStore | None = None):
        self.root = root
        self.info_store = info_store if info_store is not None else InfoSetStore()
        self.iteration = 0
        self._ev_history: list[float] = []

    def solve(self, num_iterations: int = 1000,
              callback: Callable[[int, float], None] | None = None) -> float:
        """Run CFR+ for the given number of iterations.

        Uses alternating updates: even iterations update player 0,
        odd iterations update player 1.

        Returns the estimated game value (player 0 EV).
        """
        for i in range(num_iterations):
            self.iteration += 1
            updating_player = i % 2

            ev = self._cfr(self.root, updating_player,
                           reach_probs=np.array([1.0, 1.0, 1.0]))

            if updating_player == 0:
                self._ev_history.append(ev)

            if callback and (i + 1) % 100 == 0:
                avg_ev = self.get_average_ev()
                callback(self.iteration, avg_ev)

        return self.get_average_ev()

    def get_average_ev(self) -> float:
        """Get average player 0 EV over all iterations."""
        if not self._ev_history:
            return 0.0
        # Use the latter half for better estimate
        half = max(1, len(self._ev_history) // 2)
        return sum(self._ev_history[half:]) / len(self._ev_history[half:])

    def get_exploitability(self) -> float:
        """Compute exploitability (sum of best response EVs - game value).

        Lower is better. Zero means perfect Nash equilibrium.
        """
        from .best_response import compute_best_response_ev

        br_ev_p0 = compute_best_response_ev(self.root, self.info_store, 0)
        br_ev_p1 = compute_best_response_ev(self.root, self.info_store, 1)
        return br_ev_p0 + br_ev_p1

    def _cfr(self, node: GameNode, updating_player: int,
             reach_probs: np.ndarray) -> float:
        """Recursive CFR+ traversal.

        reach_probs: [p0_reach, p1_reach, chance_reach]
        Returns expected value for player 0.
        """
        if isinstance(node, TerminalNode):
            return float(node.payoffs[0])

        if isinstance(node, ChanceNode):
            ev = 0.0
            for label, (prob, child) in node.outcomes.items():
                new_reach = reach_probs.copy()
                new_reach[2] *= prob
                ev += prob * self._cfr(child, updating_player, new_reach)
            return ev

        assert isinstance(node, ActionNode)
        player = node.player
        num_actions = len(node.actions)

        info_set = self.info_store.get_or_create(node.info_set_key, num_actions)
        strategy = info_set.get_strategy()

        action_evs = np.zeros(num_actions, dtype=np.float64)
        node_ev = 0.0

        for i, action in enumerate(node.actions):
            child = node.children[action.label]
            new_reach = reach_probs.copy()
            new_reach[player] *= strategy[i]
            action_evs[i] = self._cfr(child, updating_player, new_reach)
            node_ev += strategy[i] * action_evs[i]

        if player == updating_player and not info_set.locked:
            # Compute counterfactual regrets
            opponent = 1 - player
            cf_reach = reach_probs[opponent] * reach_probs[2]

            for i in range(num_actions):
                regret = action_evs[i] - node_ev
                if player == 1:
                    regret = -regret
                info_set.cumulative_regret[i] += cf_reach * regret

            # CFR+: floor regrets at zero
            np.maximum(info_set.cumulative_regret, 0.0,
                       out=info_set.cumulative_regret)

            # Accumulate strategy for averaging (weighted by reach)
            my_reach = reach_probs[player]
            info_set.cumulative_strategy += my_reach * strategy

        return node_ev
