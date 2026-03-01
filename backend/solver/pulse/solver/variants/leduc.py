"""Leduc Hold'em — 6-card, 2-street poker game for multi-round CFR validation.

Rules:
- 6-card deck: J, Q, K with 2 suits each
- Each player antes 1 chip, gets 1 private card
- Street 1: betting round (check/bet(2))
- 1 community card dealt
- Street 2: betting round (check/bet(4))
- Showdown: pair (private matches board) beats high card; higher rank wins ties
- Max 2 bets per street (bet + raise)
"""

from __future__ import annotations

from itertools import permutations
from typing import Sequence

from ..cards import card, card_rank, card_suit
from ..game_tree import (
    Action, ActionInfo, ActionNode, ChanceNode, GameNode,
    TerminalNode, TreeBuilder,
)

# Leduc uses J=9, Q=10, K=11 with suits 0 and 1
LEDUC_RANKS = [9, 10, 11]
LEDUC_SUITS = [0, 1]
LEDUC_CARDS = [card(r, s) for r in LEDUC_RANKS for s in LEDUC_SUITS]
LEDUC_RANK_NAMES = {9: "J", 10: "Q", 11: "K"}

ANTE = 1
BET_STREET1 = 2
BET_STREET2 = 4
MAX_BETS_PER_STREET = 2


