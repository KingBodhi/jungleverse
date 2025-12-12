import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cashGameFilterSchema, cashGamePayloadSchema } from "@/lib/validators/cash-games";
import type { CashGameWithRoom } from "@/types";

export async function listCashGames(rawQuery: Record<string, unknown>) {
  const query = cashGameFilterSchema.parse(rawQuery);
  const where: Prisma.CashGameWhereInput = {
    ...(query.roomId ? { game: { pokerRoomId: query.roomId } } : {}),
    ...(query.city
      ? { game: { pokerRoom: { city: { contains: query.city, mode: "insensitive" } } } }
      : {}),
    ...(query.country
      ? { game: { pokerRoom: { country: { contains: query.country, mode: "insensitive" } } } }
      : {}),
    ...(query.stakesMin ? { minBuyin: { gte: query.stakesMin } } : {}),
    ...(query.stakesMax ? { maxBuyin: { lte: query.stakesMax } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.cashGame.findMany({
      where,
      include: { game: { include: { pokerRoom: true } } },
      orderBy: { createdAt: "desc" },
      take: query.limit,
      skip: (query.page - 1) * query.limit,
    }) as Promise<CashGameWithRoom[]>,
    prisma.cashGame.count({ where }),
  ]);

  return { items, total, page: query.page, pages: Math.ceil(total / query.limit) };
}

export async function createCashGame(input: unknown) {
  const payload = cashGamePayloadSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const game = await tx.game.create({
      data: {
        pokerRoomId: payload.pokerRoomId,
        gameType: "CASH",
      },
    });

    return tx.cashGame.create({
      data: {
        ...payload,
        gameId: game.id,
      },
      include: { game: { include: { pokerRoom: true } } },
    });
  });
}

export async function getCashGameById(id: string) {
  return prisma.cashGame.findUnique({
    where: { id },
    include: { game: { include: { pokerRoom: true } } },
  });
}
