# Jungleverse AI Agent Guide

> A comprehensive reference for AI agents working on the Jungleverse codebase.
> Last updated: 2026-01-03

---

## Current Session Progress (2026-01-03)

### Session Status: COMPLETED

**Completed:**
- [x] Created this AI Agent Guide documentation
- [x] Started FastAPI backend server on `http://127.0.0.1:8000`
- [x] Verified desktop scraping dependencies are installed (pywinauto, pytesseract, opencv-python, mss)
- [x] Confirmed Tesseract OCR is available
- [x] Verified ClubGG launcher path exists at `D:\testgg\launcher.exe`
- [x] Fixed window detection to skip hidden windows at position (-32000, -32000)
- [x] Fixed screen capture for hardware-accelerated Unity/DirectX apps using `mss` library
- [x] Verified OCR text extraction works when window is visible

**Code Changes Made This Session:**

1. **`backend/app/scrapers/desktop_base.py`**:
   - Added `_is_valid_window()` method to filter out hidden windows
   - Updated `find_window()` to skip windows at (-32000, -32000) and with size < 100x100
   - Replaced `ImageGrab.grab()` with `mss` library for capture (works with DirectX/Unity)
   - Added focus forcing with `SetForegroundWindow` and `BringWindowToTop`

2. **`backend/requirements.txt`**:
   - Added `mss>=9.0.0` for screen capture

**Key Technical Findings:**
- `PIL.ImageGrab.grab()` returns BLACK for hardware-accelerated windows (DirectX/OpenGL/Unity)
- `mss` library successfully captures hardware-accelerated content when window is visible
- BitBlt/PrintWindow also return black for DirectX - no workaround for covered windows
- ClubGG creates a hidden placeholder window at (-32000, -32000) - must filter this out
- **Critical**: For Unity/DirectX apps, the window MUST be in foreground and not covered by other windows
- **ClubGG Capture Protection**: ClubGG dynamically enables `WDA_EXCLUDEFROMCAPTURE` (affinity=17) which blocks all screen capture. This can be checked with `GetWindowDisplayAffinity()`. Fresh app launch usually has affinity=0 (capturable). If capture shows desktop wallpaper, restart ClubGG.

**Running Services:**
- FastAPI backend: `http://127.0.0.1:8000` (background task ID: b9d623f)

**How to Test Desktop Scraping:**
```bash
# Ensure ClubGG is visible on screen (not covered by other windows)
# Then call the API:
curl http://127.0.0.1:8000/api/scrapers/desktop/clubgg

# For debug screenshot:
curl -X POST http://127.0.0.1:8000/api/scrapers/desktop/clubgg/screenshot

# Check capture protection status:
python check_affinity.py  # affinity=0 means capturable, 17 means protected
```

**Known Limitations:**
- ClubGG window must be visible and not obscured
- ClubGG may enable capture protection dynamically - restart app if capture shows wallpaper
- OCR accuracy depends on UI fonts and contrast
- Game parser may misinterpret non-game screens (parsing logic needs tuning for specific screens)
- **Auto-navigation requires ADMIN privileges** - the FastAPI server must be run as Administrator for click automation to work (SendInput requires elevation to send input to other windows)

