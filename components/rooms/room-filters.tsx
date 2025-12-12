"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function RoomFilters() {
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
    startTransition(() => {
      router.push(`/rooms?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Input
        defaultValue={searchParams.get("search") ?? ""}
        placeholder="Search keywords"
        onBlur={(event) => updateFilter("search", event.target.value)}
      />
      <Input
        defaultValue={searchParams.get("city") ?? ""}
        placeholder="City"
        onBlur={(event) => updateFilter("city", event.target.value)}
      />
      <Input
        defaultValue={searchParams.get("country") ?? ""}
        placeholder="Country"
        onBlur={(event) => updateFilter("country", event.target.value)}
      />
      <Button type="button" variant="outline" onClick={() => router.push("/rooms")} disabled={isPending}>
        Reset filters
      </Button>
    </div>
  );
}
