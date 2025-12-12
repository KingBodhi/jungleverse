"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TournamentFilters() {
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
    startTransition(() => router.push(`/tournaments?${params.toString()}`, { scroll: false }));
  }

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <Input
        type="date"
        defaultValue={searchParams.get("startDate") ?? ""}
        onChange={(event) => updateFilter("startDate", event.target.value ? formatISO(new Date(event.target.value)) : "")}
        placeholder="Start date"
      />
      <Input
        type="date"
        defaultValue={searchParams.get("endDate") ?? ""}
        onChange={(event) => updateFilter("endDate", event.target.value ? formatISO(new Date(event.target.value)) : "")}
        placeholder="End date"
      />
      <Input
        type="number"
        placeholder="Min buy-in"
        defaultValue={searchParams.get("minBuyin") ?? ""}
        onBlur={(event) => updateFilter("minBuyin", event.target.value)}
      />
      <Input
        type="number"
        placeholder="Max buy-in"
        defaultValue={searchParams.get("maxBuyin") ?? ""}
        onBlur={(event) => updateFilter("maxBuyin", event.target.value)}
      />
      <Input
        placeholder="Region or city"
        defaultValue={searchParams.get("region") ?? ""}
        onBlur={(event) => updateFilter("region", event.target.value)}
      />
      <Button type="button" variant="outline" onClick={() => router.push("/tournaments")} disabled={isPending}>
        Clear filters
      </Button>
    </div>
  );
}
