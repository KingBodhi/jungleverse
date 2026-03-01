/**
 * Poker CFR solver — public exports.
 *
 * Usage:
 *   import { CFRPlusSolver, KuhnTreeBuilder } from "@/lib/solver";
 */

// Core types
export type {
  GameVariant,
  SolveStatus,
  ActionInfo,
  GameNode,
  ActionNode,
  ChanceNode,
  TerminalNode,
  TreeBuilder,
  SolveRequest,
  NodeLockRequest,
} from "./types";
export { Action, makeActionInfo } from "./types";

// Card utilities
export {
  RANKS,
  SUITS,
  NUM_RANKS,
  NUM_SUITS,
  NUM_CARDS,
  card,
  cardRank,
  cardSuit,
  cardFromStr,
  cardToStr,
  cardsToStr,
  Deck,
  parseRange,
} from "./cards";

// Hand evaluation
export { evaluateHand, compareHands, handCategoryName } from "./evaluator";

// CFR engine
export { InfoSetData, InfoSetStore } from "./info-set";
export { CFRPlusSolver } from "./cfr";
export {
  computeBestResponseEv,
  computeEvComparison,
} from "./best-response";
export { NodeLocker } from "./node-lock";
export type { NodeLockSpec } from "./node-lock";

// Variants
export { KuhnTreeBuilder } from "./variants/kuhn";
export { LeducTreeBuilder } from "./variants/leduc";
export { NLHESubgameBuilder } from "./variants/nlhe-subgame";
