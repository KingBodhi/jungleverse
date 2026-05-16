/**
 * GTO preflop charts for 6-max NLHE at 100bb effective stacks.
 *
 * Frequencies approximate standard solver outputs (GTO Wizard / PioSolver).
 * Values represent raise/call probabilities; fold = 1 - raise - call.
 * Mixed strategies are expressed as fractional frequencies.
 *
 * Positions (6-max, in order): UTG, HJ, CO, BTN, SB, BB
 */

import type { PreflopChart, Position } from "./types";

// ---------------------------------------------------------------------------
// RFI (Raise First In) Charts — no limpers, all folds to hero
// ---------------------------------------------------------------------------

const UTG_RFI: PreflopChart = {
  position: "UTG",
  scenario: "rfi",
  stackDepth: 100,
  hands: {
    // Pairs
    AA: { raise: 1.00 }, KK: { raise: 1.00 }, QQ: { raise: 1.00 },
    JJ: { raise: 1.00 }, TT: { raise: 1.00 }, "99": { raise: 1.00 },
    "88": { raise: 1.00 }, "77": { raise: 1.00 }, "66": { raise: 0.55 },
    "55": { raise: 0.10 }, "44": { raise: 0.00 }, "33": { raise: 0.00 },
    "22": { raise: 0.00 },
    // Suited Aces
    AKs: { raise: 1.00 }, AQs: { raise: 1.00 }, AJs: { raise: 1.00 },
    ATs: { raise: 1.00 }, A9s: { raise: 0.55 }, A8s: { raise: 0.25 },
    A7s: { raise: 0.20 }, A6s: { raise: 0.15 }, A5s: { raise: 0.35 },
    A4s: { raise: 0.10 }, A3s: { raise: 0.10 }, A2s: { raise: 0.10 },
    // Offsuit Aces
    AKo: { raise: 1.00 }, AQo: { raise: 1.00 }, AJo: { raise: 1.00 },
    ATo: { raise: 0.55 }, A9o: { raise: 0.10 }, A8o: { raise: 0.00 },
    A7o: { raise: 0.00 }, A6o: { raise: 0.00 }, A5o: { raise: 0.00 },
    A4o: { raise: 0.00 }, A3o: { raise: 0.00 }, A2o: { raise: 0.00 },
    // Suited Kings
    KQs: { raise: 1.00 }, KJs: { raise: 1.00 }, KTs: { raise: 1.00 },
    K9s: { raise: 0.30 }, K8s: { raise: 0.00 }, K7s: { raise: 0.00 },
    K6s: { raise: 0.00 }, K5s: { raise: 0.00 }, K4s: { raise: 0.00 },
    K3s: { raise: 0.00 }, K2s: { raise: 0.00 },
    // Offsuit Kings
    KQo: { raise: 1.00 }, KJo: { raise: 1.00 }, KTo: { raise: 0.30 },
    K9o: { raise: 0.00 }, K8o: { raise: 0.00 }, K7o: { raise: 0.00 },
    K6o: { raise: 0.00 }, K5o: { raise: 0.00 }, K4o: { raise: 0.00 },
    K3o: { raise: 0.00 }, K2o: { raise: 0.00 },
    // Suited Queens
    QJs: { raise: 1.00 }, QTs: { raise: 1.00 }, Q9s: { raise: 0.30 },
    Q8s: { raise: 0.00 }, Q7s: { raise: 0.00 }, Q6s: { raise: 0.00 },
    Q5s: { raise: 0.00 }, Q4s: { raise: 0.00 }, Q3s: { raise: 0.00 },
    Q2s: { raise: 0.00 },
    // Offsuit Queens
    QJo: { raise: 0.60 }, QTo: { raise: 0.00 }, Q9o: { raise: 0.00 },
    Q8o: { raise: 0.00 }, Q7o: { raise: 0.00 }, Q6o: { raise: 0.00 },
    Q5o: { raise: 0.00 }, Q4o: { raise: 0.00 }, Q3o: { raise: 0.00 },
    Q2o: { raise: 0.00 },
    // Suited Jacks
    JTs: { raise: 1.00 }, J9s: { raise: 0.35 }, J8s: { raise: 0.00 },
    J7s: { raise: 0.00 }, J6s: { raise: 0.00 }, J5s: { raise: 0.00 },
    J4s: { raise: 0.00 }, J3s: { raise: 0.00 }, J2s: { raise: 0.00 },
    // Offsuit Jacks
    JTo: { raise: 0.00 }, J9o: { raise: 0.00 }, J8o: { raise: 0.00 },
    // Suited Tens
    T9s: { raise: 1.00 }, T8s: { raise: 0.30 }, T7s: { raise: 0.00 },
    T6s: { raise: 0.00 }, T5s: { raise: 0.00 }, T4s: { raise: 0.00 },
    T3s: { raise: 0.00 }, T2s: { raise: 0.00 },
    // Offsuit Tens
    T9o: { raise: 0.00 }, T8o: { raise: 0.00 },
    // Suited Nines
    "98s": { raise: 0.55 }, "97s": { raise: 0.00 }, "96s": { raise: 0.00 },
    // Suited Eights and below
    "87s": { raise: 0.00 }, "76s": { raise: 0.00 }, "65s": { raise: 0.00 },
  },
};

