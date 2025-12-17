import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const favoriteSchema = z.object({
  userId: z.string().cuid(),
  pokerRoomId: z.string().cuid(),
});

export async function addFavorite(userId: string, pokerRoomId: string) {
  return prisma.favoriteRoom.create({
    data: { userId, pokerRoomId },
  });
}

export async function removeFavorite(userId: string, pokerRoomId: string) {
  return prisma.favoriteRoom.delete({
    where: {
      userId_pokerRoomId: { userId, pokerRoomId },
    },
  });
}

export async function getFavorites(userId: string) {
  return prisma.favoriteRoom.findMany({
    where: { userId },
    include: {
      pokerRoom: {
        include: {
          games: {
            include: { cashGame: true, tournament: true },
            take: 4,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function isFavorite(userId: string, pokerRoomId: string) {
  const favorite = await prisma.favoriteRoom.findUnique({
    where: {
      userId_pokerRoomId: { userId, pokerRoomId },
    },
  });
  return !!favorite;
}

export async function getFavoriteRoomIds(userId: string) {
  const favorites = await prisma.favoriteRoom.findMany({
    where: { userId },
    select: { pokerRoomId: true },
  });
  return favorites.map((favorite) => favorite.pokerRoomId);
}
