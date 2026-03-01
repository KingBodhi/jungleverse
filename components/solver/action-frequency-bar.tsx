"use client";

import { ACTION_COLORS, classifyAction, formatAction } from "@/lib/solver-constants";

interface ActionFrequencyBarProps {
  actions: string[];
  probabilities: number[];
}

export function ActionFrequencyBar({ actions, probabilities }: ActionFrequencyBarProps) {
  const segments = actions.map((action, i) => ({
    action,
    probability: probabilities[i] ?? 0,
    color: ACTION_COLORS[classifyAction(action)] ?? "#6b7280",
  })).filter((s) => s.probability > 0.005);

  if (segments.length === 0) return null;

  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded-md">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-[11px] font-semibold text-white transition-all"
            style={{
              width: `${seg.probability * 100}%`,
              backgroundColor: seg.color,
              minWidth: seg.probability > 0.06 ? "auto" : 0,
            }}
          >
            {seg.probability >= 0.08 && `${Math.round(seg.probability * 100)}%`}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: seg.color }}
            />
            <span>{formatAction(seg.action)}</span>
            <span className="tabular-nums font-medium text-foreground">
              {Math.round(seg.probability * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
