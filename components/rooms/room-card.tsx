import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FavoriteButton } from "@/components/rooms/favorite-button";
import type { RoomWithGames } from "@/types";

interface Props {
  room: RoomWithGames;
  currentUserId?: string;
  initialIsFavorite?: boolean;
}

export function RoomCard({ room, currentUserId, initialIsFavorite = false }: Props) {
  const cashGames = room.games.filter((game) => game.cashGame);
  const tournaments = room.games.filter((game) => game.tournament);

  return (
    <Card className="h-full">
      <CardHeader className="py-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0">
            <CardTitle className="flex items-center justify-between gap-2 text-lg">
              <Link href={`/rooms/${room.id}`} className="hover:underline">
                {room.name}
              </Link>
              <Badge variant="secondary" className="text-xs">{room.city}</Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              {room.brand ?? "Independent"} · {room.city}, {room.country}
            </CardDescription>
          </div>
          {currentUserId ? (
            <div className="shrink-0">
              <FavoriteButton roomId={room.id} initialIsFavorite={initialIsFavorite} />
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 py-3 px-4 text-sm">
        {cashGames.length > 0 && (
          <div>
            <p className="font-medium text-muted-foreground">Cash action</p>
            <div className="flex flex-wrap gap-1">
              {cashGames.map((game) => (
                <Badge key={game.id} variant="outline" className="text-xs py-0 px-1">
                  {game.cashGame?.smallBlind}/{game.cashGame?.bigBlind}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {tournaments.length > 0 && (
          <div>
            <p className="font-medium text-muted-foreground">Tournaments</p>
            <div className="flex flex-wrap gap-1">
              {tournaments.map((game) => (
                <Badge key={game.id} variant="outline" className="text-xs py-0 px-1">
                  {"$"}
                  {game.tournament?.buyinAmount?.toLocaleString() ?? "?"}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {room.website && (
          <div className="text-xs text-muted-foreground">
            <Link href={room.website} target="_blank" rel="noreferrer" className="hover:underline">
              Visit Website
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
