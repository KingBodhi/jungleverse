import { Metadata } from "next";
import { listTournaments } from "@/lib/services/tournaments";
import type { TournamentWithRoom } from "@/types";
import { TournamentCard } from "@/components/tournaments/tournament-card";
import { TournamentFilters } from "@/components/tournaments/tournament-filters";
import { PaginationControls } from "@/components/pagination/pagination";

export const metadata: Metadata = {
  title: "Tournaments — Global TH Index",
};

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function TournamentsPage({ searchParams }: Props) {
  const data = await listTournaments(searchParams);
  const tournaments = data.items as TournamentWithRoom[];

  return (
    <div className="container space-y-8 py-10">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold">Upcoming tournaments</h1>
          <p className="text-muted-foreground">Filter by date range, buy-in, location, or structure.</p>
        </div>
        <TournamentFilters />
      </div>
      <div className="grid gap-4">
        {tournaments.map((tournament) => (
          <TournamentCard key={tournament.id} tournament={tournament} />
        ))}
      </div>
      <PaginationControls page={data.page} pages={data.pages} searchParams={searchParams} />
    </div>
  );
}
