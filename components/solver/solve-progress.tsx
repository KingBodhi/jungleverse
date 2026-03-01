"use client";

import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSolverStore } from "@/lib/stores/solver-store";
import { cancelSolve } from "@/lib/solver-api";

export function SolveProgress() {
  const progress = useSolverStore((s) => s.progress);
  const status = useSolverStore((s) => s.status);
  const solveId = useSolverStore((s) => s.solveId);
  const variant = useSolverStore((s) => s.variant);
  const numIterations = useSolverStore((s) => s.numIterations);
  const setStatus = useSolverStore((s) => s.setStatus);
  const setIsPolling = useSolverStore((s) => s.setIsPolling);

  if (!status || status === "completed" || status === "failed" || status === "cancelled") {
    return null;
  }

  const pct = Math.round(progress * 100);
  const itersDone = Math.round(progress * numIterations);

  const handleCancel = async () => {
    if (!solveId) return;
    try {
      await cancelSolve(solveId);
      setStatus("cancelled");
      setIsPolling(false);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
      <div className="flex-1">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Solving {variant.replace(/_/g, " ")}...
          </span>
          <span className="tabular-nums text-muted-foreground">
            {itersDone.toLocaleString()} / {numIterations.toLocaleString()} iterations ({pct}%)
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={handleCancel}
        title="Cancel solve"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
