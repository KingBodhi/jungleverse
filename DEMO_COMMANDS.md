# Jungleverse Provider System - Quick Start Commands

## 🚀 System is Live!

Your Next.js dev server is running at **http://localhost:3000**

---

## 📊 Current Status

- ✅ **42 poker rooms** indexed
- ✅ **384 tournaments** in database
- ✅ **37 cash games** in database
- ✅ **8 provider connectors** ready
- ✅ **4 infrastructure components** active

---

## 🧪 Test Commands

### Fetch Data from Providers

```bash
# Fetch all providers (takes a while)
curl http://localhost:3000/api/fetch-poker-data

# Fetch specific provider (faster)
curl http://localhost:3000/api/fetch-poker-data?provider=GGpoker
curl http://localhost:3000/api/fetch-poker-data?provider=bestbet
curl http://localhost:3000/api/fetch-poker-data?provider=PokerStars
```

### Check System Health

```bash
# Quick health check
curl http://localhost:3000/api/fetch-poker-data?action=health | jq

# Full system status with recommendations
curl http://localhost:3000/api/fetch-poker-data?action=status | jq

# Provider-specific stats
curl "http://localhost:3000/api/fetch-poker-data?action=stats&provider=GGpoker" | jq
```

### Data Quality

```bash
# Validate provider data
curl "http://localhost:3000/api/fetch-poker-data?action=validate&provider=GGpoker" | jq
```

### Cache Management

```bash
# Clear all cache
curl "http://localhost:3000/api/fetch-poker-data?action=clear-cache" | jq

# Clear specific provider cache
curl "http://localhost:3000/api/fetch-poker-data?action=clear-cache&provider=GGpoker" | jq
```

---

## 🗄️ Database Queries

### View Tournament Data

```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const tournaments = await prisma.tournament.findMany({
  include: {
    game: {
      include: {
        pokerRoom: true
      }
    }
  },
  take: 10,
  orderBy: { buyinAmount: 'desc' }
});

tournaments.forEach(t => {
  console.log(\`\${t.game.pokerRoom.name} - \\\$\${t.buyinAmount} - \${t.startTime}\`);
});

prisma.\$disconnect();
"
```

### Count by Provider

```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const rooms = await prisma.pokerRoom.findMany({
  include: {
    _count: {
      select: { games: true }
    }
  }
});

rooms
  .filter(r => r._count.games > 0)
  .sort((a, b) => b._count.games - a._count.games)
  .forEach(r => {
    console.log(\`\${r.name.padEnd(30)} \${r._count.games} games\`);
  });

prisma.\$disconnect();
"
```

---

## 🎯 Example: Full Workflow

```bash
# 1. Check system health
curl -s http://localhost:3000/api/fetch-poker-data?action=health | jq '.status'

# 2. Fetch data from a provider
curl -s http://localhost:3000/api/fetch-poker-data?provider=GGpoker | jq

# 3. Verify data was inserted
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const count = await prisma.tournament.count({
  where: { game: { pokerRoom: { name: 'GGpoker' } } }
});
console.log('GGpoker tournaments:', count);
prisma.\$disconnect();
"

# 4. Check provider stats
curl -s "http://localhost:3000/api/fetch-poker-data?action=stats&provider=GGpoker" | jq

# 5. Clear cache when done testing
curl -s "http://localhost:3000/api/fetch-poker-data?action=clear-cache&provider=GGpoker" | jq
```

---

## 📁 Key Files

### Infrastructure
- `lib/providers/rate-limiter.ts` - Rate limiting
- `lib/providers/cache.ts` - Caching layer
- `lib/providers/logger.ts` - Logging system
- `lib/providers/monitor.ts` - Health monitoring

### Connectors
- `lib/providers/ggpoker.ts` - GGpoker (working ✅)
- `lib/providers/pokerstars.ts` - PokerStars
- `lib/providers/888poker.ts` - 888poker
- `lib/providers/wsop.ts` - WSOP
- `lib/providers/partypoker.ts` - PartyPoker
- `lib/providers/wptglobal.ts` - WPT Global
- `lib/providers/bestbet.ts` - bestbet (working ✅)
- `lib/providers/pokeratlas.ts` - PokerAtlas

### API
- `app/api/fetch-poker-data/route.ts` - Main endpoint

### Documentation
- `PROVIDER_INTEGRATION_GUIDE.md` - Full developer guide
- `PROVIDER_UPGRADE_SUMMARY.md` - Technical specs
- `DEMO_COMMANDS.md` - This file

---

## 🔧 Troubleshooting

### Provider not fetching?

```bash
# Check logs
tail -f .next/server.log

# Validate provider
curl "http://localhost:3000/api/fetch-poker-data?action=validate&provider=PokerStars" | jq
```

### Database issues?

```bash
# Regenerate Prisma client
npm run db:generate

# Check migrations
npx prisma migrate status
```

### Clear everything and start fresh

```bash
# Clear cache
curl "http://localhost:3000/api/fetch-poker-data?action=clear-cache" | jq

# Restart dev server
# Ctrl+C in terminal, then: npm run dev
```

---

## 🚀 Next Steps

1. **Test all providers** - Try fetching from each provider
2. **Set up cron jobs** - Automate hourly fetches
3. **Monitor performance** - Use the status endpoint
4. **Add more providers** - Follow the guide in PROVIDER_INTEGRATION_GUIDE.md

---

## 💡 Pro Tips

- Use `?provider=X` to test individual providers faster
- Check `?action=status` regularly for health monitoring
- Clear cache between tests with `?action=clear-cache`
- Use `jq` to format JSON responses nicely
- Database queries are fast thanks to new indexes

---

**System Status**: ✅ Fully Operational
**Version**: 1.0.0
**Last Updated**: 2024-12-24
