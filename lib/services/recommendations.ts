import { prisma } from "@/lib/prisma";
import { recommendationQuerySchema } from "@/lib/validators/recommendations";
import { scoreGameForUser } from "@/lib/ranking";

export async function buildRecommendations(rawQuery: Record<string, unknown>) {
  const query = recommendationQuerySchema.parse(rawQuery);
  const user = await prisma.user.findUnique({ where: { id: query.userId } });
  if (!user) {
    throw new Error("User not found");
  }

  const games = await prisma.game.findMany({
    include: {
      pokerRoom: true,
      cashGame: true,
      tournament: true,
    },
  });

  const scored = games
    .map((game) => ({
      game,
      ...scoreGameForUser(user, { ...game, pokerRoom: game.pokerRoom }),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, query.limit);

  return scored;
}
