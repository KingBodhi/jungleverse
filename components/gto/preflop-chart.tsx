"use client";

import React, { useMemo } from "react";
import {
  getRangeGridLabels,
  ACTION_COLORS,
  classifyAction,
  formatAction,
} from "@/lib/solver-constants";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface GTOStrategyEntry {
  info_set_key: string;
  actions: string[];
  probabilities: number[];
}

interface CellData {
  actions: string[];
  probabilities: number[];
}

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

function buildHandMap(strategies: GTOStrategyEntry[]): Map<string, CellData> {
  const map = new Map<string, CellData>();
  for (const s of strategies) {
    map.set(s.info_set_key, {
      actions: s.actions,
      probabilities: s.probabilities,
    });
  }
  return map;
}

const GridCell = React.memo(function GridCell({
  label,
  cell,
}: {
  label: string;
  cell: CellData | undefined;
}) {
  const isInRange = !!cell;
  const bg = isInRange
    ? buildGradient(cell.actions, cell.probabilities)
    : undefined;

  const btn = (
    <button
      className={[
        "flex aspect-square items-center justify-center rounded-[2px] text-[10px] font-semibold leading-none transition-all",
        isInRange
          ? "text-white hover:ring-1 hover:ring-primary/60 hover:brightness-110"
          : "bg-muted/20 text-muted-foreground/40",
      ].join(" ")}
      style={isInRange ? { background: bg } : undefined}
    >
      <span className={isInRange ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" : ""}>
        {label}
      </span>
    </button>
  );

  if (!isInRange) return btn;

  return (
    <Popover>
      <PopoverTrigger asChild>{btn}</PopoverTrigger>
      <PopoverContent side="top" className="w-auto min-w-[160px] max-w-[220px] p-3 text-xs">
        <div className="mb-2 font-mono text-sm font-bold">{label}</div>
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

export function PreflopChart({ strategies }: { strategies: GTOStrategyEntry[] }) {
  const labels = useMemo(() => getRangeGridLabels(), []);
  const handMap = useMemo(() => buildHandMap(strategies), [strategies]);

  return (
    <div className="grid grid-cols-13 gap-[2px]">
      {labels.flat().map((label) => (
        <GridCell key={label} label={label} cell={handMap.get(label)} />
      ))}
    </div>
  );
}

export function GTOLegend() {
  const items = [
    { key: "raise", label: "Raise / 3-Bet" },
    { key: "call", label: "Call / Defend" },
    { key: "limp", label: "Limp" },
    { key: "fold", label: "Fold" },
  ];
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {items.map(({ key, label }) => (
        <div key={key} className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: ACTION_COLORS[classifyAction(key)] ?? "#6b7280" }}
          />
          <span className="text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}