**Running the Server with Admin Privileges:**
```powershell
# Run PowerShell as Administrator, then:
cd D:\development\GitHub\jungleverse\backend
conda run -n base python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

---

## Project Overview

**Jungleverse** is a production-grade poker game discovery and indexing platform that helps players find and track poker games (tournaments and cash games) worldwide - both online and in physical poker rooms.

### Core Value Proposition
- "Where the thrill of the hunt meets the strategy of the cards"
- Indexes live poker rooms, tournaments, and cash games from multiple sources
- Provides intelligent ranking based on user preferences, location, and bankroll
- Offers both **web scraping** and **desktop app scraping** capabilities

### Key Features
1. **Game Discovery**: Browse poker rooms, tournaments, and cash games
2. **Personalized Recommendations**: Smart ranking engine based on distance, bankroll, and preferences
3. **Bankroll Management**: Track poker sessions across multiple platforms/sites
4. **Real-time Data**: Automated scrapers pull fresh data from 8+ providers
5. **Map Visualization**: Geographic discovery using Mapbox
6. **User Dashboard**: Save favorites, set preferences, view personalized recommendations
7. **Desktop App Scraping**: Extract data from Unity-based poker clients using OCR

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 16+ | App Router, Server Components, Server Actions |
| React 19 | UI framework |
| TailwindCSS 3 | Styling |
| shadcn/ui | Component library |
| Zustand | Client-side state management |
| React Hook Form + Zod | Form handling and validation |
| Mapbox GL | Map visualization |
| NextAuth.js 4 | Authentication |

### Backend Services

#### 1. Next.js API Routes (TypeScript)
- RESTful endpoints for rooms, tournaments, cash games, users, recommendations
- Server Actions for dashboard and admin operations
- Data fetching and provider management

#### 2. Python FastAPI Backend (`/backend`)
- Advanced web scraping with Playwright
- Desktop app scraping with pywinauto + OCR (pytesseract, OpenCV)
- **Endpoints**:
  - `/api/scrapers/{provider}` - Web scraping
  - `/api/scrapers/desktop/{provider}` - Desktop app scraping
  - `/api/scrapers/desktop/{provider}/navigate` - Auto-navigation scraping

### Database
- **ORM**: Prisma 5
- **Database**: PostgreSQL

### Data Providers (8+ sources)
- **Online**: GGPoker, PokerStars, 888poker, WSOP, PartyPoker, WPT Global
- **IRL/Casino**: bestbet, PokerAtlas

---

## Directory Structure

```
jungleverse/
├── app/                          # Next.js App Router
│   ├── api/                      # REST API endpoints
│   │   ├── auth/[...nextauth]/   # NextAuth authentication
│   │   ├── bankroll/             # Bankroll tracking APIs
│   │   ├── cash-games/           # Cash game CRUD
│   │   ├── fetch-poker-data/     # Provider data fetching
│   │   ├── recommendations/      # Personalized recommendations
│   │   ├── rooms/                # Poker room CRUD
│   │   ├── tournaments/          # Tournament CRUD
│   │   └── scrapers/             # ClubGG web scraper endpoint
│   ├── admin/                    # Admin dashboard pages
│   ├── cash-games/               # Cash games listing
│   ├── dashboard/                # User dashboard with preferences
│   ├── rooms/                    # Poker rooms directory
│   ├── tournaments/              # Tournament listings
│   ├── virtual/                  # Virtual environment (PCG embed)
│   ├── globals.css               # Global styles + brand system
│   ├── layout.tsx                # Root layout with navigation
│   └── page.tsx                  # Homepage
│
├── backend/                      # Python FastAPI scraper service
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Settings management
│   │   ├── dependencies.py      # Playwright dependency injection
│   │   ├── routers/
│   │   │   └── scraper_router.py # All scraper API endpoints
│   │   ├── scrapers/
│   │   │   ├── __init__.py      # Scraper exports
│   │   │   ├── base.py          # Base web scraper (Playwright)
│   │   │   ├── clubgg.py        # ClubGG web scraper
│   │   │   ├── ggpoker.py       # GGPoker web scraper
│   │   │   ├── pokerstars.py    # PokerStars web scraper
│   │   │   ├── desktop_base.py  # Base desktop scraper (pywinauto+OCR)
│   │   │   ├── clubgg_desktop.py        # ClubGG desktop scraper
│   │   │   └── clubgg_desktop_nav.py    # ClubGG auto-navigation
│   │   └── models/              # Pydantic models
│   └── requirements.txt         # Python dependencies
│
├── components/                   # React components
│   ├── admin/                   # Admin UI components
│   ├── auth/                    # Login/register forms
│   ├── bankroll/                # Bankroll tracking UI
│   ├── cash-games/              # Cash game cards
│   ├── dashboard/               # Dashboard components
│   ├── home/                    # Hero, featured regions
│   ├── layout/                  # Navigation, footer
│   ├── maps/                    # Mapbox map components
│   ├── rooms/                   # Room cards, room details
│   ├── tournaments/             # Tournament cards
│   ├── ui/                      # shadcn/ui primitives
│   └── wait-times/              # Wait time tracking
│
├── lib/                         # Core business logic
│   ├── services/                # Prisma service layer
│   ├── providers/               # Data provider connectors
│   ├── scrapers/                # TypeScript scrapers (legacy)
│   ├── validators/              # Zod validation schemas
│   ├── auth.ts                  # NextAuth configuration
│   ├── geo.ts                   # Haversine distance calculation
│   ├── poker-data-fetcher.ts    # Data fetching orchestrator
│   ├── prisma.ts                # Prisma client singleton
│   └── ranking.ts               # Game ranking engine
│
├── prisma/
│   ├── schema.prisma            # Database schema (KEY FILE)
│   ├── seed.ts                  # Database seeding
│   └── migrations/              # Database migrations
│
├── .claude/                     # Claude Code configuration
│   ├── settings.local.json      # Local permissions
│   └── AI_AGENT_GUIDE.md        # This file
│
└── Documentation:
    ├── README.md                # Project overview
    ├── BRAND_GUIDE.md           # Design system
    ├── PROVIDER_INTEGRATION_GUIDE.md # Provider integration docs
    └── DEPLOYMENT.md            # Vercel deployment guide