class LeducTreeBuilder(TreeBuilder):
    """Builds the Leduc Hold'em game tree."""

    def build_tree(self) -> GameNode:
        root = ChanceNode(depth=0)

        # Deal 2 private cards (all ordered pairs from 6 cards)
        deals = [(c1, c2) for c1 in LEDUC_CARDS for c2 in LEDUC_CARDS if c1 != c2]
        prob = 1.0 / len(deals)  # 1/30

        for p0_card, p1_card in deals:
            label = f"{_cname(p0_card)}{_cname(p1_card)}"
            child = self._build_street1(p0_card, p1_card, depth=1)
            child.parent = root
            root.outcomes[label] = (prob, child)

        return root

    def _build_street1(self, p0_card: int, p1_card: int, depth: int) -> GameNode:
        """Build the first street betting tree."""
        pot = 2 * ANTE  # both players ante
        return self._build_betting_round(
            p0_card, p1_card, board_card=None,
            pot=pot, street=1, bet_size=BET_STREET1,
            history="", num_bets=0, depth=depth,
        )

    def _build_betting_round(self, p0_card: int, p1_card: int,
                             board_card: int | None,
                             pot: float, street: int, bet_size: int,
                             history: str, num_bets: int,
                             depth: int) -> GameNode:
        """Recursively build a betting round."""
        # Determine acting player
        # In each street, P0 acts first, then alternates
        actions_in_round = len(history.split("/")[-1]) if "/" in history else len(history)
        player = actions_in_round % 2

        player_card = p0_card if player == 0 else p1_card
        info_key = self.get_info_set_key(
            player, [player_card], history,
            board=[board_card] if board_card is not None else [],
        )

        # Terminal conditions within round
        if self._is_round_terminal(history):
            if history.endswith("f"):
                # Last action was fold
                folder = player  # current player folded? No — the player who folded
                # Actually, the fold is the last action taken by the previous player
                prev_player = 1 - player
                # The previous player folded
                winner = player  # current player wins
                payoff = pot / 2  # winner gets opponent's contribution
                payoffs = (payoff, -payoff) if winner == 0 else (-payoff, payoff)
                return TerminalNode(depth=depth, payoffs=payoffs, pot=pot)

            # Round ended with check-check or bet-call
            if street == 1:
                # Deal community card → go to street 2
                return self._deal_board_card(p0_card, p1_card, pot, history, depth)
            else:
                # Street 2 over → showdown
                return self._showdown(p0_card, p1_card, board_card, pot, depth)

        # Build action node
        actions = self._get_actions(history, num_bets, bet_size)
        node = ActionNode(
            depth=depth,
            player=player,
            actions=actions,
            info_set_key=info_key,
            pot=pot,
        )

        for action in actions:
            if action.label == "fold":
                new_hist = history + "f"
                new_pot = pot
                new_bets = num_bets
            elif action.label == "check":
                new_hist = history + "c"
                new_pot = pot
                new_bets = num_bets
            elif action.label.startswith("bet") or action.label.startswith("raise"):
                new_hist = history + "b"
                new_pot = pot + bet_size
                new_bets = num_bets + 1
            elif action.label == "call":
                new_hist = history + "k"  # 'k' for call to avoid ambiguity
                new_pot = pot + bet_size
                new_bets = num_bets
            else:
                raise ValueError(f"Unknown action: {action.label}")

            child = self._build_betting_round(
                p0_card, p1_card, board_card,
                new_pot, street, bet_size,
                new_hist, new_bets, depth + 1,
            )
            child.parent = node
            node.children[action.label] = child

        return node

    def _is_round_terminal(self, history: str) -> bool:
        """Check if the current betting round is over."""
        # Extract actions in current street
        current = history.split("/")[-1] if "/" in history else history
        if len(current) < 2:
            return False
        last_two = current[-2:]
        # Round ends on: cc (check-check), bk (bet-call), bf (bet-fold),
        # bbk (bet-raise-call), bbf (bet-raise-fold)
        if last_two in ("cc", "bk", "bf"):
            return True
        return False

    def _get_actions(self, history: str, num_bets: int, bet_size: int) -> list[ActionInfo]:
        """Get available actions based on history."""
        current = history.split("/")[-1] if "/" in history else history
        last_action = current[-1] if current else ""

        if last_action == "b":
            # Facing a bet: fold, call, or raise (if under max bets)
            actions = [
                ActionInfo(Action.FOLD, label="fold"),
                ActionInfo(Action.CALL, amount=bet_size, label="call"),
            ]
            if num_bets < MAX_BETS_PER_STREET:
                actions.append(ActionInfo(Action.RAISE, amount=bet_size, label="raise"))
            return actions
        else:
            # No bet facing: check or bet
            return [
                ActionInfo(Action.CHECK, label="check"),
                ActionInfo(Action.BET, amount=bet_size, label=f"bet_{bet_size}"),
            ]

    def _deal_board_card(self, p0_card: int, p1_card: int,
                         pot: float, history: str, depth: int) -> GameNode:
        """Deal community card as a chance node, then build street 2."""
        chance = ChanceNode(depth=depth)
        remaining = [c for c in LEDUC_CARDS if c != p0_card and c != p1_card]
        prob = 1.0 / len(remaining)

        for board_card in remaining:
            label = _cname(board_card)
            new_history = history + "/" + label + "/"
            child = self._build_betting_round(
                p0_card, p1_card, board_card,
                pot=pot, street=2, bet_size=BET_STREET2,
                history=new_history, num_bets=0, depth=depth + 1,
            )
            child.parent = chance
            chance.outcomes[label] = (prob, child)

        return chance

    def _showdown(self, p0_card: int, p1_card: int,
                  board_card: int | None, pot: float, depth: int) -> TerminalNode:
        """Determine winner at showdown."""
        p0_rank = card_rank(p0_card)
        p1_rank = card_rank(p1_card)
        board_rank = card_rank(board_card) if board_card is not None else -1

        p0_pair = p0_rank == board_rank
        p1_pair = p1_rank == board_rank

        if p0_pair and not p1_pair:
            winner = 0
        elif p1_pair and not p0_pair:
            winner = 1
        elif p0_rank > p1_rank:
            winner = 0
        elif p1_rank > p0_rank:
            winner = 1
        else:
            # True tie
            return TerminalNode(depth=depth, payoffs=(0.0, 0.0), pot=pot,
                                is_showdown=True)

        payoff = pot / 2
        payoffs = (payoff, -payoff) if winner == 0 else (-payoff, payoff)
        return TerminalNode(depth=depth, payoffs=payoffs, pot=pot, is_showdown=True)

    def get_info_set_key(self, player: int, cards: Sequence[int],
                         history: str, board: Sequence[int] = ()) -> str:
        """Info set key: 'Jc|/Ks/:cb' format."""
        card_str = _cname(cards[0])
        board_str = "".join(_cname(c) for c in board) if board else ""
        if board_str:
            return f"{card_str}|{board_str}|{history}"
        return f"{card_str}|{history}"


def _cname(c: int) -> str:
    """Card name like 'Jc', 'Ks'."""
    r = LEDUC_RANK_NAMES[card_rank(c)]
    s = "cdhs"[card_suit(c)]
    return f"{r}{s}"
