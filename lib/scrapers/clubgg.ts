// lib/scrapers/clubgg.ts
// ClubGG Poker Game Scraper using Cheerio (similar to Python's BeautifulSoup)

import * as cheerio from 'cheerio';
import { GameVariant } from '@prisma/client';

export interface ClubGGGame {
  clubId: string;
  clubName: string;
  gameType: 'CASH' | 'TOURNAMENT';
  variant: GameVariant;
  stakes?: {
    smallBlind: number;
    bigBlind: number;
    ante?: number;
  };
  tournament?: {
    buyIn: number;
    startTime: Date;
    guaranteedPrize?: number;
    maxPlayers?: number;
    name?: string;
  };
  playerCount: number;
  isRunning: boolean;
  tableCount?: number;
}

export interface ClubGGClub {
  id: string;
  name: string;
  memberCount: number;
  description?: string;
  games: ClubGGGame[];
}

export interface ClubGGScraperResult {
  success: boolean;
  timestamp: Date;
  source: 'api' | 'web' | 'mock';
  clubs: ClubGGClub[];
  games: ClubGGGame[];
  errors?: string[];
  rawHtml?: string;
}

const CLUBGG_BASE_URL = 'https://www.clubgg.com';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Fetches HTML content from a URL
 */
async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

/**
 * Main scraper function - attempts to extract game data from ClubGG
 */
export async function scrapeClubGG(): Promise<ClubGGScraperResult> {
  const result: ClubGGScraperResult = {
    success: false,
    timestamp: new Date(),
    source: 'mock',
    clubs: [],
    games: [],
    errors: [],
  };

  try {
    // Fetch the main page
    const html = await fetchPage(CLUBGG_BASE_URL);

    if (!html) {
      result.errors?.push('Failed to fetch ClubGG homepage');
      result.games = getMockGames();
      result.source = 'mock';
      result.success = true;
      return result;
    }

    // Parse with Cheerio (like BeautifulSoup)
    const $ = cheerio.load(html);

    // Store raw HTML for debugging
    result.rawHtml = html.substring(0, 5000); // First 5000 chars

    // Try multiple extraction methods
    let games: ClubGGGame[] = [];

    // Method 1: Look for JSON-LD structured data
    games = extractFromJsonLd($);
    if (games.length > 0) {
      result.games = games;
      result.source = 'web';
      result.success = true;
      return result;
    }

    // Method 2: Look for Wix/React embedded data
    games = extractFromWixData($, html);
    if (games.length > 0) {
      result.games = games;
      result.source = 'web';
      result.success = true;
      return result;
    }

    // Method 3: Scrape visible content (tables, lists, cards)
    games = extractFromVisibleContent($);
    if (games.length > 0) {
      result.games = games;
      result.source = 'web';
      result.success = true;
      return result;
    }

    // Method 4: Look for tournament/schedule sections
    games = extractFromScheduleSections($);
    if (games.length > 0) {
      result.games = games;
      result.source = 'web';
      result.success = true;
      return result;
    }

    // Fallback: Return mock data
    result.games = getMockGames();
    result.source = 'mock';
    result.success = true;
    result.errors?.push('No game data found in HTML - using mock data. ClubGG may require JavaScript rendering.');

    return result;
  } catch (error) {
    result.errors?.push(error instanceof Error ? error.message : 'Unknown error');
    result.games = getMockGames();
    result.source = 'mock';
    result.success = true;
    return result;
  }
}

/**
 * Extract game data from JSON-LD structured data
 */
function extractFromJsonLd($: cheerio.CheerioAPI): ClubGGGame[] {
  const games: ClubGGGame[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const jsonText = $(element).html();
      if (!jsonText) return;

      const data = JSON.parse(jsonText);

      // Handle arrays of structured data
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        // Look for Event or SportsEvent types
        if (item['@type'] === 'Event' || item['@type'] === 'SportsEvent') {
          const game = parseEventToGame(item);
          if (game) games.push(game);
        }

        // Look for ItemList with events
        if (item['@type'] === 'ItemList' && item.itemListElement) {
          for (const listItem of item.itemListElement) {
            if (listItem.item?.['@type'] === 'Event') {
              const game = parseEventToGame(listItem.item);
              if (game) games.push(game);
            }
          }
        }
      }
    } catch {
      // JSON parse failed, continue
    }
  });

  return games;
}

