# Velvet Abyss

A dark, mobile-first casino beneath the world. You arrive owing your soul to **the Proprietor**,
holding 500 gold. Play eighteen games across four floors, from a gilded parlour down to the Abyss.
Grow infamous, buy relics with souls, sign pacts, take contracts. Eventually pay five million gold
to buy your soul back, and begin again stronger.

It is a masquerade: each floor's host wears a mask — Mother Moth, Sir Carrion, Sister Marrow and
the Proprietor — and you arrive in a blank porcelain one. Every piece of art is original pixel art
drawn in code (`src/art/`) with one palette and one light direction, under soft candlelight.
**Play money only.** Nothing can be bought
and nothing can be cashed out.

## Play

```bash
npm ci
npm run dev        # http://localhost:5173
npm run check      # typecheck + tests (every game's return, economy)
npm run build      # production PWA in dist/
```

Every push to `main` deploys to GitHub Pages (`.github/workflows/pages.yml`). On a phone, open the
page and choose *Add to Home Screen*: it runs full-screen and works offline.

## The floors and games

| Floor (host) | Rank | Games |
| --- | --- | --- |
| I · The Gilded Parlor (Mother Moth) | 1 | **Fate's Coin** (classic · streak · cursed edge ×48), **Bone Dice** (over/under at any odds · Triple Bones 3d6), **Reliquary Reels** (3 machines: low, brutal, expanding wilds, free spins, progressive Hoard), **Hi-Lo Ladder** (classic · skull deck) |
| II · The Velvet Salon (Sir Carrion) | 4 | **Blackjack** (classic · Hellfire · Blood Pair side bet), **Wheel of Thorns** (European · Devil's wheel with cursed ×50–×500 numbers), **Jacks of the Damned** (Jacks or Better 9/6 · Deuces Wild, both with double-up), **Baccarat Noir** |
| III · The Catacombs (Sister Marrow) | 8 | **Crypt Delve** (mines 3×3/5×5/6×6), **Bone Drop** (plinko 8/12/16 rows × 3 risks, volleys of ten), **Grave Tickets** (finger-scratch, 3 tiers up to ×5000), **Séance** (keno 40/10), **Spectral Derby** (pixel-creature races) |
| IV · The Abyss (the Proprietor) | 13 | **Blood Moon** (crash), **Ladder of Souls** (tower, 4 sins), **Wheel of Ruin**, **Six Chalices** (poison roulette), **Devil's Bargain** (stake a share of your whole fortune; wins pay souls) |

Returns run from 95% to 99.5% and are shown on every table. `tests/rtp.test.ts` checks every one,
by exact calculation or by simulation (slots, blackjack, baccarat).

## Progression

- **Infamy ranks** come from every wager (bigger stakes relative to your limit count more). Each rank raises table limits, pays gold and souls, and opens floors and games.
- **Contracts:** three at a time, endlessly replaced. Each pays gold and sometimes a soul.
- **The Tithe:** a free prize wheel every three hours.
- **Relics** (permanent, bought with souls): rakeback, infamy, limits, Tithe and contract boosts, soul drops, cheaper loans, Marrow's Eye (odds and advice), Gravedigger's Spade (one safe pick).
- **Pacts** (temporary, signed with souls): double infamy, extra rakeback, Blood Moon pays ×1.5 on big wins, doubled contracts.
- **Host story arcs:** each floor's host speaks four times as you play their tables (first visit, 40, 150 and 400 rounds), with gifts and titles. Their favour shows on the floor's banner.
- **Hot Table:** one game a day pays double infamy.
- **The Grimoire:** 32 feats that pay souls.
- **The Proprietor's Mercy:** when you are broke, a loan at interest. 30% of each win repays it.
- **Redemption:** buy back your soul to reset, keeping relics and feats and earning a Sigil (limits ×1.5 forever). The price rises each cycle.

## Code

- `src/core/` holds pure logic: RNG, the rules and pay tables of every game (`games/`), the economy and progression (`economy.ts`), content (`content.ts`) and saves.
- `src/art/` holds the art system: the palette and sprite engine, every sprite and mask, the card generator.
- `src/ui/` holds the DOM/canvas front end: the app shell and screens (`app.ts`), the shared game frame and bet bar (`shell.ts`), one view per game (`games/`), the animated pixel hall (`bg.ts`), particles and big wins (`fx.ts`), and audio (`audio.ts`).
- Art credits are in [CREDITS.md](CREDITS.md).
