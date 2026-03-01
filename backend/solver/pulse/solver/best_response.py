"""Best response computation for evaluating exploitability.

A best response strategy always picks the highest-EV action at each info set
for a given player, assuming the opponent plays their current average strategy.

Uses a two-pass approach:
1. Accumulate counterfactual action values per info set (aggregated across
   all game states that share the same info set).
2. Pick best action per info set, then compute overall EV.
"""

from __future__ import annotations

import numpy as np

from .game_tree import ActionNode, ChanceNode, GameNode, TerminalNode
from .info_set import InfoSetStore


def compute_best_response_ev(root: GameNode, info_store: InfoSetStore,
                             br_player: int) -> float:
    """Compute best response EV for br_player against opponent's average strategy.

    Two-pass computation:
    1. Traverse tree to accumulate counterfactual value of each action at each
       of the BR player's info sets, weighted by opponent/chance reach.
    2. Pick best action per info set, then compute overall EV.
    """
    # Pass 1: Accumulate CF values per (info_set, action)
    cf_values: dict[str, np.ndarray] = {}  # key -> array of action CFs
    num_actions_map: dict[str, int] = {}
    _accumulate_cf_values(root, info_store, br_player, 1.0, 1.0,
                          cf_values, num_actions_map)

    # Pick best action per info set
    br_actions: dict[str, int] = {}
    for key, values in cf_values.items():
        br_actions[key] = int(np.argmax(values))

    # Pass 2: Compute EV with BR strategy
    return _eval_with_br(root, info_store, br_player, br_actions, 1.0, 1.0)


def _accumulate_cf_values(node: GameNode, info_store: InfoSetStore,
                          br_player: int, opp_reach: float,
                          chance_reach: float,
                          cf_values: dict[str, np.ndarray],
                          num_actions_map: dict[str, int]) -> float:
    """Pass 1: Compute subtree values and accumulate CF action values per info set.

    Returns the subtree value from the BR player's perspective (not weighted by
    opp/chance reach — weighting happens at accumulation).
    """
    if isinstance(node, TerminalNode):
        return float(node.payoffs[br_player])

    if isinstance(node, ChanceNode):
        ev = 0.0
        for label, (prob, child) in node.outcomes.items():
            ev += prob * _accumulate_cf_values(
                child, info_store, br_player, opp_reach,
                chance_reach * prob, cf_values, num_actions_map)
        return ev

    assert isinstance(node, ActionNode)
    player = node.player
    num_actions = len(node.actions)

    info_set = info_store.get(node.info_set_key)
    if info_set is None:
        strategy = np.full(num_actions, 1.0 / num_actions)
    else:
        strategy = info_set.get_average_strategy()

    if player == br_player:
        # Compute value of each action in this subtree
        action_vals = np.zeros(num_actions, dtype=np.float64)
        for i, action in enumerate(node.actions):
            child = node.children[action.label]
            action_vals[i] = _accumulate_cf_values(
                child, info_store, br_player, opp_reach,
                chance_reach, cf_values, num_actions_map)

        # Accumulate weighted action values for this info set
        key = node.info_set_key
        weight = opp_reach * chance_reach
        if key not in cf_values:
            cf_values[key] = np.zeros(num_actions, dtype=np.float64)
            num_actions_map[key] = num_actions
        cf_values[key] += weight * action_vals

        # Return best action value (unweighted) for parent computation
        return float(np.max(action_vals))
    else:
        # Opponent plays their average strategy
        ev = 0.0
        for i, action in enumerate(node.actions):
            child = node.children[action.label]
            ev += strategy[i] * _accumulate_cf_values(
                child, info_store, br_player, opp_reach * strategy[i],
                chance_reach, cf_values, num_actions_map)
        return ev


def _eval_with_br(node: GameNode, info_store: InfoSetStore,
                  br_player: int, br_actions: dict[str, int],
                  opp_reach: float, chance_reach: float) -> float:
    """Pass 2: Compute EV using the determined BR strategy."""
    if isinstance(node, TerminalNode):
        return float(node.payoffs[br_player]) * opp_reach * chance_reach

    if isinstance(node, ChanceNode):
        ev = 0.0
        for label, (prob, child) in node.outcomes.items():
            ev += _eval_with_br(child, info_store, br_player, br_actions,
                                opp_reach, chance_reach * prob)
        return ev

    assert isinstance(node, ActionNode)
    player = node.player
    num_actions = len(node.actions)

    info_set = info_store.get(node.info_set_key)
    if info_set is None:
        strategy = np.full(num_actions, 1.0 / num_actions)
    else:
        strategy = info_set.get_average_strategy()

    if player == br_player:
        # Play the determined BR action
        best_i = br_actions.get(node.info_set_key, 0)
        child = node.children[node.actions[best_i].label]
        return _eval_with_br(child, info_store, br_player, br_actions,
                             opp_reach, chance_reach)
    else:
        # Opponent plays average strategy
        ev = 0.0
        for i, action in enumerate(node.actions):
            child = node.children[action.label]
            ev += strategy[i] * _eval_with_br(
                child, info_store, br_player, br_actions,
                opp_reach * strategy[i], chance_reach)
        return ev


def compute_ev_comparison(root: GameNode, info_store: InfoSetStore) -> dict:
    """Compare GTO strategy EV with best response EVs for both players.

    Returns dict with:
    - gto_ev_p0: Player 0's EV under GTO
    - br_ev_p0: Player 0's EV when playing best response vs P1's GTO
    - br_ev_p1: Player 1's EV when playing best response vs P0's GTO
    - exploitability: sum of br_ev improvements (lower = closer to Nash)
    """
    gto_ev = _compute_strategy_ev(root, info_store)
    br_ev_p0 = compute_best_response_ev(root, info_store, 0)
    br_ev_p1 = compute_best_response_ev(root, info_store, 1)

    return {
        "gto_ev_p0": gto_ev,
        "gto_ev_p1": -gto_ev,
        "br_ev_p0": br_ev_p0,
        "br_ev_p1": br_ev_p1,
        "exploitability": br_ev_p0 + br_ev_p1,
    }


def _compute_strategy_ev(root: GameNode, info_store: InfoSetStore) -> float:
    """Compute EV for player 0 when both players play their average strategies."""
    return _traverse_strategy_ev(root, info_store, 1.0, 1.0, 1.0)


def _traverse_strategy_ev(node: GameNode, info_store: InfoSetStore,
                          p0_reach: float, p1_reach: float,
                          chance_reach: float) -> float:
    if isinstance(node, TerminalNode):
        return float(node.payoffs[0]) * p0_reach * p1_reach * chance_reach

    if isinstance(node, ChanceNode):
        ev = 0.0
        for label, (prob, child) in node.outcomes.items():
            ev += _traverse_strategy_ev(child, info_store,
                                        p0_reach, p1_reach, chance_reach * prob)
        return ev

    assert isinstance(node, ActionNode)
    info_set = info_store.get(node.info_set_key)
    if info_set is None:
        strategy = np.full(len(node.actions), 1.0 / len(node.actions))
    else:
        strategy = info_set.get_average_strategy()

    ev = 0.0
    for i, action in enumerate(node.actions):
        child = node.children[action.label]
        if node.player == 0:
            ev += _traverse_strategy_ev(child, info_store,
                                        p0_reach * strategy[i], p1_reach,
                                        chance_reach)
        else:
            ev += _traverse_strategy_ev(child, info_store,
                                        p0_reach, p1_reach * strategy[i],
                                        chance_reach)
    return ev