```

---

## Current Work in Progress

### Desktop App Scraping (Active Development)

**Status**: Core implementation complete, testing phase

**Files Modified/Created**:
- `backend/app/scrapers/desktop_base.py` - NEW: Base class for desktop scraping
- `backend/app/scrapers/clubgg_desktop.py` - NEW: ClubGG desktop scraper
- `backend/app/scrapers/clubgg_desktop_nav.py` - NEW: Auto-navigation capabilities
- `backend/app/scrapers/__init__.py` - MODIFIED: Added desktop scraper exports
- `backend/app/routers/scraper_router.py` - MODIFIED: Added desktop scraper endpoints
- `backend/requirements.txt` - MODIFIED: Added pywinauto, Pillow, pytesseract, opencv-python

**Architecture**:
```
DesktopBaseScraper (abstract)
├── Window detection (pywinauto)
├── Screen capture (PIL ImageGrab)
├── OCR extraction (pytesseract + OpenCV preprocessing)
├── Click automation (ctypes SendInput)
└── Screenshot folder management

ClubGGDesktopScraper (extends DesktopBaseScraper)
├── Game parsing from OCR text
├── Stakes/buy-in detection
└── Player count extraction

ClubGGNavigator (extends DesktopBaseScraper)
├── Screen detection
├── Auto-navigation between sections
├── Full app scraping with navigation
└── Quick scrape (current screen only)
```

**API Endpoints** (all under `/api/scrapers/`):
- `GET /desktop/status` - Check if desktop scraping is available
- `GET /desktop/{provider}` - Scrape desktop app
- `POST /desktop/{provider}/screenshot` - Capture debug screenshot
- `GET /desktop/{provider}/navigate` - Navigate and scrape all sections
- `POST /desktop/{provider}/navigate/to` - Navigate to specific section
- `GET /desktop/{provider}/screen` - Detect current screen

**Known Limitations**:
1. Windows-only (requires pywinauto)
2. Requires Tesseract OCR installed at `C:\Program Files\Tesseract-OCR\tesseract.exe`
3. ClubGG is Unity-based - no UI Automation support, must use OCR
4. Click automation may require elevated permissions
5. App must be visible (not minimized) for screen capture

**Test Files** (uncommitted):
- `test_desktop_scraper.py` - Desktop scraper test script
- `test_admin_nav.py` - Navigation test script

---

## Key Database Models

Located in `prisma/schema.prisma`:

```prisma
PokerRoom       # Physical or online poker venues
├── location data (lat/lng, address, city, country)
├── amenities (food, hotel, parking)
└── branding (website, phone, image)

Game            # Base game entity
├── links to PokerRoom
├── GameType (CASH | TOURNAMENT)
└── GameVariant (NLHE, PLO, PLO5, MIXED, OTHER)

CashGame        # Cash game specifics
├── stakes (smallBlind, bigBlind)
├── buy-in range (minBuyin, maxBuyin)
└── schedule (usualDaysOfWeek, usualHours)

Tournament      # Tournament specifics
├── timing (startTime, blindLevelMinutes)
├── buy-in (buyinAmount, rakeAmount)
└── structure (startingStack, reentryPolicy)

User            # Player profiles
├── authentication (email, username, hashedPassword)
├── location (homeLat, homeLng)
└── preferences (bankrollProfile, preferredVariants)

