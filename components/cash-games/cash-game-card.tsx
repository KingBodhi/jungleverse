import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { CashGameWithRoom } from "@/types";

export function CashGameCard({ game }: { game: CashGameWithRoom }) {
  const room = game.game.pokerRoom;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <Link href={`/cash-games/${game.id}`} className="hover:underline">
            {room.name}
          </Link>
          <Badge variant="secondary">
            {game.smallBlind}/{game.bigBlind}
          </Badge>
        </CardTitle>
        <CardDescription>
          {room.city}, {room.country} · Buy-in {game.minBuyin}-{game.maxBuyin}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {game.notes ?? "Reliable daily lineup"}
      </CardContent>
    </Card>
  );
}
