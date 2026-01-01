import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { TournamentWithRoom } from "@/types";

export function TournamentCard({ tournament }: { tournament: TournamentWithRoom }) {
  const room = tournament.game.pokerRoom;
  const stackLabel =
    typeof tournament.startingStack === "number"
      ? `${tournament.startingStack.toLocaleString()} stack`
      : "Stack TBD";
  const levelLabel =
    typeof tournament.blindLevelMinutes === "number"
      ? `${tournament.blindLevelMinutes}m levels`
      : "Levels TBD";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <Link href={`/tournaments/${tournament.id}`} className="hover:underline">
            {room.name} · {stackLabel}
          </Link>
          <Badge>{format(new Date(tournament.startTime), "MMM d")}</Badge>
        </CardTitle>
        <CardDescription>
          {room.city}, {room.country} · {levelLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3 text-sm">
        <Badge variant="outline">
          {"$"}
          {tournament.buyinAmount.toLocaleString()} + {tournament.rakeAmount ?? 0}
        </Badge>
        {tournament.reentryPolicy && <Badge variant="secondary">{tournament.reentryPolicy}</Badge>}
        {tournament.bountyAmount ? (
          <Badge variant="secondary">
            Bounty {"$"}
            {tournament.bountyAmount.toLocaleString()}
          </Badge>
        ) : null}
        {tournament.recurringRule && <span className="text-muted-foreground">{tournament.recurringRule}</span>}
      </CardContent>
    </Card>
  );
}
