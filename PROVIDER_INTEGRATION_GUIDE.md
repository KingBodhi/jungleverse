# Provider Integration Guide

## Overview

Jungleverse now supports automated data fetching from 8+ poker providers (online and IRL), with infrastructure for rate limiting, caching, monitoring, and validation.

## Supported Providers

### Online Poker Sites
1. **GGpoker** ✅ - Tournament scraping
2. **PokerStars** ✅ - API + scraping fallback
3. **888poker** ✅ - Tournament scraping
4. **WSOP** ✅ - Online + circuit events
5. **PartyPoker** ✅ - Tournament scraping
6. **WPT Global** ✅ - Tournament scraping

### IRL/Casino Providers
1. **bestbet** ✅ - Tournaments (scraping) + Cash games (PokerAtlas API)
2. **PokerAtlas** ✅ - Cash games for US poker rooms

## API Endpoints

### Fetch Data
```bash
# Fetch all providers
GET /api/fetch-poker-data

# Fetch specific provider
GET /api/fetch-poker-data?provider=PokerStars

# Response
{
  "success": true,
  "message": "Data fetching completed successfully (provider:PokerStars)",
  "duration": "2453ms",
  "timestamp": "2024-12-24T12:34:56.789Z"
}
```

### System Health
```bash
# Get overall system health
GET /api/fetch-poker-data?action=health

# Response
{
  "status": "healthy",
  "providers": [
    {
      "provider": "GGpoker",
      "status": "healthy",
      "successRate": 0.95,
      "avgResponseTime": 1234
    },
    ...
  ],
  "cache": {
    "size": 42,
    "expired": 3
  }
}
```

### Provider Statistics
```bash
# Get all provider stats
GET /api/fetch-poker-data?action=stats

# Get specific provider stats
GET /api/fetch-poker-data?action=stats&provider=PokerStars

# Response
{
  "provider": "PokerStars",
  "statistics": {
    "totalFetches": 150,
    "successCount": 142,
    "errorCount": 8,
    "successRate": 0.947,
    "avgDuration": 2134
  },
  "health": {
    "status": "healthy",
    "lastSuccessfulFetch": "2024-12-24T12:00:00.000Z"
  }
}
```

### System Status
```bash
# Get comprehensive status report
GET /api/fetch-poker-data?action=status

# Response
{
  "summary": "System: HEALTHY | Providers: 7/8 healthy | Cache: 42 entries",
  "health": { ... },
  "recommendations": [
    "⚠️ PartyPoker is degraded (success rate: 65.3%)"
  ]
}
```

### Validate Provider
```bash
# Validate provider data quality
GET /api/fetch-poker-data?action=validate&provider=PokerStars

# Response
{
  "provider": "PokerStars",
  "valid": true,
  "issues": [],
  "timestamp": "2024-12-24T12:34:56.789Z"
}
```

### Clear Cache
```bash
# Clear all cache
GET /api/fetch-poker-data?action=clear-cache

# Clear specific provider cache
GET /api/fetch-poker-data?action=clear-cache&provider=PokerStars
```

## Infrastructure Components

### 1. Rate Limiter (`lib/providers/rate-limiter.ts`)
Prevents overwhelming provider sites with requests:

```typescript
import { globalRateLimiter } from "@/lib/providers/rate-limiter";

// Throttle requests with 2 second delay
await globalRateLimiter.throttle("PokerStars", 2000);

// Check rate limit (max 10 requests per minute)
const allowed = globalRateLimiter.checkRateLimit("PokerStars", 10, 60000);
```

### 2. Cache (`lib/providers/cache.ts`)
Reduces redundant API calls:

```typescript
import { providerCache, ProviderCache } from "@/lib/providers/cache";

// Get cached data
const cached = providerCache.get<Tournament[]>(cacheKey);

// Set cache with 1 hour TTL
providerCache.set(cacheKey, data, 3600000);

// Generate cache key
const key = ProviderCache.createKey("PokerStars", "tournaments");
```

### 3. Logger (`lib/providers/logger.ts`)
Tracks fetch success/failure:

```typescript
import { providerLogger } from "@/lib/providers/logger";

// Log success
providerLogger.logSuccess("PokerStars", "tournaments", 150, 2134);

// Log error
providerLogger.logError("PokerStars", "tournaments", error, 543);

// Get provider stats
const stats = providerLogger.getProviderStats("PokerStars");
```

### 4. Monitor (`lib/providers/monitor.ts`)
Health checking and validation:

```typescript
import { providerMonitor } from "@/lib/providers/monitor";

// Get system health
const health = providerMonitor.getSystemHealth();

// Validate provider data
const validation = await providerMonitor.validateProviderData("PokerStars");

// Generate report
const report = providerMonitor.generateReport();
```

## Adding a New Provider

### 1. Create Connector File

