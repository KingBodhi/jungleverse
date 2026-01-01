# Jungleverse Brand System

Quick reference for maintaining the "red chip x green canopy" identity across the app, marketing, and partner embeds.

## 1. Narrative North Star
- **Tagline**: "Where the thrill of the hunt meets the strategy of the cards."
- **Story**: Jungleverse is an expedition briefing. We map uncharted poker rooms with the precision of a cartographer and the urgency of a high-roller suite. Visual language mixes lush foliage, premium wayfinding, and kinetic chip energy.
- **Adjectives**: Expeditionary, Kinetic, Premium, Instinctive, Strategic, Lush.

## 2. Color System
| Token | Hex | HSL | Usage |
| --- | --- | --- | --- |
| `--primary` Accent Gold | `#F2B705` | `45 96% 48%` | Premium CTAs, KPI flashes, glow accents. |
| `--secondary` Jungle Green | `#0A2A25` | `171 62% 10%` | Navigation, hero backgrounds, chip shells. |
| `--accent` Chip Red | `#D92D20` | `4 74% 49%` | Live indicators, alerts, hot chips. |
| `--background` Canopy Neutral | `#F0F2F0` | `120 7% 94%` | Light surfaces + canvas. |
| `--foreground` Midnight Teal | `#031A1A` | `180 79% 6%` | Core text + iconography. |
| `--muted` Mist Leaf | `#E6ECE3` | `120 10% 90%` | Skeletons, filter shells. |
| `--border` Cane Reed | `#DFE6E0` | `150 12% 84%` | Input/card outlines. |
| `--success` Rainforest Emerald | `#22A67D` | `161 66% 39%` | Positive deltas, player counts. |
| `--warning` Ember Orange | `#F28705` | `33 96% 48%` | Wait times, cautions. |
| `--info` Signal Blue | `#4685D9` | `214 66% 56%` | Neutral info badges, map hints. |
| `--disabled` Fog Grey | `#A9B5B3` | `170 8% 69%` | Disabled controls. |

**Light Mode**: Canopy Neutral background with white cards and jungle/vermillion accents. **Dark Mode**: Midnight Teal (#031A1A) canvas, Jungle Green cards, Accent Gold + Chip Red highlights. Maintain 4.5:1 contrast for body copy; gold/red on midnight background naturally exceeds 7:1.

### Gradients & Graphics
- **Canopy Sweep**: `linear-gradient(130deg, rgba(10,42,37,0.96), rgba(3,26,26,0.90))` plus chip-red and gold radial flares.
- **Chip Spark**: `radial-gradient(circle at 30% 30%, rgba(217,45,32,0.45), transparent 60%)` layered under avatars/cards.
- **Leaf Overlay**: Low-opacity SVG (monstera silhouette at 7% opacity) anchored to the hero's top-right corner.

## 3. Typography & Iconography
- **Display**: `Bebas Neue` (via `next/font`) for hero titles, section headings, stat labels. Always uppercase with ~0.3em tracking.
- **Body**: `Inter` for dense UI copy and paragraphs. Apply `font-variant-numeric: tabular-nums` for game stats, rake, and wait times.
- **Icon Weight**: Lucide/Feather icons at 1.5px stroke. Use chip red, accent gold, or success green to communicate state.
- **Custom Graphics**:
  - Chip-leaf hybrid logomark (poker chip wedge replaced by monstera leaf).
  - Radar rings (accent gold) for "live" elements on maps and cards.
  - Map pins shaped like angled poker chips casting a soft cane shadow.

## 4. Component Treatments
- **Cards**: 6px radius (`--radius: 0.375rem`), cane border, double-shadow (`0 12px 20px -18px rgba(3,26,26,0.75)` + chip-red hover glow). Hover lifts card -2px.
- **Buttons**:
  - Primary CTA (Accent Gold / Midnight text) with uppercase Bebas-inspired tracking and -2px hover lift.
  - Secondary (Jungle Green / white) for neutral actions.
  - Outline = dashed cane border, transparent fill, flips to jungle fill on hover.
- **Badges/Pills**: Rounded full, uppercase micro text, dashed outlines for filters; solid chip red or jungle green for state tags.
- **Inputs**: 6px radius, translucent card background, 2px gold focus ring with background offset.
- **Charts**: Primary series = Jungle Green, highlight series = Chip Red or Accent Gold. Gridlines dotted Cane Reed (20% opacity). Tooltips use Midnight Teal with gold dot.
- **Loading Skeletons**: Shimmer gradient (110°) from Mist Leaf to translucent Midnight; apply `.skeleton` utility.
- **Decorative Motifs**: `brand-hero` wrapper for hero gradient + leaf overlay, `chip-pulse` pseudo-element for glowing chips.

## 5. Imagery & Motion
- **Photography**: Ambient shots of high-end poker interiors (felt, lighting rigs, architecture). Avoid literal player faces. Overlay foliage SVGs or chip glows at 8–10% opacity.
- **Motion**: 300ms zoom/fade for hero + card transitions, chip-pulse radial animation for live rooms, shimmer skeletons for loading states, parallax foliage on map pans.

## 6. Implementation Notes
- Fonts wired via `next/font` with `--font-body` + `--font-display` CSS vars; Tailwind `fontFamily` updated accordingly.
- Tailwind tokens read from CSS custom properties, so updating this guide requires syncing `app/globals.css`.
- Utility classes added:
  - `.brand-hero`, `.chip-pulse`, `.skeleton`, `.heading-label`, `.logo-gradient`.
  - `shadow-brand` & `shadow-brand-soft` are defined in Tailwind for consistent drop shadows.
- Buttons, cards, badges, inputs, hero, and skeletons already use these utilities in the app. Keep new components consistent.

Keep this file updated whenever we extend the brand (logo lockup, marketing site, merch, etc.).