BankrollAccount # Multi-platform bankroll tracking
├── provider (POKERSTARS, GG_POKER, CLUB_GG, etc.)
└── balance and session tracking
```

---

## Provider Infrastructure

Located in `lib/providers/`:

| Component | File | Purpose |
|-----------|------|---------|
| Registry | `index.ts` | Provider discovery and routing |
| Cache | `cache.ts` | In-memory TTL cache (1 hour default) |
| Rate Limiter | `rate-limiter.ts` | Request throttling per provider |
| Logger | `logger.ts` | Success/failure tracking |
| Monitor | `monitor.ts` | Health checks and validation |

**Adding a New Provider**:
1. Create `lib/providers/{provider}.ts` implementing the provider interface
2. Register in `lib/providers/index.ts`
3. Add to database enum if needed (`prisma/schema.prisma`)
4. See `PROVIDER_INTEGRATION_GUIDE.md` for detailed steps

---

## Common Development Tasks

### Running the Project

```bash
# Frontend (Next.js)
npm install
npm run dev              # Development server on http://localhost:3000

# Backend (Python FastAPI)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Database
npx prisma generate      # Generate Prisma client
npx prisma db push       # Push schema changes
npx prisma studio        # Open Prisma Studio GUI
```

### Running Tests

```bash
# Frontend tests
npm run test             # Vitest

# Backend (no formal tests yet - use test scripts)
python test_desktop_scraper.py
```

### Desktop Scraper Testing

```bash
# From project root, using conda environment
powershell -Command "conda run -n base python test_desktop_scraper.py"

# Or with direct Python path
"C:\Users\madha\AppData\Local\Programs\Python\Python39\python.exe" test_desktop_scraper.py
```

---

## Environment Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN="..."

# Python backend
TESSERACT_PATH="C:\Program Files\Tesseract-OCR\tesseract.exe"
```

### Claude Code Permissions

Located in `.claude/settings.local.json` - allows specific bash commands for testing.

---

## Code Style & Conventions

### TypeScript/React
- Use functional components with hooks
- Prefer Server Components where possible
- Use Zod for runtime validation
- Follow shadcn/ui patterns for components

### Python
- Use async/await for all I/O operations
- Pydantic for models and validation
- Type hints throughout
- Abstract base classes for scrapers

### Git
- Commit messages: `type: description`
- Types: `feat`, `fix`, `refactor`, `docs`, `test`
- Always include `Co-Authored-By: Claude <noreply@anthropic.com>` for AI commits

---

## Important Files to Know

| Purpose | File |
|---------|------|
| Database schema | `prisma/schema.prisma` |
| Main API routes | `app/api/` |
| Provider connectors | `lib/providers/` |
| Ranking algorithm | `lib/ranking.ts` |
| Auth config | `lib/auth.ts` |
| Desktop scraper base | `backend/app/scrapers/desktop_base.py` |
| Scraper router | `backend/app/routers/scraper_router.py` |
| Brand/design system | `BRAND_GUIDE.md` |

---

## Troubleshooting

### Desktop Scraping Issues

1. **"Desktop scraping not available"**
   - Check platform is Windows
   - Install: `pip install pywinauto Pillow pytesseract opencv-python`
   - Verify Tesseract OCR is installed

2. **"ClubGG not found"**
   - Ensure ClubGG desktop app is running
   - Check `EXE_PATH` in `clubgg_desktop.py` matches actual location

3. **"Click not working"**
   - May need to run as Administrator
   - Check `check_click_permissions()` return value

4. **Poor OCR accuracy**
   - Ensure window is fully visible (not overlapped)
   - Try adjusting preprocessing in `preprocess_for_ocr()`
   - Check Tesseract version (4.0+ recommended)

### Database Issues

1. **Schema out of sync**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

2. **Migration conflicts**
   ```bash
   npx prisma migrate reset  # WARNING: Deletes all data
   ```

---

## Next Steps / TODO

### Desktop Scraping
- [ ] Test navigation reliability on different screen sizes
- [ ] Add more robust OCR text parsing
- [ ] Support additional desktop poker clients (PokerStars, GGPoker)
- [ ] Add visual element detection (template matching) for buttons

### General
- [ ] Add comprehensive test suite
- [ ] Implement caching layer for desktop scrape results
- [ ] Add support for macOS desktop apps (if feasible)
- [ ] Real-time game updates via WebSocket

---

## Contact & Resources

- **Repository**: https://github.com/anthropics/jungleverse
- **Documentation**: See `/README.md`, `/BRAND_GUIDE.md`, `/PROVIDER_INTEGRATION_GUIDE.md`
- **Issues**: Report bugs via GitHub Issues