const HJ_RFI: PreflopChart = {
  position: "HJ",
  scenario: "rfi",
  stackDepth: 100,
  hands: {
    // Pairs
    AA: { raise: 1.00 }, KK: { raise: 1.00 }, QQ: { raise: 1.00 },
    JJ: { raise: 1.00 }, TT: { raise: 1.00 }, "99": { raise: 1.00 },
    "88": { raise: 1.00 }, "77": { raise: 1.00 }, "66": { raise: 0.80 },
    "55": { raise: 0.35 }, "44": { raise: 0.10 }, "33": { raise: 0.00 },
    "22": { raise: 0.00 },
    // Suited Aces
    AKs: { raise: 1.00 }, AQs: { raise: 1.00 }, AJs: { raise: 1.00 },
    ATs: { raise: 1.00 }, A9s: { raise: 1.00 }, A8s: { raise: 0.80 },
    A7s: { raise: 0.60 }, A6s: { raise: 0.45 }, A5s: { raise: 0.65 },
    A4s: { raise: 0.35 }, A3s: { raise: 0.25 }, A2s: { raise: 0.20 },
    // Offsuit Aces
    AKo: { raise: 1.00 }, AQo: { raise: 1.00 }, AJo: { raise: 1.00 },
    ATo: { raise: 1.00 }, A9o: { raise: 0.55 }, A8o: { raise: 0.15 },
    A7o: { raise: 0.00 }, A6o: { raise: 0.00 }, A5o: { raise: 0.00 },
    A4o: { raise: 0.00 }, A3o: { raise: 0.00 }, A2o: { raise: 0.00 },
    // Suited Kings
    KQs: { raise: 1.00 }, KJs: { raise: 1.00 }, KTs: { raise: 1.00 },
    K9s: { raise: 0.85 }, K8s: { raise: 0.50 }, K7s: { raise: 0.30 },
    K6s: { raise: 0.15 }, K5s: { raise: 0.10 }, K4s: { raise: 0.00 },
    K3s: { raise: 0.00 }, K2s: { raise: 0.00 },
    // Offsuit Kings
    KQo: { raise: 1.00 }, KJo: { raise: 1.00 }, KTo: { raise: 0.80 },
    K9o: { raise: 0.25 }, K8o: { raise: 0.00 }, K7o: { raise: 0.00 },
    K6o: { raise: 0.00 }, K5o: { raise: 0.00 }, K4o: { raise: 0.00 },
    K3o: { raise: 0.00 }, K2o: { raise: 0.00 },
    // Suited Queens
    QJs: { raise: 1.00 }, QTs: { raise: 1.00 }, Q9s: { raise: 0.80 },
    Q8s: { raise: 0.40 }, Q7s: { raise: 0.15 }, Q6s: { raise: 0.00 },
    Q5s: { raise: 0.00 }, Q4s: { raise: 0.00 }, Q3s: { raise: 0.00 },
    Q2s: { raise: 0.00 },
    // Offsuit Queens
    QJo: { raise: 1.00 }, QTo: { raise: 0.55 }, Q9o: { raise: 0.10 },
    Q8o: { raise: 0.00 }, Q7o: { raise: 0.00 }, Q6o: { raise: 0.00 },
    Q5o: { raise: 0.00 }, Q4o: { raise: 0.00 }, Q3o: { raise: 0.00 },
    Q2o: { raise: 0.00 },
    // Suited Jacks
    JTs: { raise: 1.00 }, J9s: { raise: 0.85 }, J8s: { raise: 0.40 },
    J7s: { raise: 0.15 }, J6s: { raise: 0.00 }, J5s: { raise: 0.00 },
    J4s: { raise: 0.00 }, J3s: { raise: 0.00 }, J2s: { raise: 0.00 },
    // Offsuit Jacks
    JTo: { raise: 0.35 }, J9o: { raise: 0.00 }, J8o: { raise: 0.00 },
    // Suited Tens
    T9s: { raise: 1.00 }, T8s: { raise: 0.75 }, T7s: { raise: 0.25 },
    T6s: { raise: 0.00 }, T5s: { raise: 0.00 },
    // Offsuit Tens
    T9o: { raise: 0.10 }, T8o: { raise: 0.00 },
    // Suited Nines
    "98s": { raise: 0.90 }, "97s": { raise: 0.45 }, "96s": { raise: 0.10 },
    // Suited Eights
    "87s": { raise: 0.60 }, "86s": { raise: 0.15 }, "85s": { raise: 0.00 },
    // Suited Sevens
    "76s": { raise: 0.40 }, "75s": { raise: 0.00 },
    // Suited Sixes
    "65s": { raise: 0.20 }, "64s": { raise: 0.00 },
  },
};

const CO_RFI: PreflopChart = {
  position: "CO",
  scenario: "rfi",
  stackDepth: 100,
  hands: {
    // Pairs
    AA: { raise: 1.00 }, KK: { raise: 1.00 }, QQ: { raise: 1.00 },
    JJ: { raise: 1.00 }, TT: { raise: 1.00 }, "99": { raise: 1.00 },
    "88": { raise: 1.00 }, "77": { raise: 1.00 }, "66": { raise: 1.00 },
    "55": { raise: 0.70 }, "44": { raise: 0.40 }, "33": { raise: 0.20 },
    "22": { raise: 0.15 },
    // Suited Aces
    AKs: { raise: 1.00 }, AQs: { raise: 1.00 }, AJs: { raise: 1.00 },
    ATs: { raise: 1.00 }, A9s: { raise: 1.00 }, A8s: { raise: 1.00 },
    A7s: { raise: 0.90 }, A6s: { raise: 0.80 }, A5s: { raise: 0.95 },
    A4s: { raise: 0.75 }, A3s: { raise: 0.65 }, A2s: { raise: 0.55 },
    // Offsuit Aces
    AKo: { raise: 1.00 }, AQo: { raise: 1.00 }, AJo: { raise: 1.00 },
    ATo: { raise: 1.00 }, A9o: { raise: 0.90 }, A8o: { raise: 0.55 },
    A7o: { raise: 0.30 }, A6o: { raise: 0.15 }, A5o: { raise: 0.20 },
    A4o: { raise: 0.10 }, A3o: { raise: 0.00 }, A2o: { raise: 0.00 },
    // Suited Kings
    KQs: { raise: 1.00 }, KJs: { raise: 1.00 }, KTs: { raise: 1.00 },
    K9s: { raise: 1.00 }, K8s: { raise: 0.85 }, K7s: { raise: 0.65 },
    K6s: { raise: 0.50 }, K5s: { raise: 0.40 }, K4s: { raise: 0.25 },
    K3s: { raise: 0.15 }, K2s: { raise: 0.10 },
    // Offsuit Kings
    KQo: { raise: 1.00 }, KJo: { raise: 1.00 }, KTo: { raise: 1.00 },
    K9o: { raise: 0.65 }, K8o: { raise: 0.25 }, K7o: { raise: 0.10 },
    K6o: { raise: 0.00 }, K5o: { raise: 0.00 }, K4o: { raise: 0.00 },
    K3o: { raise: 0.00 }, K2o: { raise: 0.00 },
    // Suited Queens
    QJs: { raise: 1.00 }, QTs: { raise: 1.00 }, Q9s: { raise: 1.00 },
    Q8s: { raise: 0.75 }, Q7s: { raise: 0.50 }, Q6s: { raise: 0.30 },
    Q5s: { raise: 0.20 }, Q4s: { raise: 0.10 }, Q3s: { raise: 0.00 },
    Q2s: { raise: 0.00 },
    // Offsuit Queens
    QJo: { raise: 1.00 }, QTo: { raise: 0.90 }, Q9o: { raise: 0.50 },
    Q8o: { raise: 0.15 }, Q7o: { raise: 0.00 }, Q6o: { raise: 0.00 },
    Q5o: { raise: 0.00 }, Q4o: { raise: 0.00 }, Q3o: { raise: 0.00 },
    Q2o: { raise: 0.00 },
    // Suited Jacks
    JTs: { raise: 1.00 }, J9s: { raise: 1.00 }, J8s: { raise: 0.80 },
    J7s: { raise: 0.55 }, J6s: { raise: 0.30 }, J5s: { raise: 0.10 },
    J4s: { raise: 0.00 }, J3s: { raise: 0.00 }, J2s: { raise: 0.00 },
    // Offsuit Jacks
    JTo: { raise: 0.80 }, J9o: { raise: 0.30 }, J8o: { raise: 0.00 },
    // Suited Tens
    T9s: { raise: 1.00 }, T8s: { raise: 1.00 }, T7s: { raise: 0.65 },
    T6s: { raise: 0.35 }, T5s: { raise: 0.10 },
    // Offsuit Tens
    T9o: { raise: 0.50 }, T8o: { raise: 0.10 },
    // Suited Nines
    "98s": { raise: 1.00 }, "97s": { raise: 0.80 }, "96s": { raise: 0.50 },
    "95s": { raise: 0.15 },
    // Suited Eights
    "87s": { raise: 0.90 }, "86s": { raise: 0.55 }, "85s": { raise: 0.20 },
    // Suited Sevens
    "76s": { raise: 0.75 }, "75s": { raise: 0.30 }, "74s": { raise: 0.00 },
    // Suited Sixes
    "65s": { raise: 0.55 }, "64s": { raise: 0.15 },
    // Suited Fives
    "54s": { raise: 0.35 }, "53s": { raise: 0.00 },
  },
};

