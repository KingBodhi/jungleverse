"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, PanelRight, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSolverStore } from "@/lib/stores/solver-store";
import {
  startSolve,
  getSolveStatus,
  getStrategies,
  getInfoSets,
  getEVComparison,
} from "@/lib/solver-api";
import { ConfigPanel } from "./config-panel";
import { SolveProgress } from "./solve-progress";
import { StrategyView } from "./strategy-view";
import { InfoPanel } from "./info-panel";

export function SolverShell() {
  const store = useSolverStore();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mobileConfigOpen, setMobileConfigOpen] = useState(false);
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);
  const [backendUp, setBackendUp] = useState<boolean | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(false);
  const [serverless, setServerless] = useState(false);
  const [iterLimits, setIterLimits] = useState<Record<string, number> | null>(null);

  // Health check on mount
  const checkBackend = useCallback(async () => {
    setCheckingBackend(true);
    try {
      const res = await fetch("/api/solver?action=health");
      setBackendUp(res.ok);
      if (res.ok) {
        const data = await res.json();
        if (data.serverless) setServerless(true);
        if (data.max_iterations) setIterLimits(data.max_iterations);
      }
    } catch {
      setBackendUp(false);
    } finally {
      setCheckingBackend(false);
    }
  }, []);

  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    store.setIsPolling(false);
  }, [store]);

  const fetchResults = useCallback(
    async (id: string) => {
      try {
        const [strategyRes, infoSetRes, evRes] = await Promise.all([
          getStrategies(id),
          getInfoSets(id),
          getEVComparison(id),
        ]);
        store.setStrategies(strategyRes.strategies);
        store.setInfoSetKeys(infoSetRes.info_set_keys);
        store.setEvComparison(evRes);
      } catch (err) {
        console.error("Failed to fetch results:", err);
        store.setError("Failed to fetch solve results");
      }
    },
    [store]
  );

  const startPolling = useCallback(
    (id: string) => {
      store.setIsPolling(true);
      pollRef.current = setInterval(async () => {
        try {
          const res = await getSolveStatus(id);
          store.setProgress(res.progress);
          store.setStatus(res.status);

          if (res.status === "completed") {
            stopPolling();
            store.setProgress(1);
            store.setEvP0(res.ev_p0);
            store.setExploitability(res.exploitability);
            await fetchResults(id);
          } else if (res.status === "failed") {
            stopPolling();
            store.setError(res.error ?? "Solve failed");
          } else if (res.status === "cancelled") {
            stopPolling();
          }
        } catch {
          stopPolling();
          store.setError("Lost connection to solver backend");
        }
      }, 500);
    },
    [store, stopPolling, fetchResults]
  );

  const handleSolve = useCallback(async () => {
    // Stop any existing poll
    stopPolling();

    // Reset previous results
    store.setError(null);
    store.setStrategies([]);
    store.setInfoSetKeys([]);
    store.setSelectedInfoSetKey(null);
    store.setEvComparison(null);
    store.setProgress(0);
    store.setEvP0(null);
    store.setExploitability(null);

    try {
      const res = await startSolve({
        variant: store.variant,
        num_iterations: store.numIterations,
        ...(store.variant === "nlhe_subgame"
          ? {
              board: store.board,
              range_p0: store.rangeP0,
              range_p1: store.rangeP1,
              pot: store.pot,
              stack: store.stack,
              bet_sizes: store.betSizes,
            }
          : {}),
      });

      store.setSolveId(res.solve_id);
      store.setStatus(res.status);
      setMobileConfigOpen(false);
      setBackendUp(true);

      if (res.status === "completed") {
        store.setProgress(1);
        store.setEvP0(res.ev_p0);
        store.setExploitability(res.exploitability);
        await fetchResults(res.solve_id);
      } else {
        startPolling(res.solve_id);
      }
    } catch (err) {
      store.setError(
        err instanceof Error ? err.message : "Failed to start solve"
      );
      store.setStatus("failed");
    }
  }, [store, startPolling, stopPolling, fetchResults]);

  const isSolving =
    store.status === "pending" || store.status === "running";

  return (
    <div className="container py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile config trigger */}
          <div className="lg:hidden">
            <Sheet open={mobileConfigOpen} onOpenChange={setMobileConfigOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Configuration</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <ConfigPanel onSolve={handleSolve} isSolving={isSolving} backendUp={backendUp} serverless={serverless} iterLimits={iterLimits} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div>
            <h1 className="font-display text-3xl uppercase tracking-widest text-primary">
              Solver
            </h1>
            <p className="text-sm text-muted-foreground">
              CFR Poker Strategy Solver
            </p>
          </div>
        </div>

        {/* Mobile info trigger */}
        <div className="lg:hidden">
          <Sheet open={mobileInfoOpen} onOpenChange={setMobileInfoOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <PanelRight className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Info</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <InfoPanel />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Progress bar */}
      {isSolving && (
        <div className="mb-4">
          <SolveProgress />
        </div>
      )}

      {/* Backend offline banner */}
      {backendUp === false && (
        <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-sm">
          <div className="flex items-start gap-3">
            <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div className="space-y-2">
              <p className="font-semibold text-amber-300">
                Solver backend not connected
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The CFR solver runs as a separate Python service. To use the
                solver, start the backend locally or deploy it:
              </p>
              <div className="rounded bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground">
                <p className="text-amber-400/80"># Local</p>
                <p>cd backend/solver</p>
                <p>pip install -r requirements.txt</p>
                <p>uvicorn main:app --port 8001</p>
                <p className="mt-2 text-amber-400/80"># Docker</p>
                <p>cd backend/solver</p>
                <p>docker build -t solver . && docker run -p 8001:8001 solver</p>
              </div>
              <p className="text-xs text-muted-foreground">
                For production, deploy to{" "}
                <span className="text-amber-400/80">Fly.io</span>,{" "}
                <span className="text-amber-400/80">Railway</span>, or{" "}
                <span className="text-amber-400/80">Render</span> and set the{" "}
                <code className="rounded bg-muted/40 px-1 py-0.5">
                  SOLVER_API_URL
                </code>{" "}
                env var in Vercel.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-1 text-xs"
                onClick={checkBackend}
                disabled={checkingBackend}
              >
                {checkingBackend ? (
                  <RefreshCw className="mr-1.5 h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-3 w-3" />
                )}
                Retry Connection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {store.error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {store.error}
        </div>
      )}

      {/* Completed indicator */}
      {store.status === "completed" && store.strategies.length > 0 && (
        <div className="mb-4 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs text-green-400">
          Solve complete — {store.strategies.length} strategies,{" "}
          {store.infoSetKeys.length} info sets
          {store.exploitability !== null && (
            <>, exploitability: {store.exploitability.toFixed(6)}</>
          )}
        </div>
      )}

      {/* 3-column layout */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr_300px]">
        {/* Left: Config (hidden on mobile, in Sheet instead) */}
        <aside className="hidden lg:block">
          <div className="sticky top-6">
            <ConfigPanel onSolve={handleSolve} isSolving={isSolving} backendUp={backendUp} serverless={serverless} iterLimits={iterLimits} />
          </div>
        </aside>

        {/* Center: Strategy View */}
        <main className="min-w-0">
          <StrategyView />
        </main>

        {/* Right: Info Panel (hidden on mobile, in Sheet instead) */}
        <aside className="hidden lg:block">
          <div className="sticky top-6">
            <InfoPanel />
          </div>
        </aside>
      </div>
    </div>
  );
}
