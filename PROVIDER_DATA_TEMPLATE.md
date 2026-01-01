# Provider Data Template

The Rooms/Providers database stores two categories of entries:

1. **Physical Poker Rooms** – brick-and-mortar poker rooms located inside casinos, standalone cardrooms, or social clubs.
2. **Online Poker Providers** – iGaming operators or platforms that offer poker games digitally.

To keep both the database seed files and CSV exports aligned, each provider record should follow the schema below. Columns are ordered for easy import into spreadsheets or Prisma seed scripts.

| Column | Description | Example |
| --- | --- | --- |
| `provider_id` | Stable slug (`kebab-case`) used as the unique key everywhere. | `commerce-casino` |
| `category` | `physical` or `online`. | `physical` |
| `official_name` | Legal/official name used on licenses or website mastheads. | `Commerce Casino` |
| `brand_name` | Consumer-facing brand (if different). | `Commerce` |
| `operator_company` | Parent company or operator of the room/platform. | `Commerce Casino & Hotel` |
| `logo_url` | HTTPS link to an official SVG/PNG logo (prefer transparent background). | `https://www.commercecasino.com/wp-content/uploads/logo.svg` |
| `website_url` | Canonical marketing site for the provider. | `https://www.commercecasino.com` |
| `contact_email` | Primary support/email inbox. Use `N/A` if not published. | `info@commercecasino.com` |
| `contact_phone` | Public reservations / cage / concierge number. Include `+` country code. | `+1-323-721-2100` |
| `hq_address` | Mailing or street address (online providers use HQ/regulator office). | `6131 Telegraph Rd, Commerce, CA 90040` |
| `municipality` | City / municipality name. | `Commerce` |
| `state_or_region` | US state, province, or region. | `California` |
| `country` | Country name. | `United States` |
| `postal_code` | ZIP / postal code (if published). | `90040` |
| `latitude` | Decimal latitude in WGS84. Leave blank if unknown. | `34.0087` |
| `longitude` | Decimal longitude in WGS84. | `-118.1487` |
| `timezone` | IANA timezone the room primarily operates in. | `America/Los_Angeles` |
| `licensing_jurisdiction` | Gaming regulator or license reference. | `California Gambling Control Commission` |
| `primary_markets` | Comma-separated list of markets/regions served. | `Southern California, Traveling players` |
| `contact_hours` | Published support hours or “24/7”. | `24/7` |
| `social_links` | Pipe (`|`) separated list of official social URLs. | `https://instagram.com/commercecasino|https://x.com/CommerceCasino` |
| `games_offered` | High-level descriptors separated by semicolons (`Cash NLHE; Tournaments; Mixed Games`). Do **not** list specific blinds or schedules. | `Cash NLHE; Cash PLO; Daily tournaments` |
| `specialties` | Unique positioning (e.g., “High roller events”, “Beginner-friendly”). | `Largest card room in the world` |
| `support_channels` | Comma-separated list of support channels (`phone, email, live chat`). | `phone, email` |
| `notes` | Free-form operational notes or reminders. | `Hosts LAPC major series each winter.` |
| `data_source` | Short citation of where the data came from (site, regulator, etc.). | `commercecasino.com/contact` |
| `last_verified_utc` | ISO 8601 timestamp when the record was last refreshed. | `2026-01-01T18:00:00Z` |

### Implementation Notes

- **CSV Sheets**: Use one CSV per category (`providers_physical.csv`, `providers_online.csv`). Both share the same header row defined above.
- **Types & Validation**: Prisma models should align closely with these columns. Optional fields can remain `NULL` in the database but still show `N/A` in CSV exports.
- **Logos & Assets**: Prefer SVG hosts from official domains. If only raster assets exist, store an HTTPS PNG or JPG under 1MB.
- **Game Coverage**: `games_offered` should summarize types (e.g., `Cash NLHE`, `MTT`, `PLO`) rather than enumerating every stake or tournament.
- **Source Tracking**: Always record `data_source` + `last_verified_utc` alongside the data. This lets us refresh stale entries quickly.

Keep this template up to date whenever we add new metadata requirements so our seed files, Prisma schema, and CSV exports stay in sync.
