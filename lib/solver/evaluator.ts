/**
 * Hand strength evaluation for poker.
 *
 * Evaluates 5-7 card hands and returns a comparable hand rank.
 * Higher rank = stronger hand.
 *
 * Hand categories (high byte of rank):
 *   8: Straight Flush
 *   7: Four of a Kind
 *   6: Full House
 *   5: Flush
 *   4: Straight
 *   3: Three of a Kind
 *   2: Two Pair
 *   1: One Pair
 *   0: High Card
 */

import { cardRank, cardSuit } from "./cards";

const STRAIGHT_FLUSH = 8 << 20;
const FOUR_OF_A_KIND = 7 << 20;
const FULL_HOUSE = 6 << 20;
const FLUSH = 5 << 20;
const STRAIGHT = 4 << 20;
const THREE_OF_A_KIND = 3 << 20;
const TWO_PAIR = 2 << 20;
const ONE_PAIR = 1 << 20;
const HIGH_CARD = 0;

function rankCounts(
  ranks: number[],
): { pairs: [number, number][]; sorted: number[] } {
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  // Sort by count desc, then rank desc
  const pairs = Array.from(counts.entries())
    .map(([rank, count]) => [count, rank] as [number, number])
    .sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const sorted = [...ranks].sort((a, b) => b - a);
  return { pairs, sorted };
}

function checkStraight(ranks: number[]): number | null {
  const unique = [...new Set(ranks)].sort((a, b) => b - a);
  if (unique.length < 5) return null;

  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i] - unique[i + 4] === 4) return unique[i];
  }

  // Check wheel (A-2-3-4-5)
  const s = new Set(unique);
  if (s.has(12) && s.has(0) && s.has(1) && s.has(2) && s.has(3)) return 3;

  return null;
}

function evaluate5(cards: number[]): number {
  const ranks = cards.map(cardRank);
  const suits = cards.map(cardSuit);

  const isFlush = new Set(suits).size === 1;
  const straightHigh = checkStraight(ranks);

  const { pairs, sorted } = rankCounts(ranks);

  if (isFlush && straightHigh !== null) {
    return STRAIGHT_FLUSH | (straightHigh << 16);
  }

  if (pairs[0][0] === 4) {
    const quadRank = pairs[0][1];
    const kicker = pairs[1][1];
    return FOUR_OF_A_KIND | (quadRank << 16) | (kicker << 12);
  }

  if (pairs[0][0] === 3 && pairs[1][0] === 2) {
    const tripRank = pairs[0][1];
    const pairRank = pairs[1][1];
    return FULL_HOUSE | (tripRank << 16) | (pairRank << 12);
  }

  if (isFlush) {
    let val = FLUSH;
    const desc = sorted;
    for (let i = 0; i < desc.length; i++) {
      val |= desc[i] << (16 - i * 4);
    }
    return val;
  }

  if (straightHigh !== null) {
    return STRAIGHT | (straightHigh << 16);
  }

  if (pairs[0][0] === 3) {
    const tripRank = pairs[0][1];
    const kickers = ranks
      .filter((r) => r !== tripRank)
      .sort((a, b) => b - a);
    return (
      THREE_OF_A_KIND |
      (tripRank << 16) |
      (kickers[0] << 12) |
      (kickers[1] << 8)
    );
  }

  if (pairs[0][0] === 2 && pairs[1][0] === 2) {
    const hiPair = Math.max(pairs[0][1], pairs[1][1]);
    const loPair = Math.min(pairs[0][1], pairs[1][1]);
    const kicker = pairs[2][1];
    return TWO_PAIR | (hiPair << 16) | (loPair << 12) | (kicker << 8);
  }

  if (pairs[0][0] === 2) {
    const pairRank = pairs[0][1];
    const kickers = ranks
      .filter((r) => r !== pairRank)
      .sort((a, b) => b - a);
    let val = ONE_PAIR | (pairRank << 16);
    for (let i = 0; i < Math.min(kickers.length, 3); i++) {
      val |= kickers[i] << (12 - i * 4);
    }
    return val;
  }

  // High card
  let val = HIGH_CARD;
  for (let i = 0; i < sorted.length; i++) {
    val |= sorted[i] << (16 - i * 4);
  }
  return val;
}

/** Generator for C(n,k) combinations of indices into an array. */
function* combinations<T>(arr: T[], k: number): Generator<T[]> {
  if (k === 0) {
    yield [];
    return;
  }
  for (let i = 0; i <= arr.length - k; i++) {
    for (const rest of combinations(arr.slice(i + 1), k - 1)) {
      yield [arr[i], ...rest];
    }
  }
}

/**
 * Evaluate 5-7 cards, returning the best 5-card hand rank.
 */
export function evaluateHand(cards: number[]): number {
  const n = cards.length;
  if (n === 5) return evaluate5(cards);
  if (n < 5 || n > 7) throw new Error(`Expected 5-7 cards, got ${n}`);

  let best = -1;
  for (const combo of combinations(cards, 5)) {
    const rank = evaluate5(combo);
    if (rank > best) best = rank;
  }
  return best;
}

const CATEGORY_NAMES: Record<number, string> = {
  0: "High Card",
  1: "One Pair",
  2: "Two Pair",
  3: "Three of a Kind",
  4: "Straight",
  5: "Flush",
  6: "Full House",
  7: "Four of a Kind",
  8: "Straight Flush",
};

export function handCategoryName(rank: number): string {
  return CATEGORY_NAMES[rank >>> 20] ?? "Unknown";
}

export function compareHands(hand1: number[], hand2: number[]): number {
  const r1 = evaluateHand(hand1);
  const r2 = evaluateHand(hand2);
  if (r1 > r2) return 1;
  if (r1 < r2) return -1;
  return 0;
}
