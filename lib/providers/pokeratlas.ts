import { GameVariant } from "@prisma/client";
import { NormalizedCashGame, ProviderConnector } from "./types";
import { inferVariantFromName } from "./helpers";
import { globalRateLimiter } from "./rate-limiter";
import { providerCache, ProviderCache } from "./cache";
import { providerLogger } from "./logger";

// PokerAtlas API - public endpoints
const POKERATLAS_BASE_URL = "https://www.pokeratlas.com/api";

interface PokerAtlasRoom {
  id: number;
  name: string;
  city: string;
  state: string;
  country: string;
  live_cash_games_key?: string;
}

interface PokerAtlasCashGame {
  game_name: string;
  tables: number;
  waiting: number;
  notes1?: string | null;
  active?: boolean;
}

// List of known PokerAtlas room keys
// This can be expanded by scraping the PokerAtlas directory or via their API
const KNOWN_ROOMS: { name: string; key: string }[] = [
  { name: "bestbet St. Augustine", key: "b44fbb67-283c-4c92-9617-458bb82cf0e5" },
  // Add more room keys as discovered
  // These keys are typically found in the PokerAtlas room pages or can be requested
];

async function fetchPokerAtlasCashGames(): Promise<NormalizedCashGame[]> {
  const startTime = Date.now();
  const allGames: NormalizedCashGame[] = [];

  try {
    // Iterate through known rooms
    for (const room of KNOWN_ROOMS) {
      try {
        // Rate limit between rooms
        await globalRateLimiter.throttle("PokerAtlas", 2000);

        const cacheKey = `pokeratlas:${room.key}:cashGames`;
        const cached = providerCache.get<NormalizedCashGame[]>(cacheKey);

        if (cached) {
          allGames.push(...cached);
          continue;
        }

        const url = `${POKERATLAS_BASE_URL}/live_cash_games?key=${room.key}`;
        const response = await fetch(url, {
          headers: {
            "User-Agent": "jungleverse-data-fetcher/1.0",
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          console.warn(`[PokerAtlas] Failed to fetch ${room.name}: ${response.status}`);
          continue;
        }

        const data = (await response.json()) as PokerAtlasCashGame[];
        const games = data
          .filter((row) => row.active !== false && row.tables > 0)
          .map((row) => transformPokerAtlasGame(row, room.name))
          .filter((game): game is NormalizedCashGame => game !== null);

        if (games.length > 0) {
          providerCache.set(cacheKey, games, 600000); // 10 minutes for live cash games
          allGames.push(...games);
        }
      } catch (error) {
        console.warn(`[PokerAtlas] Error fetching ${room.name}:`, (error as Error).message);
      }
    }

    providerLogger.logSuccess("PokerAtlas", "cashGames", allGames.length, Date.now() - startTime);
    return allGames;
  } catch (error) {
    providerLogger.logError("PokerAtlas", "cashGames", error as Error, Date.now() - startTime);
    return [];
  }
}

function transformPokerAtlasGame(
  row: PokerAtlasCashGame,
  pokerRoom: string
): NormalizedCashGame | null {
  const stakes = parseStakeLabel(row.game_name);
  const buyins = parseBuyinRange(row.notes1 ?? "");

  if (!stakes) {
    return null;
  }

  // Default buy-in if not specified
  const minBuyin = buyins?.min ?? stakes.big * 50;
  const maxBuyin = buyins?.max ?? stakes.big * 200;

  return {
    pokerRoom,
    variant: inferVariantFromName(row.game_name),
    smallBlind: stakes.small,
    bigBlind: stakes.big,
    minBuyin,
    maxBuyin,
    notes: `Tables: ${row.tables} · Waiting: ${row.waiting}`,
  };
}

function parseStakeLabel(label: string): { small: number; big: number } | null {
  // Match patterns like "$1/$2", "$2/$5", "$5/$10"
  const match = label.replace(/\s+/g, "").match(/\$(\d+(?:\.\d+)?)\/\$(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }

  return {
    small: Math.round(Number.parseFloat(match[1])),
    big: Math.round(Number.parseFloat(match[2])),
  };
}

function parseBuyinRange(label: string): { min: number; max: number } | null {
  if (!label) return null;

  // Extract all dollar amounts
  const matches = Array.from(label.matchAll(/\$(\d+(?:,\d+)*)/g)).map((match) =>
    Number.parseInt(match[1].replace(/,/g, ""), 10)
  );

  if (!matches.length) {
    return null;
  }

  if (matches.length === 1) {
    return { min: matches[0], max: matches[0] };
  }

  return {
    min: matches[0],
    max: matches[1],
  };
}

/**
 * Discover and add new PokerAtlas rooms dynamically
 * This function can scrape the PokerAtlas directory to find new room keys
 */
export async function discoverPokerAtlasRooms(): Promise<{ name: string; key: string }[]> {
  // TODO: Implement discovery by scraping https://www.pokeratlas.com/poker-rooms
  // For now, return known rooms
  return KNOWN_ROOMS;
}

/**
 * Add a new PokerAtlas room to track
 */
export function addPokerAtlasRoom(name: string, key: string): void {
  if (!KNOWN_ROOMS.find((r) => r.key === key)) {
    KNOWN_ROOMS.push({ name, key });
  }
}

export const pokeratlasConnector: ProviderConnector = {
  name: "PokerAtlas",
  type: "IRL",
  pokerRooms: KNOWN_ROOMS.map((r) => r.name),
  fetchCashGames: fetchPokerAtlasCashGames,
};
