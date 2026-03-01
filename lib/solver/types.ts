/**
 * Internal types and enums for the CFR solver engine.
 */

export type GameVariant = "kuhn" | "leduc" | "nlhe_subgame";

export type SolveStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export const enum Action {
  FOLD = "fold",
  CHECK = "check",
  CALL = "call",
  BET = "bet",
  RAISE = "raise",
  ALL_IN = "all_in",
}

export interface ActionInfo {
  action: Action;
  amount: number;
  label: string;
}

export function makeActionInfo(
  action: Action,
  amount = 0,
  label?: string,
): ActionInfo {
  if (!label) {
    label = amount > 0 ? `${action}_${Math.floor(amount)}` : action;
  }
  return { action, amount, label };
}

/** Discriminated union for game tree nodes. */
export type GameNode = ActionNode | ChanceNode | TerminalNode;

export interface ActionNode {
  type: "action";
  player: number;
  actions: ActionInfo[];
  children: Map<string, GameNode>;
  infoSetKey: string;
  pot: number;
  stacks: [number, number];
  depth: number;
}

export interface ChanceNode {
  type: "chance";
  outcomes: Map<string, { prob: number; child: GameNode }>;
  depth: number;
}

export interface TerminalNode {
  type: "terminal";
  payoffs: [number, number];
  pot: number;
  isShowdown: boolean;
  depth: number;
}

/** Interface for variant-specific tree builders. */
export interface TreeBuilder {
  buildTree(): GameNode;
  getInfoSetKey(
    player: number,
    cards: number[],
    history: string,
    board?: number[],
  ): string;
}

/** Solve request matching the API contract. */
export interface SolveRequest {
  variant: GameVariant;
  num_iterations: number;
  board?: string;
  range_p0?: string;
  range_p1?: string;
  pot?: number;
  stack?: number;
  bet_sizes?: number[];
}

/** Node lock request matching the API contract. */
export interface NodeLockRequest {
  solve_id: string;
  locks: Record<string, number[]>;
  resolve_iterations: number;
}
