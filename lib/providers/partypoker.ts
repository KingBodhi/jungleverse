import { load } from "cheerio";
import { GameVariant } from "@prisma/client";
import { NormalizedTournament, ProviderConnector } from "./types";
import { inferVariantFromName, parseCurrency, sanitizeText } from "./helpers";
import { globalRateLimiter } from "./rate-limiter";
import { providerCache, ProviderCache } from "./cache";
import { providerLogger } from "./logger";

const PARTYPOKER_SCHEDULE_URL = "https://www.partypoker.com/en/poker/tournaments";

async function fetchPartyPokerTournaments(): Promise<NormalizedTournament[]> {
  const startTime = Date.now();
  const cacheKey = ProviderCache.createKey("PartyPoker", "tournaments");

  try {
    const cached = providerCache.get<NormalizedTournament[]>(cacheKey);
    if (cached) {
      providerLogger.logSuccess("PartyPoker", "tournaments", cached.length, Date.now() - startTime);
      return cached;
    }

    await globalRateLimiter.throttle("PartyPoker", 3000);

    const tournaments = await scrapePartyPokerSchedule();

    if (tournaments.length > 0) {
      providerCache.set(cacheKey, tournaments, 3600000);
    }

    providerLogger.logSuccess("PartyPoker", "tournaments", tournaments.length, Date.now() - startTime);
    return tournaments;
  } catch (error) {
    providerLogger.logError("PartyPoker", "tournaments", error as Error, Date.now() - startTime);
    return [];
  }
}

async function scrapePartyPokerSchedule(): Promise<NormalizedTournament[]> {
  const response = await fetch(PARTYPOKER_SCHEDULE_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load PartyPoker schedule (${response.status})`);
  }

  const html = await response.text();
  const $ = load(html);
  const tournaments: NormalizedTournament[] = [];

  $(".tournament-card, .tourney-item, [data-tournament-id]").each((_, element) => {
    try {
      const $el = $(element);
      const name = sanitizeText($el.find(".tournament-name, .event-name, h3").text());
      const buyinText = sanitizeText($el.find(".buy-in, .buyin").text());
      const guaranteeText = sanitizeText($el.find(".guarantee, .gtd, .prize").text());
      const timeText = sanitizeText($el.find(".start-time, .time").text());

      const buyinAmount = parseCurrency(buyinText);
      if (buyinAmount === null || !name) return;

      tournaments.push({
        pokerRoom: "PartyPoker",
        variant: inferVariantFromName(name),
        startTime: parsePartyPokerTime(timeText) || new Date(Date.now() + 3600000),
        buyinAmount,
        estimatedPrizePool: parseCurrency(guaranteeText) ?? undefined,
        metadata: { source: "scraping", name },
      });
    } catch (error) {
      console.warn("[PartyPoker] Failed to parse tournament");
    }
  });

  return tournaments;
}

function parsePartyPokerTime(timeText: string): Date | null {
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

export const partypokerConnector: ProviderConnector = {
  name: "PartyPoker",
  type: "ONLINE",
  pokerRooms: ["PartyPoker"],
  fetchTournaments: fetchPartyPokerTournaments,
};
