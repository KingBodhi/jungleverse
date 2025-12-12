import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { RoomWithGames } from "@/types";

interface Props {
  room: RoomWithGames;
}

export function RoomCard({ room }: Props) {
  const cashGames = room.games.filter((game) => game.cashGame);
  const tournaments = room.games.filter((game) => game.tournament);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <Link href={`/rooms/${room.id}`} className="hover:underline">
            {room.name}
          </Link>
          <Badge variant="secondary">{room.city}</Badge>
        </CardTitle>
        <CardDescription>
          {room.brand ?? "Independent"} · {room.city}, {room.country}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {cashGames.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Cash action</p>
            <div className="flex flex-wrap gap-2 text-sm">
              {cashGames.map((game) => (
                <Badge key={game.id} variant="outline">
                  {game.cashGame?.smallBlind}/{game.cashGame?.bigBlind} blinds
                </Badge>
              ))}
            </div>
          </div>
        )}
        {tournaments.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Tournaments</p>
            <div className="flex flex-wrap gap-2 text-sm">
              {tournaments.map((game) => (
                <Badge key={game.id} variant="outline">
                  {"$"}
                  {game.tournament?.buyinAmount?.toLocaleString() ?? "?"} buy-in · {game.tournament?.blindLevelMinutes}m levels
                </Badge>
              ))}
            </div>
          </div>
        )}
        <div className="text-sm text-muted-foreground">
          {room.website ? <Link href={room.website}>Website</Link> : room.address}
        </div>
      </CardContent>
    </Card>
  );
}
