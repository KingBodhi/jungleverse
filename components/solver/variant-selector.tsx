"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSolverStore } from "@/lib/stores/solver-store";
import type { GameVariant } from "@/types/solver";

const variants: { value: GameVariant; label: string }[] = [
  { value: "kuhn", label: "Kuhn" },
  { value: "leduc", label: "Leduc" },
  { value: "nlhe_subgame", label: "NLHE Subgame" },
];

export function VariantSelector() {
  const variant = useSolverStore((s) => s.variant);
  const setVariant = useSolverStore((s) => s.setVariant);

  return (
    <Tabs
      value={variant}
      onValueChange={(v) => setVariant(v as GameVariant)}
    >
      <TabsList className="w-full">
        {variants.map((v) => (
          <TabsTrigger key={v.value} value={v.value} className="flex-1 text-xs">
            {v.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
