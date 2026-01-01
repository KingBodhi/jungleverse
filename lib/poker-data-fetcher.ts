import { prisma } from "./prisma";
import { providerRegistry } from "./providers";
import type { NormalizedCashGame, NormalizedTournament, ProviderConnector } from "./providers/types";
import { createCashGame } from "./services/cash-games";
import { createTournament } from "./services/tournaments";

const roomIdCache = new Map<string, string>();

async function resolveRoomId(name: string) {
  if (roomIdCache.has(name)) {
    return roomIdCache.get(name)!;
  }
  const room = await prisma.pokerRoom.findFirst({ where: { name } });
  if (!room) {
    return null;
  }
  roomIdCache.set(name, room.id);
  return room.id;
}

async function ingestTournaments(records: NormalizedTournament[], providerName: string) {
  for (const record of records) {
    const roomId = await resolveRoomId(record.pokerRoom);
    if (!roomId) {
      console.warn(`[${providerName}] Missing poker room: ${record.pokerRoom}`);
      continue;
    }
    const exists = await prisma.tournament.findFirst({
      where: {
        buyinAmount: record.buyinAmount,
        startTime: record.startTime,
        game: {
          pokerRoomId: roomId,
        },
      },
    });
    if (exists) {
      continue;
    }
    await createTournament({
      ...record,
      pokerRoomId: roomId,
    });
  }
}

async function ingestCashGames(records: NormalizedCashGame[], providerName: string) {
  for (const record of records) {
    const roomId = await resolveRoomId(record.pokerRoom);
    if (!roomId) {
      console.warn(`[${providerName}] Missing poker room: ${record.pokerRoom}`);
      continue;
    }
    const existing = await prisma.cashGame.findFirst({
      where: {
        smallBlind: record.smallBlind,
        bigBlind: record.bigBlind,
        game: {
          pokerRoomId: roomId,
        },
      },
    });
    if (existing) {
      await prisma.cashGame.update({
        where: { id: existing.id },
        data: {
          minBuyin: record.minBuyin,
          maxBuyin: record.maxBuyin,
          notes: record.notes,
        },
      });
      continue;
    }
    await createCashGame({
      pokerRoomId: roomId,
      variant: record.variant,
      smallBlind: record.smallBlind,
      bigBlind: record.bigBlind,
      minBuyin: record.minBuyin,
      maxBuyin: record.maxBuyin,
      usualDaysOfWeek: record.usualDaysOfWeek ?? [],
      notes: record.notes,
    });
  }
}

async function runConnector(connector: ProviderConnector) {
  if (connector.fetchTournaments) {
    const tournaments = await connector.fetchTournaments();
    await ingestTournaments(tournaments, connector.name);
  }
  if (connector.fetchCashGames) {
    const cashGames = await connector.fetchCashGames();
    await ingestCashGames(cashGames, connector.name);
  }
}

export async function fetchAllPokerData(providerName?: string) {
  const connectors = providerName
    ? providerRegistry.filter((provider) => provider.name.toLowerCase() === providerName.toLowerCase())
    : providerRegistry;
  if (!connectors.length) {
    throw new Error(providerName ? `Unknown provider: ${providerName}` : "No providers configured");
  }
  for (const connector of connectors) {
    await runConnector(connector);
  }
}