const BTN_RFI: PreflopChart = {
  position: "BTN",
  scenario: "rfi",
  stackDepth: 100,
  hands: {
    // Pairs — all pairs raise
    AA: { raise: 1.00 }, KK: { raise: 1.00 }, QQ: { raise: 1.00 },
    JJ: { raise: 1.00 }, TT: { raise: 1.00 }, "99": { raise: 1.00 },
    "88": { raise: 1.00 }, "77": { raise: 1.00 }, "66": { raise: 1.00 },
    "55": { raise: 1.00 }, "44": { raise: 1.00 }, "33": { raise: 0.80 },
    "22": { raise: 0.70 },
    // Suited Aces — nearly all
    AKs: { raise: 1.00 }, AQs: { raise: 1.00 }, AJs: { raise: 1.00 },
    ATs: { raise: 1.00 }, A9s: { raise: 1.00 }, A8s: { raise: 1.00 },
    A7s: { raise: 1.00 }, A6s: { raise: 1.00 }, A5s: { raise: 1.00 },
    A4s: { raise: 1.00 }, A3s: { raise: 1.00 }, A2s: { raise: 1.00 },
    // Offsuit Aces
    AKo: { raise: 1.00 }, AQo: { raise: 1.00 }, AJo: { raise: 1.00 },
    ATo: { raise: 1.00 }, A9o: { raise: 1.00 }, A8o: { raise: 0.90 },
    A7o: { raise: 0.75 }, A6o: { raise: 0.60 }, A5o: { raise: 0.65 },
    A4o: { raise: 0.50 }, A3o: { raise: 0.40 }, A2o: { raise: 0.35 },
    // Suited Kings
    KQs: { raise: 1.00 }, KJs: { raise: 1.00 }, KTs: { raise: 1.00 },
    K9s: { raise: 1.00 }, K8s: { raise: 1.00 }, K7s: { raise: 1.00 },
    K6s: { raise: 0.90 }, K5s: { raise: 0.80 }, K4s: { raise: 0.65 },
    K3s: { raise: 0.55 }, K2s: { raise: 0.45 },
    // Offsuit Kings
    KQo: { raise: 1.00 }, KJo: { raise: 1.00 }, KTo: { raise: 1.00 },
    K9o: { raise: 0.90 }, K8o: { raise: 0.65 }, K7o: { raise: 0.50 },
    K6o: { raise: 0.35 }, K5o: { raise: 0.25 }, K4o: { raise: 0.15 },
    K3o: { raise: 0.10 }, K2o: { raise: 0.00 },
    // Suited Queens
    QJs: { raise: 1.00 }, QTs: { raise: 1.00 }, Q9s: { raise: 1.00 },
    Q8s: { raise: 1.00 }, Q7s: { raise: 0.85 }, Q6s: { raise: 0.70 },
    Q5s: { raise: 0.55 }, Q4s: { raise: 0.40 }, Q3s: { raise: 0.25 },
    Q2s: { raise: 0.15 },
    // Offsuit Queens
    QJo: { raise: 1.00 }, QTo: { raise: 1.00 }, Q9o: { raise: 0.85 },
    Q8o: { raise: 0.55 }, Q7o: { raise: 0.30 }, Q6o: { raise: 0.15 },
    Q5o: { raise: 0.00 }, Q4o: { raise: 0.00 }, Q3o: { raise: 0.00 },
    Q2o: { raise: 0.00 },
    // Suited Jacks
    JTs: { raise: 1.00 }, J9s: { raise: 1.00 }, J8s: { raise: 1.00 },
    J7s: { raise: 0.85 }, J6s: { raise: 0.65 }, J5s: { raise: 0.45 },
    J4s: { raise: 0.25 }, J3s: { raise: 0.10 }, J2s: { raise: 0.00 },
    // Offsuit Jacks
    JTo: { raise: 1.00 }, J9o: { raise: 0.75 }, J8o: { raise: 0.35 },
    J7o: { raise: 0.10 }, J6o: { raise: 0.00 },
    // Suited Tens
    T9s: { raise: 1.00 }, T8s: { raise: 1.00 }, T7s: { raise: 0.90 },
    T6s: { raise: 0.70 }, T5s: { raise: 0.45 }, T4s: { raise: 0.20 },
    T3s: { raise: 0.00 }, T2s: { raise: 0.00 },
    // Offsuit Tens
    T9o: { raise: 0.85 }, T8o: { raise: 0.45 }, T7o: { raise: 0.15 },
    T6o: { raise: 0.00 },
    // Suited Nines
    "98s": { raise: 1.00 }, "97s": { raise: 1.00 }, "96s": { raise: 0.85 },
    "95s": { raise: 0.60 }, "94s": { raise: 0.25 }, "93s": { raise: 0.00 },
    // Offsuit Nines
    "98o": { raise: 0.55 }, "97o": { raise: 0.20 }, "96o": { raise: 0.00 },
    // Suited Eights
    "87s": { raise: 1.00 }, "86s": { raise: 0.85 }, "85s": { raise: 0.60 },
    "84s": { raise: 0.25 }, "83s": { raise: 0.00 },
    // Offsuit Eights
    "87o": { raise: 0.35 }, "86o": { raise: 0.10 }, "85o": { raise: 0.00 },
    // Suited Sevens
    "76s": { raise: 1.00 }, "75s": { raise: 0.75 }, "74s": { raise: 0.35 },
    "73s": { raise: 0.00 },
    // Offsuit Sevens
    "76o": { raise: 0.25 }, "75o": { raise: 0.00 },
    // Suited Sixes
    "65s": { raise: 0.85 }, "64s": { raise: 0.45 }, "63s": { raise: 0.10 },
    // Suited Fives
    "54s": { raise: 0.75 }, "53s": { raise: 0.35 }, "52s": { raise: 0.10 },
    // Suited Fours and below
    "43s": { raise: 0.40 }, "42s": { raise: 0.10 },
    "32s": { raise: 0.20 },
  },
};

