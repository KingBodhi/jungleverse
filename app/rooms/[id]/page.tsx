import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getRoomById } from "@/lib/services/rooms";
import type { RoomWithGames } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Props {
  params: { id: string };
}

export default async function RoomDetailPage({ params }: Props) {
  const room = (await getRoomById(params.id)) as RoomWithGames | null;
  if (!room) {
    notFound();
  }

  const cashGames = room.games.filter((game) => game.cashGame);
  const tournaments = room.games.filter((game) => game.tournament);

  return (
    <div className="container space-y-8 py-10">
      <div>
        <h1 className="text-4xl font-bold">{room.name}</h1>
        <p className="text-muted-foreground">
          {room.address ? `${room.address}, ` : ""}
          {room.city}, {room.state ? `${room.state}, ` : ""}
          {room.country}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {room.website && (
            <Badge asChild>
              <a href={room.website} target="_blank" rel="noreferrer">
                Website
              </a>
            </Badge>
          )}
          {room.phone && <Badge variant="secondary">{room.phone}</Badge>}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cash games</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cashGames.length === 0 && <p className="text-sm text-muted-foreground">No cash lineup published.</p>}
            {cashGames.map((game) => (
              <div key={game.id} className="rounded-lg border p-4">
                <p className="font-medium">
                  {game.cashGame?.smallBlind}/{game.cashGame?.bigBlind} blinds
                </p>
                <p className="text-sm text-muted-foreground">
                  Buy-in {game.cashGame?.minBuyin}-{game.cashGame?.maxBuyin}
                </p>
                {game.cashGame?.notes && <p className="text-sm">{game.cashGame.notes}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tournaments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tournaments.length === 0 && <p className="text-sm text-muted-foreground">No tournaments posted.</p>}
            {tournaments.map((game) => (
              <div key={game.id} className="rounded-lg border p-4">
                <p className="font-medium">
                  {"$"}
                  {game.tournament?.buyinAmount?.toLocaleString()} buy-in · {game.tournament?.blindLevelMinutes}m
                </p>
                <p className="text-sm text-muted-foreground">
                  Starts {game.tournament?.startTime ? format(new Date(game.tournament.startTime), "MMM d, p") : "TBA"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
