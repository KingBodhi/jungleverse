/**
 * Local VM Provider Connector
 *
 * Reads parsed poker client data from the VM shared folder.
 * This connector integrates with the file watcher service that
 * extracts data from Windows poker clients running in a QEMU/KVM VM.
 */

import { readFile, readdir, stat } from "fs/promises";
import { join } from "path";
import { GameVariant } from "@prisma/client";
import {
  NormalizedTournament,
  NormalizedCashGame,
  ProviderConnector,
} from "./types";
import { providerLogger } from "./logger";

// Default path - can be overridden via env var
const PARSED_DATA_DIR =
  process.env.POKER_VM_PARSED_DIR ||
  join(process.env.HOME || "", ".local/share/poker-vm/shared-data/_parsed");

interface ParsedTournamentData {
  poker_room: string;
  variant: string;
  start_time: string;
  buyin_amount: number;
  rake_amount?: number;
  starting_stack?: number;
  blind_level_minutes?: number;
  reentry_policy?: string;
  bounty_amount?: number;
  recurring_rule?: string;
  estimated_prize_pool?: number;
  typical_field_size?: number;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

interface ParsedCashGameData {
  poker_room: string;
  variant: string;
  small_blind: number;
  big_blind: number;
  min_buyin: number;
  max_buyin: number;
  current_players?: number;
  max_players?: number;
  table_id?: string;
  metadata?: Record<string, unknown>;
}

function mapVariant(variant: string): GameVariant {
  switch (variant.toUpperCase()) {
    case "PLO":
      return GameVariant.PLO;
    case "PLO5":
      return GameVariant.PLO5;
    case "MIXED":
      return GameVariant.MIXED;
    case "OTHER":
      return GameVariant.OTHER;
    case "NLHE":
    default:
      return GameVariant.NLHE;
  }
}

async function getLatestFile(
  pattern: string
): Promise<{ path: string; mtime: Date } | null> {
  try {
    const files = await readdir(PARSED_DATA_DIR);
    const matching = files.filter((f) => f.startsWith(pattern) && f.endsWith(".json"));

    if (matching.length === 0) {
      return null;
    }

    // Sort by filename (which includes timestamp) to get latest
    matching.sort().reverse();
    const latestFile = matching[0];
    const filePath = join(PARSED_DATA_DIR, latestFile);
    const stats = await stat(filePath);

    return { path: filePath, mtime: stats.mtime };
  } catch (error) {
    return null;
  }
}

async function fetchLocalVmTournaments(): Promise<NormalizedTournament[]> {
  const startTime = Date.now();

  try {
    const latest = await getLatestFile("tournaments_");

    if (!latest) {
      providerLogger.logSuccess("LocalVM", "tournaments", 0, Date.now() - startTime);
      return [];
    }

    // Check if file is recent (within last hour)
    const ageMs = Date.now() - latest.mtime.getTime();
    if (ageMs > 3600000) {
      console.warn("[LocalVM] Tournament data is stale (>1 hour old)");
    }

    const content = await readFile(latest.path, "utf-8");
    const rawData: ParsedTournamentData[] = JSON.parse(content);

    const tournaments: NormalizedTournament[] = rawData.map((t) => ({
      pokerRoom: t.poker_room,
      variant: mapVariant(t.variant),
      startTime: new Date(t.start_time),
      buyinAmount: t.buyin_amount,
      rakeAmount: t.rake_amount,
      startingStack: t.starting_stack,
      blindLevelMinutes: t.blind_level_minutes,
      reentryPolicy: t.reentry_policy,
      bountyAmount: t.bounty_amount,
      recurringRule: t.recurring_rule,
      estimatedPrizePool: t.estimated_prize_pool,
      typicalFieldSize: t.typical_field_size,
      externalId: t.external_id,
      metadata: {
        ...t.metadata,
        source: "local-vm",
        parsedFile: latest.path,
      },
    }));

    providerLogger.logSuccess(
      "LocalVM",
      "tournaments",
      tournaments.length,
      Date.now() - startTime
    );

    return tournaments;
  } catch (error) {
    providerLogger.logError(
      "LocalVM",
      "tournaments",
      error as Error,
      Date.now() - startTime
    );
    return [];
  }
}

async function fetchLocalVmCashGames(): Promise<NormalizedCashGame[]> {
  const startTime = Date.now();

  try {
    const latest = await getLatestFile("cashgames_");

    if (!latest) {
      providerLogger.logSuccess("LocalVM", "cashGames", 0, Date.now() - startTime);
      return [];
    }

    const content = await readFile(latest.path, "utf-8");
    const rawData: ParsedCashGameData[] = JSON.parse(content);

    const cashGames: NormalizedCashGame[] = rawData.map((g) => ({
      pokerRoom: g.poker_room,
      variant: mapVariant(g.variant),
      smallBlind: g.small_blind,
      bigBlind: g.big_blind,
      minBuyin: g.min_buyin,
      maxBuyin: g.max_buyin,
      metadata: {
        ...g.metadata,
        source: "local-vm",
        currentPlayers: g.current_players,
        maxPlayers: g.max_players,
        tableId: g.table_id,
      },
    }));

    providerLogger.logSuccess(
      "LocalVM",
      "cashGames",
      cashGames.length,
      Date.now() - startTime
    );

    return cashGames;
  } catch (error) {
    providerLogger.logError(
      "LocalVM",
      "cashGames",
      error as Error,
      Date.now() - startTime
    );
    return [];
  }
}

/**
 * Get list of poker rooms found in local VM data
 */
async function getDetectedPokerRooms(): Promise<string[]> {
  const rooms = new Set<string>();

  try {
    const tournaments = await fetchLocalVmTournaments();
    tournaments.forEach((t) => rooms.add(t.pokerRoom));
  } catch {
    // ignore
  }

  try {
    const cashGames = await fetchLocalVmCashGames();
    cashGames.forEach((g) => rooms.add(g.pokerRoom));
  } catch {
    // ignore
  }

  return Array.from(rooms);
}

export const localVmConnector: ProviderConnector = {
  name: "LocalVM",
  type: "ONLINE",
  pokerRooms: [
    "ClubGG",
    "Pokerstars",
    "GGpoker",
    "888Poker",
    "PartyPoker",
    "WPTGlobal",
    "WSOP",
  ],
  fetchTournaments: fetchLocalVmTournaments,
  fetchCashGames: fetchLocalVmCashGames,
};

export { getDetectedPokerRooms };