const SB_RFI: PreflopChart = {
  position: "SB",
  scenario: "rfi",
  stackDepth: 100,
  hands: {
    // Pairs — mix of raise and limp
    AA: { raise: 1.00 }, KK: { raise: 1.00 }, QQ: { raise: 1.00 },
    JJ: { raise: 1.00 }, TT: { raise: 1.00 }, "99": { raise: 0.85, limp: 0.15 },
    "88": { raise: 0.65, limp: 0.35 }, "77": { raise: 0.50, limp: 0.50 },
    "66": { raise: 0.40, limp: 0.60 }, "55": { raise: 0.30, limp: 0.70 },
    "44": { raise: 0.25, limp: 0.75 }, "33": { raise: 0.20, limp: 0.80 },
    "22": { raise: 0.15, limp: 0.85 },
    // Suited Aces
    AKs: { raise: 1.00 }, AQs: { raise: 1.00 }, AJs: { raise: 1.00 },
    ATs: { raise: 1.00 }, A9s: { raise: 0.85, limp: 0.15 },
    A8s: { raise: 0.70, limp: 0.30 }, A7s: { raise: 0.55, limp: 0.45 },
    A6s: { raise: 0.50, limp: 0.50 }, A5s: { raise: 0.75, limp: 0.25 },
    A4s: { raise: 0.60, limp: 0.40 }, A3s: { raise: 0.55, limp: 0.45 },
    A2s: { raise: 0.50, limp: 0.50 },
    // Offsuit Aces
    AKo: { raise: 1.00 }, AQo: { raise: 1.00 }, AJo: { raise: 1.00 },
    ATo: { raise: 0.85, limp: 0.15 }, A9o: { raise: 0.65, limp: 0.35 },
    A8o: { raise: 0.50, limp: 0.50 }, A7o: { raise: 0.35, limp: 0.65 },
    A6o: { raise: 0.25, limp: 0.75 }, A5o: { raise: 0.30, limp: 0.70 },
    A4o: { raise: 0.25, limp: 0.75 }, A3o: { raise: 0.20, limp: 0.80 },
    A2o: { raise: 0.15, limp: 0.85 },
    // Suited Kings
    KQs: { raise: 1.00 }, KJs: { raise: 1.00 }, KTs: { raise: 1.00 },
    K9s: { raise: 0.80, limp: 0.20 }, K8s: { raise: 0.60, limp: 0.40 },
    K7s: { raise: 0.50, limp: 0.50 }, K6s: { raise: 0.40, limp: 0.60 },
    K5s: { raise: 0.35, limp: 0.65 }, K4s: { raise: 0.25, limp: 0.75 },
    K3s: { raise: 0.20, limp: 0.80 }, K2s: { raise: 0.15, limp: 0.85 },
    // Offsuit Kings
    KQo: { raise: 1.00 }, KJo: { raise: 1.00 }, KTo: { raise: 0.75, limp: 0.25 },
    K9o: { raise: 0.50, limp: 0.50 }, K8o: { raise: 0.30, limp: 0.70 },
    K7o: { raise: 0.20, limp: 0.80 }, K6o: { raise: 0.15, limp: 0.85 },
    K5o: { raise: 0.10, limp: 0.90 }, K4o: { raise: 0.05, limp: 0.95 },
    K3o: { raise: 0.00, limp: 1.00 }, K2o: { raise: 0.00, limp: 1.00 },
    // Suited Queens
    QJs: { raise: 1.00 }, QTs: { raise: 1.00 }, Q9s: { raise: 0.85, limp: 0.15 },
    Q8s: { raise: 0.65, limp: 0.35 }, Q7s: { raise: 0.50, limp: 0.50 },
    Q6s: { raise: 0.35, limp: 0.65 }, Q5s: { raise: 0.25, limp: 0.75 },
    Q4s: { raise: 0.20, limp: 0.80 }, Q3s: { raise: 0.15, limp: 0.85 },
    Q2s: { raise: 0.10, limp: 0.90 },
    // Offsuit Queens
    QJo: { raise: 0.90, limp: 0.10 }, QTo: { raise: 0.65, limp: 0.35 },
    Q9o: { raise: 0.40, limp: 0.60 }, Q8o: { raise: 0.20, limp: 0.80 },
    Q7o: { raise: 0.10, limp: 0.90 }, Q6o: { raise: 0.00, limp: 1.00 },
    Q5o: { raise: 0.00, limp: 1.00 }, Q4o: { raise: 0.00, limp: 1.00 },
    Q3o: { raise: 0.00, limp: 1.00 }, Q2o: { raise: 0.00, limp: 1.00 },
    // Suited Jacks
    JTs: { raise: 1.00 }, J9s: { raise: 0.85, limp: 0.15 },
    J8s: { raise: 0.65, limp: 0.35 }, J7s: { raise: 0.50, limp: 0.50 },
    J6s: { raise: 0.35, limp: 0.65 }, J5s: { raise: 0.20, limp: 0.80 },
    J4s: { raise: 0.10, limp: 0.90 }, J3s: { raise: 0.00, limp: 1.00 },
    J2s: { raise: 0.00, limp: 1.00 },
    // Offsuit Jacks
    JTo: { raise: 0.65, limp: 0.35 }, J9o: { raise: 0.35, limp: 0.65 },
    J8o: { raise: 0.15, limp: 0.85 }, J7o: { raise: 0.05, limp: 0.95 },
    J6o: { raise: 0.00, limp: 1.00 },
    // Suited Tens
    T9s: { raise: 0.90, limp: 0.10 }, T8s: { raise: 0.75, limp: 0.25 },
    T7s: { raise: 0.55, limp: 0.45 }, T6s: { raise: 0.40, limp: 0.60 },
    T5s: { raise: 0.25, limp: 0.75 }, T4s: { raise: 0.10, limp: 0.90 },
    T3s: { raise: 0.00, limp: 1.00 }, T2s: { raise: 0.00, limp: 1.00 },
    // Offsuit Tens
    T9o: { raise: 0.50, limp: 0.50 }, T8o: { raise: 0.25, limp: 0.75 },
    T7o: { raise: 0.10, limp: 0.90 }, T6o: { raise: 0.00, limp: 1.00 },
    // Suited Nines
    "98s": { raise: 0.80, limp: 0.20 }, "97s": { raise: 0.60, limp: 0.40 },
    "96s": { raise: 0.45, limp: 0.55 }, "95s": { raise: 0.25, limp: 0.75 },
    "94s": { raise: 0.10, limp: 0.90 }, "93s": { raise: 0.00, limp: 1.00 },
    // Offsuit Nines
    "98o": { raise: 0.30, limp: 0.70 }, "97o": { raise: 0.10, limp: 0.90 },
    "96o": { raise: 0.00, limp: 1.00 },
    // Suited Eights
    "87s": { raise: 0.70, limp: 0.30 }, "86s": { raise: 0.50, limp: 0.50 },
    "85s": { raise: 0.30, limp: 0.70 }, "84s": { raise: 0.10, limp: 0.90 },
    "83s": { raise: 0.00, limp: 1.00 },
    // Offsuit Eights
    "87o": { raise: 0.15, limp: 0.85 }, "86o": { raise: 0.00, limp: 1.00 },
    // Suited Sevens and below — mostly limp
    "76s": { raise: 0.60, limp: 0.40 }, "75s": { raise: 0.35, limp: 0.65 },
    "74s": { raise: 0.10, limp: 0.90 }, "73s": { raise: 0.00, limp: 1.00 },
    "76o": { raise: 0.05, limp: 0.95 }, "75o": { raise: 0.00, limp: 1.00 },
    "65s": { raise: 0.50, limp: 0.50 }, "64s": { raise: 0.20, limp: 0.80 },
    "63s": { raise: 0.00, limp: 1.00 },
    "54s": { raise: 0.40, limp: 0.60 }, "53s": { raise: 0.15, limp: 0.85 },
    "43s": { raise: 0.20, limp: 0.80 }, "32s": { raise: 0.10, limp: 0.90 },
  },
};

// ---------------------------------------------------------------------------
// BB Defense Charts — vs RFI from each position
// ---------------------------------------------------------------------------

