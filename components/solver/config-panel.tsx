"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw } from "lucide-react";
import { useSolverStore } from "@/lib/stores/solver-store";
import { VariantSelector } from "./variant-selector";
import { NlheConfigForm } from "./nlhe-config-form";

interface ConfigPanelProps {
  onSolve: () => void;
  isSolving: boolean;
  backendUp?: boolean | null;
  serverless?: boolean;
  iterLimits?: Record<string, number> | null;
}

export function ConfigPanel({ onSolve, isSolving, backendUp, serverless, iterLimits }: ConfigPanelProps) {
  const variant = useSolverStore((s) => s.variant);
  const numIterations = useSolverStore((s) => s.numIterations);
  const setNumIterations = useSolverStore((s) => s.setNumIterations);
  const reset = useSolverStore((s) => s.reset);

  const maxIter = iterLimits?.[variant] ?? 100_000;

  // Format iteration display: 1000 → "1K", 10000 → "10K"
  const formatIter = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
    return n.toString();
  };

  return (
    <Card className="hover:translate-y-0 hover:shadow-brand-soft">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-widest">
            Configuration
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={reset}
            title="Reset to defaults"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <VariantSelector />

        {variant === "nlhe_subgame" && <NlheConfigForm />}

        {variant !== "nlhe_subgame" && (
          <p className="rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {variant === "kuhn"
              ? "3-card poker (J, Q, K). Each player antes 1, gets 1 card. Simple yet illustrative."
              : "6-card poker (J, Q, K in 2 suits). Two betting streets with a community card."}
          </p>
        )}

        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Iterations</Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatIter(numIterations)}
            </span>
          </div>
          <Slider
            value={[Math.min(numIterations, maxIter)]}
            onValueChange={([v]) => setNumIterations(v)}
            min={100}
            max={maxIter}
            step={100}
            className="mt-2"
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground/50">
            <span>100</span>
            <span>{formatIter(maxIter)}</span>
          </div>
          {serverless && maxIter < 100_000 && (
            <p className="mt-1 text-[10px] text-amber-400/70">
              Serverless mode — iterations capped at {formatIter(maxIter)} for {variant}
            </p>
          )}
        </div>

        <Button
          onClick={onSolve}
          disabled={isSolving || backendUp === false}
          className="w-full"
          size="lg"
        >
          {isSolving ? (
            <>Solving...</>
          ) : backendUp === false ? (
            <>Backend Offline</>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Solve
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
