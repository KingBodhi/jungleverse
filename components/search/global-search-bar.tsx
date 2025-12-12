"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function GlobalSearchBar() {
  const [value, setValue] = useState("");
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new URLSearchParams();
    if (value.trim()) {
      query.set("search", value.trim());
    }
    router.push(`/rooms?${query.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl items-center gap-2">
      <Input
        placeholder="Search poker rooms, cash games, tournaments..."
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <Button type="submit">Search</Button>
    </form>
  );
}