const BB_VS_BTN: PreflopChart = {
  position: "BB",
  vsPosition: "BTN",
  scenario: "bb_defense",
  stackDepth: 100,
  hands: {
    // Pairs
    AA: { raise: 1.00 }, KK: { raise: 1.00 }, QQ: { raise: 1.00 },
    JJ: { raise: 0.80, call: 0.20 }, TT: { raise: 0.45, call: 0.55 },
    "99": { raise: 0.20, call: 0.80 }, "88": { raise: 0.10, call: 0.90 },
    "77": { raise: 0.00, call: 1.00 }, "66": { raise: 0.00, call: 1.00 },
    "55": { raise: 0.00, call: 1.00 }, "44": { raise: 0.00, call: 1.00 },
    "33": { raise: 0.00, call: 0.90 }, "22": { raise: 0.00, call: 0.85 },
    // Suited Aces
    AKs: { raise: 0.80, call: 0.20 }, AQs: { raise: 0.60, call: 0.40 },
    AJs: { raise: 0.40, call: 0.60 }, ATs: { raise: 0.25, call: 0.75 },
    A9s: { raise: 0.15, call: 0.85 }, A8s: { raise: 0.10, call: 0.90 },
    A7s: { raise: 0.10, call: 0.90 }, A6s: { raise: 0.15, call: 0.85 },
    A5s: { raise: 0.20, call: 0.80 }, A4s: { raise: 0.15, call: 0.85 },
    A3s: { raise: 0.10, call: 0.90 }, A2s: { raise: 0.10, call: 0.90 },
    // Offsuit Aces
    AKo: { raise: 0.65, call: 0.35 }, AQo: { raise: 0.45, call: 0.55 },
    AJo: { raise: 0.25, call: 0.75 }, ATo: { raise: 0.15, call: 0.85 },
    A9o: { raise: 0.00, call: 1.00 }, A8o: { raise: 0.00, call: 0.90 },
    A7o: { raise: 0.00, call: 0.80 }, A6o: { raise: 0.00, call: 0.75 },
    A5o: { raise: 0.00, call: 0.80 }, A4o: { raise: 0.00, call: 0.70 },
    A3o: { raise: 0.00, call: 0.60 }, A2o: { raise: 0.00, call: 0.55 },
    // Suited Kings
    KQs: { raise: 0.30, call: 0.70 }, KJs: { raise: 0.15, call: 0.85 },
    KTs: { raise: 0.10, call: 0.90 }, K9s: { raise: 0.05, call: 0.95 },
    K8s: { raise: 0.00, call: 0.90 }, K7s: { raise: 0.00, call: 0.85 },
    K6s: { raise: 0.00, call: 0.80 }, K5s: { raise: 0.00, call: 0.75 },
    K4s: { raise: 0.00, call: 0.70 }, K3s: { raise: 0.00, call: 0.65 },
    K2s: { raise: 0.00, call: 0.60 },
    // Offsuit Kings
    KQo: { raise: 0.15, call: 0.85 }, KJo: { raise: 0.05, call: 0.95 },
    KTo: { raise: 0.00, call: 0.95 }, K9o: { raise: 0.00, call: 0.85 },
    K8o: { raise: 0.00, call: 0.70 }, K7o: { raise: 0.00, call: 0.60 },
    K6o: { raise: 0.00, call: 0.50 }, K5o: { raise: 0.00, call: 0.45 },
    K4o: { raise: 0.00, call: 0.35 }, K3o: { raise: 0.00, call: 0.25 },
    K2o: { raise: 0.00, call: 0.20 },
    // Suited Queens
    QJs: { raise: 0.10, call: 0.90 }, QTs: { raise: 0.05, call: 0.95 },
    Q9s: { raise: 0.00, call: 0.95 }, Q8s: { raise: 0.00, call: 0.85 },
    Q7s: { raise: 0.00, call: 0.80 }, Q6s: { raise: 0.00, call: 0.75 },
    Q5s: { raise: 0.00, call: 0.70 }, Q4s: { raise: 0.00, call: 0.65 },
    Q3s: { raise: 0.00, call: 0.55 }, Q2s: { raise: 0.00, call: 0.50 },
    // Offsuit Queens
    QJo: { raise: 0.00, call: 0.95 }, QTo: { raise: 0.00, call: 0.85 },
    Q9o: { raise: 0.00, call: 0.75 }, Q8o: { raise: 0.00, call: 0.60 },
    Q7o: { raise: 0.00, call: 0.50 }, Q6o: { raise: 0.00, call: 0.40 },
    Q5o: { raise: 0.00, call: 0.30 }, Q4o: { raise: 0.00, call: 0.20 },
    Q3o: { raise: 0.00, call: 0.15 }, Q2o: { raise: 0.00, call: 0.10 },
    // Suited Jacks
    JTs: { raise: 0.00, call: 1.00 }, J9s: { raise: 0.00, call: 0.95 },
    J8s: { raise: 0.00, call: 0.85 }, J7s: { raise: 0.00, call: 0.75 },
    J6s: { raise: 0.00, call: 0.65 }, J5s: { raise: 0.00, call: 0.55 },
    J4s: { raise: 0.00, call: 0.40 }, J3s: { raise: 0.00, call: 0.30 },
    J2s: { raise: 0.00, call: 0.20 },
    // Offsuit Jacks
    JTo: { raise: 0.00, call: 0.90 }, J9o: { raise: 0.00, call: 0.75 },
    J8o: { raise: 0.00, call: 0.60 }, J7o: { raise: 0.00, call: 0.45 },
    J6o: { raise: 0.00, call: 0.30 }, J5o: { raise: 0.00, call: 0.15 },
    // Suited Tens
    T9s: { raise: 0.00, call: 1.00 }, T8s: { raise: 0.00, call: 0.95 },
    T7s: { raise: 0.00, call: 0.85 }, T6s: { raise: 0.00, call: 0.75 },
    T5s: { raise: 0.00, call: 0.60 }, T4s: { raise: 0.00, call: 0.45 },
    T3s: { raise: 0.00, call: 0.30 }, T2s: { raise: 0.00, call: 0.20 },
    // Offsuit Tens
    T9o: { raise: 0.00, call: 0.80 }, T8o: { raise: 0.00, call: 0.65 },
    T7o: { raise: 0.00, call: 0.50 }, T6o: { raise: 0.00, call: 0.35 },
    T5o: { raise: 0.00, call: 0.20 },
    // Suited Nines
    "98s": { raise: 0.00, call: 0.95 }, "97s": { raise: 0.00, call: 0.85 },
    "96s": { raise: 0.00, call: 0.75 }, "95s": { raise: 0.00, call: 0.60 },
    "94s": { raise: 0.00, call: 0.40 }, "93s": { raise: 0.00, call: 0.25 },
    "92s": { raise: 0.00, call: 0.15 },
    // Offsuit Nines
    "98o": { raise: 0.00, call: 0.70 }, "97o": { raise: 0.00, call: 0.55 },
    "96o": { raise: 0.00, call: 0.40 }, "95o": { raise: 0.00, call: 0.25 },
    // Suited Eights
    "87s": { raise: 0.00, call: 0.90 }, "86s": { raise: 0.00, call: 0.75 },
    "85s": { raise: 0.00, call: 0.60 }, "84s": { raise: 0.00, call: 0.40 },
    "83s": { raise: 0.00, call: 0.25 }, "82s": { raise: 0.00, call: 0.15 },
    // Offsuit Eights
    "87o": { raise: 0.00, call: 0.55 }, "86o": { raise: 0.00, call: 0.40 },
    "85o": { raise: 0.00, call: 0.25 },
    // Suited Sevens and below
    "76s": { raise: 0.00, call: 0.80 }, "75s": { raise: 0.00, call: 0.65 },
    "74s": { raise: 0.00, call: 0.45 }, "73s": { raise: 0.00, call: 0.25 },
    "76o": { raise: 0.00, call: 0.40 }, "75o": { raise: 0.00, call: 0.25 },
    "65s": { raise: 0.00, call: 0.70 }, "64s": { raise: 0.00, call: 0.50 },
    "63s": { raise: 0.00, call: 0.30 },
    "54s": { raise: 0.00, call: 0.60 }, "53s": { raise: 0.00, call: 0.40 },
    "52s": { raise: 0.00, call: 0.25 },
    "43s": { raise: 0.00, call: 0.45 }, "42s": { raise: 0.00, call: 0.30 },
    "32s": { raise: 0.00, call: 0.35 },
  },
};

