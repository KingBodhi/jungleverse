"""Tests for node locking and exploitative strategy computation.

Key test: Lock Kuhn P2 to always-call → verify P1 adjusts by never bluffing with J.
"""

import pytest
import numpy as np
from pulse.solver.variants.kuhn import KuhnTreeBuilder
from pulse.solver.cfr import CFRPlusSolver
from pulse.solver.node_lock import NodeLocker, NodeLockSpec
from pulse.solver.best_response import compute_ev_comparison
from pulse.solver.info_set import InfoSetStore


@pytest.fixture
def solved_kuhn():
    """Create a fully solved Kuhn poker instance."""
    builder = KuhnTreeBuilder()
    root = builder.build_tree()
    store = InfoSetStore()
    solver = CFRPlusSolver(root, store)
    solver.solve(num_iterations=2000)
    return solver, root, store


class TestNodeLocking:
    def test_lock_and_unlock(self, solved_kuhn):
        """Basic lock/unlock operations."""
        solver, root, store = solved_kuhn
        locker = NodeLocker(store)

        # Lock P2's "Q:b" info set to always call
        spec = NodeLockSpec(locks={"Q:b": [0.0, 1.0]})  # fold=0, call=1
        results = locker.apply_locks(spec)
        assert results["Q:b"] is True

        # Verify it's locked
        info_set = store.get("Q:b")
        assert info_set.locked is True
        strategy = info_set.get_strategy()
        assert strategy[1] == 1.0  # always call

        # Unlock
        count = locker.rollback_last()
        assert count == 1
        assert info_set.locked is False

    def test_lock_nonexistent_key(self, solved_kuhn):
        """Locking a nonexistent key returns False."""
        solver, root, store = solved_kuhn
        locker = NodeLocker(store)

        spec = NodeLockSpec(locks={"FAKE:key": [0.5, 0.5]})
        results = locker.apply_locks(spec)
        assert results["FAKE:key"] is False

    def test_always_call_exploitative(self, solved_kuhn):
        """Lock P2 to always-call → P1 should stop bluffing with J.

        When P2 always calls, bluffing with J is -EV since J always loses
        at showdown. P1 should only bet for value (with K).
        """
        solver, root, store = solved_kuhn
        locker = NodeLocker(store)

        # Lock ALL of P2's info sets to always call (never fold)
        p2_facing_bet_keys = ["J:b", "Q:b", "K:b"]
        locks = {key: [0.0, 1.0] for key in p2_facing_bet_keys}  # fold=0, call=1

        # Also lock P2's first-action info sets (when P1 checks)
        # P2 can check or bet after P1 checks
        p2_after_check_keys = ["J:c", "Q:c", "K:c"]
        for key in p2_after_check_keys:
            locks[key] = [0.5, 0.5]  # keep original-ish for these

        spec = NodeLockSpec(locks=locks)
        locker.apply_locks(spec)

        # Reset unlocked regrets and re-solve
        locker.prepare_for_resolve()
        solver.solve(num_iterations=2000)

        # Now check P1's strategy with J (first to act)
        j_info = store.get("J:")
        assert j_info is not None
        j_strategy = j_info.get_average_strategy()
        # With J, P1 should check most/all the time (no bluffing value)
        # check=0, bet=1
        assert j_strategy[0] > 0.8, \
            f"J should check (not bluff) vs always-call opp. Strategy: {j_strategy}"

        # P1 with K should bet aggressively for value
        k_info = store.get("K:")
        assert k_info is not None
        k_strategy = k_info.get_average_strategy()
        # K should bet frequently (value bet)
        assert k_strategy[1] > 0.5, \
            f"K should bet for value vs always-call. Strategy: {k_strategy}"

    def test_ev_improves_after_nodelock(self, solved_kuhn):
        """P1's EV should improve when exploiting a locked P2 strategy."""
        solver, root, store = solved_kuhn

        # Get GTO comparison first
        gto_comparison = compute_ev_comparison(root, store)
        gto_ev = gto_comparison["gto_ev_p0"]

        # Lock P2 to always call
        locker = NodeLocker(store)
        p2_bet_keys = ["J:b", "Q:b", "K:b"]
        locks = {key: [0.0, 1.0] for key in p2_bet_keys}
        spec = NodeLockSpec(locks=locks)
        locker.apply_locks(spec)

        # Re-solve for exploitative strategy
        locker.prepare_for_resolve()
        solver.solve(num_iterations=2000)

        # Get exploitative comparison
        exploit_comparison = compute_ev_comparison(root, store)

        # P0's EV should be at least as good as GTO (exploiting weak play)
        # In GTO, P0 EV ≈ -0.0556. Against always-call P2, should be better.
        exploit_ev = exploit_comparison["gto_ev_p0"]
        assert exploit_ev >= gto_ev - 0.01, \
            f"Exploit EV {exploit_ev} should be >= GTO EV {gto_ev}"

    def test_rollback_all(self, solved_kuhn):
        """Rollback all locks restores all info sets."""
        solver, root, store = solved_kuhn
        locker = NodeLocker(store)

        # Lock multiple info sets
        spec = NodeLockSpec(locks={
            "J:b": [0.0, 1.0],
            "Q:b": [0.0, 1.0],
            "K:b": [0.0, 1.0],
        })
        locker.apply_locks(spec)
        assert len(locker.get_locked_keys()) == 3

        count = locker.rollback_all()
        assert count == 3
        assert len(locker.get_locked_keys()) == 0

    def test_helper_methods(self):
        """Test convenience methods for creating strategies."""
        always_fold = NodeLocker.make_always_action(2, 0)
        assert always_fold == [1.0, 0.0]

        always_call = NodeLocker.make_always_action(2, 1)
        assert always_call == [0.0, 1.0]

        uniform = NodeLocker.make_uniform(3)
        assert len(uniform) == 3
        assert abs(sum(uniform) - 1.0) < 1e-10
