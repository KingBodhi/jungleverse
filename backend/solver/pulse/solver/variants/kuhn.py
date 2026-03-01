"""Kuhn poker — minimal poker game for CFR validation.

Rules:
- 3-card deck: J(9), Q(10), K(11) using standard rank encoding
- Each player antes 1 chip, gets 1 card
- Player 0 acts first: check or bet(1)
- Player 1 responds: check/call or bet(1)/fold
- If both check or bet is called: showdown (higher card wins pot)
- Known Nash equilibrium: Player 0 EV = -1/18 ≈ -0.0556
"""

from __future__ import annotations

from itertools import permutations
from typing import Sequence

from ..cards import card, card_rank
from ..game_tree import (
    Action, ActionInfo, ActionNode, ChanceNode, GameNode,
    TerminalNode, TreeBuilder,
)

# Kuhn uses J=9, Q=10, K=11 (rank indices)
KUHN_RANKS = [9, 10, 11]  # J, Q, K
KUHN_RANK_NAMES = {9: "J", 10: "Q", 11: "K"}

# We use suit 0 (clubs) for all Kuhn cards
KUHN_CARDS = [card(r, 0) for r in KUHN_RANKS]


class KuhnTreeBuilder(TreeBuilder):
    """Builds the complete Kuhn poker game tree."""

    def build_tree(self) -> GameNode:
        """Build tree with chance node at root dealing all permutations."""
        root = ChanceNode(depth=0)

        # All possible deals: (p0_card, p1_card)
        deals = list(permutations(KUHN_CARDS, 2))
        prob = 1.0 / len(deals)  # 1/6 each

        for p0_card, p1_card in deals:
            label = f"{_card_name(p0_card)}{_card_name(p1_card)}"
            child = self._build_action_tree(p0_card, p1_card, "", 0)
            child.parent = root
            root.outcomes[label] = (prob, child)

        return root

    def _build_action_tree(self, p0_card: int, p1_card: int,
                           history: str, depth: int) -> GameNode:
        """Recursively build the action tree after cards are dealt."""
        ante = 1.0

        # Check if terminal
        if history == "cc":
            # Both checked — showdown
            winner = 0 if card_rank(p0_card) > card_rank(p1_card) else 1
            payoff = ante  # winner gets opponent's ante
            payoffs = (payoff, -payoff) if winner == 0 else (-payoff, payoff)
            return TerminalNode(depth=depth, payoffs=payoffs, pot=2 * ante,
                                is_showdown=True)

        if history == "bc":
            # P0 bet, P1 fold
            return TerminalNode(depth=depth, payoffs=(ante, -ante), pot=2 * ante)

        if history == "bb":
            # P0 bet, P1 call — showdown
            winner = 0 if card_rank(p0_card) > card_rank(p1_card) else 1
            payoff = 2 * ante
            payoffs = (payoff, -payoff) if winner == 0 else (-payoff, payoff)
            return TerminalNode(depth=depth, payoffs=payoffs, pot=4 * ante,
                                is_showdown=True)

        if history == "cbc":
            # P0 check, P1 bet, P0 fold
            return TerminalNode(depth=depth, payoffs=(-ante, ante), pot=2 * ante)

        if history == "cbb":
            # P0 check, P1 bet, P0 call — showdown
            winner = 0 if card_rank(p0_card) > card_rank(p1_card) else 1
            payoff = 2 * ante
            payoffs = (payoff, -payoff) if winner == 0 else (-payoff, payoff)
            return TerminalNode(depth=depth, payoffs=payoffs, pot=4 * ante,
                                is_showdown=True)

        # Determine acting player
        player = len(history) % 2
        if history == "cb":
            player = 0  # P0 faces P1's bet

        # Which card does the acting player see?
        player_card = p0_card if player == 0 else p1_card

        # Build info set key: card + action history
        info_key = self.get_info_set_key(player, [player_card], history)

        # Available actions depend on history
        if history in ("", "c"):
            # Can check or bet
            actions = [
                ActionInfo(Action.CHECK, label="check"),
                ActionInfo(Action.BET, amount=1.0, label="bet"),
            ]
        elif history in ("b", "cb"):
            # Facing a bet: fold or call
            actions = [
                ActionInfo(Action.FOLD, label="fold"),
                ActionInfo(Action.CALL, amount=1.0, label="call"),
            ]
        else:
            raise ValueError(f"Unexpected history: {history}")

        # Map action labels to Kuhn history chars
        action_to_char = {"check": "c", "bet": "b", "fold": "c", "call": "b"}

        node = ActionNode(
            depth=depth,
            player=player,
            actions=actions,
            info_set_key=info_key,
            pot=2 * ante + history.count("b") * ante,
        )

        for action in actions:
            char = action_to_char[action.label]
            new_history = history + char
            child = self._build_action_tree(p0_card, p1_card, new_history, depth + 1)
            child.parent = node
            node.children[action.label] = child

        return node

    def get_info_set_key(self, player: int, cards: Sequence[int],
                         history: str, board: Sequence[int] = ()) -> str:
        """Info set key: 'J:' or 'Q:cb' etc."""
        card_name = _card_name(cards[0])
        return f"{card_name}:{history}"


def _card_name(c: int) -> str:
    """Get single-letter name for Kuhn card."""
    return KUHN_RANK_NAMES[card_rank(c)]
