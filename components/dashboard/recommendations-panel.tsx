import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Game, PokerRoom, CashGame, Tournament } from "@prisma/client";

interface RecommendationItem {
  game: Game & { pokerRoom: PokerRoom; cashGame: CashGame | null; tournament: Tournament | null };
  score: number;
  breakdown: {
    preferenceMatch: number;
    distanceScore: number;
    bankrollScore: number;
  };
}

interface Props {
  recommendations: RecommendationItem[];
}

export function RecommendationsPanel({ recommendations }: Props) {
  if (!recommendations.length) {
    return <Card><CardContent className="p-6 text-muted-foreground">No recommendations yet. Update your profile to get started.</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {recommendations.map((item) => (
        <Card key={item.game.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>{item.game.pokerRoom.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {item.game.pokerRoom.city}, {item.game.pokerRoom.country}
              </p>
            </div>
            <Badge variant="secondary">Score {item.score.toFixed(2)}</Badge>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Distance {Math.round(item.breakdown.distanceScore * 100)}%</span>
            <span>Preference {Math.round(item.breakdown.preferenceMatch * 100)}%</span>
            <span>Bankroll {Math.round(item.breakdown.bankrollScore * 100)}%</span>
            <Link href={`/rooms/${item.game.pokerRoomId}`} className="text-primary">
              View room →
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
