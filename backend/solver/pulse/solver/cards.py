"""Card encoding, deck, and range parsing.

Cards are encoded as integers 0-51: rank * 4 + suit.
Ranks: 2=0, 3=1, ..., T=8, J=9, Q=10, K=11, A=12
Suits: c=0, d=1, h=2, s=3
"""

from __future__ import annotations

import random
import re
from typing import Sequence

RANKS = "23456789TJQKA"
SUITS = "cdhs"
NUM_RANKS = 13
NUM_SUITS = 4
NUM_CARDS = 52

RANK_NAMES = {i: RANKS[i] for i in range(NUM_RANKS)}
SUIT_NAMES = {i: SUITS[i] for i in range(NUM_SUITS)}

# Precomputed maps
_RANK_MAP = {c: i for i, c in enumerate(RANKS)}
_SUIT_MAP = {c: i for i, c in enumerate(SUITS)}


def card(rank: int, suit: int) -> int:
    """Create card int from rank (0-12) and suit (0-3)."""
    return rank * NUM_SUITS + suit


def card_rank(c: int) -> int:
    """Get rank (0-12) from card int."""
    return c // NUM_SUITS


def card_suit(c: int) -> int:
    """Get suit (0-3) from card int."""
    return c % NUM_SUITS


def card_from_str(s: str) -> int:
    """Parse 'Ah', 'Ks', '2c' etc. to card int."""
    if len(s) != 2:
        raise ValueError(f"Invalid card string: {s!r}")
    r = _RANK_MAP.get(s[0].upper())
    su = _SUIT_MAP.get(s[1].lower())
    if r is None or su is None:
        raise ValueError(f"Invalid card string: {s!r}")
    return card(r, su)


def card_to_str(c: int) -> str:
    """Convert card int to string like 'Ah'."""
    return RANK_NAMES[card_rank(c)] + SUIT_NAMES[card_suit(c)]


def cards_to_str(cards: Sequence[int]) -> str:
    """Convert list of card ints to 'AhKs2c' style string."""
    return "".join(card_to_str(c) for c in cards)


class Deck:
    """Standard 52-card deck with deal/shuffle support."""

    def __init__(self, exclude: Sequence[int] = ()):
        self._cards = [c for c in range(NUM_CARDS) if c not in exclude]

    def shuffle(self, rng: random.Random | None = None) -> None:
        if rng:
            rng.shuffle(self._cards)
        else:
            random.shuffle(self._cards)

    def deal(self, n: int = 1) -> list[int]:
        if n > len(self._cards):
            raise ValueError(f"Cannot deal {n} from {len(self._cards)} remaining")
        dealt = self._cards[:n]
        self._cards = self._cards[n:]
        return dealt

    @property
    def remaining(self) -> int:
        return len(self._cards)

    @property
    def cards(self) -> list[int]:
        return list(self._cards)


# --- Range Parsing ---

# Regex for individual combos: AA, AKs, AKo, A5s-A2s, 77-55, etc.
_COMBO_RE = re.compile(
    r"^([2-9TJQKA])([2-9TJQKA])([so])?(?:-([2-9TJQKA])([2-9TJQKA])\3?)?$"
)


def _rank(ch: str) -> int:
    return _RANK_MAP[ch.upper()]


def parse_range(range_str: str) -> list[tuple[int, int]]:
    """Parse a poker range string into a list of (card1, card2) combos.

    Supports: 'AA', 'AKs', 'AKo', 'QJs-Q9s', '88-55', 'AhKh' (specific).
    Returns sorted list of card pairs (lower card first).
    """
    combos: list[tuple[int, int]] = []
    if not range_str.strip():
        return combos

    for part in range_str.split(","):
        part = part.strip()
        if not part:
            continue

        # Specific combo like "AhKs"
        if len(part) == 4 and part[1].lower() in SUITS and part[3].lower() in SUITS:
            c1 = card_from_str(part[:2])
            c2 = card_from_str(part[2:])
            combos.append((min(c1, c2), max(c1, c2)))
            continue

        m = _COMBO_RE.match(part)
        if not m:
            raise ValueError(f"Invalid range component: {part!r}")

        r1, r2, kind = _rank(m.group(1)), _rank(m.group(2)), m.group(3)

        # Determine end ranks for dash ranges
        if m.group(4) is not None:
            end_r1, end_r2 = _rank(m.group(4)), _rank(m.group(5))
        else:
            end_r1, end_r2 = r1, r2

        if r1 == r2:
            # Pairs: 88-55
            lo, hi = min(r1, end_r1), max(r1, end_r1)
            for r in range(lo, hi + 1):
                for s1 in range(NUM_SUITS):
                    for s2 in range(s1 + 1, NUM_SUITS):
                        c1, c2 = card(r, s1), card(r, s2)
                        combos.append((min(c1, c2), max(c1, c2)))
        elif kind == "s":
            # Suited: AKs or QJs-Q9s
            hi_r = max(r1, r2)
            lo_start = min(r1, r2)
            lo_end = min(end_r1, end_r2)
            for lo_r in range(min(lo_start, lo_end), max(lo_start, lo_end) + 1):
                for s in range(NUM_SUITS):
                    c1, c2 = card(hi_r, s), card(lo_r, s)
                    combos.append((min(c1, c2), max(c1, c2)))
        elif kind == "o":
            # Offsuit: AKo
            hi_r = max(r1, r2)
            lo_start = min(r1, r2)
            lo_end = min(end_r1, end_r2)
            for lo_r in range(min(lo_start, lo_end), max(lo_start, lo_end) + 1):
                for s1 in range(NUM_SUITS):
                    for s2 in range(NUM_SUITS):
                        if s1 != s2:
                            c1, c2 = card(hi_r, s1), card(lo_r, s2)
                            combos.append((min(c1, c2), max(c1, c2)))
        else:
            # No suit specifier — all combos (suited + offsuit)
            hi_r = max(r1, r2)
            lo_start = min(r1, r2)
            lo_end = min(end_r1, end_r2)
            for lo_r in range(min(lo_start, lo_end), max(lo_start, lo_end) + 1):
                for s1 in range(NUM_SUITS):
                    for s2 in range(NUM_SUITS):
                        c1, c2 = card(hi_r, s1), card(lo_r, s2)
                        if c1 != c2:
                            combos.append((min(c1, c2), max(c1, c2)))

    # Deduplicate preserving order
    seen: set[tuple[int, int]] = set()
    result: list[tuple[int, int]] = []
    for combo in combos:
        if combo not in seen:
            seen.add(combo)
            result.append(combo)
    return result