const BB_VS_CO: PreflopChart = {
  position: "BB",
  vsPosition: "CO",
  scenario: "bb_defense",
  stackDepth: 100,
  hands: {
    AA: { raise: 1.00 }, KK: { raise: 1.00 }, QQ: { raise: 0.90, call: 0.10 },
    JJ: { raise: 0.70, call: 0.30 }, TT: { raise: 0.35, call: 0.65 },
    "99": { raise: 0.15, call: 0.85 }, "88": { raise: 0.05, call: 0.95 },
    "77": { raise: 0.00, call: 1.00 }, "66": { raise: 0.00, call: 1.00 },
    "55": { raise: 0.00, call: 0.95 }, "44": { raise: 0.00, call: 0.85 },
    "33": { raise: 0.00, call: 0.80 }, "22": { raise: 0.00, call: 0.70 },
    AKs: { raise: 0.75, call: 0.25 }, AQs: { raise: 0.50, call: 0.50 },
    AJs: { raise: 0.30, call: 0.70 }, ATs: { raise: 0.15, call: 0.85 },
    A9s: { raise: 0.05, call: 0.95 }, A8s: { raise: 0.00, call: 0.95 },
    A7s: { raise: 0.00, call: 0.90 }, A6s: { raise: 0.05, call: 0.95 },
    A5s: { raise: 0.10, call: 0.90 }, A4s: { raise: 0.05, call: 0.95 },
    A3s: { raise: 0.00, call: 0.95 }, A2s: { raise: 0.00, call: 0.90 },
    AKo: { raise: 0.55, call: 0.45 }, AQo: { raise: 0.30, call: 0.70 },
    AJo: { raise: 0.10, call: 0.90 }, ATo: { raise: 0.00, call: 1.00 },
    A9o: { raise: 0.00, call: 0.90 }, A8o: { raise: 0.00, call: 0.80 },
    A7o: { raise: 0.00, call: 0.70 }, A6o: { raise: 0.00, call: 0.65 },
    A5o: { raise: 0.00, call: 0.70 }, A4o: { raise: 0.00, call: 0.60 },
    A3o: { raise: 0.00, call: 0.50 }, A2o: { raise: 0.00, call: 0.45 },
    KQs: { raise: 0.20, call: 0.80 }, KJs: { raise: 0.10, call: 0.90 },
    KTs: { raise: 0.05, call: 0.95 }, K9s: { raise: 0.00, call: 0.95 },
    K8s: { raise: 0.00, call: 0.85 }, K7s: { raise: 0.00, call: 0.80 },
    K6s: { raise: 0.00, call: 0.75 }, K5s: { raise: 0.00, call: 0.70 },
    K4s: { raise: 0.00, call: 0.60 }, K3s: { raise: 0.00, call: 0.55 },
    K2s: { raise: 0.00, call: 0.50 },
    KQo: { raise: 0.05, call: 0.95 }, KJo: { raise: 0.00, call: 0.95 },
    KTo: { raise: 0.00, call: 0.90 }, K9o: { raise: 0.00, call: 0.75 },
    K8o: { raise: 0.00, call: 0.60 }, K7o: { raise: 0.00, call: 0.50 },
    K6o: { raise: 0.00, call: 0.40 }, K5o: { raise: 0.00, call: 0.35 },
    K4o: { raise: 0.00, call: 0.25 }, K3o: { raise: 0.00, call: 0.15 },
    K2o: { raise: 0.00, call: 0.10 },
    QJs: { raise: 0.05, call: 0.95 }, QTs: { raise: 0.00, call: 1.00 },
    Q9s: { raise: 0.00, call: 0.95 }, Q8s: { raise: 0.00, call: 0.85 },
    Q7s: { raise: 0.00, call: 0.75 }, Q6s: { raise: 0.00, call: 0.65 },
    Q5s: { raise: 0.00, call: 0.60 }, Q4s: { raise: 0.00, call: 0.50 },
    Q3s: { raise: 0.00, call: 0.40 }, Q2s: { raise: 0.00, call: 0.30 },
    QJo: { raise: 0.00, call: 0.90 }, QTo: { raise: 0.00, call: 0.75 },
    Q9o: { raise: 0.00, call: 0.60 }, Q8o: { raise: 0.00, call: 0.45 },
    Q7o: { raise: 0.00, call: 0.30 }, Q6o: { raise: 0.00, call: 0.20 },
    JTs: { raise: 0.00, call: 1.00 }, J9s: { raise: 0.00, call: 0.90 },
    J8s: { raise: 0.00, call: 0.80 }, J7s: { raise: 0.00, call: 0.65 },
    J6s: { raise: 0.00, call: 0.50 }, J5s: { raise: 0.00, call: 0.40 },
    J4s: { raise: 0.00, call: 0.25 }, J3s: { raise: 0.00, call: 0.15 },
    JTo: { raise: 0.00, call: 0.80 }, J9o: { raise: 0.00, call: 0.65 },
    J8o: { raise: 0.00, call: 0.50 }, J7o: { raise: 0.00, call: 0.35 },
    J6o: { raise: 0.00, call: 0.20 },
    T9s: { raise: 0.00, call: 0.95 }, T8s: { raise: 0.00, call: 0.85 },
    T7s: { raise: 0.00, call: 0.75 }, T6s: { raise: 0.00, call: 0.60 },
    T5s: { raise: 0.00, call: 0.45 }, T4s: { raise: 0.00, call: 0.30 },
    T3s: { raise: 0.00, call: 0.20 }, T2s: { raise: 0.00, call: 0.10 },
    T9o: { raise: 0.00, call: 0.70 }, T8o: { raise: 0.00, call: 0.55 },
    T7o: { raise: 0.00, call: 0.40 }, T6o: { raise: 0.00, call: 0.25 },
    "98s": { raise: 0.00, call: 0.90 }, "97s": { raise: 0.00, call: 0.75 },
    "96s": { raise: 0.00, call: 0.60 }, "95s": { raise: 0.00, call: 0.45 },
    "94s": { raise: 0.00, call: 0.25 },
    "98o": { raise: 0.00, call: 0.60 }, "97o": { raise: 0.00, call: 0.45 },
    "96o": { raise: 0.00, call: 0.25 },
    "87s": { raise: 0.00, call: 0.80 }, "86s": { raise: 0.00, call: 0.65 },
    "85s": { raise: 0.00, call: 0.50 }, "84s": { raise: 0.00, call: 0.30 },
    "87o": { raise: 0.00, call: 0.45 }, "86o": { raise: 0.00, call: 0.30 },
    "76s": { raise: 0.00, call: 0.70 }, "75s": { raise: 0.00, call: 0.50 },
    "74s": { raise: 0.00, call: 0.30 },
    "65s": { raise: 0.00, call: 0.60 }, "64s": { raise: 0.00, call: 0.40 },
    "54s": { raise: 0.00, call: 0.50 }, "53s": { raise: 0.00, call: 0.30 },
    "43s": { raise: 0.00, call: 0.35 }, "32s": { raise: 0.00, call: 0.25 },
  },
};

