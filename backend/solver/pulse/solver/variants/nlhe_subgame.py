"""NLHE postflop subgame solver.

Builds a game tree for No-Limit Hold'em postflop play with configurable:
- Board cards (flop/turn/river)
- Player ranges
- Bet sizes (as fractions of pot)
- Pot and stack geometry

This is the production use case — solves postflop spots given preflop ranges.
"""

from __future__ import annotations

from itertools import combinations
from typing import Sequence

from ..cards import (
    NUM_CARDS, card_from_str, card_rank, card_suit, card_to_str,
    cards_to_str, parse_range,
)
from ..evaluator import evaluate_hand
from ..game_tree import (
    Action, ActionInfo, ActionNode, ChanceNode, GameNode,
    TerminalNode, TreeBuilder,
)

DEFAULT_BET_SIZES = [0.33, 0.67, 1.0]  # fractions of pot
DEFAULT_RAISE_SIZES = [0.5, 1.0]       # fractions of pot after bet
MAX_RAISES = 3
MAX_RUNOUT_CARDS = 6  # limit runout enumeration per street for tractability


class NLHESubgameBuilder(TreeBuilder):
    """Builds an NLHE postflop subgame tree."""

    def __init__(self, board: str = "Qs9d2c",
                 range_p0: str = "AA,KK,QQ,JJ,AKs,AKo",
                 range_p1: str = "AA,KK,QQ,JJ,AKs,AKo",
                 pot: float = 100.0,
                 stack: float = 200.0,
                 bet_sizes: list[float] | None = None,
                 **kwargs):
        self.board_str = board
        self.board_cards = self._parse_board(board)
        self.range_p0 = parse_range(range_p0)
        self.range_p1 = parse_range(range_p1)
        self.pot = pot
        self.stack = stack  # effective stack remaining
        self.bet_sizes = bet_sizes or DEFAULT_BET_SIZES

        # Filter ranges: remove combos that conflict with board
        board_set = set(self.board_cards)
        self.range_p0 = [(c1, c2) for c1, c2 in self.range_p0
                         if c1 not in board_set and c2 not in board_set]
        self.range_p1 = [(c1, c2) for c1, c2 in self.range_p1
                         if c1 not in board_set and c2 not in board_set]

        # Determine street from board length
        self.street = {3: "flop", 4: "turn", 5: "river"}[len(self.board_cards)]

    def _parse_board(self, board: str) -> list[int]:
        """Parse board string like 'Qs9d2c' into card ints."""
        if len(board) % 2 != 0:
            raise ValueError(f"Invalid board string: {board}")
        cards = []
        for i in range(0, len(board), 2):
            cards.append(card_from_str(board[i:i + 2]))
        if len(cards) not in (3, 4, 5):
            raise ValueError(f"Board must be 3-5 cards, got {len(cards)}")
        return cards

    def build_tree(self) -> GameNode:
        """Build the subgame tree.

        Root is a chance node enumerating all combos of (p0_hand, p1_hand)
        that don't conflict with each other or the board.
        """
        root = ChanceNode(depth=0)

        # Enumerate all valid deal-outs
        valid_deals = []
        for h0 in self.range_p0:
            for h1 in self.range_p1:
                # No card overlap
                if h0[0] in h1 or h0[1] in h1 or h1[0] in h0 or h1[1] in h0:
                    continue
                valid_deals.append((h0, h1))

        if not valid_deals:
            raise ValueError("No valid deals — ranges may conflict with board")

        prob = 1.0 / len(valid_deals)

        for (c0a, c0b), (c1a, c1b) in valid_deals:
            label = f"{card_to_str(c0a)}{card_to_str(c0b)}v{card_to_str(c1a)}{card_to_str(c1b)}"
            child = self._build_betting(
                p0_hand=(c0a, c0b), p1_hand=(c1a, c1b),
                board=list(self.board_cards),
                pot=self.pot, stacks=(self.stack, self.stack),
                history="", num_raises=0, depth=1,
            )
            child.parent = root
            root.outcomes[label] = (prob, child)

        return root

    def _build_betting(self, p0_hand: tuple[int, int], p1_hand: tuple[int, int],
                       board: list[int], pot: float,
                       stacks: tuple[float, float],
                       history: str, num_raises: int, depth: int) -> GameNode:
        """Build a betting subtree."""
        # Determine player from action count in current street
        current_street_actions = history.split("/")[-1] if "/" in history else history
        player = len(current_street_actions) % 2

        player_hand = p0_hand if player == 0 else p1_hand
        info_key = self.get_info_set_key(
            player, list(player_hand), history, board
        )

        # Check if round is complete
        if self._is_round_complete(history):
            if history.endswith("f"):
                # Fold — previous player wins
                winner = player  # the player who DIDN'T fold
                payoff = pot / 2
                payoffs = (payoff, -payoff) if winner == 0 else (-payoff, payoff)
                return TerminalNode(depth=depth, payoffs=payoffs, pot=pot)

            # Check-check or bet-call: deal next street or showdown
            if len(board) < 5:
                return self._deal_street(
                    p0_hand, p1_hand, board, pot, stacks, history, depth
                )
            else:
                return self._showdown(p0_hand, p1_hand, board, pot, depth)

        # Build actions
        actions = self._get_actions(history, pot, stacks[player], num_raises)

        node = ActionNode(
            depth=depth,
            player=player,
            actions=actions,
            info_set_key=info_key,
            pot=pot,
            stacks=stacks,
        )

        for action in actions:
            new_stacks = list(stacks)
            if action.action == Action.FOLD:
                new_hist = history + "f"
                new_pot = pot
            elif action.action == Action.CHECK:
                new_hist = history + "x"
                new_pot = pot
            elif action.action in (Action.BET, Action.RAISE, Action.ALL_IN):
                amt = min(action.amount, stacks[player])
                new_hist = history + f"b{int(amt)}"
                new_pot = pot + amt
                new_stacks[player] -= amt
                num_raises_new = num_raises + 1
            elif action.action == Action.CALL:
                amt = action.amount
                new_hist = history + "c"
                new_pot = pot + amt
                new_stacks[player] -= amt
                num_raises_new = num_raises
            else:
                new_hist = history + "?"
                new_pot = pot

            nr = num_raises + 1 if action.action in (Action.BET, Action.RAISE, Action.ALL_IN) else num_raises

            child = self._build_betting(
                p0_hand, p1_hand, board, new_pot,
                tuple(new_stacks), new_hist, nr, depth + 1,
            )
            child.parent = node
            node.children[action.label] = child

        return node

    def _is_round_complete(self, history: str) -> bool:
        """Check if current betting round is complete."""
        current = history.split("/")[-1] if "/" in history else history
        if len(current) < 2:
            return False
        # Ends on: xx (check-check), ...c (call after bet), ...f (fold)
        if current.endswith("f"):
            return True
        if current == "xx":
            return True
        # bet followed by call
        if current.endswith("c") and len(current) >= 2:
            return True
        return False

    def _get_actions(self, history: str, pot: float, player_stack: float,
                     num_raises: int) -> list[ActionInfo]:
        """Get available actions."""
        current = history.split("/")[-1] if "/" in history else history
        facing_bet = False
        bet_amount = 0.0

        # Parse last action to detect if facing a bet
        for i in range(len(current) - 1, -1, -1):
            if current[i] == 'b':
                facing_bet = True
                # Extract amount
                j = i + 1
                while j < len(current) and current[j].isdigit():
                    j += 1
                if j > i + 1:
                    bet_amount = float(current[i + 1:j])
                break
            elif current[i] in ('x', 'c', 'f'):
                break

        if facing_bet:
            actions = [
                ActionInfo(Action.FOLD, label="fold"),
                ActionInfo(Action.CALL, amount=bet_amount, label="call"),
            ]
            # Raise options
            if num_raises < MAX_RAISES and player_stack > bet_amount:
                for frac in DEFAULT_RAISE_SIZES:
                    raise_amt = bet_amount + pot * frac
                    raise_amt = min(raise_amt, player_stack)
                    label = f"raise_{int(raise_amt)}"
                    actions.append(ActionInfo(Action.RAISE, amount=raise_amt, label=label))
                # All-in
                if player_stack > raise_amt:
                    actions.append(ActionInfo(Action.ALL_IN, amount=player_stack,
                                             label=f"allin_{int(player_stack)}"))
        else:
            actions = [ActionInfo(Action.CHECK, label="check")]
            for frac in self.bet_sizes:
                bet_amt = pot * frac
                bet_amt = min(bet_amt, player_stack)
                if bet_amt > 0:
                    label = f"bet_{int(bet_amt)}"
                    actions.append(ActionInfo(Action.BET, amount=bet_amt, label=label))
            # All-in
            if player_stack > 0:
                max_bet = max((pot * f for f in self.bet_sizes), default=0)
                if player_stack > max_bet:
                    actions.append(ActionInfo(Action.ALL_IN, amount=player_stack,
                                             label=f"allin_{int(player_stack)}"))

        return actions

    def _deal_street(self, p0_hand: tuple[int, int], p1_hand: tuple[int, int],
                     board: list[int], pot: float,
                     stacks: tuple[float, float],
                     history: str, depth: int) -> GameNode:
        """Deal the next street card as a chance node.

        To keep the tree tractable, limits to MAX_RUNOUT_CARDS representative
        cards per street (spread evenly across ranks).
        """
        used = set(board) | set(p0_hand) | set(p1_hand)
        remaining = [c for c in range(NUM_CARDS) if c not in used]

        if not remaining:
            return self._showdown(p0_hand, p1_hand, board, pot, depth)

        # Subsample for tractability
        if len(remaining) > MAX_RUNOUT_CARDS:
            step = len(remaining) / MAX_RUNOUT_CARDS
            sampled = [remaining[int(i * step)] for i in range(MAX_RUNOUT_CARDS)]
            remaining = sampled

        chance = ChanceNode(depth=depth)
        prob = 1.0 / len(remaining)

        for card_int in remaining:
            new_board = board + [card_int]
            label = card_to_str(card_int)
            new_history = history + "/" + label + "/"

            child = self._build_betting(
                p0_hand, p1_hand, new_board, pot, stacks,
                new_history, 0, depth + 1,
            )
            child.parent = chance
            chance.outcomes[label] = (prob, child)

        return chance

    def _showdown(self, p0_hand: tuple[int, int], p1_hand: tuple[int, int],
                  board: list[int], pot: float, depth: int) -> TerminalNode:
        """Evaluate hands and determine winner."""
        p0_cards = list(p0_hand) + board
        p1_cards = list(p1_hand) + board

        p0_rank = evaluate_hand(p0_cards)
        p1_rank = evaluate_hand(p1_cards)

        if p0_rank > p1_rank:
            payoff = pot / 2
            payoffs = (payoff, -payoff)
        elif p1_rank > p0_rank:
            payoff = pot / 2
            payoffs = (-payoff, payoff)
        else:
            payoffs = (0.0, 0.0)

        return TerminalNode(depth=depth, payoffs=payoffs, pot=pot, is_showdown=True)

    def get_info_set_key(self, player: int, cards: Sequence[int],
                         history: str, board: Sequence[int] = ()) -> str:
        """Info set key: 'AhKh|Qs9d2c|check:bet_50' format."""
        hand_str = cards_to_str(sorted(cards, reverse=True))
        board_str = cards_to_str(board) if board else ""
        if board_str:
            return f"{hand_str}|{board_str}|{history}"
        return f"{hand_str}|{history}"
