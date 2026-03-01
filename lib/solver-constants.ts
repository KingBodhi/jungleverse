// Solver constants — action colors, rank/suit data, helpers

/** GTO Wizard–convention action color map */
export const ACTION_COLORS: Record<string, string> = {
  fold: "#3b82f6",       // blue-500
  check: "#22c55e",      // green-500
  call: "#22c55e",       // green-500
  bet: "#ef4444",        // red-500
  raise: "#f97316",      // orange-500
  allin: "#a855f7",      // purple-500
  "all-in": "#a855f7",
};

/** Tailwind-friendly background classes for action buttons / legends */
export const ACTION_BG_CLASSES: Record<string, string> = {
  fold: "bg-blue-500",
  check: "bg-green-500",
  call: "bg-green-500",
  bet: "bg-red-500",
  raise: "bg-orange-500",
  allin: "bg-purple-500",
  "all-in": "bg-purple-500",
};

export const SUIT_COLORS: Record<string, string> = {
  h: "#ef4444", // red
  d: "#3b82f6", // blue
  c: "#22c55e", // green
  s: "#94a3b8", // slate
};

export const SUIT_SYMBOLS: Record<string, string> = {
  h: "\u2665",
  d: "\u2666",
  c: "\u2663",
  s: "\u2660",
};

export const RANKS = [
  "A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2",
] as const;

export const SUITS = ["h", "d", "c", "s"] as const;

/** Build a 13x13 range matrix: row = higher rank, col = lower rank.
 *  Upper-left triangle = suited, lower-right = offsuit, diagonal = pairs. */
export function getRangeGridLabels(): string[][] {
  return RANKS.map((r, ri) =>
    RANKS.map((c, ci) => {
      if (ri === ci) return `${r}${c}`;
      if (ri < ci) return `${r}${c}s`;
      return `${RANKS[ci]}${RANKS[ri]}o`;
    })
  );
}

/** Map a raw action label (from the API) to a canonical color key.
 *  Handles: check, bet, bet_100, raise_150, allin_200, fold, call, bet_2, bet_4 */
export function classifyAction(label: string): string {
  const lower = label.toLowerCase();
  if (lower === "fold") return "fold";
  if (lower === "check") return "check";
  if (lower === "call") return "call";
  if (lower.startsWith("allin") || lower.startsWith("all-in") || lower.startsWith("all_in") || lower === "jam")
    return "allin";
  if (lower.startsWith("raise") || lower.startsWith("3bet") || lower.startsWith("4bet"))
    return "raise";
  if (lower.startsWith("bet")) return "bet";
  return "bet"; // fallback
}

/** Format an action label for display.
 *  "bet_100" → "Bet 100", "allin_500" → "All-in 500", "check" → "Check" */
export function formatAction(label: string): string {
  const lower = label.toLowerCase();
  if (lower === "check") return "Check";
  if (lower === "fold") return "Fold";
  if (lower === "call") return "Call";

  // Handle parameterized actions: bet_100, raise_150, allin_200, bet_2, bet_4
  const match = lower.match(/^(bet|raise|allin|all[_-]in)[_]?(\d+\.?\d*)?$/);
  if (match) {
    const base = match[1];
    const amount = match[2];
    const labels: Record<string, string> = {
      bet: "Bet",
      raise: "Raise",
      allin: "All-in",
      "all_in": "All-in",
      "all-in": "All-in",
    };
    const pretty = labels[base] ?? base.charAt(0).toUpperCase() + base.slice(1);
    return amount ? `${pretty} ${amount}` : pretty;
  }

  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Convert a specific hand like "AhKh" → hand class "AKs" */
export function handToClass(hand: string): string {
  if (hand.length < 4) return hand;

  const r1 = hand[0].toUpperCase();
  const s1 = hand[1].toLowerCase();
  const r2 = hand[2].toUpperCase();
  const s2 = hand[3].toLowerCase();

  const ri1 = RANKS.indexOf(r1 as typeof RANKS[number]);
  const ri2 = RANKS.indexOf(r2 as typeof RANKS[number]);

  if (ri1 === -1 || ri2 === -1) return hand;

  const [high, low] = ri1 <= ri2 ? [r1, r2] : [r2, r1];

  if (r1 === r2) return `${high}${low}`;
  if (s1 === s2) return `${high}${low}s`;
  return `${high}${low}o`;
}

/** Render card string "Ah" as rank + colored suit, returns {rank, suit, color} */
export function parseCard(card: string): { rank: string; suit: string; symbol: string; color: string } | null {
  if (card.length < 2) return null;
  const rank = card[0].toUpperCase();
  const suit = card[1].toLowerCase();
  return {
    rank,
    suit,
    symbol: SUIT_SYMBOLS[suit] ?? suit,
    color: SUIT_COLORS[suit] ?? "#94a3b8",
  };
}

/** Parse an info set key to extract the player acting.
 *  Kuhn: "K:" → player from history length (empty="" → P0, "b" → P1, "c" → P1, "cb" → P0)
 *  Leduc/NLHE: uses action history portion similarly.
 *  Returns 0 or 1. */
export function inferPlayer(key: string, variant: string): 0 | 1 {
  if (variant === "kuhn") {
    // Format: "card:history" — P0 acts on even-length history, P1 on odd
    const history = key.split(":")[1] ?? "";
    return (history.length % 2 === 0 ? 0 : 1) as 0 | 1;
  }
  if (variant === "leduc") {
    // Format: "card|board|history" — count total action chars across streets
    const parts = key.split("|");
    const history = parts[parts.length - 1] ?? "";
    // Remove street separators, count actions
    const actions = history.replace(/\//g, "");
    return (actions.length % 2 === 0 ? 0 : 1) as 0 | 1;
  }
  // NLHE: "hand|board|history" — count action tokens
  const parts = key.split("|");
  const history = parts[parts.length - 1] ?? "";
  // Count action tokens: x, c, f, or b followed by digits
  const tokens = history.match(/[xcf]|b\d*/g) ?? [];
  return (tokens.length % 2 === 0 ? 0 : 1) as 0 | 1;
}

export const DEFAULT_NLHE_CONFIG = {
  board: "Qs9d2c",
  range_p0: "AA,KK,QQ,JJ,TT,99,88,77,66,AKs,AQs,AJs,ATs,KQs,KJs,AKo,AQo",
  range_p1: "AA,KK,QQ,JJ,TT,99,88,77,AKs,AQs,AJs,KQs,AKo",
  pot: 100,
  stack: 200,
  bet_sizes: [0.33, 0.5, 0.75, 1.0],
  num_iterations: 1000,
};
