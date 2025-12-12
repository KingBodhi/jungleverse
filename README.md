# Global Texas Hold'em Game Index

Production-grade Next.js 14 (App Router) MVP that indexes live poker rooms, tournaments, and cash games worldwide. Built with TypeScript, TailwindCSS + shadcn/ui, Prisma ORM, PostgreSQL, and Mapbox for spatial discovery.

## Tech Stack

- **Next.js 16 / React 19** with App Router, Server Components, Server Actions
- **TypeScript** with strict mode and Vitest unit tests
- **TailwindCSS 3 + shadcn/ui** for rapid UI building
- **Prisma ORM + PostgreSQL** data layer with typed services
- **Mapbox GL** map visualization
- **Zod** validation layer used everywhere (API, actions, forms)

## Getting Started

```bash
npm install
cp .env.example .env # edit DATABASE_URL + NEXT_PUBLIC_MAPBOX_TOKEN
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The Prisma seed creates 10 poker rooms, 20 tournaments, 20 cash games, and 3 example users so you can immediately test the dashboard and recommendation engine.

### Env Vars

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/global_holdem_index
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-token
```

Add `NEXT_PUBLIC_APP_URL` to override metadata URLs when deploying.

## Package Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start Next.js in development mode |
| `npm run build` | Production build |
| `npm start` | Run compiled app |
| `npm run lint` | ESLint (Next.js config) |
| `npm test` | Vitest suite for the ranking engine |
| `npm run db:generate` | Prisma client generation |
| `npm run db:migrate` | Run or create dev migrations |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` | Populate the database with sample data |

## Folder Structure

```
app/
  api/
    rooms|tournaments|cash-games|users|recommendations
  cash-games/
  dashboard/
  rooms/
  tournaments/
  admin/
components/
  admin|cash-games|dashboard|home|layout|maps|pagination|rooms|search|tournaments|ui
lib/
  services|validators|geo|ranking|security|http|prisma
prisma/
  schema.prisma
  seed.ts
types/
vitest.config.ts
```

## Deployment

### Frontend (Vercel)

1. Create a new Vercel project from this repo.
2. Set env vars in Vercel dashboard: `DATABASE_URL`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_APP_URL`.
3. Add `prisma generate` as a postinstall (Vercel runs automatically).
4. Vercel builds with `npm run build` and deploys the Next app + serverless API routes.

### PostgreSQL (Railway or Supabase)

- **Railway**: provision a Postgres service, copy the provided connection string into `DATABASE_URL`.
- **Supabase**: create a project, use the primary database URL (`postgresql://...`). Ensure the IP allow list lets Vercel connect or use Supabase connection pooling.
- Run `npx prisma migrate deploy` against the managed DB, then `npm run db:seed` locally pointing to the remote DB if you want seed data in production.

### Mapbox

Create a Mapbox account, generate a Public Access Token, and set `NEXT_PUBLIC_MAPBOX_TOKEN`. The rooms directory map renders markers only when this token exists.

## Extending the MVP

- **Auth**: drop in NextAuth or Lucia and wire API routes to JWT / sessions.
- **Realtime Feeds**: connect to operator APIs (Poker Atlas, Bravo) and push updates through server actions.
- **Advanced Ranking**: plug in travel APIs, liquidity forecasts, or user-provided feedback weights.
- **Notifications**: create background jobs (Cron/Vercel Scheduler) to email or text when a matching event hits a threshold.

## How it Works

- **Services Layer** (`lib/services/*`) centralizes Prisma queries so API routes, server actions, and server components reuse the same logic.
- **Validators** (`lib/validators/*`) provide Zod schemas for every payload (rooms, tournaments, cash games, users, recommendations) keeping validation consistent.
- **Ranking Engine** (`lib/ranking.ts`) normalizes distance, bankroll fit, and preference matching into a weighted score. Covered by Vitest tests (`lib/ranking.test.ts`).
- **Server Actions** (`app/dashboard/actions.ts`, `app/admin/actions.ts`) power the dashboard preference form and admin data-entry UI without round-trip API calls.
- **API Routes** (`app/api/...`) expose REST endpoints for rooms, tournaments, cash games, users, and recommendations—great for a mobile client or partners.
- **UI**: Tailwind + shadcn/ui components, map view powered by `react-map-gl`, dashboards built with cards, filters, tabs, etc.

## What to Build Next

1. OAuth/sign-in flows with persistent sessions and role-based access for the admin console.
2. Background job to ingest GTFS / flight times to refine travel-distance scoring.
3. User-generated reviews / live wait times with optimistic updates via Zustand or React Query.
4. Edge cache the recommendations endpoint for super-fast responses across geographies.
5. Expand variants (PLO, Mixed) once schema + enums are updated and validated.
