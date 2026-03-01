"""Hand strength evaluation for poker.

Evaluates 5-7 card hands and returns a comparable hand rank.
Higher rank = stronger hand.

Hand categories (high byte of rank):
  8: Straight Flush
  7: Four of a Kind
  6: Full House
  5: Flush
  4: Straight
  3: Three of a Kind
  2: Two Pair
  1: One Pair
  0: High Card
"""

from __future__ import annotations

from itertools import combinations
from typing import Sequence

from .cards import card_rank, card_suit, NUM_RANKS

# Category values (shifted to high bits for easy comparison)
STRAIGHT_FLUSH = 8 << 20
FOUR_OF_A_KIND = 7 << 20
FULL_HOUSE = 6 << 20
FLUSH = 5 << 20
STRAIGHT = 4 << 20
THREE_OF_A_KIND = 3 << 20
TWO_PAIR = 2 << 20
ONE_PAIR = 1 << 20
HIGH_CARD = 0 << 20


def _rank_counts(ranks: list[int]) -> tuple[list[tuple[int, int]], list[int]]:
    """Count occurrences of each rank, return sorted (count, rank) pairs and kickers."""
    counts: dict[int, int] = {}
    for r in ranks:
        counts[r] = counts.get(r, 0) + 1
    # Sort by count desc, then rank desc
    pairs = sorted(counts.items(), key=lambda x: (x[1], x[0]), reverse=True)
    return [(count, rank) for rank, count in pairs], sorted(ranks, reverse=True)


def _check_straight(ranks: list[int]) -> int | None:
    """Check for a straight, return high card rank or None.
    Handles A-2-3-4-5 (wheel) as special case.
    """
    unique = sorted(set(ranks), reverse=True)
    if len(unique) < 5:
        return None

    # Check regular straights
    for i in range(len(unique) - 4):
        if unique[i] - unique[i + 4] == 4:
            return unique[i]

    # Check wheel (A-2-3-4-5): A=12, 5=3, 4=2, 3=1, 2=0
    if set(unique) >= {12, 0, 1, 2, 3}:
        return 3  # 5-high straight

    return None


def evaluate_5(cards: Sequence[int]) -> int:
    """Evaluate exactly 5 cards, return comparable hand rank integer."""
    assert len(cards) == 5

    ranks = [card_rank(c) for c in cards]
    suits = [card_suit(c) for c in cards]

    is_flush = len(set(suits)) == 1
    straight_high = _check_straight(ranks)

    count_pairs, sorted_ranks = _rank_counts(ranks)

    if is_flush and straight_high is not None:
        return STRAIGHT_FLUSH | (straight_high << 16)

    if count_pairs[0][0] == 4:
        # Four of a kind
        quad_rank = count_pairs[0][1]
        kicker = count_pairs[1][1]
        return FOUR_OF_A_KIND | (quad_rank << 16) | (kicker << 12)

    if count_pairs[0][0] == 3 and count_pairs[1][0] == 2:
        # Full house
        trip_rank = count_pairs[0][1]
        pair_rank = count_pairs[1][1]
        return FULL_HOUSE | (trip_rank << 16) | (pair_rank << 12)

    if is_flush:
        val = FLUSH
        for i, r in enumerate(sorted(ranks, reverse=True)):
            val |= r << (16 - i * 4)
        return val

    if straight_high is not None:
        return STRAIGHT | (straight_high << 16)

    if count_pairs[0][0] == 3:
        # Three of a kind
        trip_rank = count_pairs[0][1]
        kickers = sorted([r for r in ranks if r != trip_rank], reverse=True)
        return THREE_OF_A_KIND | (trip_rank << 16) | (kickers[0] << 12) | (kickers[1] << 8)

    if count_pairs[0][0] == 2 and count_pairs[1][0] == 2:
        # Two pair
        hi_pair = max(count_pairs[0][1], count_pairs[1][1])
        lo_pair = min(count_pairs[0][1], count_pairs[1][1])
        kicker = count_pairs[2][1]
        return TWO_PAIR | (hi_pair << 16) | (lo_pair << 12) | (kicker << 8)

    if count_pairs[0][0] == 2:
        # One pair
        pair_rank = count_pairs[0][1]
        kickers = sorted([r for r in ranks if r != pair_rank], reverse=True)
        val = ONE_PAIR | (pair_rank << 16)
        for i, k in enumerate(kickers[:3]):
            val |= k << (12 - i * 4)
        return val

    # High card
    val = HIGH_CARD
    for i, r in enumerate(sorted(ranks, reverse=True)):
        val |= r << (16 - i * 4)
    return val


def evaluate_hand(cards: Sequence[int]) -> int:
    """Evaluate 5-7 cards, returning the best 5-card hand rank.

    For 5 cards, evaluates directly.
    For 6-7 cards, evaluates all C(n,5) combinations.
    """
    n = len(cards)
    if n == 5:
        return evaluate_5(cards)
    if n < 5 or n > 7:
        raise ValueError(f"Expected 5-7 cards, got {n}")

    best = -1
    for combo in combinations(cards, 5):
        rank = evaluate_5(combo)
        if rank > best:
            best = rank
    return best


def hand_category_name(rank: int) -> str:
    """Get human-readable category name from hand rank."""
    category = rank >> 20
    names = {
        0: "High Card",
        1: "One Pair",
        2: "Two Pair",
        3: "Three of a Kind",
        4: "Straight",
        5: "Flush",
        6: "Full House",
        7: "Four of a Kind",
        8: "Straight Flush",
    }
    return names.get(category, "Unknown")


def compare_hands(hand1: Sequence[int], hand2: Sequence[int]) -> int:
    """Compare two hands. Returns 1 if hand1 wins, -1 if hand2 wins, 0 for tie."""
    r1 = evaluate_hand(hand1)
    r2 = evaluate_hand(hand2)
    if r1 > r2:
        return 1
    elif r1 < r2:
        return -1
    return 0
