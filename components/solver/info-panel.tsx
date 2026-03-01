"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Lock, RefreshCw, Search, Wifi, WifiOff } from "lucide-react";
import { useSolverStore } from "@/lib/stores/solver-store";
import {
  applyNodeLock,
  getSolveStatus,
  getStrategies,
  getInfoSets,
  getEVComparison,
} from "@/lib/solver-api";
import {
  inferPlayer,
  formatAction,
  ACTION_COLORS,
  classifyAction,
  parseCard,
  SUIT_SYMBOLS,
  SUIT_COLORS,
} from "@/lib/solver-constants";

/** Small colored card badge for board display */
function CardChip({ card }: { card: string }) {
  const parsed = parseCard(card);
  if (!parsed) return <span className="font-mono font-bold">{card}</span>;
  return (
    <span className="inline-flex items-center rounded bg-muted/60 px-1 py-0.5 font-mono text-xs font-bold">
      {parsed.rank}
      <span style={{ color: parsed.color }}>{parsed.symbol}</span>
    </span>
  );
}

export function InfoPanel() {
  const variant = useSolverStore((s) => s.variant);
  const status = useSolverStore((s) => s.status);
  const solveId = useSolverStore((s) => s.solveId);
  const evP0 = useSolverStore((s) => s.evP0);
  const exploitability = useSolverStore((s) => s.exploitability);
  const strategies = useSolverStore((s) => s.strategies);
  const infoSetKeys = useSolverStore((s) => s.infoSetKeys);
  const selectedInfoSetKey = useSolverStore((s) => s.selectedInfoSetKey);
  const setSelectedInfoSetKey = useSolverStore((s) => s.setSelectedInfoSetKey);
  const selectedPlayer = useSolverStore((s) => s.selectedPlayer);
  const setSelectedPlayer = useSolverStore((s) => s.setSelectedPlayer);
  const evComparison = useSolverStore((s) => s.evComparison);
  const numIterations = useSolverStore((s) => s.numIterations);
  const board = useSolverStore((s) => s.board);
  const pot = useSolverStore((s) => s.pot);
  const stack = useSolverStore((s) => s.stack);
  const setStatus = useSolverStore((s) => s.setStatus);
  const setStrategies = useSolverStore((s) => s.setStrategies);
  const setInfoSetKeys = useSolverStore((s) => s.setInfoSetKeys);
  const setEvComparison = useSolverStore((s) => s.setEvComparison);
  const setEvP0 = useSolverStore((s) => s.setEvP0);
  const setExploitability = useSolverStore((s) => s.setExploitability);
  const setProgress = useSolverStore((s) => s.setProgress);
  const setError = useSolverStore((s) => s.setError);

  // Node lock local state
  const [lockEnabled, setLockEnabled] = useState(false);
  const [lockProbs, setLockProbs] = useState<number[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [backendUp, setBackendUp] = useState<boolean | null>(null);

  // Health check
  useEffect(() => {
    fetch("/api/solver?action=health")
      .then((r) => setBackendUp(r.ok))
      .catch(() => setBackendUp(false));
  }, [solveId]);

  // Get the selected strategy entry
  const selectedEntry = strategies.find(
    (s) => s.info_set_key === selectedInfoSetKey
  );

  // Reset lock state when selected entry changes
  useEffect(() => {
    setLockEnabled(false);
    if (selectedEntry) {
      setLockProbs([...selectedEntry.probabilities]);
    }
  }, [selectedInfoSetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update lock prob without normalizing during drag — normalize on apply
  const updateLockProb = (idx: number, value: number) => {
    const newProbs = [...lockProbs];
    newProbs[idx] = value;
    setLockProbs(newProbs);
  };

  // Normalize probs to sum to 1.0
  const normalizeProbs = (probs: number[]): number[] => {
    const total = probs.reduce((a, b) => a + b, 0);
    if (total <= 0) return probs.map(() => 1 / probs.length);
    return probs.map((p) => p / total);
  };

  const handleApplyLock = async () => {
    if (!solveId || !selectedInfoSetKey || lockProbs.length === 0) return;
    setIsApplying(true);
    setError(null);

    const normalized = normalizeProbs(lockProbs);

    try {
      const res = await applyNodeLock({
        solve_id: solveId,
        locks: { [selectedInfoSetKey]: normalized },
        resolve_iterations: numIterations,
      });

      // The backend re-runs the solve — poll until done
      if (res.status === "running") {
        setStatus("running");
        setProgress(0);

        const poll = async () => {
          const maxAttempts = 120; // 60 seconds max
          for (let i = 0; i < maxAttempts; i++) {
            await new Promise((r) => setTimeout(r, 500));
            try {
              const statusRes = await getSolveStatus(solveId);
              setProgress(statusRes.progress);
              if (statusRes.status === "completed") {
                setStatus("completed");
                setProgress(1);
                setEvP0(statusRes.ev_p0);
                setExploitability(statusRes.exploitability);
                // Fetch updated results
                const [stratRes, infoRes, evRes] = await Promise.all([
                  getStrategies(solveId),
                  getInfoSets(solveId),
                  getEVComparison(solveId),
                ]);
                setStrategies(stratRes.strategies);
                setInfoSetKeys(infoRes.info_set_keys);
                setEvComparison(evRes);
                return;
              }
              if (statusRes.status === "failed") {
                setStatus("failed");
                setError(statusRes.error ?? "Re-solve failed");
                return;
              }
            } catch {
              setError("Lost connection during re-solve");
              return;
            }
          }
          setError("Re-solve timed out");
        };
        await poll();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Node lock failed");
    } finally {
      setIsApplying(false);
    }
  };

  // Filter info set keys by selected player using inferPlayer
  const filteredKeys = infoSetKeys.filter((key) => {
    const player = inferPlayer(key, variant);
    if (player !== selectedPlayer) return false;
    if (searchQuery) {
      return key.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Board cards for NLHE display
  const boardCards = variant === "nlhe_subgame" && board
    ? board.match(/.{2}/g) ?? []
    : [];

  return (
    <div className="space-y-4">
      {/* Game State */}
      <Card className="hover:translate-y-0 hover:shadow-brand-soft">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-widest">
              Game State
            </CardTitle>
            {backendUp !== null && (
              <div className="flex items-center gap-1 text-[10px]" title={backendUp ? "Backend connected" : "Backend offline"}>
                {backendUp ? (
                  <Wifi className="h-3 w-3 text-green-400" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-400" />
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Variant</span>
            <span className="font-mono capitalize">
              {variant.replace(/_/g, " ")}
            </span>
          </div>
          {status && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span
                className={`font-mono capitalize ${
                  status === "completed"
                    ? "text-green-400"
                    : status === "failed"
                    ? "text-red-400"
                    : status === "running"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {status}
              </span>
            </div>
          )}
          {variant === "nlhe_subgame" && boardCards.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Board</span>
              <div className="flex gap-0.5">
                {boardCards.map((c, i) => (
                  <CardChip key={i} card={c} />
                ))}
              </div>
            </div>
          )}
          {variant === "nlhe_subgame" && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pot</span>
                <span className="tabular-nums">{pot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Eff. Stack</span>
                <span className="tabular-nums">{stack}</span>
              </div>
            </>
          )}
          {evP0 !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">EV (P0)</span>
              <span className={`tabular-nums ${evP0 >= 0 ? "text-green-400" : "text-red-400"}`}>
                {evP0 >= 0 ? "+" : ""}{evP0.toFixed(4)}
              </span>
            </div>
          )}
          {exploitability !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Exploitability</span>
              <span className="tabular-nums">
                {exploitability.toFixed(6)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Info Sets</span>
            <span className="tabular-nums">{infoSetKeys.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* EV Comparison */}
      {evComparison && (
        <Card className="hover:translate-y-0 hover:shadow-brand-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-widest">
              EV Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-muted/40 p-2.5 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">GTO P0</div>
                <div className={`mt-1 font-mono text-sm font-semibold tabular-nums ${evComparison.gto_ev_p0 >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {evComparison.gto_ev_p0 >= 0 ? "+" : ""}{evComparison.gto_ev_p0.toFixed(4)}
                </div>
              </div>
              <div className="rounded-md bg-muted/40 p-2.5 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">GTO P1</div>
                <div className={`mt-1 font-mono text-sm font-semibold tabular-nums ${evComparison.gto_ev_p1 >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {evComparison.gto_ev_p1 >= 0 ? "+" : ""}{evComparison.gto_ev_p1.toFixed(4)}
                </div>
              </div>
              <div className="rounded-md bg-muted/40 p-2.5 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">BR P0</div>
                <div className={`mt-1 font-mono text-sm font-semibold tabular-nums ${evComparison.br_ev_p0 >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {evComparison.br_ev_p0 >= 0 ? "+" : ""}{evComparison.br_ev_p0.toFixed(4)}
                </div>
              </div>
              <div className="rounded-md bg-muted/40 p-2.5 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">BR P1</div>
                <div className={`mt-1 font-mono text-sm font-semibold tabular-nums ${evComparison.br_ev_p1 >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {evComparison.br_ev_p1 >= 0 ? "+" : ""}{evComparison.br_ev_p1.toFixed(4)}
                </div>
              </div>
            </div>
            <Separator className="my-2.5" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Exploitability</span>
              <span className="tabular-nums font-mono font-semibold">
                {evComparison.exploitability.toFixed(6)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spot Navigator */}
      {infoSetKeys.length > 0 && (
        <Card className="hover:translate-y-0 hover:shadow-brand-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-widest">
              Spot Navigator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant={selectedPlayer === 0 ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setSelectedPlayer(0)}
              >
                P0 (OOP)
              </Button>
              <Button
                variant={selectedPlayer === 1 ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setSelectedPlayer(1)}
              >
                P1 (IP)
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter info sets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-7 text-xs"
              />
            </div>

            <div className="text-[10px] text-muted-foreground">
              {filteredKeys.length} of {infoSetKeys.length} info sets
            </div>

            <ScrollArea className="h-[200px]">
              <div className="space-y-0.5 pr-2">
                {filteredKeys.map((key) => {
                  const entry = strategies.find((s) => s.info_set_key === key);
                  return (
                    <button
                      key={key}
                      className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left font-mono text-xs transition-colors ${
                        selectedInfoSetKey === key
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedInfoSetKey(key)}
                    >
                      <span className="flex-1 truncate">{key}</span>
                      {entry?.is_locked && (
                        <Lock className="h-2.5 w-2.5 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })}
                {filteredKeys.length === 0 && (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    No info sets match
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Selected Info Set Detail */}
      {selectedEntry && (
        <Card className="hover:translate-y-0 hover:shadow-brand-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-mono truncate">
              {selectedEntry.info_set_key}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedEntry.actions.map((action, i) => {
              const prob = selectedEntry.probabilities[i];
              const color = ACTION_COLORS[classifyAction(action)] ?? "#6b7280";
              return (
                <div key={i} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
                      {formatAction(action)}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {Math.round(prob * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${prob * 100}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Node Lock Controls */}
      {selectedEntry && (
        <Card className="hover:translate-y-0 hover:shadow-brand-soft">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-widest">
                Node Lock
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="lock-toggle" className="text-xs text-muted-foreground">
                  Lock
                </Label>
                <Switch
                  id="lock-toggle"
                  checked={lockEnabled}
                  onCheckedChange={(checked) => {
                    setLockEnabled(checked);
                    if (checked && selectedEntry) {
                      setLockProbs([...selectedEntry.probabilities]);
                    }
                  }}
                />
              </div>
            </div>
          </CardHeader>
          {lockEnabled && (
            <CardContent className="space-y-3">
              <div className="space-y-2.5">
                {selectedEntry.actions.map((action, i) => {
                  const color = ACTION_COLORS[classifyAction(action)] ?? "#6b7280";
                  const raw = lockProbs[i] ?? 0;
                  const total = lockProbs.reduce((a, b) => a + b, 0);
                  const displayPct = total > 0 ? Math.round((raw / total) * 100) : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
                          {formatAction(action)}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {displayPct}%
                        </span>
                      </div>
                      <Slider
                        value={[raw]}
                        onValueChange={([v]) => updateLockProb(i, v)}
                        min={0}
                        max={1}
                        step={0.01}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Preview bar */}
              <div className="flex h-4 overflow-hidden rounded">
                {selectedEntry.actions.map((action, i) => {
                  const raw = lockProbs[i] ?? 0;
                  const total = lockProbs.reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? (raw / total) * 100 : 0;
                  if (pct < 0.5) return null;
                  return (
                    <div
                      key={i}
                      className="transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: ACTION_COLORS[classifyAction(action)] ?? "#6b7280",
                      }}
                    />
                  );
                })}
              </div>

              <Button
                onClick={handleApplyLock}
                disabled={isApplying}
                className="w-full"
                size="sm"
              >
                {isApplying ? (
                  <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-3 w-3" />
                )}
                {isApplying ? "Re-solving..." : "Apply Lock & Re-solve"}
              </Button>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
