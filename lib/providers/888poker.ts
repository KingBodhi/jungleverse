import { load } from "cheerio";
import { GameVariant } from "@prisma/client";
import { NormalizedTournament, ProviderConnector } from "./types";
import { inferVariantFromName, parseCurrency, sanitizeText } from "./helpers";
import { globalRateLimiter } from "./rate-limiter";
import { providerCache, ProviderCache } from "./cache";
import { providerLogger } from "./logger";

const POKER888_SCHEDULE_URL = "https://www.888poker.com/poker-tournaments/";
const POKER888_API_URL = "https://www.888poker.com/api/tournaments/schedule";

async function fetch888PokerTournaments(): Promise<NormalizedTournament[]> {
  const startTime = Date.now();
  const cacheKey = ProviderCache.createKey("888poker", "tournaments");

  try {
    // Check cache
    const cached = providerCache.get<NormalizedTournament[]>(cacheKey);
    if (cached) {
      providerLogger.logSuccess("888poker", "tournaments", cached.length, Date.now() - startTime);
      return cached;
    }

    // Rate limit
    await globalRateLimiter.throttle("888poker", 3000);

    // Try API first
    let tournaments = await try888PokerAPI();

    // Fallback to scraping
    if (!tournaments || tournaments.length === 0) {
      tournaments = await scrape888PokerSchedule();
    }

    // Cache results
    if (tournaments.length > 0) {
      providerCache.set(cacheKey, tournaments, 3600000); // 1 hour
    }

    providerLogger.logSuccess("888poker", "tournaments", tournaments.length, Date.now() - startTime);
    return tournaments;
  } catch (error) {
    providerLogger.logError("888poker", "tournaments", error as Error, Date.now() - startTime);
    return [];
  }
}

async function try888PokerAPI(): Promise<NormalizedTournament[]> {
  try {
    const response = await fetch(POKER888_API_URL, {
      headers: {
        "User-Agent": "jungleverse-data-fetcher/1.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (Array.isArray(data.tournaments || data)) {
      const tournamentList = data.tournaments || data;
      return tournamentList.map((t: any) => ({
        pokerRoom: "888Poker",
        variant: parse888Variant(t.game_type || t.variant),
        startTime: new Date(t.start_time || t.startTime),
        buyinAmount: parseCurrency(String(t.buy_in || t.buyin)) || 0,
        rakeAmount: parseCurrency(String(t.fee || t.rake)) ?? undefined,
        startingStack: t.starting_chips || t.chips,
        blindLevelMinutes: t.level_duration || t.blindLevel,
        estimatedPrizePool: parseCurrency(String(t.guaranteed || t.guarantee)) ?? undefined,
        externalId: String(t.tournament_id || t.id),
        metadata: { source: "api", ...t },
      }));
    }

    return [];
  } catch (error) {
    console.warn("[888poker API] Failed, falling back to scraping:", (error as Error).message);
    return [];
  }
}

async function scrape888PokerSchedule(): Promise<NormalizedTournament[]> {
  const response = await fetch(POKER888_SCHEDULE_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load 888poker schedule (${response.status})`);
  }

  const html = await response.text();
  const $ = load(html);
  const tournaments: NormalizedTournament[] = [];

  // Parse tournament listings - adjust selectors for actual site structure
  $(".tournament-card, .tournament-item, .tourney-row, [data-tournament]").each((_, element) => {
    try {
      const $el = $(element);

      const name = sanitizeText(
        $el.find(".tournament-name, .tourney-name, .event-name, h3, h4").text()
      );
      const buyinText = sanitizeText(
        $el.find(".buy-in, .buyin, .price, .entry-fee").text()
      );
      const guaranteeText = sanitizeText(
        $el.find(".guarantee, .gtd, .prize-pool").text()
      );
      const timeText = sanitizeText(
        $el.find(".start-time, .time, .when").text()
      );

      const buyinAmount = parseCurrency(buyinText);
      if (buyinAmount === null || !name) {
        return;
      }

      const startTime = parse888Time(timeText);
      const guarantee = parseCurrency(guaranteeText);

      tournaments.push({
        pokerRoom: "888Poker",
        variant: inferVariantFromName(name),
        startTime: startTime || new Date(Date.now() + 3600000),
        buyinAmount,
        estimatedPrizePool: guarantee || undefined,
        recurringRule: extract888RecurringPattern(name, timeText),
        metadata: {
          source: "scraping",
          name,
          timeText,
        },
      });
    } catch (error) {
      console.warn("[888poker] Failed to parse tournament:", (error as Error).message);
    }
  });

  return tournaments;
}

function parse888Variant(text: string): GameVariant {
  const lower = text.toLowerCase();

  if (lower.includes("plo5") || lower.includes("5-card")) {
    return GameVariant.PLO5;
  }
  if (lower.includes("plo") || lower.includes("omaha")) {
    return GameVariant.PLO;
  }
  if (lower.includes("mixed") || lower.includes("horse")) {
    return GameVariant.MIXED;
  }

  return GameVariant.NLHE;
}

function parse888Time(timeText: string): Date | null {
  if (!timeText) return null;

  try {
    const now = new Date();

    // Extract HH:MM
    const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/);
    if (!timeMatch) return null;

    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);

    const date = new Date(now);
    date.setHours(hours, minutes, 0, 0);

    // Check for tomorrow indicator
    if (timeText.toLowerCase().includes("tomorrow")) {
      date.setDate(date.getDate() + 1);
    }

    // If time is past, assume tomorrow
    if (date < now && !timeText.toLowerCase().includes("today")) {
      date.setDate(date.getDate() + 1);
    }

    return date;
  } catch (error) {
    return null;
  }
}

function extract888RecurringPattern(name: string, timeText: string): string | undefined {
  const combined = `${name} ${timeText}`.toLowerCase();

  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (const day of days) {
    if (combined.includes(day)) {
      return `Weekly - ${day.charAt(0).toUpperCase() + day.slice(1)}`;
    }
  }

  if (combined.includes("daily")) return "Daily";
  if (combined.includes("hourly")) return "Hourly";

  return undefined;
}

export const poker888Connector: ProviderConnector = {
  name: "888poker",
  type: "ONLINE",
  pokerRooms: ["888Poker"],
  fetchTournaments: fetch888PokerTournaments,
};