const BB_VS_HJ: PreflopChart = {
  position: "BB",
  vsPosition: "HJ",
  scenario: "bb_defense",
  stackDepth: 100,
  hands: {
    AA: { raise: 1.00 }, KK: { raise: 1.00 }, QQ: { raise: 0.80, call: 0.20 },
    JJ: { raise: 0.55, call: 0.45 }, TT: { raise: 0.25, call: 0.75 },
    "99": { raise: 0.10, call: 0.90 }, "88": { raise: 0.00, call: 1.00 },
    "77": { raise: 0.00, call: 1.00 }, "66": { raise: 0.00, call: 0.90 },
    "55": { raise: 0.00, call: 0.85 }, "44": { raise: 0.00, call: 0.75 },
    "33": { raise: 0.00, call: 0.65 }, "22": { raise: 0.00, call: 0.55 },
    AKs: { raise: 0.70, call: 0.30 }, AQs: { raise: 0.45, call: 0.55 },
    AJs: { raise: 0.25, call: 0.75 }, ATs: { raise: 0.10, call: 0.90 },
    A9s: { raise: 0.00, call: 1.00 }, A8s: { raise: 0.00, call: 0.90 },
    A7s: { raise: 0.00, call: 0.85 }, A6s: { raise: 0.00, call: 0.90 },
    A5s: { raise: 0.05, call: 0.95 }, A4s: { raise: 0.00, call: 0.90 },
    A3s: { raise: 0.00, call: 0.85 }, A2s: { raise: 0.00, call: 0.80 },
    AKo: { raise: 0.50, call: 0.50 }, AQo: { raise: 0.25, call: 0.75 },
    AJo: { raise: 0.10, call: 0.90 }, ATo: { raise: 0.00, call: 0.95 },
    A9o: { raise: 0.00, call: 0.85 }, A8o: { raise: 0.00, call: 0.75 },
    A7o: { raise: 0.00, call: 0.65 }, A6o: { raise: 0.00, call: 0.60 },
    A5o: { raise: 0.00, call: 0.65 }, A4o: { raise: 0.00, call: 0.55 },
    A3o: { raise: 0.00, call: 0.45 }, A2o: { raise: 0.00, call: 0.40 },
    KQs: { raise: 0.15, call: 0.85 }, KJs: { raise: 0.05, call: 0.95 },
    KTs: { raise: 0.00, call: 1.00 }, K9s: { raise: 0.00, call: 0.90 },
    K8s: { raise: 0.00, call: 0.80 }, K7s: { raise: 0.00, call: 0.75 },
    K6s: { raise: 0.00, call: 0.70 }, K5s: { raise: 0.00, call: 0.65 },
    K4s: { raise: 0.00, call: 0.55 }, K3s: { raise: 0.00, call: 0.45 },
    K2s: { raise: 0.00, call: 0.40 },
    KQo: { raise: 0.00, call: 1.00 }, KJo: { raise: 0.00, call: 0.90 },
    KTo: { raise: 0.00, call: 0.80 }, K9o: { raise: 0.00, call: 0.65 },
    K8o: { raise: 0.00, call: 0.50 }, K7o: { raise: 0.00, call: 0.40 },
    K6o: { raise: 0.00, call: 0.30 }, K5o: { raise: 0.00, call: 0.25 },
    K4o: { raise: 0.00, call: 0.15 }, K3o: { raise: 0.00, call: 0.10 },
    QJs: { raise: 0.00, call: 1.00 }, QTs: { raise: 0.00, call: 0.95 },
    Q9s: { raise: 0.00, call: 0.85 }, Q8s: { raise: 0.00, call: 0.75 },
    Q7s: { raise: 0.00, call: 0.65 }, Q6s: { raise: 0.00, call: 0.55 },
    Q5s: { raise: 0.00, call: 0.50 }, Q4s: { raise: 0.00, call: 0.40 },
    Q3s: { raise: 0.00, call: 0.30 }, Q2s: { raise: 0.00, call: 0.20 },
    QJo: { raise: 0.00, call: 0.85 }, QTo: { raise: 0.00, call: 0.70 },
    Q9o: { raise: 0.00, call: 0.55 }, Q8o: { raise: 0.00, call: 0.40 },
    Q7o: { raise: 0.00, call: 0.25 }, Q6o: { raise: 0.00, call: 0.15 },
    JTs: { raise: 0.00, call: 0.95 }, J9s: { raise: 0.00, call: 0.85 },
    J8s: { raise: 0.00, call: 0.75 }, J7s: { raise: 0.00, call: 0.60 },
    J6s: { raise: 0.00, call: 0.45 }, J5s: { raise: 0.00, call: 0.30 },
    J4s: { raise: 0.00, call: 0.20 }, J3s: { raise: 0.00, call: 0.10 },
    JTo: { raise: 0.00, call: 0.75 }, J9o: { raise: 0.00, call: 0.55 },
    J8o: { raise: 0.00, call: 0.40 }, J7o: { raise: 0.00, call: 0.25 },
    T9s: { raise: 0.00, call: 0.90 }, T8s: { raise: 0.00, call: 0.80 },
    T7s: { raise: 0.00, call: 0.65 }, T6s: { raise: 0.00, call: 0.50 },
    T5s: { raise: 0.00, call: 0.35 }, T4s: { raise: 0.00, call: 0.20 },
    T9o: { raise: 0.00, call: 0.60 }, T8o: { raise: 0.00, call: 0.45 },
    T7o: { raise: 0.00, call: 0.30 },
    "98s": { raise: 0.00, call: 0.85 }, "97s": { raise: 0.00, call: 0.70 },
    "96s": { raise: 0.00, call: 0.55 }, "95s": { raise: 0.00, call: 0.35 },
    "98o": { raise: 0.00, call: 0.50 }, "97o": { raise: 0.00, call: 0.35 },
    "87s": { raise: 0.00, call: 0.75 }, "86s": { raise: 0.00, call: 0.55 },
    "85s": { raise: 0.00, call: 0.40 }, "84s": { raise: 0.00, call: 0.20 },
    "87o": { raise: 0.00, call: 0.35 },
    "76s": { raise: 0.00, call: 0.65 }, "75s": { raise: 0.00, call: 0.45 },
    "74s": { raise: 0.00, call: 0.25 },
    "65s": { raise: 0.00, call: 0.55 }, "64s": { raise: 0.00, call: 0.30 },
    "54s": { raise: 0.00, call: 0.45 }, "53s": { raise: 0.00, call: 0.25 },
    "43s": { raise: 0.00, call: 0.30 }, "32s": { raise: 0.00, call: 0.20 },
  },
};

