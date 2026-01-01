import { load } from "cheerio";
import { GameVariant } from "@prisma/client";
import { NormalizedTournament, ProviderConnector } from "./types";
import { inferVariantFromName, parseCurrency, sanitizeText } from "./helpers";
import { globalRateLimiter } from "./rate-limiter";
import { providerCache, ProviderCache } from "./cache";
import { providerLogger } from "./logger";

const WPT_GLOBAL_URL = "https://wptglobal.com/tournaments";

async function fetchWPTGlobalTournaments(): Promise<NormalizedTournament[]> {
  const startTime = Date.now();
  const cacheKey = ProviderCache.createKey("WPTGlobal", "tournaments");

  try {
    const cached = providerCache.get<NormalizedTournament[]>(cacheKey);
    if (cached) {
      providerLogger.logSuccess("WPT Global", "tournaments", cached.length, Date.now() - startTime);
      return cached;
    }

    await globalRateLimiter.throttle("WPTGlobal", 3000);

    const tournaments = await scrapeWPTGlobalSchedule();

    if (tournaments.length > 0) {
      providerCache.set(cacheKey, tournaments, 3600000);
    }

    providerLogger.logSuccess("WPT Global", "tournaments", tournaments.length, Date.now() - startTime);
    return tournaments;
  } catch (error) {
    providerLogger.logError("WPT Global", "tournaments", error as Error, Date.now() - startTime);
    return [];
  }
}

async function scrapeWPTGlobalSchedule(): Promise<NormalizedTournament[]> {
  const response = await fetch(WPT_GLOBAL_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load WPT Global schedule (${response.status})`);
  }

  const html = await response.text();
  const $ = load(html);
  const tournaments: NormalizedTournament[] = [];

  $(".tournament-item, .event-card, [data-event]").each((_, element) => {
    try {
      const $el = $(element);
      const name = sanitizeText($el.find(".tournament-name, .event-name, h3, h4").text());
      const buyinText = sanitizeText($el.find(".buy-in, .buyin, .entry-fee").text());
      const guaranteeText = sanitizeText($el.find(".guarantee, .gtd, .prize-pool").text());
      const timeText = sanitizeText($el.find(".start-time, .time, .when").text());

      const buyinAmount = parseCurrency(buyinText);
      if (buyinAmount === null || !name) return;

      tournaments.push({
        pokerRoom: "WPT Global",
        variant: inferVariantFromName(name),
        startTime: parseWPTTime(timeText) || new Date(Date.now() + 3600000),
        buyinAmount,
        estimatedPrizePool: parseCurrency(guaranteeText) ?? undefined,
        recurringRule: extractWPTPattern(name),
        metadata: { source: "scraping", name },
      });
    } catch (error) {
      console.warn("[WPT Global] Failed to parse tournament");
    }
  });

  return tournaments;
}

function parseWPTTime(timeText: string): Date | null {
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

function extractWPTPattern(name: string): string | undefined {
  const lower = name.toLowerCase();
  if (lower.includes("daily")) return "Daily";
  if (lower.includes("sunday")) return "Weekly - Sunday";
  if (lower.includes("saturday")) return "Weekly - Saturday";
  return undefined;
}

export const wptglobalConnector: ProviderConnector = {
  name: "WPT Global",
  type: "ONLINE",
  pokerRooms: ["WPT Global"],
  fetchTournaments: fetchWPTGlobalTournaments,
};
