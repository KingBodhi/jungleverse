// Solver types — mirrors backend/solver/pulse/solver/models.py

export type GameVariant = "kuhn" | "leduc" | "nlhe_subgame";

export type SolveStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

// --- Request types ---

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

export interface NodeLockRequest {
  solve_id: string;
  locks: Record<string, number[]>;
  resolve_iterations: number;
}

// --- Response types ---

export interface SolveResponse {
  solve_id: string;
  status: SolveStatus;
  variant: GameVariant;
  num_iterations: number;
  progress: number;
  ev_p0: number | null;
  exploitability: number | null;
  num_info_sets: number;
  error: string | null;
}

export interface StrategyEntry {
  info_set_key: string;
  actions: string[];
  probabilities: number[];
  is_locked: boolean;
}

export interface StrategyResponse {
  solve_id: string;
  strategies: StrategyEntry[];
  total_info_sets: number;
}

export interface InfoSetsResponse {
  solve_id: string;
  info_set_keys: string[];
  total: number;
}

export interface EVComparisonResponse {
  solve_id: string;
  gto_ev_p0: number;
  gto_ev_p1: number;
  br_ev_p0: number;
  br_ev_p1: number;
  exploitability: number;
}

export interface NodeLockResponse {
  solve_id: string;
  locks_applied: Record<string, boolean>;
  status: SolveStatus;
  resolve_iterations: number;
}

// --- UI-specific types ---

export interface RangeGridCell {
  label: string;
  actions: string[];
  probabilities: number[];
  isInRange: boolean;
}

export type ViewMode = "strategy" | "ev" | "equity";
