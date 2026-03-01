import { create } from "zustand";
import type {
  GameVariant,
  SolveStatus,
  StrategyEntry,
  EVComparisonResponse,
  ViewMode,
} from "@/types/solver";

interface SolverState {
  // --- Config ---
  variant: GameVariant;
  numIterations: number;
  board: string;
  rangeP0: string;
  rangeP1: string;
  pot: number;
  stack: number;
  betSizes: number[];

  // --- Solve ---
  solveId: string | null;
  status: SolveStatus | null;
  progress: number;
  error: string | null;
  evP0: number | null;
  exploitability: number | null;

  // --- Data ---
  strategies: StrategyEntry[];
  infoSetKeys: string[];
  selectedInfoSetKey: string | null;
  selectedPlayer: 0 | 1;
  evComparison: EVComparisonResponse | null;

  // --- View ---
  viewMode: ViewMode;
  isPolling: boolean;

  // --- Actions ---
  setVariant: (v: GameVariant) => void;
  setNumIterations: (n: number) => void;
  setBoard: (b: string) => void;
  setRangeP0: (r: string) => void;
  setRangeP1: (r: string) => void;
  setPot: (p: number) => void;
  setStack: (s: number) => void;
  setBetSizes: (b: number[]) => void;

  setSolveId: (id: string | null) => void;
  setStatus: (s: SolveStatus | null) => void;
  setProgress: (p: number) => void;
  setError: (e: string | null) => void;
  setEvP0: (ev: number | null) => void;
  setExploitability: (e: number | null) => void;

  setStrategies: (s: StrategyEntry[]) => void;
  setInfoSetKeys: (keys: string[]) => void;
  setSelectedInfoSetKey: (key: string | null) => void;
  setSelectedPlayer: (p: 0 | 1) => void;
  setEvComparison: (ev: EVComparisonResponse | null) => void;

  setViewMode: (m: ViewMode) => void;
  setIsPolling: (p: boolean) => void;

  reset: () => void;
}

const initialState = {
  variant: "kuhn" as GameVariant,
  numIterations: 1000,
  board: "Qs9d2c",
  rangeP0: "AA,KK,QQ,JJ,TT,99,88,77,66,AKs,AQs,AJs,ATs,KQs,KJs,AKo,AQo",
  rangeP1: "AA,KK,QQ,JJ,TT,99,88,77,AKs,AQs,AJs,KQs,AKo",
  pot: 100,
  stack: 200,
  betSizes: [0.33, 0.5, 0.75, 1.0],

  solveId: null,
  status: null,
  progress: 0,
  error: null,
  evP0: null,
  exploitability: null,

  strategies: [],
  infoSetKeys: [],
  selectedInfoSetKey: null,
  selectedPlayer: 0 as const,
  evComparison: null,

  viewMode: "strategy" as ViewMode,
  isPolling: false,
};

export const useSolverStore = create<SolverState>((set) => ({
  ...initialState,

  setVariant: (v) => set({ variant: v }),
  setNumIterations: (n) => set({ numIterations: n }),
  setBoard: (b) => set({ board: b }),
  setRangeP0: (r) => set({ rangeP0: r }),
  setRangeP1: (r) => set({ rangeP1: r }),
  setPot: (p) => set({ pot: p }),
  setStack: (s) => set({ stack: s }),
  setBetSizes: (b) => set({ betSizes: b }),

  setSolveId: (id) => set({ solveId: id }),
  setStatus: (s) => set({ status: s }),
  setProgress: (p) => set({ progress: p }),
  setError: (e) => set({ error: e }),
  setEvP0: (ev) => set({ evP0: ev }),
  setExploitability: (e) => set({ exploitability: e }),

  setStrategies: (s) => set({ strategies: s }),
  setInfoSetKeys: (keys) => set({ infoSetKeys: keys }),
  setSelectedInfoSetKey: (key) => set({ selectedInfoSetKey: key }),
  setSelectedPlayer: (p) => set({ selectedPlayer: p }),
  setEvComparison: (ev) => set({ evComparison: ev }),

  setViewMode: (m) => set({ viewMode: m }),
  setIsPolling: (p) => set({ isPolling: p }),

  reset: () => set(initialState),
}));
