"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ACTION_COLORS,
  classifyAction,
  formatAction,
  parseCard,
  SUIT_COLORS,
} from "@/lib/solver-constants";
import { useSolverStore } from "@/lib/stores/solver-store";

/** Render a card string like "K" or "Jc" with colored suit symbol */
function CardBadge({ card }: { card: string }) {
  const parsed = parseCard(card);
  if (!parsed) {
    // Simple card like "J", "Q", "K" (Kuhn)
    return <span className="font-bold">{card}</span>;
  }
  return (
    <span className="inline-flex items-center font-mono font-bold">
      {parsed.rank}
      <span style={{ color: parsed.color }}>{parsed.symbol}</span>
    </span>
  );
}

/** Parse info set key and render it with card badges
 *  Kuhn: "K:" → [K] (empty history)
 *  Kuhn: "J:b" → [J] after bet
 *  Leduc: "Jc|Ks|cb" → [Jc] board [Ks] history cb */
function InfoSetLabel({ infoKey, variant }: { infoKey: string; variant: string }) {
  if (variant === "kuhn") {
    const [card, history] = infoKey.split(":");
    return (
      <span className="inline-flex items-center gap-1">
        <CardBadge card={card} />
        {history && (
          <span className="text-muted-foreground">{history}</span>
        )}
      </span>
    );
  }
  if (variant === "leduc") {
    const parts = infoKey.split("|");
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        <CardBadge card={parts[0]} />
        {parts[1] && (
          <>
            <span className="text-muted-foreground/60">/</span>
            <CardBadge card={parts[1]} />
          </>
        )}
        {parts[2] && (
          <span className="text-muted-foreground">{parts[2]}</span>
        )}
      </span>
    );
  }
  // NLHE
  const parts = infoKey.split("|");
  const hand = parts[0] ?? "";
  return (
    <span className="inline-flex flex-wrap items-center gap-0.5">
      {hand.match(/.{2}/g)?.map((c, i) => (
        <CardBadge key={i} card={c} />
      ))}
      {parts.length > 2 && parts[2] && (
        <span className="ml-1 text-muted-foreground">{parts[2]}</span>
      )}
    </span>
  );
}

export function CardStrategyTable() {
  const strategies = useSolverStore((s) => s.strategies);
  const variant = useSolverStore((s) => s.variant);
  const selectedInfoSetKey = useSolverStore((s) => s.selectedInfoSetKey);
  const setSelectedInfoSetKey = useSolverStore((s) => s.setSelectedInfoSetKey);

  if (strategies.length === 0) {
    return null;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[160px]">Info Set</TableHead>
          <TableHead>Strategy</TableHead>
          <TableHead className="w-[140px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {strategies.map((entry) => {
          const isSelected = selectedInfoSetKey === entry.info_set_key;
          return (
            <TableRow
              key={entry.info_set_key}
              className={`cursor-pointer ${isSelected ? "bg-primary/10" : ""}`}
              onClick={() => setSelectedInfoSetKey(entry.info_set_key)}
            >
              <TableCell className="text-xs">
                <div className="flex items-center gap-1.5">
                  <InfoSetLabel infoKey={entry.info_set_key} variant={variant} />
                  {entry.is_locked && (
                    <span className="rounded bg-primary/20 px-1 py-0.5 text-[9px] text-primary">
                      LOCKED
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {/* Inline stacked bar */}
                <div className="flex h-5 overflow-hidden rounded">
                  {entry.actions.map((action, i) => {
                    const prob = entry.probabilities[i];
                    if (prob < 0.005) return null;
                    const color =
                      ACTION_COLORS[classifyAction(action)] ?? "#6b7280";
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-center text-[9px] font-medium text-white transition-all"
                        style={{
                          width: `${prob * 100}%`,
                          backgroundColor: color,
                        }}
                        title={`${formatAction(action)}: ${Math.round(prob * 100)}%`}
                      >
                        {prob >= 0.15 && `${Math.round(prob * 100)}%`}
                      </div>
                    );
                  })}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-wrap justify-end gap-1">
                  {entry.actions.map((action, i) => {
                    const prob = entry.probabilities[i];
                    if (prob < 0.005) return null;
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center gap-0.5 text-[10px]"
                      >
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor:
                              ACTION_COLORS[classifyAction(action)] ?? "#6b7280",
                          }}
                        />
                        <span className="text-muted-foreground">
                          {formatAction(action)}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
