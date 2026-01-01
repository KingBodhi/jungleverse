import { load } from "cheerio";
import { GameVariant } from "@prisma/client";
import { NormalizedTournament, ProviderConnector } from "./types";
import { inferVariantFromName, parseCurrency, sanitizeText } from "./helpers";
import { globalRateLimiter } from "./rate-limiter";
import { providerCache, ProviderCache } from "./cache";
import { providerLogger } from "./logger";

const WSOP_ONLINE_URL = "https://www.wsop.com/online-poker/tournaments/";
const WSOP_CIRCUIT_URL = "https://www.wsop.com/tournaments/";

async function fetchWSOPTournaments(): Promise<NormalizedTournament[]> {
  const startTime = Date.now();
  const cacheKey = ProviderCache.createKey("WSOP", "tournaments");

  try {
    const cached = providerCache.get<NormalizedTournament[]>(cacheKey);
    if (cached) {
      providerLogger.logSuccess("WSOP", "tournaments", cached.length, Date.now() - startTime);
      return cached;
    }

    await globalRateLimiter.throttle("WSOP", 3000);

    // Fetch both online and circuit tournaments
    const [onlineTournaments, circuitTournaments] = await Promise.all([
      scrapeWSOPOnline().catch(() => []),
      scrapeWSOPCircuit().catch(() => []),
    ]);

    const tournaments = [...onlineTournaments, ...circuitTournaments];

    if (tournaments.length > 0) {
      providerCache.set(cacheKey, tournaments, 3600000);
    }

    providerLogger.logSuccess("WSOP", "tournaments", tournaments.length, Date.now() - startTime);
    return tournaments;
  } catch (error) {
    providerLogger.logError("WSOP", "tournaments", error as Error, Date.now() - startTime);
    return [];
  }
}

async function scrapeWSOPOnline(): Promise<NormalizedTournament[]> {
  const response = await fetch(WSOP_ONLINE_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load WSOP online schedule (${response.status})`);
  }

  const html = await response.text();
  const $ = load(html);
  const tournaments: NormalizedTournament[] = [];

  $(".tournament-item, .tourney-card, [data-tournament]").each((_, element) => {
    try {
      const $el = $(element);
      const name = sanitizeText($el.find(".tournament-name, .event-name, h3").text());
      const buyinText = sanitizeText($el.find(".buy-in, .buyin, .entry").text());
      const guaranteeText = sanitizeText($el.find(".guarantee, .gtd").text());
      const timeText = sanitizeText($el.find(".start-time, .time").text());

      const buyinAmount = parseCurrency(buyinText);
      if (buyinAmount === null || !name) return;

      tournaments.push({
        pokerRoom: "WSOP",
        variant: inferVariantFromName(name),
        startTime: parseWSOPTime(timeText) || new Date(Date.now() + 3600000),
        buyinAmount,
        estimatedPrizePool: parseCurrency(guaranteeText) ?? undefined,
        recurringRule: extractWSOPPattern(name),
        metadata: { source: "online", name },
      });
    } catch (error) {
      console.warn("[WSOP] Failed to parse online tournament");
    }
  });

  return tournaments;
}

async function scrapeWSOPCircuit(): Promise<NormalizedTournament[]> {
  const response = await fetch(WSOP_CIRCUIT_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    return [];
  }

  const html = await response.text();
  const $ = load(html);
  const tournaments: NormalizedTournament[] = [];

  $(".circuit-event, .event-card").each((_, element) => {
    try {
      const $el = $(element);
      const name = sanitizeText($el.find(".event-name, h3, h4").text());
      const buyinText = sanitizeText($el.find(".buy-in, .buyin").text());
      const location = sanitizeText($el.find(".location, .venue").text());

      const buyinAmount = parseCurrency(buyinText);
      if (buyinAmount === null || !name) return;

      tournaments.push({
        pokerRoom: location || "WSOP Circuit",
        variant: GameVariant.NLHE,
        startTime: new Date(Date.now() + 86400000), // Default to tomorrow
        buyinAmount,
        metadata: { source: "circuit", name, location },
      });
    } catch (error) {
      console.warn("[WSOP] Failed to parse circuit event");
    }
  });

  return tournaments;
}

function parseWSOPTime(timeText: string): Date | null {
  if (!timeText) return null;

  try {
    const now = new Date();
    const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/);
    if (!timeMatch) return null;

    const date = new Date(now);
    date.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);

    if (date < now) {
      date.setDate(date.getDate() + 1);
    }

    return date;
  } catch {
    return null;
  }
}

function extractWSOPPattern(name: string): string | undefined {
  const lower = name.toLowerCase();
  if (lower.includes("daily")) return "Daily";
  if (lower.includes("weekly")) return "Weekly";
  return undefined;
}

export const wsopConnector: ProviderConnector = {
  name: "WSOP",
  type: "ONLINE",
  pokerRooms: ["WSOP"],
  fetchTournaments: fetchWSOPTournaments,
};
