import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { roomFilterSchema, roomPayloadSchema } from "@/lib/validators/rooms";
import type { RoomWithGames } from "@/types";

export async function listRooms(rawQuery: Record<string, unknown>) {
  const query = roomFilterSchema.parse(rawQuery);
  const where: Prisma.PokerRoomWhereInput = {
    ...(query.city ? { city: { contains: query.city, mode: "insensitive" } } : {}),
    ...(query.country ? { country: { contains: query.country, mode: "insensitive" } } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { brand: { contains: query.search, mode: "insensitive" } },
            { city: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.pokerRoom.findMany({
      where,
      include: {
        games: {
          include: { cashGame: true, tournament: true },
          take: 4,
        },
      },
      orderBy: { createdAt: "desc" },
      take: query.limit,
      skip: (query.page - 1) * query.limit,
    }) as Promise<RoomWithGames[]>,
    prisma.pokerRoom.count({ where }),
  ]);

  return { items, total, page: query.page, pages: Math.ceil(total / query.limit) };
}

export async function createRoom(input: unknown) {
  const payload = roomPayloadSchema.parse(input);
  return prisma.pokerRoom.create({ data: payload });
}

export async function getRoomById(id: string) {
  return prisma.pokerRoom.findUnique({
    where: { id },
    include: {
      games: {
        include: { cashGame: true, tournament: true },
      },
    },
  });
}