```typescript
// lib/providers/newsite.ts
import { load } from "cheerio";
import { NormalizedTournament, ProviderConnector } from "./types";
import { globalRateLimiter } from "./rate-limiter";
import { providerCache, ProviderCache } from "./cache";
import { providerLogger } from "./logger";

async function fetchNewSiteTournaments(): Promise<NormalizedTournament[]> {
  const startTime = Date.now();
  const cacheKey = ProviderCache.createKey("NewSite", "tournaments");

  try {
    // Check cache
    const cached = providerCache.get<NormalizedTournament[]>(cacheKey);
    if (cached) {
      providerLogger.logSuccess("NewSite", "tournaments", cached.length, Date.now() - startTime);
      return cached;
    }

    // Rate limit
    await globalRateLimiter.throttle("NewSite", 3000);

    // Fetch data (API or scraping)
    const tournaments = await scrapeNewSite();

    // Cache results
    if (tournaments.length > 0) {
      providerCache.set(cacheKey, tournaments, 3600000);
    }

    providerLogger.logSuccess("NewSite", "tournaments", tournaments.length, Date.now() - startTime);
    return tournaments;
  } catch (error) {
    providerLogger.logError("NewSite", "tournaments", error as Error, Date.now() - startTime);
    return [];
  }
}

async function scrapeNewSite(): Promise<NormalizedTournament[]> {
  // Implementation here
  return [];
}

export const newsiteConnector: ProviderConnector = {
  name: "NewSite",
  type: "ONLINE", // or "IRL"
  pokerRooms: ["NewSite"],
  fetchTournaments: fetchNewSiteTournaments,
};
```

### 2. Register Connector

```typescript
// lib/providers/index.ts
import { newsiteConnector } from "./newsite";

export const providerRegistry: ProviderConnector[] = [
  // ...existing connectors
  newsiteConnector,
];
```

### 3. Add Poker Room to Database

```sql
INSERT INTO "PokerRoom" (id, name, city, country, latitude, longitude)
VALUES (
  gen_random_uuid(),
  'NewSite',
  'Online',
  'Online',
  NULL,
  NULL
);
```

## Database Schema Updates

### New Indexes Added

```sql
-- Game variant index
CREATE INDEX "Game_variant_idx" ON "Game"("variant");

-- Game room + variant composite
CREATE INDEX "Game_pokerRoomId_variant_idx" ON "Game"("pokerRoomId", "variant");

-- Cash game blinds index
CREATE INDEX "CashGame_smallBlind_bigBlind_idx" ON "CashGame"("smallBlind", "bigBlind");
```

Apply with:
```bash
npm run db:generate
npm run db:migrate
```

## Best Practices

### 1. Respect Rate Limits
- **Online sites**: 2-3 seconds between requests
- **Public APIs**: 1-2 seconds between requests
- **Scraping**: 3-5 seconds between requests

### 2. Cache Aggressively
- **Tournaments**: 1 hour TTL
- **Cash games**: 10 minutes TTL
- **Static data**: 24 hours TTL

### 3. Error Handling
- Always wrap fetch calls in try/catch
- Log errors with providerLogger
- Return empty arrays on failure
- Never throw unhandled exceptions

### 4. Data Validation
- Validate required fields exist
- Check date formats are correct
- Ensure numeric values are positive
- Filter out invalid/expired data

### 5. Legal Compliance
- ✅ Scrape public tournament schedules
- ✅ Use provided public APIs
- ❌ Don't scrape user data
- ❌ Don't bypass authentication
- ❌ Respect robots.txt

## Monitoring

### View Logs
```bash
# Check provider health
curl http://localhost:3000/api/fetch-poker-data?action=health

# View statistics
curl http://localhost:3000/api/fetch-poker-data?action=stats

# Get status report
curl http://localhost:3000/api/fetch-poker-data?action=status
```

### Automated Monitoring
Set up Vercel Cron to run:
```javascript
// app/api/cron/monitor-providers/route.ts
export async function GET() {
  const report = providerMonitor.generateReport();

  if (report.health.overall === 'down') {
    // Send alert (email, Slack, etc.)
  }

  return NextResponse.json(report);
}
```

## Troubleshooting

### Provider Returns No Data
1. Check if site structure changed (update selectors)
2. Verify rate limiting isn't blocking you
3. Check if site requires JavaScript rendering (use Playwright)
4. Validate API endpoint URLs

### High Error Rate
1. Review recent error logs
2. Check if site is blocking requests
3. Verify User-Agent headers
4. Increase delay between requests

### Slow Performance
1. Check cache hit rates
2. Verify database indexes are applied
3. Run validation on providers
4. Consider parallel fetching

## Future Enhancements

### Phase 2
- [ ] Add more online poker sites (ACR, BetOnline, etc.)
- [ ] Bravo Poker Live integration
- [ ] Hendon Mob tournament database
- [ ] International poker room coverage

### Phase 3
- [ ] Real-time updates via WebSocket
- [ ] Player traffic data
- [ ] Historical trend analysis
- [ ] Predictive modeling for field sizes

### Phase 4
- [ ] Mobile app integration
- [ ] Push notifications for events
- [ ] User-contributed data
- [ ] Partnership APIs

## Support

For issues or questions:
1. Check this guide first
2. Review provider logs via API
3. Test validation endpoint
4. Check GitHub issues
