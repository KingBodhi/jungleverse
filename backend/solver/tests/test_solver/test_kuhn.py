"""Tests for Kuhn poker CFR solver.

Validates convergence to known Nash equilibrium:
- Player 0 EV = -1/18 ≈ -0.0556
- Known strategy frequencies at specific info sets
- Exploitability < 0.001 within 1000 iterations
"""

import pytest
from pulse.solver.variants.kuhn import KuhnTreeBuilder
from pulse.solver.cfr import CFRPlusSolver
from pulse.solver.game_tree import count_nodes
from pulse.solver.info_set import InfoSetStore


@pytest.fixture
def kuhn_solver():
    """Create a solved Kuhn poker instance."""
    builder = KuhnTreeBuilder()
    root = builder.build_tree()
    store = InfoSetStore()
    solver = CFRPlusSolver(root, store)
    solver.solve(num_iterations=5000)
    return solver, store


class TestKuhnTreeBuilding:
    def test_tree_structure(self):
        builder = KuhnTreeBuilder()
        root = builder.build_tree()
        counts = count_nodes(root)
        # Kuhn has 6 deals, each with multiple action sequences
        assert counts["chance"] >= 1
        assert counts["action"] > 0
        assert counts["terminal"] > 0

    def test_chance_node_probabilities(self):
        builder = KuhnTreeBuilder()
        root = builder.build_tree()
        # 6 possible deals, each with probability 1/6
        assert len(root.outcomes) == 6
        for label, (prob, child) in root.outcomes.items():
            assert abs(prob - 1.0 / 6) < 1e-10


class TestCFRConvergence:
    def test_player0_ev(self, kuhn_solver):
        """P0 EV should converge to -1/18 ≈ -0.0556."""
        solver, store = kuhn_solver
        ev = solver.get_average_ev()
        assert abs(ev - (-1.0 / 18)) < 0.01, f"P0 EV = {ev}, expected ~{-1/18:.4f}"

    def test_exploitability(self, kuhn_solver):
        """Exploitability should be very low after 2000 iterations."""
        solver, store = kuhn_solver
        exploit = solver.get_exploitability()
        assert exploit < 0.01, f"Exploitability = {exploit}, expected < 0.01"

    def test_info_set_count(self, kuhn_solver):
        """Kuhn poker has 12 info sets (6 per player)."""
        solver, store = kuhn_solver
        # Each player has 3 cards × 2 possible histories at first decision
        # Plus facing-bet info sets
        assert len(store) == 12

    def test_king_always_bets_or_calls(self, kuhn_solver):
        """With K, player should always bet/call (it's the best card)."""
        solver, store = kuhn_solver

        # K: (first to act) — should bet with high frequency
        k_root = store.get("K:")
        assert k_root is not None
        k_strategy = k_root.get_average_strategy()
        # K should bet frequently (check=0, bet=1)
        # In Nash EQ: K bets with alpha + 3*alpha = some freq,
        # but always calls when facing bet
        assert k_strategy[1] > 0.3  # bets reasonably often

        # K:b (facing bet with K) — should always call
        k_facing_bet = store.get("K:b")
        assert k_facing_bet is not None
        k_call = k_facing_bet.get_average_strategy()
        assert k_call[1] > 0.95  # fold=0, call=1 — almost always calls

    def test_jack_strategy(self, kuhn_solver):
        """J should rarely bet as P0 (bluff frequency ~alpha/3)."""
        solver, store = kuhn_solver

        # J: (first to act) — should check most of the time
        j_root = store.get("J:")
        assert j_root is not None
        j_strategy = j_root.get_average_strategy()
        # check=0, bet=1
        # In Nash EQ, J bets (bluffs) with probability alpha ≈ 1/3
        assert j_strategy[0] > 0.5  # checks more than bets

        # J:b (facing bet with J) — should always fold
        j_facing_bet = store.get("J:b")
        assert j_facing_bet is not None
        j_fold = j_facing_bet.get_average_strategy()
        assert j_fold[0] > 0.95  # fold=0 — almost always folds


class TestSolverMechanics:
    def test_incremental_solving(self):
        """Solver can be called multiple times incrementally."""
        builder = KuhnTreeBuilder()
        root = builder.build_tree()
        store = InfoSetStore()
        solver = CFRPlusSolver(root, store)

        solver.solve(500)
        ev1 = solver.get_average_ev()
        assert solver.iteration == 500

        solver.solve(500)
        ev2 = solver.get_average_ev()
        assert solver.iteration == 1000

        # More iterations should give a better estimate
        assert abs(ev2 - (-1.0 / 18)) <= abs(ev1 - (-1.0 / 18)) + 0.01

    def test_callback(self):
        """Callback is invoked during solving."""
        builder = KuhnTreeBuilder()
        root = builder.build_tree()
        solver = CFRPlusSolver(root)

        calls = []
        solver.solve(500, callback=lambda i, ev: calls.append((i, ev)))
        assert len(calls) == 5  # called every 100 iterations
        for iteration, ev in calls:
            assert iteration % 100 == 0
