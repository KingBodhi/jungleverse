import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Game, PokerRoom, CashGame, Tournament, Provider } from "@prisma/client";

interface RecommendationItem {
  game: Game & { pokerRoom: PokerRoom; cashGame: CashGame | null; tournament: Tournament | null };
  score: number;
  breakdown: {
    preferenceMatch: number;
    distanceScore: number;
    bankrollScore: number;
  };
  affordability?: {
    canAfford: boolean;
    ratio: number;
    provider: Provider;
  };
}

interface Props {
  recommendations: RecommendationItem[];
}

function formatBuyIn(game: RecommendationItem["game"]) {
  if (game.cashGame) {
    return `$${game.cashGame.minBuyin / 100}-$${game.cashGame.maxBuyin / 100}`;
  }
  if (game.tournament) {
    return `$${game.tournament.buyinAmount / 100}`;
  }
  return null;
}

export function RecommendationsPanel({ recommendations }: Props) {
  if (!recommendations.length) {
    return <Card><CardContent className="p-6 text-muted-foreground">No recommendations yet. Update your profile to get started.</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {recommendations.map((item) => (
        <Card key={item.game.id} className={item.affordability && !item.affordability.canAfford ? "opacity-60" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{item.game.pokerRoom.name}</CardTitle>
                {item.affordability && !item.affordability.canAfford && (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-600">
                    Over budget
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {item.game.pokerRoom.city}, {item.game.pokerRoom.country}
              </p>
            </div>
            <div className="text-right">
              <Badge variant="secondary">Score {item.score.toFixed(2)}</Badge>
              {formatBuyIn(item.game) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {item.game.gameType === "CASH" ? "Buy-in" : "Entry"}: {formatBuyIn(item.game)}
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Dist {Math.round(item.breakdown.distanceScore * 100)}%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Pref {Math.round(item.breakdown.preferenceMatch * 100)}%
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${item.breakdown.bankrollScore > 0.5 ? "bg-green-500" : "bg-amber-500"}`} />
                Bank {Math.round(item.breakdown.bankrollScore * 100)}%
              </span>
              <Link href={`/rooms/${item.game.pokerRoomId}`} className="text-primary ml-auto">
                View room →
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
