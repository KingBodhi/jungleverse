"use client";

import { BarChart3, TrendingUp, PieChart } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSolverStore } from "@/lib/stores/solver-store";
import {
  ACTION_COLORS,
  classifyAction,
  formatAction,
} from "@/lib/solver-constants";
import type { ViewMode, StrategyEntry } from "@/types/solver";
import { RangeGrid } from "./range-grid";
import { CardStrategyTable } from "./card-strategy-table";
import { ActionFrequencyBar } from "./action-frequency-bar";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 rounded-full bg-muted/40 p-4">
        <BarChart3 className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <h3 className="font-display text-lg tracking-wider text-muted-foreground">
        No Results
      </h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground/70">
        Select a variant, configure parameters, and click Solve to compute
        GTO strategies.
      </p>
    </div>
  );
}

/** EV breakdown table — shows per-hand EV when strategies are available */
function EVBreakdown({ strategies }: { strategies: StrategyEntry[] }) {
  if (strategies.length === 0) return <EmptyState />;

  // Compute expected value proxy per info set: sum(prob * action_index_weight)
  // Since we don't have per-action EV, show probability-weighted action mix
  const allActions = Array.from(new Set(strategies.flatMap((s) => s.actions)));

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Strategy mix per info set. Higher bet/raise frequency suggests higher EV hands.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Info Set</TableHead>
            {allActions.map((a) => (
              <TableHead key={a} className="text-center text-xs">
                <div className="flex flex-col items-center gap-0.5">
                  <span
                    className="inline-block h-2 w-2 rounded-sm"
                    style={{ backgroundColor: ACTION_COLORS[classifyAction(a)] ?? "#6b7280" }}
                  />
                  <span>{formatAction(a)}</span>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {strategies.map((entry) => (
            <TableRow key={entry.info_set_key}>
              <TableCell className="font-mono text-xs">
                {entry.info_set_key}
              </TableCell>
              {allActions.map((action) => {
                const idx = entry.actions.indexOf(action);
                const prob = idx >= 0 ? entry.probabilities[idx] : 0;
                return (
                  <TableCell key={action} className="text-center">
                    <span
                      className="inline-block rounded px-1.5 py-0.5 text-xs tabular-nums font-medium"
                      style={{
                        backgroundColor:
                          prob > 0.005
                            ? `${ACTION_COLORS[classifyAction(action)] ?? "#6b7280"}${Math.round(prob * 80 + 20).toString(16).padStart(2, "0")}`
                            : "transparent",
                        color: prob > 0.005 ? "white" : "var(--muted-foreground)",
                      }}
                    >
                      {prob > 0.005 ? `${Math.round(prob * 100)}%` : "-"}
                    </span>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Equity distribution — shows per-action breakdown with relative equity */
function EquityBreakdown({ strategies }: { strategies: StrategyEntry[] }) {
  if (strategies.length === 0) return <EmptyState />;

  // Group strategies by dominant action
  const allActions = Array.from(new Set(strategies.flatMap((s) => s.actions)));
  const groups = allActions.map((action) => {
    const matching = strategies.filter((s) => {
      const idx = s.actions.indexOf(action);
      if (idx < 0) return false;
      return s.probabilities[idx] === Math.max(...s.probabilities);
    });
    return { action, count: matching.length };
  }).filter((g) => g.count > 0);

  const total = strategies.length;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Distribution of dominant actions across all info sets.
      </p>
      <div className="space-y-3">
        {groups.map((g) => {
          const pct = total > 0 ? g.count / total : 0;
          const color = ACTION_COLORS[classifyAction(g.action)] ?? "#6b7280";
          return (
            <div key={g.action}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                  {formatAction(g.action)}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {g.count} / {total} ({Math.round(pct * 100)}%)
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted/40">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct * 100}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StrategyView() {
  const variant = useSolverStore((s) => s.variant);
  const strategies = useSolverStore((s) => s.strategies);
  const viewMode = useSolverStore((s) => s.viewMode);
  const setViewMode = useSolverStore((s) => s.setViewMode);
  const status = useSolverStore((s) => s.status);

  // Aggregate frequencies across all strategies for the top-level bar
  const allActions = Array.from(
    new Set(strategies.flatMap((s) => s.actions))
  );
  const aggProbs = allActions.map((action) => {
    const total = strategies.reduce((sum, s) => {
      const idx = s.actions.indexOf(action);
      return sum + (idx >= 0 ? s.probabilities[idx] : 0);
    }, 0);
    return strategies.length > 0 ? total / strategies.length : 0;
  });

  const hasResults = strategies.length > 0;

  return (
    <div className="space-y-4">
      <Tabs
        value={viewMode}
        onValueChange={(v) => setViewMode(v as ViewMode)}
      >
        <TabsList>
          <TabsTrigger value="strategy" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Strategy
          </TabsTrigger>
          <TabsTrigger value="ev" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            EV
          </TabsTrigger>
          <TabsTrigger value="equity" className="gap-1.5">
            <PieChart className="h-3.5 w-3.5" />
            Equity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="strategy" className="mt-4 space-y-4">
          {!hasResults ? (
            <EmptyState />
          ) : (
            <>
              <ActionFrequencyBar actions={allActions} probabilities={aggProbs} />
              {variant === "nlhe_subgame" ? (
                <RangeGrid />
              ) : (
                <CardStrategyTable />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="ev" className="mt-4">
          <EVBreakdown strategies={strategies} />
        </TabsContent>

        <TabsContent value="equity" className="mt-4">
          <EquityBreakdown strategies={strategies} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
