# Online Poker Sites Integration - Implementation Summary

## Overview

We've successfully implemented a data fetching and indexing system for online poker sites in the Jungleverse project. The system can now monitor and collect data from online poker operators.

## What Was Implemented

### 1. Database Setup

Added 24 online poker sites to the database:
- GGpoker
- 888Poker
- Unibet
- WPT Global
- iPoker Network
- PartyPoker
- WSOP
- Pokerstars
- Phenom Poker
- WeplayPoker
- CoinPoker
- Betonline
- AApoker
- Virtue Poker
- Betfair
- SWC
- VbetPoker
- Shenpoker
- ActionCardz
- Intertops
- Everygame
- Pokerking
- JackPoker
- Sportdbetting Poker

All sites are stored as `PokerRoom` records with:
- City: "Online"
- Country: "Online"

### 2. Data Fetching Service

**File**: `lib/poker-data-fetcher.ts`

A provider registry (`lib/providers/index.ts`) describes each connector’s responsibilities (tournaments, cash games, or both). The ingester resolves poker-room IDs, deduplicates upcoming events, and routes the normalized payloads through Prisma services.

```typescript
export const providerRegistry: ProviderConnector[] = [ggpokerConnector, bestbetConnector];

export async function fetchAllPokerData(providerName?: string) {
  const connectors = providerName
    ? providerRegistry.filter((provider) => provider.name.toLowerCase() === providerName.toLowerCase())
    : providerRegistry;
  for (const connector of connectors) {
    await runConnector(connector);
  }
}
```

**Key Functions**:
- `fetchAllPokerData(provider?: string)` – runs every connector or a single provider when the query string includes `?provider=...`
- `runConnector` – routes normalized tournaments/cash games through Prisma-backed services with duplicate protection

### 3. API Endpoint

**File**: `app/api/fetch-poker-data/route.ts`

```typescript
GET /api/fetch-poker-data
```

Triggers the data fetching service. Can be called:
- Manually via HTTP request
- By a cron job for scheduled updates
- From admin panel

### 4. Seeding Script

**File**: `scripts/seed-poker-sites.ts`

One-time script to populate the database with the list of online poker sites.

**Usage**:
```bash
npx tsx scripts/seed-poker-sites.ts
```

## Current Status

✅ **Working**:
- 24 online poker sites + new bestbet brick-and-mortar rooms seeded
- Real GGPoker daily schedule scraped directly from `ggpoker.com/tournaments/daily-guarantees`
- Real bestbet tournaments (Jacksonville, Orange Park, St. Augustine) parsed from their live schedule endpoint
- Live bestbet St. Augustine cash tables ingested via PokerAtlas JSON feed with stake/buy-in metadata
- `/api/fetch-poker-data` accepts an optional `provider` filter for targeted refreshes

**Verified**:
```bash
curl "http://localhost:3000/api/fetch-poker-data?provider=bestbet"
# Returns: {"message":"Data fetching completed successfully (provider:bestbet)"}
```

Database now contains:
- Fresh online tournaments mapped to the GGpoker room with real guarantees
- A rolling slate of bestbet daily events across Florida locations
- St. Augustine cash games that update min/max buy-ins + waitlist counts instead of dummy data

## Architecture Highlights

### Database Schema

The existing schema perfectly supports online poker:

```
Tournament
  └─ Game (includes variant: NLHE, PLO, etc.)
      └─ PokerRoom (name, city, country)
```

### Extensibility

The connector pattern makes it easy to add new sites:

1. Add a new connector function in `lib/poker-data-fetcher.ts`
2. Implement the site-specific fetching logic
3. Return tournament/cash game data in the expected format

## Next Steps

### Phase 1: Real Data Integration

For each poker site, implement actual data fetching:

1. **API-based sites** (preferred):
   - GGpoker: Check if they have a public API
   - Pokerstars: Look for tournament schedule API
   - WSOP: May have public JSON feeds