/**
 * Parse a schema.org Event to ClubGGGame
 */
function parseEventToGame(event: Record<string, unknown>): ClubGGGame | null {
  try {
    const name = (event.name as string) || '';
    const startDate = event.startDate as string;

    // Try to extract buy-in from name or description
    const buyInMatch = name.match(/\$(\d+)/);
    const buyIn = buyInMatch ? parseInt(buyInMatch[1], 10) : 0;

    // Determine variant from name
    let variant: GameVariant = 'NLHE';
    if (name.toLowerCase().includes('plo') || name.toLowerCase().includes('omaha')) {
      variant = name.toLowerCase().includes('plo5') ? 'PLO5' : 'PLO';
    }

    return {
      clubId: 'clubgg_main',
      clubName: 'ClubGG',
      gameType: 'TOURNAMENT',
      variant,
      tournament: {
        buyIn,
        startTime: startDate ? new Date(startDate) : new Date(),
        name,
      },
      playerCount: 0,
      isRunning: false,
    };
  } catch {
    return null;
  }
}

/**
 * Extract data from Wix/React embedded state
 */
function extractFromWixData($: cheerio.CheerioAPI, html: string): ClubGGGame[] {
  const games: ClubGGGame[] = [];

  // Look for Wix preloaded state
  const patterns = [
    /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});/,
    /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/,
    /window\.__DATA__\s*=\s*({[\s\S]*?});/,
    /"pageData":\s*({[\s\S]*?}),"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        const data = JSON.parse(match[1]);
        // Recursively search for game-related data
        const foundGames = searchForGameData(data);
        games.push(...foundGames);
      } catch {
        // JSON parse failed
      }
    }
  }

  // Also check script tags for embedded data
  $('script').each((_, element) => {
    const scriptContent = $(element).html() || '';

    // Look for tournament or game arrays
    const dataPatterns = [
      /tournaments?\s*[=:]\s*(\[[\s\S]*?\])/,
      /games?\s*[=:]\s*(\[[\s\S]*?\])/,
      /schedule\s*[=:]\s*(\[[\s\S]*?\])/,
    ];

    for (const pattern of dataPatterns) {
      const match = scriptContent.match(pattern);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          if (Array.isArray(data)) {
            for (const item of data) {
              const game = parseGenericToGame(item);
              if (game) games.push(game);
            }
          }
        } catch {
          // JSON parse failed
        }
      }
    }
  });

  return games;
}

/**
 * Recursively search an object for game-related data
 */
function searchForGameData(obj: unknown, depth = 0): ClubGGGame[] {
  const games: ClubGGGame[] = [];
  if (depth > 10) return games; // Prevent infinite recursion

  if (!obj || typeof obj !== 'object') return games;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      games.push(...searchForGameData(item, depth + 1));
    }
    return games;
  }

  const record = obj as Record<string, unknown>;

  // Check if this object looks like a game/tournament
  if (
    record.buyIn || record.buyin || record.buy_in ||
    record.stakes || record.blinds ||
    record.tournament || record.gameType
  ) {
    const game = parseGenericToGame(record);
    if (game) games.push(game);
  }

  // Recurse into nested objects
  for (const value of Object.values(record)) {
    games.push(...searchForGameData(value, depth + 1));
  }

  return games;
}

/**
 * Parse a generic object to ClubGGGame
 */
