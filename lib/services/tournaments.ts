import { Prisma } from "@prisma/client";
import { formatISO } from "date-fns";
import { prisma } from '../prisma';
import { haversineDistanceKm } from "@/lib/geo";
import { tournamentFilterSchema, tournamentPayloadSchema } from '../validators/tournaments';
import type { TournamentWithRoom } from '../../types';

export async function listTournaments(rawQuery: Record<string, unknown>) {
  const query = tournamentFilterSchema.parse(rawQuery);
  const startTimeFilter: Prisma.DateTimeFilter = {};
  if (query.startDate) {
    startTimeFilter.gte = new Date(query.startDate);
  }
  if (query.endDate) {
    startTimeFilter.lte = new Date(query.endDate);
  }

  const where: Prisma.TournamentWhereInput = {
    ...(Object.keys(startTimeFilter).length ? { startTime: startTimeFilter } : {}),
    ...(query.minBuyin ? { buyinAmount: { gte: query.minBuyin } } : {}),
    ...(query.maxBuyin ? { buyinAmount: { lte: query.maxBuyin } } : {}),
    ...(query.region
      ? {
          game: {
            pokerRoom: {
              OR: [
                { city: { contains: query.region, mode: "insensitive" } },
                { country: { contains: query.region, mode: "insensitive" } },
              ],
            },
          },
        }
      : {}),
  };

  const rows = (await prisma.tournament.findMany({
    where,
    include: { game: { include: { pokerRoom: true } } },
    orderBy: { startTime: "asc" },
  })) as TournamentWithRoom[];

  const filtered = query.radiusKm && query.latitude && query.longitude
    ? rows.filter((row) => {
        const room = row.game.pokerRoom;
        if (!room.latitude || !room.longitude) return false;
        return (
          haversineDistanceKm(
            { lat: query.latitude!, lng: query.longitude! },
            { lat: room.latitude, lng: room.longitude }
          ) <= query.radiusKm!
        );
      })
    : rows;

  const start = (query.page - 1) * query.limit;
  const paged = filtered.slice(start, start + query.limit);

  return {
    items: paged,
    total: filtered.length,
    page: query.page,
    pages: Math.ceil(filtered.length / query.limit),
    timestamp: formatISO(new Date()),
  };
}

export async function createTournament(input: unknown) {
  const payload = tournamentPayloadSchema.parse(input);
  const { pokerRoomId, variant, ...tournamentData } = payload;

  return prisma.$transaction(async (tx) => {
    const game = await tx.game.create({
      data: {
        pokerRoomId,
        gameType: "TOURNAMENT",
        variant,
      },
    });

    return tx.tournament.create({
      data: {
        ...tournamentData,
        gameId: game.id,
      },
      include: { game: { include: { pokerRoom: true } } },
    });
  });
}

export async function getTournamentById(id: string) {
  return prisma.tournament.findUnique({
    where: { id },
    include: { game: { include: { pokerRoom: true } } },
  });
}