2. **Web scraping** (when API unavailable):
   - Use libraries like `cheerio` or `puppeteer`
   - Parse tournament schedules from public pages
   - Respect robots.txt and rate limiting

### Phase 2: Data Enrichment

Expand the data collected:

- **Tournaments**:
  - Prize pool guarantees
  - Late registration periods
  - Satellite opportunities
  - Player field size limits

- **Cash Games**:
  - Available stake levels
  - Table count
  - Game variants (PLO, PLO5, MIXED)
  - Rake structures

### Phase 3: Scheduling & Monitoring

1. **Cron Jobs**:
   - Create `app/api/cron/fetch-poker-data/route.ts`
   - Schedule via Vercel Cron or similar
   - Run hourly/daily depending on site update frequency

2. **Error Handling**:
   - Log failed fetches
   - Retry logic for transient failures
   - Alert when sites change structure

3. **Rate Limiting**:
   - Implement delays between requests
   - Respect each site's terms of service
   - Consider caching mechanisms

### Phase 4: Data Quality

1. **Deduplication**:
   - Detect and merge duplicate tournaments
   - Handle recurring tournaments
   - Update existing records vs creating new ones

2. **Validation**:
   - Verify buy-in amounts are reasonable
   - Check start times are in the future
   - Validate currency conversions if needed

## Example: Adding a New Connector

```typescript
// In lib/poker-data-fetcher.ts

const siteConnectors: { [key: string]: () => Promise<any[]> } = {
  // ... existing connectors

  '888Poker': async () => {
    // Option 1: API call
    const response = await fetch('https://api.888poker.com/tournaments');
    const data = await response.json();

    // Transform to our format
    return data.tournaments.map(t => ({
      variant: GameVariant.NLHE,
      startTime: new Date(t.start_time),
      buyinAmount: t.buy_in,
      startingStack: t.chips,
      blindLevelMinutes: t.level_duration,
      estimatedPrizePool: t.guaranteed_prize,
    }));

    // Option 2: Web scraping
    // const html = await fetch('https://888poker.com/schedule').then(r => r.text());
    // const $ = cheerio.load(html);
    // Parse the HTML and extract tournament data...
  },
};
```

## Testing

To test the current implementation:

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Trigger data fetching:
   ```bash
   curl http://localhost:3000/api/fetch-poker-data
   ```

3. Verify in database:
   ```typescript
   npx tsx -e "
   import { PrismaClient } from '@prisma/client';
   const prisma = new PrismaClient();
   prisma.tournament.findMany({
     include: { game: { include: { pokerRoom: true } } }
   }).then(console.log).finally(() => prisma.\$disconnect());
   "
   ```

## Notes

- The existing ranking system will automatically work with online tournaments
- Users can set their preferences to include/exclude online games
- Distance scoring will be 0 for all online games (fair comparison)
- The admin panel can be extended to manually add/edit online tournaments

## Files Changed/Added

### New Files
- ✅ `lib/poker-data-fetcher.ts` - Data fetching service
- ✅ `app/api/fetch-poker-data/route.ts` - API endpoint
- ✅ `scripts/seed-poker-sites.ts` - Seeding script
- ✅ `scripts/poker-sites.txt` - List of poker sites

### Modified Files
- ✅ `lib/services/rooms.ts` - Fixed imports
- ✅ `lib/services/tournaments.ts` - Fixed imports, updated createTournament
- ✅ `lib/services/cash-games.ts` - Fixed imports
- ✅ `app/api/rooms/[id]/reviews/route.ts` - Fixed slug name

## Resources

- [Poker Atlas API](https://www.pokeratlas.com) - Real-time poker room data
- [Bravo Poker Live](https://www.bravopoker.com) - Industry standard for cash games
- [PokerNews Schedule](https://www.pokernews.com/tours/) - Tournament schedules
- Each operator's website for official schedules
