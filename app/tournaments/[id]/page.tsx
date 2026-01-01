import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { format } from "date-fns";
import { getTournamentById } from "@/lib/services/tournaments";
import type { TournamentWithRoom } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type RouteParams = { id: string };
type MaybePromise<T> = T | Promise<T>;

interface Props {
  params: MaybePromise<RouteParams>;
}

export const metadata: Metadata = {
  title: "Tournament Details — Global TH Index",
};

export default async function TournamentDetailPage({ params }: Props) {
  const resolvedParams = await resolveParams(params);
  const tournamentId = resolvedParams?.id ? decodeURIComponent(resolvedParams.id) : null;

  if (!tournamentId) {
    notFound();
  }

  const tournament = (await getTournamentById(tournamentId)) as TournamentWithRoom | null;

  if (!tournament) {
    notFound();
  }

  const room = tournament.game.pokerRoom;
  const formattedStart = format(new Date(tournament.startTime), "PPPp");

  return (
    <div className="container space-y-6 py-10">
      <div>
        <h1 className="text-4xl font-bold">
          {`${room.name} · $${tournament.buyinAmount.toLocaleString()}`}
        </h1>
        <p className="text-muted-foreground">
          {[room.city, room.state, room.country].filter(Boolean).join(", ")} · {formattedStart}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/tournaments">Back to tournaments</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/rooms/${room.id}`}>Visit room profile</Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Structure</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Stat
            label="Starting stack"
            value={
              typeof tournament.startingStack === "number"
                ? `${tournament.startingStack.toLocaleString()} chips`
                : "Stack TBD"
            }
          />
          <Stat
            label="Levels"
            value={
              typeof tournament.blindLevelMinutes === "number"
                ? `${tournament.blindLevelMinutes} minutes`
                : "Levels TBD"
            }
          />
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

async function resolveParams(input: MaybePromise<RouteParams>) {
  if (typeof (input as Promise<RouteParams>).then === "function") {
    return (input as Promise<RouteParams>);
  }

  return input as RouteParams;
}
