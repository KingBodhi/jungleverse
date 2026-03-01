"use client";

import React, { useMemo } from "react";
import {
  getRangeGridLabels,
  ACTION_COLORS,
  classifyAction,
  formatAction,
  handToClass,
} from "@/lib/solver-constants";
import { useSolverStore } from "@/lib/stores/solver-store";
import type { StrategyEntry } from "@/types/solver";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/** Build a CSS linear-gradient with hard color stops from action probabilities */
function buildGradient(actions: string[], probabilities: number[]): string {
  const segments: { color: string; pct: number }[] = [];
  for (let i = 0; i < actions.length; i++) {
    const prob = probabilities[i];
    if (prob < 0.005) continue;
    segments.push({
      color: ACTION_COLORS[classifyAction(actions[i])] ?? "#6b7280",
      pct: prob * 100,
    });
  }

  if (segments.length === 0) return "transparent";
  if (segments.length === 1) return segments[0].color;

  let cursor = 0;
  const stops: string[] = [];
  for (const seg of segments) {
    stops.push(`${seg.color} ${cursor}%`);
    cursor += seg.pct;
    stops.push(`${seg.color} ${cursor}%`);
  }
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

interface AggregatedCell {
  actions: string[];
  probabilities: number[];
  combos: StrategyEntry[];
}

/** Aggregate all combos of the same hand class into averaged probabilities */
function buildClassMap(strategies: StrategyEntry[]): Map<string, AggregatedCell> {
  const map = new Map<string, { entries: StrategyEntry[] }>();

  for (const s of strategies) {
    // NLHE info_set_key: "AhKh|board|history" — extract hand from first segment
    const parts = s.info_set_key.split("|");
    const hand = parts[0];
    const cls = handToClass(hand);
    const existing = map.get(cls);
    if (existing) {
      existing.entries.push(s);
    } else {
      map.set(cls, { entries: [s] });
    }
  }

  const result = new Map<string, AggregatedCell>();
  for (const [cls, { entries }] of map) {
    // Collect all unique actions
    const allActions = Array.from(new Set(entries.flatMap((e) => e.actions)));
    // Average probabilities across combos
    const avgProbs = allActions.map((action) => {
      const total = entries.reduce((sum, e) => {
        const idx = e.actions.indexOf(action);
        return sum + (idx >= 0 ? e.probabilities[idx] : 0);
      }, 0);
      return total / entries.length;
    });
    result.set(cls, { actions: allActions, probabilities: avgProbs, combos: entries });
  }
  return result;
}

const RangeCell = React.memo(function RangeCell({
  label,
  cell,
}: {
  label: string;
  cell: AggregatedCell | undefined;
}) {
  const selectedKey = useSolverStore((s) => s.selectedInfoSetKey);
  const setSelectedKey = useSolverStore((s) => s.setSelectedInfoSetKey);

  const isInRange = !!cell;
  const isSelected =
    cell && cell.combos.some((c) => c.info_set_key === selectedKey);

  const bg = isInRange
    ? buildGradient(cell.actions, cell.probabilities)
    : undefined;

  const cellBtn = (
    <button
      className={`
        flex aspect-square items-center justify-center rounded-[2px] text-[10px]
        font-semibold leading-none transition-all
        ${isInRange ? "text-white" : "bg-muted/20 text-muted-foreground/40"}
        ${isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}
        ${isInRange ? "hover:ring-1 hover:ring-primary/60 hover:brightness-110" : ""}
      `}
      style={isInRange ? { background: bg } : undefined}
      onClick={() => {
        if (cell && cell.combos.length > 0) {
          setSelectedKey(cell.combos[0].info_set_key);
        }
      }}
    >
      <span className={isInRange ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" : ""}>
        {label}
      </span>
    </button>
  );

  if (!isInRange) return cellBtn;

  return (
    <Popover>
      <PopoverTrigger asChild>{cellBtn}</PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-auto min-w-[160px] max-w-[220px] p-3 text-xs"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-sm font-bold">{label}</span>
          <span className="text-muted-foreground">
            {cell.combos.length} combo{cell.combos.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="space-y-1">
          {cell.actions.map((action, i) => {
            const prob = cell.probabilities[i];
            if (prob < 0.005) return null;
            const color = ACTION_COLORS[classifyAction(action)] ?? "#6b7280";
            return (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="flex-1">{formatAction(action)}</span>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted/40">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${prob * 100}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="w-8 text-right tabular-nums text-muted-foreground">
                    {Math.round(prob * 100)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
});

export function RangeGrid() {
  const strategies = useSolverStore((s) => s.strategies);
  const labels = useMemo(() => getRangeGridLabels(), []);
  const classMap = useMemo(() => buildClassMap(strategies), [strategies]);

  if (strategies.length === 0) return null;

  return (
    <div className="grid grid-cols-13 gap-[2px]">
      {labels.flat().map((label) => (
        <RangeCell key={label} label={label} cell={classMap.get(label)} />
      ))}
    </div>
  );
}
