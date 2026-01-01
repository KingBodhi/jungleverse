import { load } from "cheerio";
import { GameVariant } from "@prisma/client";
import { NormalizedTournament, ProviderConnector } from "./types";
import { inferVariantFromName, parseCurrency, sanitizeText } from "./helpers";
import { globalRateLimiter } from "./rate-limiter";
import { providerCache, ProviderCache } from "./cache";
import { providerLogger } from "./logger";

const POKERSTARS_SCHEDULE_URL = "https://www.pokerstars.com/poker/tournaments/schedule/";
const POKERSTARS_API_URL = "https://www.pokerstars.com/api/tournaments/";

async function fetchPokerStarsTournaments(): Promise<NormalizedTournament[]> {
  const startTime = Date.now();
  const cacheKey = ProviderCache.createKey("PokerStars", "tournaments");

  try {
    // Check cache first
    const cached = providerCache.get<NormalizedTournament[]>(cacheKey);
    if (cached) {
      providerLogger.logSuccess("PokerStars", "tournaments", cached.length, Date.now() - startTime);
      return cached;
    }

    // Rate limit
    await globalRateLimiter.throttle("PokerStars", 3000);

    // Try API first
    let tournaments = await tryPokerStarsAPI();

    // Fallback to scraping if API fails
    if (!tournaments || tournaments.length === 0) {
      tournaments = await scrapePokerStarsSchedule();
    }

    // Cache results
    if (tournaments.length > 0) {
      providerCache.set(cacheKey, tournaments, 3600000); // 1 hour
    }

    providerLogger.logSuccess("PokerStars", "tournaments", tournaments.length, Date.now() - startTime);
    return tournaments;
  } catch (error) {
    providerLogger.logError("PokerStars", "tournaments", error as Error, Date.now() - startTime);
    return [];
  }
}

type PokerStarsAPITournament = {
  gameType?: string;
  variant?: string;
  startTime?: string;
  start_time?: string;
  buyIn?: string | number;
  buyin?: string | number;
  rake?: string | number;
  startingChips?: number;
  starting_stack?: number;
  levelDuration?: number;
  blind_level?: number;
  reentry?: string;
  guarantee?: string | number;
  guaranteed?: string | number;
  expectedPlayers?: number;
  tournamentId?: string | number;
  id?: string | number;
  [key: string]: unknown;
};

