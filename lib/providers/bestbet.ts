import { load } from "cheerio";
import { GameVariant } from "@prisma/client";
import { NormalizedCashGame, NormalizedTournament, ProviderConnector } from "./types";
import {
  inferVariantFromName,
  parseCurrency,
  parseMeridianTimeLabel,
  parseUsDateLabel,
  sanitizeText,
  toEasternUtcDate,
} from "./helpers";

const DAILY_ENDPOINT = "https://bestbetjax.com/pull/daily-tournaments";
const AJAX_HEADERS = {
  "User-Agent": "jungleverse-data-fetcher/1.0",
  "X-Requested-With": "XMLHttpRequest",
};

type LocationConfig = {
  slug: string;
  pokerRoom: string;
};

const BESTBET_LOCATIONS: LocationConfig[] = [
  { slug: "jax", pokerRoom: "bestbet Jacksonville" },
  { slug: "op", pokerRoom: "bestbet Orange Park" },
  { slug: "sa", pokerRoom: "bestbet St. Augustine" },
];

async function fetchBestbetTournaments(): Promise<NormalizedTournament[]> {
  const tournaments: NormalizedTournament[] = [];
  for (const location of BESTBET_LOCATIONS) {
    const response = await fetch(`${DAILY_ENDPOINT}/${location.slug}`, { headers: AJAX_HEADERS });
    if (!response.ok) {
      throw new Error(`Failed to fetch bestbet tournaments for ${location.slug}`);
    }
    const html = await response.text();
    const $ = load(`<table>${html}</table>`);
    $("tr").each((_, row) => {
      const cells = $(row)
        .find("td")
        .toArray()
        .map((cell) => sanitizeText($(cell).text()));
      if (cells.length < 5) {
        return;
      }
      const [dateLabel, timeLabel, eventLabel, , buyinLabel] = cells;
      try {
        const dateParts = parseUsDateLabel(dateLabel);
        const timeParts = parseMeridianTimeLabel(timeLabel);
        const startTime = toEasternUtcDate(dateParts, timeParts);
        const buyinAmount = parseCurrency(buyinLabel);
        if (buyinAmount === null) {
          return;
        }
        tournaments.push({
          pokerRoom: location.pokerRoom,
          variant: inferVariantFromName(eventLabel),
          startTime,
          buyinAmount,
          recurringRule: eventLabel,
          metadata: { dateLabel, timeLabel, eventLabel },
        });
      } catch (error) {
        console.warn(`[bestbet] Skipping row for ${location.slug}: ${(error as Error).message}`);
      }
    });
  }
  return tournaments;
}

const ST_AUGUSTINE_POKERATLAS_URL =
  "https://www.pokeratlas.com/api/live_cash_games?key=b44fbb67-283c-4c92-9617-458bb82cf0e5";

async function fetchBestbetCashGames(): Promise<NormalizedCashGame[]> {
  const response = await fetch(ST_AUGUSTINE_POKERATLAS_URL, {
    headers: { "User-Agent": "jungleverse-data-fetcher/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch PokerAtlas feed (${response.status})`);
  }
  const payload = (await response.json()) as PokerAtlasRow[];
  return payload
    .filter((row) => row.active && row.tables > 0)
    .map(transformPokerAtlasRow)
    .filter((row): row is NormalizedCashGame => Boolean(row));
}

type PokerAtlasRow = {
  game_name: string;
  tables: number;
  waiting: number;
  notes1?: string | null;
  active?: boolean;
};

function transformPokerAtlasRow(row: PokerAtlasRow): NormalizedCashGame | null {
  const stakes = parseStakeLabel(row.game_name);
  const buyins = parseBuyinRange(row.notes1 ?? "");
  if (!stakes || !buyins) {
    return null;
  }
  return {
    pokerRoom: "bestbet St. Augustine",
    variant: inferVariantFromName(row.game_name),
    smallBlind: stakes.small,
    bigBlind: stakes.big,
    minBuyin: buyins.min,
    maxBuyin: buyins.max,
    notes: `Tables: ${row.tables} · Waiting: ${row.waiting}`,
  };
}

function parseStakeLabel(label: string) {
  const match = label.replace(/\s+/g, "").match(/\$(\d+(?:\.\d+)?)\/\$(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }
  return {
    small: Math.round(Number.parseFloat(match[1])),
    big: Math.round(Number.parseFloat(match[2])),
  };
}

function parseBuyinRange(label: string) {
  const matches = Array.from(label.matchAll(/\$(\d+(?:,\d+)*)/g)).map((match) =>
    Number.parseInt(match[1].replace(/,/g, ""), 10)
  );
  if (!matches.length) {
    return null;
  }
  const [min, max] = matches.length === 1 ? [matches[0], matches[0]] : [matches[0], matches[1]];
  if (Number.isNaN(min) || Number.isNaN(max)) {
    return null;
  }
  return { min, max };
}

export const bestbetConnector: ProviderConnector = {
  name: "bestbet",
  type: "IRL",
  pokerRooms: BESTBET_LOCATIONS.map((loc) => loc.pokerRoom),
  fetchTournaments: fetchBestbetTournaments,
  fetchCashGames: fetchBestbetCashGames,
};
