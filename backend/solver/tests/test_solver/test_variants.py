"""Tests for Leduc and NLHE subgame variants."""

import pytest
from pulse.solver.variants.leduc import LeducTreeBuilder
from pulse.solver.variants.nlhe_subgame import NLHESubgameBuilder
from pulse.solver.cfr import CFRPlusSolver
from pulse.solver.game_tree import count_nodes
from pulse.solver.info_set import InfoSetStore


class TestLeduc:
    def test_tree_builds(self):
        """Leduc tree builds without error."""
        builder = LeducTreeBuilder()
        root = builder.build_tree()
        counts = count_nodes(root)
        assert counts["chance"] > 1   # root + board card deals
        assert counts["action"] > 0
        assert counts["terminal"] > 0

    def test_chance_probabilities(self):
        """Root chance node has 30 deals (6*5 permutations)."""
        builder = LeducTreeBuilder()
        root = builder.build_tree()
        assert len(root.outcomes) == 30
        total_prob = sum(p for p, _ in root.outcomes.values())
        assert abs(total_prob - 1.0) < 1e-10

    def test_solve_converges(self):
        """Leduc CFR converges to reasonable EV."""
        builder = LeducTreeBuilder()
        root = builder.build_tree()
        store = InfoSetStore()
        solver = CFRPlusSolver(root, store)
        ev = solver.solve(num_iterations=500)

        # Leduc is slightly P1-favored, P0 EV is small negative
        assert -2.0 < ev < 2.0, f"EV {ev} out of reasonable range"
        assert len(store) > 20  # Should have many info sets

    def test_exploitability_decreases(self):
        """More iterations should reduce exploitability."""
        builder = LeducTreeBuilder()
        root = builder.build_tree()
        store = InfoSetStore()
        solver = CFRPlusSolver(root, store)

        solver.solve(200)
        exploit_200 = solver.get_exploitability()

        solver.solve(800)
        exploit_1000 = solver.get_exploitability()

        # Exploitability should generally decrease with more iterations
        assert exploit_1000 < exploit_200 + 0.5


class TestNLHESubgame:
    def test_river_tree_builds(self):
        """NLHE river subgame tree builds quickly (no more cards to deal)."""
        builder = NLHESubgameBuilder(
            board="Qs9d2cTh5s",
            range_p0="AhAd",
            range_p1="KhKd",
            pot=100,
            stack=200,
            bet_sizes=[0.5],
        )
        assert builder.street == "river"
        root = builder.build_tree()
        counts = count_nodes(root)
        assert counts["chance"] == 1  # only the root deal-out
        assert counts["terminal"] > 0
        assert counts["action"] > 0

    def test_solve_river_subgame(self):
        """Solve a river subgame (AA vs KK)."""
        builder = NLHESubgameBuilder(
            board="Qs9d2cTh5s",
            range_p0="AhAd",
            range_p1="KhKd",
            pot=100,
            stack=200,
            bet_sizes=[0.5],
        )
        root = builder.build_tree()
        store = InfoSetStore()
        solver = CFRPlusSolver(root, store)
        ev = solver.solve(num_iterations=200)

        # AA beats KK on this board, P0 should have positive EV
        assert ev > 0, f"AA should beat KK, got EV {ev}"

    def test_flop_subgame_builds(self):
        """NLHE flop subgame builds (with runout subsampling)."""
        builder = NLHESubgameBuilder(
            board="Qs9d2c",
            range_p0="AhAd",
            range_p1="KhKd",
            pot=100,
            stack=200,
            bet_sizes=[0.5],
        )
        assert builder.street == "flop"
        root = builder.build_tree()
        counts = count_nodes(root)
        assert counts["terminal"] > 0

    def test_range_board_conflict_filtered(self):
        """Cards on the board are filtered from ranges."""
        builder = NLHESubgameBuilder(
            board="Ac9d2c",
            range_p0="AA",  # Some AA combos overlap with Ac
            range_p1="KK",
            pot=100,
            stack=200,
        )
        # AA has 6 combos, but Ac is on board so 3 are removed
        assert len(builder.range_p0) == 3  # Ah-Ad, Ah-As, Ad-As

    def test_invalid_board_raises(self):
        """Invalid board raises ValueError."""
        with pytest.raises(ValueError):
            NLHESubgameBuilder(board="Qs9d")  # only 2 cards
