"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CashGameFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => router.push(`/cash-games?${params.toString()}`, { scroll: false }));
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Input
        placeholder="City"
        defaultValue={searchParams.get("city") ?? ""}
        onBlur={(event) => updateFilter("city", event.target.value)}
      />
      <Input
        placeholder="Country"
        defaultValue={searchParams.get("country") ?? ""}
        onBlur={(event) => updateFilter("country", event.target.value)}
      />
      <Input
        type="number"
        placeholder="Min stakes"
        defaultValue={searchParams.get("stakesMin") ?? ""}
        onBlur={(event) => updateFilter("stakesMin", event.target.value)}
      />
      <Input
        type="number"
        placeholder="Max stakes"
        defaultValue={searchParams.get("stakesMax") ?? ""}
        onBlur={(event) => updateFilter("stakesMax", event.target.value)}
      />
      <Button type="button" variant="outline" onClick={() => router.push("/cash-games")} disabled={isPending}>
        Reset
      </Button>
    </div>
  );
}
