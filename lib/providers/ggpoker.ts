import { load } from "cheerio";
import { ProviderConnector, NormalizedTournament } from "./types";
import {
  expandDaysExpression,
  getNextUtcOccurrence,
  inferVariantFromName,
  parseCurrency,
  parseUtcTimeLabel,
  sanitizeText,
} from "./helpers";

const GGP_URL = "https://ggpoker.com/tournaments/daily-guarantees/";

async function fetchGgpokerTournaments(): Promise<NormalizedTournament[]> {
  const response = await fetch(GGP_URL, {
    headers: {
      "User-Agent": "jungleverse-data-fetcher/1.0",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to load GGPoker schedule (${response.status})`);
  }
  const html = await response.text();
  const $ = load(html);
  const tournaments: NormalizedTournament[] = [];

  $("table").each((_, table) => {
    const headers = $(table)
      .find("thead th")
      .toArray()
      .map((th) => sanitizeText($(th).text()));
    if (!headers.length || !headers.includes("Event")) {
      return;
    }
    $(table)
      .find("tbody tr")
      .each((__, row) => {
        const cells = $(row)
          .find("td")
          .toArray()
          .map((cell) => sanitizeText($(cell).text()));
        if (!cells.length) return;
        const tuple = Object.fromEntries(cells.map((value, idx) => [headers[idx] ?? `col${idx}`, value]));
        const eventName = tuple["Event"];
        const buyin = parseCurrency(tuple["Buy-In"]);
        const guarantee = parseCurrency(tuple["GTD"]);
        const timeLabel = tuple["UTC"] || tuple["Time"];
        if (!eventName || buyin === null || !timeLabel) {
          return;
        }
        const { hour, minute } = parseUtcTimeLabel(timeLabel);
        const dayIndexes = expandDaysExpression(tuple["Day"]);
        const startTime = getNextUtcOccurrence(dayIndexes, hour, minute);
        tournaments.push({
          pokerRoom: "GGpoker",
          variant: inferVariantFromName(eventName),
          startTime,
          buyinAmount: buyin,
          estimatedPrizePool: guarantee ?? undefined,
          recurringRule: tuple["Day"] || "Daily",
          metadata: tuple,
        });
      });
  });

  return tournaments;
}

export const ggpokerConnector: ProviderConnector = {
  name: "GGpoker",
  type: "ONLINE",
  pokerRooms: ["GGpoker"],
  fetchTournaments: fetchGgpokerTournaments,
};
