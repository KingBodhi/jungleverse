import { randomUUID } from "crypto";
import { GameType, GameVariant } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { providerRegistry } from "@/lib/providers";
import { providerIngestionStore } from "@/lib/providers/ingestion-store";
import type {
  NormalizedCashGame,
  NormalizedTournament,
  ProviderConnector,
} from "@/lib/providers/types";

const START_TIME_TOLERANCE_MS = 15 * 60 * 1000; // 15 minutes

interface DataIngestionStats {
  attempted: number;
  created: number;
  updated: number;
  skipped: number;
}

interface IngestionResult {
  created: number;
  updated: number;
  skipped: number;
  missingRooms: Set<string>;
}

type RoomRecord = {
  id: string;
  name: string;
  normalized: string;
};

type RoomIndex = {
  map: Map<string, RoomRecord>;
  list: RoomRecord[];
};

export interface ProviderFetchSummary {
  runId: string;
  provider: string;
  durationMs: number;
  completedAt: string;
  tournaments: DataIngestionStats;
  cashGames: DataIngestionStats;
  missingRooms: string[];
  errors: string[];
}

type TournamentPayload = {
  variant: GameVariant;
  startTime: Date;
  buyinAmount: number;
  rakeAmount: number | null;
  startingStack: number | null;
  blindLevelMinutes: number | null;
  reentryPolicy: string | null;
  bountyAmount: number | null;
  recurringRule: string | null;
  estimatedPrizePool: number | null;
  typicalFieldSize: number | null;
};

type CashGamePayload = {
  variant: GameVariant;
  smallBlind: number;
  bigBlind: number;
  minBuyin: number;
  maxBuyin: number;
  notes: string | null;
  usualDaysOfWeek: string[];
};

export async function fetchAllPokerData(providerName?: string): Promise<ProviderFetchSummary[]> {
  const connectors = providerName
    ? providerRegistry.filter((connector) => connector.name.toLowerCase() === providerName.toLowerCase())
    : providerRegistry;

  if (providerName && connectors.length === 0) {
    throw new Error(`Unknown provider: ${providerName}`);
  }

  const roomIndex = await buildRoomIndex();
  const summaries: ProviderFetchSummary[] = [];

  for (const connector of connectors) {
    summaries.push(await runConnector(connector, roomIndex));
  }

  return summaries;
}

function createEmptyStats(): DataIngestionStats {
  return { attempted: 0, created: 0, updated: 0, skipped: 0 };
}