async function tryPokerStarsAPI(): Promise<NormalizedTournament[]> {
  try {
    const response = await fetch(POKERSTARS_API_URL, {
      headers: {
        "User-Agent": "jungleverse-data-fetcher/1.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    // Transform API response to normalized format
    // Note: This structure is hypothetical - adjust based on actual API
    if (Array.isArray(data.tournaments)) {
      return data.tournaments.map((t: PokerStarsAPITournament) => {
        const startSource = t.startTime ?? t.start_time ?? Date.now();
        return {
          pokerRoom: "Pokerstars",
          variant: parsePokerStarsVariant(t.gameType ?? t.variant ?? ""),
          startTime: new Date(startSource),
          buyinAmount: parseCurrency(String(t.buyIn ?? t.buyin ?? "")) || 0,
          rakeAmount: parseCurrency(String(t.rake ?? "")) ?? undefined,
          startingStack: t.startingChips ?? t.starting_stack ?? 0,
          blindLevelMinutes: t.levelDuration ?? t.blind_level ?? 0,
          reentryPolicy: t.reentry,
          estimatedPrizePool: parseCurrency(String(t.guarantee ?? t.guaranteed ?? "")) ?? undefined,
          typicalFieldSize: t.expectedPlayers,
          externalId: String(t.tournamentId ?? t.id ?? ""),
          metadata: { source: "api", ...t },
        };
      });
    }

    return [];
  } catch (error) {
    console.warn("[PokerStars API] Failed, falling back to scraping:", (error as Error).message);
    return [];
  }
}

async function scrapePokerStarsSchedule(): Promise<NormalizedTournament[]> {
  const response = await fetch(POKERSTARS_SCHEDULE_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load PokerStars schedule (${response.status})`);
  }

  const html = await response.text();
  const $ = load(html);
  const tournaments: NormalizedTournament[] = [];

  // Parse tournament schedule - adjust selectors based on actual page structure
  $(".tournament-row, .tournament-item, [data-tournament-id]").each((_, element) => {
    try {
      const $el = $(element);

      // Extract tournament data - these selectors are examples, adjust for actual site
      const name = sanitizeText($el.find(".tournament-name, .event-name").text());
      const buyinText = sanitizeText($el.find(".buy-in, .buyin").text());
      const guaranteeText = sanitizeText($el.find(".guarantee, .gtd").text());
      const timeText = sanitizeText($el.find(".start-time, .time").text());
      const gameTypeText = sanitizeText($el.find(".game-type, .variant").text());

      const buyinAmount = parseCurrency(buyinText);
      if (buyinAmount === null || !name) {
        return;
      }

      const startTime = parsePokerStarsTime(timeText);
      const guarantee = parseCurrency(guaranteeText);

      tournaments.push({
        pokerRoom: "Pokerstars",
        variant: gameTypeText
          ? parsePokerStarsVariant(gameTypeText)
          : inferVariantFromName(name),
        startTime: startTime || new Date(Date.now() + 3600000), // Default to 1 hour from now
        buyinAmount,
        estimatedPrizePool: guarantee || undefined,
        recurringRule: extractRecurringPattern(name),
        metadata: {
          source: "scraping",
          name,
          timeText,
          guaranteeText,
        },
      });
    } catch (error) {
      console.warn("[PokerStars] Failed to parse tournament:", (error as Error).message);
    }
  });

  return tournaments;
}

function parsePokerStarsVariant(text: string): GameVariant {
  const lower = text.toLowerCase();

  if (lower.includes("plo5") || lower.includes("5-card plo")) {
    return GameVariant.PLO5;
  }
  if (lower.includes("plo") || lower.includes("omaha")) {
    return GameVariant.PLO;
  }
  if (lower.includes("mixed") || lower.includes("horse") || lower.includes("8-game")) {
    return GameVariant.MIXED;
  }
  if (lower.includes("nlhe") || lower.includes("no limit") || lower.includes("hold'em")) {
    return GameVariant.NLHE;
  }

  return GameVariant.NLHE; // Default
}

function parsePokerStarsTime(timeText: string): Date | null {
  if (!timeText) return null;

  try {
    // Handle various time formats
    // Example: "18:00 ET", "Today 19:00", "Tomorrow 14:00"
    const now = new Date();

    // Extract time (HH:MM)
    const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/);
    if (!timeMatch) return null;

    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);

    // Check for relative day indicators
    const isToday = timeText.toLowerCase().includes("today");
    const isTomorrow = timeText.toLowerCase().includes("tomorrow");

    const date = new Date(now);
    if (isTomorrow) {
      date.setDate(date.getDate() + 1);
    }

    date.setHours(hours, minutes, 0, 0);

    // If time is in the past today, assume it's tomorrow
    if (!isTomorrow && !isToday && date < now) {
      date.setDate(date.getDate() + 1);
    }

    return date;
  } catch (error) {
    console.warn("[PokerStars] Failed to parse time:", timeText);
    return null;
  }
}

function extractRecurringPattern(name: string): string | undefined {
  const lower = name.toLowerCase();

  if (lower.includes("daily")) return "Daily";
  if (lower.includes("sunday")) return "Weekly - Sunday";
  if (lower.includes("monday")) return "Weekly - Monday";
  if (lower.includes("tuesday")) return "Weekly - Tuesday";
  if (lower.includes("wednesday")) return "Weekly - Wednesday";
  if (lower.includes("thursday")) return "Weekly - Thursday";
  if (lower.includes("friday")) return "Weekly - Friday";
  if (lower.includes("saturday")) return "Weekly - Saturday";

  return undefined;
}

export const pokerstarsConnector: ProviderConnector = {
  name: "PokerStars",
  type: "ONLINE",
  pokerRooms: ["Pokerstars"],
  fetchTournaments: fetchPokerStarsTournaments,
};
