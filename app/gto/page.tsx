"use client";

import { useEffect, useState, useCallback } from "react";
import { PreflopChart, GTOLegend, type GTOStrategyEntry } from "@/components/gto/preflop-chart";
import { Button } from "@/components/ui/button";
import type { Position, Scenario } from "@/lib/gto/types";

const POSITIONS: Position[] = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];

const BB_DEFENSE_SOURCES: Position[] = ["UTG", "HJ", "CO", "BTN"];

type ChartKey = { position: Position; scenario: Scenario; vsPosition?: Position };

function labelFor(key: ChartKey): string {
  if (key.scenario === "rfi") return `${key.position} Open (RFI)`;
  if (key.scenario === "bb_defense") return `BB vs ${key.vsPosition} Open`;
  return `${key.position} ${key.scenario}`;
}

export default function GTOPage() {
  const [selected, setSelected] = useState<ChartKey>({ position: "BTN", scenario: "rfi" });
  const [strategies, setStrategies] = useState<GTOStrategyEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ totalHands: number; stackDepth: number } | null>(null);

  const fetchChart = useCallback(async (key: ChartKey) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ position: key.position, scenario: key.scenario });
      if (key.vsPosition) params.set("vsPosition", key.vsPosition);
      const res = await fetch(`/api/gto/preflop?${params}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to load chart");
      }
      const data = await res.json();
      setStrategies(data.strategies);
      setMeta({ totalHands: data.totalHands, stackDepth: data.stackDepth });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStrategies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChart(selected);
  }, [selected, fetchChart]);

  const selectRFI = (pos: Position) => {
    if (pos === "BB") return;
    setSelected({ position: pos, scenario: "rfi" });
  };

  const selectBBDefense = (vs: Position) => {
    setSelected({ position: "BB", scenario: "bb_defense", vsPosition: vs });
  };

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-widest text-secondary">
          GTO Preflop Charts
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          6-max NLHE · 100bb effective · Game Theory Optimal frequencies
        </p>
      </div>

      {/* Scenario selector */}
      <div className="space-y-3">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Open Raise First In (RFI)
          </p>
          <div className="flex flex-wrap gap-2">
            {POSITIONS.filter((p) => p !== "BB").map((pos) => (
              <Button
                key={pos}
                size="sm"
                variant={selected.scenario === "rfi" && selected.position === pos ? "default" : "outline"}
                onClick={() => selectRFI(pos)}
              >
                {pos}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            BB Defense (vs Open)
          </p>
          <div className="flex flex-wrap gap-2">
            {BB_DEFENSE_SOURCES.map((vs) => (
              <Button
                key={vs}
                size="sm"
                variant={
                  selected.scenario === "bb_defense" && selected.vsPosition === vs
                    ? "default"
                    : "outline"
                }
                onClick={() => selectBBDefense(vs)}
              >
                vs {vs}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{labelFor(selected)}</h2>
          {meta && (
            <p className="text-xs text-muted-foreground">
              {meta.totalHands} hands in range · {meta.stackDepth}bb effective
            </p>
          )}
        </div>
        <GTOLegend />
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-border/60 bg-card p-4">
        {loading && (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Loading...
          </div>
        )}
        {error && (
          <div className="flex h-32 items-center justify-center text-sm text-destructive">
            {error}
          </div>
        )}
        {!loading && !error && <PreflopChart strategies={strategies} />}
      </div>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground">
        Frequencies approximate standard solver outputs (GTO Wizard / PioSolver) for 6-max NLHE.
        Mixed strategies reflect equilibrium mixing at 100bb. Use as a baseline — adjust for
        exploitative play against population tendencies.
      </p>
    </div>
  );
}
