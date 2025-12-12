import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getTournamentById } from "@/lib/services/tournaments";
import type { TournamentWithRoom } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Props {
  params: { id: string };
}

export default async function TournamentDetailPage({ params }: Props) {
  const tournament = (await getTournamentById(params.id)) as TournamentWithRoom | null;
  if (!tournament) {
    notFound();
  }
  const room = tournament.game.pokerRoom;
  return (
    <div className="container space-y-6 py-10">
      <div>
        <h1 className="text-4xl font-bold">
          {room.name} · {"$"}
          {tournament.buyinAmount.toLocaleString()}
        </h1>
        <p className="text-muted-foreground">
          {room.city}, {room.country} · {format(new Date(tournament.startTime), "PPPp")}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Structure</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Stat label="Starting stack" value={`${tournament.startingStack} chips`} />
          <Stat label="Levels" value={`${tournament.blindLevelMinutes} minutes`} />
          <Stat label="Re-entry" value={tournament.reentryPolicy ?? "TBD"} />
          <Stat
            label="Bounty"
            value={tournament.bountyAmount ? `$${tournament.bountyAmount.toLocaleString()}` : "None"}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
