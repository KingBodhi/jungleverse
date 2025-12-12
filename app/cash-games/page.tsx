import { Metadata } from "next";
import { listCashGames } from "@/lib/services/cash-games";
import type { CashGameWithRoom } from "@/types";
import { CashGameCard } from "@/components/cash-games/cash-game-card";
import { CashGameFilters } from "@/components/cash-games/cash-game-filters";
import { PaginationControls } from "@/components/pagination/pagination";

export const metadata: Metadata = {
  title: "Cash games — Global TH Index",
};

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function CashGamesPage({ searchParams }: Props) {
  const data = await listCashGames(searchParams);
  const games = data.items as CashGameWithRoom[];

  return (
    <div className="container space-y-8 py-10">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold">Cash Games</h1>
          <p className="text-muted-foreground">Filter by stakes, region, or room.</p>
        </div>
        <CashGameFilters />
      </div>
      <div className="grid gap-4">
        {games.map((game) => (
          <CashGameCard key={game.id} game={game} />
        ))}
      </div>
      <PaginationControls page={data.page} pages={data.pages} searchParams={searchParams} />
    </div>
  );
}
