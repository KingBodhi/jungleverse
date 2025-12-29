import { prisma } from "@/lib/prisma";
import { recommendationQuerySchema } from "@/lib/validators/recommendations";
import { scoreGameForUser, BankrollContext } from "@/lib/ranking";

export async function buildRecommendations(rawQuery: Record<string, unknown>) {
  const query = recommendationQuerySchema.parse(rawQuery);

  // Fetch user with bankroll accounts
  const user = await prisma.user.findUnique({
    where: { id: query.userId },
    include: {
      bankrollAccounts: {
        where: { isActive: true },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Build bankroll context
  const bankrollContext: BankrollContext = {
    accounts: user.bankrollAccounts,
    totalEffectiveBankroll: user.bankrollAccounts.reduce(
      (sum, acc) => sum + acc.balance + acc.depositTolerance,
      0
    ),
  };

  const games = await prisma.game.findMany({
    include: {
      pokerRoom: true,
      cashGame: true,
      tournament: true,
    },
  });

  const scored = games
    .map((game) => {
      const result = scoreGameForUser(
        user,
        { ...game, pokerRoom: game.pokerRoom },
        bankrollContext
      );
      return {
        game,
        ...result,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, query.limit);

  return scored;
}

export async function buildAffordableRecommendations(rawQuery: Record<string, unknown>) {
  const allRecs = await buildRecommendations(rawQuery);

  // Filter to only games user can afford
  return allRecs.filter((rec) => rec.affordability.canAfford);
}

export async function getRecommendationsByProvider(
  userId: string,
  provider: string,
  limit: number = 10
) {
  const recs = await buildRecommendations({ userId, limit: 100 });

  // Filter to games on specific provider
  return recs
    .filter((rec) => rec.affordability.provider === provider)
    .slice(0, limit);
}