async function runConnector(connector: ProviderConnector, roomIndex: RoomIndex): Promise<ProviderFetchSummary> {
  const summary: ProviderFetchSummary = {
    runId: randomUUID(),
    provider: connector.name,
    durationMs: 0,
    completedAt: new Date().toISOString(),
    tournaments: createEmptyStats(),
    cashGames: createEmptyStats(),
    missingRooms: [],
    errors: [],
  };

  const missingRooms = new Set<string>();
  const start = Date.now();

  if (connector.fetchTournaments) {
    try {
      const tournaments = await connector.fetchTournaments();
      summary.tournaments.attempted = tournaments.length;
      const result = await ingestTournaments(tournaments, roomIndex);
      summary.tournaments.created = result.created;
      summary.tournaments.updated = result.updated;
      summary.tournaments.skipped = result.skipped;
      result.missingRooms.forEach((room) => missingRooms.add(room));
    } catch (error) {
      summary.errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (connector.fetchCashGames) {
    try {
      const cashGames = await connector.fetchCashGames();
      summary.cashGames.attempted = cashGames.length;
      const result = await ingestCashGames(cashGames, roomIndex);
      summary.cashGames.created = result.created;
      summary.cashGames.updated = result.updated;
      summary.cashGames.skipped = result.skipped;
      result.missingRooms.forEach((room) => missingRooms.add(room));
    } catch (error) {
      summary.errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  summary.missingRooms = Array.from(missingRooms.values()).sort();
  summary.durationMs = Date.now() - start;
  summary.completedAt = new Date().toISOString();
  providerIngestionStore.update(summary);
  return summary;
}

async function ingestTournaments(tournaments: NormalizedTournament[], roomIndex: RoomIndex): Promise<IngestionResult> {
  const result: IngestionResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    missingRooms: new Set<string>(),
  };

  for (const tournament of tournaments) {
    const roomName = tournament.pokerRoom?.trim();
    if (!roomName) {
      result.skipped++;
      continue;
    }

    const room = await resolveRoom(roomName, roomIndex);
    if (!room) {
      result.skipped++;
      result.missingRooms.add(roomName);
      continue;
    }

    const payload = sanitizeTournamentData(tournament);
    if (!payload) {
      result.skipped++;
      continue;
    }

    const action = await upsertTournament(room.id, payload);
    if (action === "created") {
      result.created++;
    } else if (action === "updated") {
      result.updated++;
    }
  }

  return result;
}

async function ingestCashGames(cashGames: NormalizedCashGame[], roomIndex: RoomIndex): Promise<IngestionResult> {
  const result: IngestionResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    missingRooms: new Set<string>(),
  };

  for (const cashGame of cashGames) {
    const roomName = cashGame.pokerRoom?.trim();
    if (!roomName) {
      result.skipped++;
      continue;
    }

    const room = await resolveRoom(roomName, roomIndex);
    if (!room) {
      result.skipped++;
      result.missingRooms.add(roomName);
      continue;
    }

    const payload = sanitizeCashGameData(cashGame);
    if (!payload) {
      result.skipped++;
      continue;
    }

    const action = await upsertCashGame(room.id, payload);
    if (action === "created") {
      result.created++;
    } else if (action === "updated") {
      result.updated++;
    }
  }

  return result;
}

async function upsertTournament(pokerRoomId: string, data: TournamentPayload) {
  const windowStart = new Date(data.startTime.getTime() - START_TIME_TOLERANCE_MS);
  const windowEnd = new Date(data.startTime.getTime() + START_TIME_TOLERANCE_MS);

  const existing = await prisma.tournament.findFirst({
    where: {
      buyinAmount: data.buyinAmount,
      startTime: {
        gte: windowStart,
        lte: windowEnd,
      },
      game: { pokerRoomId },
    },
    include: { game: true },
  });

  if (existing) {
    await prisma.tournament.update({
      where: { id: existing.id },
      data: {
        startTime: data.startTime,
        rakeAmount: data.rakeAmount,
        startingStack: data.startingStack,
        blindLevelMinutes: data.blindLevelMinutes,
        reentryPolicy: data.reentryPolicy,
        bountyAmount: data.bountyAmount,
        recurringRule: data.recurringRule,
        estimatedPrizePool: data.estimatedPrizePool,
        typicalFieldSize: data.typicalFieldSize,
      },
    });

    if (existing.game.variant !== data.variant) {
      await prisma.game.update({
        where: { id: existing.gameId },
        data: { variant: data.variant },
      });
    }

    return "updated" as const;
  }

  await prisma.$transaction(async (tx) => {
    const game = await tx.game.create({
      data: {
        pokerRoomId,
        gameType: GameType.TOURNAMENT,
        variant: data.variant,
      },
    });

    await tx.tournament.create({
      data: {
        gameId: game.id,
        startTime: data.startTime,
        buyinAmount: data.buyinAmount,
        rakeAmount: data.rakeAmount,
        startingStack: data.startingStack,
        blindLevelMinutes: data.blindLevelMinutes,
        reentryPolicy: data.reentryPolicy,
        bountyAmount: data.bountyAmount,
        recurringRule: data.recurringRule,
        estimatedPrizePool: data.estimatedPrizePool,
        typicalFieldSize: data.typicalFieldSize,
      },
    });
  });

  return "created" as const;
}

async function upsertCashGame(pokerRoomId: string, data: CashGamePayload) {
  const existing = await prisma.cashGame.findFirst({
    where: {
      smallBlind: data.smallBlind,
      bigBlind: data.bigBlind,
      game: { pokerRoomId },
    },
    include: { game: true },
  });

  if (existing) {
    await prisma.cashGame.update({
      where: { id: existing.id },
      data: {
        minBuyin: data.minBuyin,
        maxBuyin: data.maxBuyin,
        notes: data.notes,
        usualDaysOfWeek: data.usualDaysOfWeek,
      },
    });

    if (existing.game.variant !== data.variant) {
      await prisma.game.update({
        where: { id: existing.gameId },
        data: { variant: data.variant },
      });
    }

    return "updated" as const;
  }

  await prisma.$transaction(async (tx) => {
    const game = await tx.game.create({
      data: {
        pokerRoomId,
        gameType: GameType.CASH,
        variant: data.variant,
      },
    });

    await tx.cashGame.create({
      data: {
        gameId: game.id,
        smallBlind: data.smallBlind,
        bigBlind: data.bigBlind,
        minBuyin: data.minBuyin,
        maxBuyin: data.maxBuyin,
        notes: data.notes,
        usualDaysOfWeek: data.usualDaysOfWeek,
      },
    });
  });

  return "created" as const;
}

function sanitizeTournamentData(tournament: NormalizedTournament): TournamentPayload | null {
  const startTime = new Date(tournament.startTime);
  if (Number.isNaN(startTime.getTime())) {
    return null;
  }

  if (!Number.isFinite(tournament.buyinAmount)) {
    return null;
  }

  return {
    variant: tournament.variant,
    startTime,
    buyinAmount: Math.max(0, Math.round(tournament.buyinAmount)),
    rakeAmount: toNullableInt(tournament.rakeAmount),
    startingStack: toNullableInt(tournament.startingStack),
    blindLevelMinutes: toNullableInt(tournament.blindLevelMinutes),
    reentryPolicy: sanitizeString(tournament.reentryPolicy),
    bountyAmount: toNullableInt(tournament.bountyAmount),
    recurringRule: sanitizeString(tournament.recurringRule),
    estimatedPrizePool: toNullableInt(tournament.estimatedPrizePool),
    typicalFieldSize: toNullableInt(tournament.typicalFieldSize),
  };
}

function sanitizeCashGameData(cashGame: NormalizedCashGame): CashGamePayload | null {
  if (!Number.isFinite(cashGame.smallBlind) || !Number.isFinite(cashGame.bigBlind)) {
    return null;
  }
  if (!Number.isFinite(cashGame.minBuyin) || !Number.isFinite(cashGame.maxBuyin)) {
    return null;
  }

  const minBuyin = Math.max(0, Math.round(cashGame.minBuyin));
  const maxBuyin = Math.max(minBuyin, Math.round(cashGame.maxBuyin));
  const usualDays = Array.isArray(cashGame.usualDaysOfWeek)
    ? cashGame.usualDaysOfWeek.map((day) => day.trim()).filter(Boolean)
    : [];

  return {
    variant: cashGame.variant,
    smallBlind: Math.max(0, Math.round(cashGame.smallBlind)),
    bigBlind: Math.max(0, Math.round(cashGame.bigBlind)),
    minBuyin,
    maxBuyin,
    notes: sanitizeString(cashGame.notes),
    usualDaysOfWeek: usualDays,
  };
}

function sanitizeString(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toNullableInt(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.round(value);
}

async function buildRoomIndex(): Promise<RoomIndex> {
  const rooms = await prisma.pokerRoom.findMany({
    select: { id: true, name: true },
  });

  const map = new Map<string, RoomRecord>();
  const list: RoomRecord[] = [];

  for (const room of rooms) {
    const record: RoomRecord = {
      id: room.id,
      name: room.name,
      normalized: normalizeRoomName(room.name),
    };
    list.push(record);

    for (const key of createRoomKeyVariants(room.name)) {
      if (key && !map.has(key)) {
        map.set(key, record);
      }
    }
  }

  return { map, list };
}

async function resolveRoom(roomName: string, index: RoomIndex): Promise<RoomRecord | null> {
  const normalizedInput = normalizeRoomName(roomName);

  for (const key of createRoomKeyVariants(roomName)) {
    const existing = index.map.get(key);
    if (existing) {
      index.map.set(normalizedInput, existing);
      return existing;
    }
  }

  const fuzzyMatch = findFuzzyRoom(normalizedInput, index);
  if (fuzzyMatch) {
    index.map.set(normalizedInput, fuzzyMatch);
    return fuzzyMatch;
  }

  const fromDb = await prisma.pokerRoom.findFirst({
    where: { name: { equals: roomName, mode: "insensitive" } },
    select: { id: true, name: true },
  });

  if (fromDb) {
    const record: RoomRecord = {
      id: fromDb.id,
      name: fromDb.name,
      normalized: normalizeRoomName(fromDb.name),
    };
    index.list.push(record);
    for (const key of createRoomKeyVariants(fromDb.name)) {
      if (key && !index.map.has(key)) {
        index.map.set(key, record);
      }
    }
    index.map.set(normalizedInput, record);
    return record;
  }

  return null;
}

function findFuzzyRoom(target: string, index: RoomIndex): RoomRecord | null {
  if (!target) return null;
  const candidates = index.list.filter((room) => looselyMatches(room.normalized, target));
  if (!candidates.length) {
    return null;
  }
  return candidates.sort((a, b) => Math.abs(a.normalized.length - target.length) - Math.abs(b.normalized.length - target.length))[0];
}

function looselyMatches(a: string, b: string) {
  if (!a || !b) return false;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;
  if (shorter.length < 5) return false;
  return longer.includes(shorter);
}

function createRoomKeyVariants(name: string) {
  const normalized = normalizeRoomName(name);
  const stripped = normalized.replace(/(pokerroom|poker|casino|cardclub|cardroom|cardhouse)/g, "");
  return Array.from(new Set([normalized, stripped].filter(Boolean)));
}

function normalizeRoomName(value?: string | null) {
  return value?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
}