const BB_VS_UTG: PreflopChart = {
  position: "BB",
  vsPosition: "UTG",
  scenario: "bb_defense",
  stackDepth: 100,
  hands: {
    AA: { raise: 1.00 }, KK: { raise: 1.00 }, QQ: { raise: 0.55, call: 0.45 },
    JJ: { raise: 0.25, call: 0.75 }, TT: { raise: 0.05, call: 0.95 },
    "99": { raise: 0.00, call: 1.00 }, "88": { raise: 0.00, call: 1.00 },
    "77": { raise: 0.00, call: 0.85 }, "66": { raise: 0.00, call: 0.75 },
    "55": { raise: 0.00, call: 0.65 }, "44": { raise: 0.00, call: 0.55 },
    "33": { raise: 0.00, call: 0.45 }, "22": { raise: 0.00, call: 0.40 },
    AKs: { raise: 0.60, call: 0.40 }, AQs: { raise: 0.30, call: 0.70 },
    AJs: { raise: 0.15, call: 0.85 }, ATs: { raise: 0.05, call: 0.95 },
    A9s: { raise: 0.00, call: 0.90 }, A8s: { raise: 0.00, call: 0.80 },
    A7s: { raise: 0.00, call: 0.75 }, A6s: { raise: 0.00, call: 0.75 },
    A5s: { raise: 0.00, call: 0.85 }, A4s: { raise: 0.00, call: 0.75 },
    A3s: { raise: 0.00, call: 0.70 }, A2s: { raise: 0.00, call: 0.65 },
    AKo: { raise: 0.35, call: 0.65 }, AQo: { raise: 0.10, call: 0.90 },
    AJo: { raise: 0.00, call: 0.90 }, ATo: { raise: 0.00, call: 0.75 },
    A9o: { raise: 0.00, call: 0.60 }, A8o: { raise: 0.00, call: 0.50 },
    A7o: { raise: 0.00, call: 0.40 }, A6o: { raise: 0.00, call: 0.40 },
    A5o: { raise: 0.00, call: 0.45 }, A4o: { raise: 0.00, call: 0.35 },
    A3o: { raise: 0.00, call: 0.25 }, A2o: { raise: 0.00, call: 0.20 },
    KQs: { raise: 0.05, call: 0.95 }, KJs: { raise: 0.00, call: 0.95 },
    KTs: { raise: 0.00, call: 0.90 }, K9s: { raise: 0.00, call: 0.75 },
    K8s: { raise: 0.00, call: 0.60 }, K7s: { raise: 0.00, call: 0.55 },
    K6s: { raise: 0.00, call: 0.50 }, K5s: { raise: 0.00, call: 0.45 },
    K4s: { raise: 0.00, call: 0.35 }, K3s: { raise: 0.00, call: 0.25 },
    K2s: { raise: 0.00, call: 0.20 },
    KQo: { raise: 0.00, call: 0.85 }, KJo: { raise: 0.00, call: 0.70 },
    KTo: { raise: 0.00, call: 0.55 }, K9o: { raise: 0.00, call: 0.40 },
    K8o: { raise: 0.00, call: 0.25 }, K7o: { raise: 0.00, call: 0.15 },
    K6o: { raise: 0.00, call: 0.10 },
    QJs: { raise: 0.00, call: 0.90 }, QTs: { raise: 0.00, call: 0.80 },
    Q9s: { raise: 0.00, call: 0.65 }, Q8s: { raise: 0.00, call: 0.55 },
    Q7s: { raise: 0.00, call: 0.45 }, Q6s: { raise: 0.00, call: 0.35 },
    Q5s: { raise: 0.00, call: 0.30 }, Q4s: { raise: 0.00, call: 0.20 },
    Q3s: { raise: 0.00, call: 0.15 }, Q2s: { raise: 0.00, call: 0.10 },
    QJo: { raise: 0.00, call: 0.70 }, QTo: { raise: 0.00, call: 0.55 },
    Q9o: { raise: 0.00, call: 0.35 }, Q8o: { raise: 0.00, call: 0.20 },
    JTs: { raise: 0.00, call: 0.85 }, J9s: { raise: 0.00, call: 0.70 },
    J8s: { raise: 0.00, call: 0.55 }, J7s: { raise: 0.00, call: 0.40 },
    J6s: { raise: 0.00, call: 0.25 }, J5s: { raise: 0.00, call: 0.15 },
    JTo: { raise: 0.00, call: 0.60 }, J9o: { raise: 0.00, call: 0.40 },
    J8o: { raise: 0.00, call: 0.25 },
    T9s: { raise: 0.00, call: 0.80 }, T8s: { raise: 0.00, call: 0.65 },
    T7s: { raise: 0.00, call: 0.50 }, T6s: { raise: 0.00, call: 0.35 },
    T5s: { raise: 0.00, call: 0.20 },
    T9o: { raise: 0.00, call: 0.45 }, T8o: { raise: 0.00, call: 0.30 },
    "98s": { raise: 0.00, call: 0.70 }, "97s": { raise: 0.00, call: 0.55 },
    "96s": { raise: 0.00, call: 0.40 }, "95s": { raise: 0.00, call: 0.20 },
    "98o": { raise: 0.00, call: 0.35 }, "97o": { raise: 0.00, call: 0.20 },
    "87s": { raise: 0.00, call: 0.60 }, "86s": { raise: 0.00, call: 0.45 },
    "85s": { raise: 0.00, call: 0.25 }, "84s": { raise: 0.00, call: 0.10 },
    "87o": { raise: 0.00, call: 0.20 },
    "76s": { raise: 0.00, call: 0.50 }, "75s": { raise: 0.00, call: 0.30 },
    "74s": { raise: 0.00, call: 0.10 },
    "65s": { raise: 0.00, call: 0.40 }, "64s": { raise: 0.00, call: 0.20 },
    "54s": { raise: 0.00, call: 0.30 }, "53s": { raise: 0.00, call: 0.15 },
    "43s": { raise: 0.00, call: 0.20 }, "32s": { raise: 0.00, call: 0.10 },
  },
};

// ---------------------------------------------------------------------------
// Registry and lookup
// ---------------------------------------------------------------------------

const ALL_CHARTS: PreflopChart[] = [
  UTG_RFI, HJ_RFI, CO_RFI, BTN_RFI, SB_RFI,
  BB_VS_BTN, BB_VS_CO, BB_VS_HJ, BB_VS_UTG,
];

export function lookupChart(
  position: Position,
  scenario: string,
  vsPosition?: Position,
): PreflopChart | null {
  return (
    ALL_CHARTS.find(
      (c) =>
        c.position === position &&
        c.scenario === scenario &&
        c.vsPosition === vsPosition,
    ) ?? null
  );
}

export function listAvailableCharts(): Array<{
  position: Position;
  scenario: string;
  vsPosition?: Position;
  label: string;
}> {
  return ALL_CHARTS.map((c) => ({
    position: c.position,
    scenario: c.scenario,
    vsPosition: c.vsPosition,
    label: c.vsPosition
      ? `${c.position} vs ${c.vsPosition} (${c.scenario})`
      : `${c.position} RFI`,
  }));
}

/** Convert a PreflopChart to StrategyEntry-compatible format for RangeGrid */
export function chartToStrategyEntries(
  chart: PreflopChart,
): Array<{ info_set_key: string; actions: string[]; probabilities: number[]; is_locked: boolean }> {
  const entries = [];
  for (const [hand, freqs] of Object.entries(chart.hands)) {
    const actions: string[] = [];
    const probs: number[] = [];

    if ((freqs.raise ?? 0) > 0) {
      actions.push("raise");
      probs.push(freqs.raise!);
    }
    if ((freqs.limp ?? 0) > 0) {
      actions.push("limp");
      probs.push(freqs.limp!);
    }
    if ((freqs.call ?? 0) > 0) {
      actions.push("call");
      probs.push(freqs.call!);
    }

    const foldProb = 1 - (freqs.raise ?? 0) - (freqs.call ?? 0) - (freqs.limp ?? 0);
    if (foldProb > 0.01) {
      actions.push("fold");
      probs.push(foldProb);
    }

    if (actions.length > 0) {
      entries.push({
        info_set_key: hand,
        actions,
        probabilities: probs,
        is_locked: false,
      });
    }
  }
  return entries;
}
