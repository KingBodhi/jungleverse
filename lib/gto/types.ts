export type Position = "UTG" | "HJ" | "CO" | "BTN" | "SB" | "BB";

export type Scenario =
  | "rfi"         // Raise First In (open from position)
  | "3bet"        // 3-bet vs an open
  | "vs_3bet"     // Response to 3-bet (caller)
  | "bb_defense"  // BB calling/3-betting vs steal
  | "sb_vs_bb";   // SB vs BB (heads up)

export interface HandFrequencies {
  raise?: number;  // 0..1 — includes open-raise, 3-bet, 4-bet
  call?: number;   // 0..1
  fold?: number;   // 0..1 (implicit: 1 - raise - call)
  limp?: number;   // 0..1 — SB limp strategy
}

export interface PreflopChart {
  position: Position;
  vsPosition?: Position;  // opponent position for 3-bet/defense charts
  scenario: Scenario;
  stackDepth: number;     // effective stack in BB
  /** hand class -> action frequencies (e.g. "AKs" -> { raise: 1.0 }) */
  hands: Record<string, HandFrequencies>;
}

export interface PreflopQuery {
  position: Position;
  vsPosition?: Position;
  scenario: Scenario;
  stackDepth?: number;
}
