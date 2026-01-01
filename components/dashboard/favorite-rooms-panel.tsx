import Link from "next/link";
import { FavoriteButton } from "@/components/rooms/favorite-button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { FavoriteRoomWithDetails } from "@/types";

interface FavoriteRoomsPanelProps {
  favorites: FavoriteRoomWithDetails[];
}

export function FavoriteRoomsPanel({ favorites }: FavoriteRoomsPanelProps) {
  if (favorites.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saved rooms</CardTitle>
          <CardDescription>Tap the heart on any room to store it here.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No favorites yet. Head to the rooms directory and save a few go-to spots.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved rooms</CardTitle>
        <CardDescription>Quick links to clubs you trust.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {favorites.map((favorite) => {
          const firstGame = favorite.pokerRoom.games[0];
          const summary = firstGame?.cashGame
            ? `$${firstGame.cashGame.smallBlind}/$${firstGame.cashGame.bigBlind} cash`
            : firstGame?.tournament
            ? `$${firstGame.tournament.buyinAmount?.toLocaleString() ?? "?"} · ${
                typeof firstGame.tournament.blindLevelMinutes === "number"
                  ? `${firstGame.tournament.blindLevelMinutes}m`
                  : "Levels TBD"
              }`
            : null;

          return (
            <div key={favorite.id} className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div>
                <Link
                  href={`/rooms/${favorite.pokerRoom.id}`}
                  className="font-medium hover:underline"
                >
                  {favorite.pokerRoom.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {favorite.pokerRoom.city}, {favorite.pokerRoom.country}
                </p>
                {summary ? <p className="text-xs text-muted-foreground">{summary}</p> : null}
              </div>
              <FavoriteButton roomId={favorite.pokerRoom.id} initialIsFavorite />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
