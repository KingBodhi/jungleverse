/**
 * Card encoding, deck, and range parsing.
 *
 * Cards are encoded as integers 0-51: rank * 4 + suit.
 * Ranks: 2=0, 3=1, ..., T=8, J=9, Q=10, K=11, A=12
 * Suits: c=0, d=1, h=2, s=3
 */

export const RANKS = "23456789TJQKA";
export const SUITS = "cdhs";
export const NUM_RANKS = 13;
export const NUM_SUITS = 4;
export const NUM_CARDS = 52;

const RANK_MAP = new Map<string, number>();
for (let i = 0; i < NUM_RANKS; i++) RANK_MAP.set(RANKS[i], i);

const SUIT_MAP = new Map<string, number>();
for (let i = 0; i < NUM_SUITS; i++) SUIT_MAP.set(SUITS[i], i);

export function card(rank: number, suit: number): number {
  return rank * NUM_SUITS + suit;
}

export function cardRank(c: number): number {
  return (c / NUM_SUITS) | 0;
}

export function cardSuit(c: number): number {
  return c % NUM_SUITS;
}

export function cardFromStr(s: string): number {
  if (s.length !== 2) throw new Error(`Invalid card string: "${s}"`);
  const r = RANK_MAP.get(s[0].toUpperCase());
  const su = SUIT_MAP.get(s[1].toLowerCase());
  if (r === undefined || su === undefined)
    throw new Error(`Invalid card string: "${s}"`);
  return card(r, su);
}

export function cardToStr(c: number): string {
  return RANKS[cardRank(c)] + SUITS[cardSuit(c)];
}

export function cardsToStr(cards: number[]): string {
  return cards.map(cardToStr).join("");
}

export class Deck {
  private _cards: number[];

  constructor(exclude: number[] = []) {
    const excSet = new Set(exclude);
    this._cards = [];
    for (let c = 0; c < NUM_CARDS; c++) {
      if (!excSet.has(c)) this._cards.push(c);
    }
  }

  shuffle(): void {
    // Fisher-Yates
    for (let i = this._cards.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [this._cards[i], this._cards[j]] = [this._cards[j], this._cards[i]];
    }
  }

  deal(n = 1): number[] {
    if (n > this._cards.length)
      throw new Error(
        `Cannot deal ${n} from ${this._cards.length} remaining`,
      );
    return this._cards.splice(0, n);
  }

  get remaining(): number {
    return this._cards.length;
  }

  get cards(): number[] {
    return [...this._cards];
  }
}

// --- Range Parsing ---

const COMBO_RE =
  /^([2-9TJQKA])([2-9TJQKA])([so])?(?:-([2-9TJQKA])([2-9TJQKA])\3?)?$/;

function rankFromChar(ch: string): number {
  const r = RANK_MAP.get(ch.toUpperCase());
  if (r === undefined) throw new Error(`Invalid rank: ${ch}`);
  return r;
}

export function parseRange(rangeStr: string): [number, number][] {
  const combos: [number, number][] = [];
  if (!rangeStr.trim()) return combos;

  for (let part of rangeStr.split(",")) {
    part = part.trim();
    if (!part) continue;

    // Specific combo like "AhKs"
    if (
      part.length === 4 &&
      SUIT_MAP.has(part[1].toLowerCase()) &&
      SUIT_MAP.has(part[3].toLowerCase())
    ) {
      const c1 = cardFromStr(part.slice(0, 2));
      const c2 = cardFromStr(part.slice(2, 4));
      combos.push([Math.min(c1, c2), Math.max(c1, c2)]);
      continue;
    }

    const m = COMBO_RE.exec(part);
    if (!m) throw new Error(`Invalid range component: "${part}"`);

    const r1 = rankFromChar(m[1]);
    const r2 = rankFromChar(m[2]);
    const kind = m[3] as "s" | "o" | undefined;

    const endR1 = m[4] !== undefined ? rankFromChar(m[4]) : r1;
    const endR2 = m[5] !== undefined ? rankFromChar(m[5]) : r2;

    if (r1 === r2) {
      // Pairs: 88-55
      const lo = Math.min(r1, endR1);
      const hi = Math.max(r1, endR1);
      for (let r = lo; r <= hi; r++) {
        for (let s1 = 0; s1 < NUM_SUITS; s1++) {
          for (let s2 = s1 + 1; s2 < NUM_SUITS; s2++) {
            const c1 = card(r, s1);
            const c2 = card(r, s2);
            combos.push([Math.min(c1, c2), Math.max(c1, c2)]);
          }
        }
      }
    } else if (kind === "s") {
      // Suited
      const hiR = Math.max(r1, r2);
      const loStart = Math.min(r1, r2);
      const loEnd = Math.min(endR1, endR2);
      for (
        let loR = Math.min(loStart, loEnd);
        loR <= Math.max(loStart, loEnd);
        loR++
      ) {
        for (let s = 0; s < NUM_SUITS; s++) {
          const c1 = card(hiR, s);
          const c2 = card(loR, s);
          combos.push([Math.min(c1, c2), Math.max(c1, c2)]);
        }
      }
    } else if (kind === "o") {
      // Offsuit
      const hiR = Math.max(r1, r2);
      const loStart = Math.min(r1, r2);
      const loEnd = Math.min(endR1, endR2);
      for (
        let loR = Math.min(loStart, loEnd);
        loR <= Math.max(loStart, loEnd);
        loR++
      ) {
        for (let s1 = 0; s1 < NUM_SUITS; s1++) {
          for (let s2 = 0; s2 < NUM_SUITS; s2++) {
            if (s1 !== s2) {
              const c1 = card(hiR, s1);
              const c2 = card(loR, s2);
              combos.push([Math.min(c1, c2), Math.max(c1, c2)]);
            }
          }
        }
      }
    } else {
      // No suit specifier — all combos
      const hiR = Math.max(r1, r2);
      const loStart = Math.min(r1, r2);
      const loEnd = Math.min(endR1, endR2);
      for (
        let loR = Math.min(loStart, loEnd);
        loR <= Math.max(loStart, loEnd);
        loR++
      ) {
        for (let s1 = 0; s1 < NUM_SUITS; s1++) {
          for (let s2 = 0; s2 < NUM_SUITS; s2++) {
            const c1 = card(hiR, s1);
            const c2 = card(loR, s2);
            if (c1 !== c2) {
              combos.push([Math.min(c1, c2), Math.max(c1, c2)]);
            }
          }
        }
      }
    }
  }

  // Deduplicate preserving order
  const seen = new Set<string>();
  const result: [number, number][] = [];
  for (const combo of combos) {
    const key = `${combo[0]},${combo[1]}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(combo);
    }
  }
  return result;
}
