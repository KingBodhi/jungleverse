# Physical Casino Data Audit — January 2, 2026

## Snapshot
- **Total physical poker rooms in local DB:** 43
- **Logos:** 43 / 43 present (manual seed rooms now pull brand icons via unavatar)
- **Hero images:** 28 / 43 mapped; 15 still rely on generic fallback
- **Cash/tournament source coverage:** 30 / 33 provider rows in `data/providers_physical.csv` need explicit split between cash + tournament references (currently share a single `data_source` string)

## Rooms still missing dedicated hero imagery
These rooms render the gradient/stock fallback on cards and detail pages. Recommended canonical asset noted where we already found a viable photo.

| Poker Room | Suggested image source |
| --- | --- |
| Banco Casino Bratislava | `https://www.bancocasino.sk/ba/sites/bancocasino.sk.ba/files/banco_ba.jpg` |
| Hard Rock Tulsa Poker Room | Need exterior photo from Hard Rock Tulsa newsroom or Bravo listing |
| Hippodrome Casino | `https://www.hippodromecasino.com/wp-content/uploads/2019/11/About-The-Hippodrome.jpg` |
| King's Resort Poker Room | `https://admin.kings-resort.com/wp-content/uploads/2024/09/kingsbet-banner.jpg` |
| Okada Manila Poker | `https://cdn-storage.okadamanila.com/wp-content/uploads/2025/02/05013304/OkadaPool-2321.webp` |
| Parkwest Bicycle Casino Poker Room | `https://www.thebike.com/images/home_slider_bikecasinoentrance.jpg` |
| Peppermill Resort Spa Casino Poker Room | Already have hero in overrides but key mismatch; add alias `peppermillresortspacasinopokerroom` |
| Playground Poker Club | Need approved exterior shot from playground.ca media kit |
| Seminole Hard Rock Tampa Poker Room | `https://www.seminolehardrocktampa.com/tampa/-/media/project/shrss/sga/casinos/hard-rock/tampa/lifestyle/stay/hotel_1052x688.jpg` |
| Shuffle 214 | `https://images.squarespace-cdn.com/content/v1/608b11d814fcac00fb4e19be/7ada7cae-8f19-4450-b8b0-24554ae320e5/Shuffle+214+Cowboy+Stack+20%2C000.jpg` |
| Texas Card House Austin | Need location photo (TCH media kit or local press) |
| Thunder Valley Casino Resort Poker Room | `https://media-cdn.tripadvisor.com/media/photo-s/06/bc/d2/d7/thunder-valley-casino.jpg` (or resort media kit) |
| bestbet Jacksonville | `https://bestbetjax.com/images/uploads/JAX.jpg` |
| bestbet Orange Park | `https://bestbetjax.com/images/uploads/OP.jpg` |
| bestbet St. Augustine | `https://bestbetjax.com/images/uploads/bestbet_St_Augustine_Exterior_500x285.png` |

_Add the above URLs to `lib/room-images.ts:HERO_IMAGE_OVERRIDES` (normalize keys for each name) or store them per-room when we introduce a dedicated `heroImageUrl` field._

## Provider rows needing clearer source notes
30 provider entries in `data/providers_physical.csv` only cite a single combined `data_source` string. Add two new columns (e.g., `cash_source_url`, `tournament_source_url`) so we can trace lineup vs. schedule back to their respective authority. See `reports/physical-casino-audit.json` → `sourceGaps` array for the exact list (Wynn, Encore Boston Harbor, Caesars Palace, etc.).

## Files/changes of interest
- `prisma/seed.ts`
  - Manual rooms now embed brand logos via `unavatar` URLs
  - Merge logic normalizes names so CSV rows win over seed fallbacks
  - Finds existing rooms case-insensitively to avoid duplicates
- `prisma/seed_casinos.ts`
  - Trimmed to only handle `King's Resort` so we stop overwriting MGM rooms from the CSV
- `data/providers_physical.csv`
  - Normalized `official_name` for Aria so it aligns with the seed logic
- `reports/physical-casino-audit.json`
  - Machine-readable audit results feeding this summary

Next pass: wire the suggested hero URLs into `HERO_IMAGE_OVERRIDES`, split cash/tournament sources inside the CSV, and consider promoting explicit `logoUrl`/`heroImageUrl` columns on `PokerRoom` so we stop overloading `imageUrl`.