function parseGenericToGame(obj: Record<string, unknown>): ClubGGGame | null {
  try {
    // Determine if it's a cash game or tournament
    const isTournament = !!(
      obj.buyIn || obj.buyin || obj.buy_in ||
      obj.tournament || obj.startTime || obj.start_time
    );

    const name = (obj.name || obj.title || '') as string;

    // Parse variant
    let variant: GameVariant = 'NLHE';
    const variantStr = ((obj.variant || obj.game_type || name) as string).toLowerCase();
    if (variantStr.includes('plo5') || variantStr.includes('5-card')) {
      variant = 'PLO5';
    } else if (variantStr.includes('plo') || variantStr.includes('omaha')) {
      variant = 'PLO';
    } else if (variantStr.includes('mixed')) {
      variant = 'MIXED';
    }

    if (isTournament) {
      return {
        clubId: 'clubgg_main',
        clubName: 'ClubGG',
        gameType: 'TOURNAMENT',
        variant,
        tournament: {
          buyIn: Number(obj.buyIn || obj.buyin || obj.buy_in || 0),
          startTime: new Date((obj.startTime || obj.start_time || new Date()) as string),
          guaranteedPrize: Number(obj.guarantee || obj.guaranteed || obj.prize_pool || 0) || undefined,
          name,
        },
        playerCount: Number(obj.players || obj.entries || 0),
        isRunning: !!(obj.running || obj.active || obj.live),
      };
    } else {
      // Cash game
      const smallBlind = Number(obj.smallBlind || obj.small_blind || obj.sb || 0);
      const bigBlind = Number(obj.bigBlind || obj.big_blind || obj.bb || 0);

      if (smallBlind === 0 && bigBlind === 0) return null;

      return {
        clubId: 'clubgg_main',
        clubName: 'ClubGG',
        gameType: 'CASH',
        variant,
        stakes: { smallBlind, bigBlind },
        playerCount: Number(obj.players || obj.seated || 0),
        isRunning: true,
        tableCount: Number(obj.tables || 1),
      };
    }
  } catch {
    return null;
  }
}

/**
 * Extract from visible HTML content (tables, lists, cards)
 */
function extractFromVisibleContent($: cheerio.CheerioAPI): ClubGGGame[] {
  const games: ClubGGGame[] = [];

  // Look for tournament tables
  $('table').each((_, table) => {
    const $table = $(table);
    const headers = $table.find('th').map((_, th) => $(th).text().toLowerCase()).get();

    // Check if this looks like a tournament/game table
    const isGameTable = headers.some(h =>
      h.includes('buy') || h.includes('time') || h.includes('stakes') || h.includes('game')
    );

    if (isGameTable) {
      $table.find('tbody tr').each((_, row) => {
        const cells = $(row).find('td').map((_, td) => $(td).text().trim()).get();
        const game = parseTableRowToGame(headers, cells);
        if (game) games.push(game);
      });
    }
  });

  // Look for game cards/tiles
  const cardSelectors = [
    '.game-card', '.tournament-card', '.event-card',
    '[data-game]', '[data-tournament]',
    '.schedule-item', '.event-item',
  ];

  for (const selector of cardSelectors) {
    $(selector).each((_, element) => {
      const $el = $(element);
      const text = $el.text();
      const game = parseCardTextToGame(text, $el.attr('data-game') || $el.attr('data-tournament'));
      if (game) games.push(game);
    });
  }

  // Look for list items with game info
  $('li, .list-item').each((_, element) => {
    const text = $(element).text();
    // Check if it looks like a poker game listing
    if (text.match(/\$\d+|\d+\/\d+|hold'?em|omaha|tournament/i)) {
      const game = parseTextToGame(text);
      if (game) games.push(game);
    }
  });

  return games;
}

/**
 * Parse a table row to ClubGGGame
 */
function parseTableRowToGame(headers: string[], cells: string[]): ClubGGGame | null {
  if (cells.length === 0) return null;

  const data: Record<string, string> = {};
  headers.forEach((header, i) => {
    if (cells[i]) data[header] = cells[i];
  });

  // Try to extract game info from the mapped data
  const buyInStr = data['buy-in'] || data['buyin'] || data['entry'] || '';
  const buyInMatch = buyInStr.match(/\$?(\d+)/);
  const buyIn = buyInMatch ? parseInt(buyInMatch[1], 10) : 0;

  const timeStr = data['time'] || data['start'] || data['date'] || '';
  const stakesStr = data['stakes'] || data['blinds'] || data['game'] || '';

  if (buyIn > 0) {
    return {
      clubId: 'clubgg_main',
      clubName: 'ClubGG',
      gameType: 'TOURNAMENT',
      variant: 'NLHE',
      tournament: {
        buyIn,
        startTime: parseTimeString(timeStr),
        name: data['name'] || data['tournament'] || '',
      },
      playerCount: 0,
      isRunning: false,
    };
  }

  // Try parsing as cash game
  const stakesMatch = stakesStr.match(/(\d+)\/(\d+)/);
  if (stakesMatch) {
    return {
      clubId: 'clubgg_main',
      clubName: 'ClubGG',
      gameType: 'CASH',
      variant: 'NLHE',
      stakes: {
        smallBlind: parseInt(stakesMatch[1], 10),
        bigBlind: parseInt(stakesMatch[2], 10),
      },
      playerCount: 0,
      isRunning: true,
    };
  }

  return null;
}

/**
 * Parse card/tile text to game
 */
function parseCardTextToGame(text: string, dataAttr?: string): ClubGGGame | null {
  // Try parsing data attribute first
  if (dataAttr) {
    try {
      const data = JSON.parse(dataAttr);
      return parseGenericToGame(data);
    } catch {
      // Not JSON
    }
  }

  return parseTextToGame(text);
}

/**
 * Parse free-form text to game
 */
function parseTextToGame(text: string): ClubGGGame | null {
  // Look for buy-in pattern: $55, $109, etc.
  const buyInMatch = text.match(/\$(\d+)\s*(?:buy-?in|entry)?/i);

  // Look for stakes pattern: 1/2, 2/5, etc.
  const stakesMatch = text.match(/(\d+)\/(\d+)/);

  // Look for guarantee pattern: $10,000 GTD, $5K guaranteed
  const gtdMatch = text.match(/\$?([\d,]+)k?\s*(?:gtd|guaranteed)/i);

  // Determine variant
  let variant: GameVariant = 'NLHE';
  if (text.match(/plo5|5-?card\s*omaha/i)) variant = 'PLO5';
  else if (text.match(/plo|omaha/i)) variant = 'PLO';
  else if (text.match(/mixed/i)) variant = 'MIXED';

  if (buyInMatch) {
    // Tournament
    const buyIn = parseInt(buyInMatch[1], 10);
    let guarantee: number | undefined;
    if (gtdMatch) {
      guarantee = parseInt(gtdMatch[1].replace(/,/g, ''), 10);
      if (text.toLowerCase().includes('k')) guarantee *= 1000;
    }

    return {
      clubId: 'clubgg_main',
      clubName: 'ClubGG',
      gameType: 'TOURNAMENT',
      variant,
      tournament: {
        buyIn,
        startTime: new Date(),
        guaranteedPrize: guarantee,
      },
      playerCount: 0,
      isRunning: false,
    };
  }

  if (stakesMatch) {
    // Cash game
    return {
      clubId: 'clubgg_main',
      clubName: 'ClubGG',
      gameType: 'CASH',
      variant,
      stakes: {
        smallBlind: parseInt(stakesMatch[1], 10),
        bigBlind: parseInt(stakesMatch[2], 10),
      },
      playerCount: 0,
      isRunning: true,
    };
  }

  return null;
}

/**
 * Extract from schedule/tournament sections
 */
function extractFromScheduleSections($: cheerio.CheerioAPI): ClubGGGame[] {
  const games: ClubGGGame[] = [];

  // Common section selectors
  const sectionSelectors = [
    '#schedule', '.schedule', '[data-section="schedule"]',
    '#tournaments', '.tournaments', '[data-section="tournaments"]',
    '#events', '.events', '[data-section="events"]',
    '#games', '.games', '[data-section="games"]',
  ];

  for (const selector of sectionSelectors) {
    const $section = $(selector);
    if ($section.length === 0) continue;

    // Get all text content and try to parse
    const text = $section.text();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    for (const line of lines) {
      const game = parseTextToGame(line);
      if (game) games.push(game);
    }
  }

  return games;
}

/**
 * Parse a time string to Date
 */
function parseTimeString(timeStr: string): Date {
  if (!timeStr) return new Date();

  try {
    // Try direct parsing
    const date = new Date(timeStr);
    if (!isNaN(date.getTime())) return date;

    // Try common formats
    const now = new Date();

    // "8:00 PM" or "20:00"
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const period = timeMatch[3]?.toLowerCase();

      if (period === 'pm' && hours < 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;

      now.setHours(hours, minutes, 0, 0);
      return now;
    }

    return new Date();
  } catch {
    return new Date();
  }
}

/**
 * Returns mock game data
 */
function getMockGames(): ClubGGGame[] {
  const now = new Date();

  return [
    {
      clubId: 'club_001',
      clubName: 'ClubGG Main',
      gameType: 'CASH',
      variant: 'NLHE',
      stakes: { smallBlind: 1, bigBlind: 2 },
      playerCount: 6,
      isRunning: true,
      tableCount: 3,
    },
    {
      clubId: 'club_001',
      clubName: 'ClubGG Main',
      gameType: 'CASH',
      variant: 'NLHE',
      stakes: { smallBlind: 2, bigBlind: 5 },
      playerCount: 8,
      isRunning: true,
      tableCount: 2,
    },
    {
      clubId: 'club_001',
      clubName: 'ClubGG Main',
      gameType: 'CASH',
      variant: 'PLO',
      stakes: { smallBlind: 1, bigBlind: 2 },
      playerCount: 4,
      isRunning: true,
      tableCount: 1,
    },
    {
      clubId: 'club_001',
      clubName: 'ClubGG Main',
      gameType: 'TOURNAMENT',
      variant: 'NLHE',
      tournament: {
        buyIn: 55,
        startTime: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        guaranteedPrize: 10000,
        maxPlayers: 500,
        name: '$55 NLH Daily',
      },
      playerCount: 0,
      isRunning: false,
    },
    {
      clubId: 'club_001',
      clubName: 'ClubGG Main',
      gameType: 'TOURNAMENT',
      variant: 'NLHE',
      tournament: {
        buyIn: 22,
        startTime: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        guaranteedPrize: 5000,
        maxPlayers: 1000,
        name: '$22 Turbo',
      },
      playerCount: 0,
      isRunning: false,
    },
  ];
}

/**
 * Fetches active cash games from ClubGG
 */
export async function getActiveCashGames(): Promise<ClubGGGame[]> {
  const result = await scrapeClubGG();
  return result.games.filter(g => g.gameType === 'CASH' && g.isRunning);
}

/**
 * Fetches upcoming tournaments from ClubGG
 */
export async function getUpcomingTournaments(): Promise<ClubGGGame[]> {
  const result = await scrapeClubGG();
  return result.games.filter(g => g.gameType === 'TOURNAMENT');
}

/**
 * Transforms ClubGG games to format compatible with database
 */
export function transformToDbFormat(games: ClubGGGame[]) {
  return games.map(game => ({
    source: 'CLUB_GG',
    gameType: game.gameType,
    variant: game.variant,
    ...(game.gameType === 'CASH' && game.stakes ? {
      smallBlind: game.stakes.smallBlind * 100,
      bigBlind: game.stakes.bigBlind * 100,
    } : {}),
    ...(game.gameType === 'TOURNAMENT' && game.tournament ? {
      buyinAmount: game.tournament.buyIn * 100,
      startTime: game.tournament.startTime,
      estimatedPrizePool: game.tournament.guaranteedPrize ? game.tournament.guaranteedPrize * 100 : null,
      name: game.tournament.name,
    } : {}),
    playerCount: game.playerCount,
    isActive: game.isRunning,
    metadata: {
      clubId: game.clubId,
      clubName: game.clubName,
      tableCount: game.tableCount,
    },
  }));
}
