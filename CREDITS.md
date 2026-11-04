# Credits and licences

Everything in Velvet Abyss is either the project owner's own art, a public-domain (CC0) pack, an
SIL Open Font Licence font, or original code/synthesis written for this project. All money in the
game is play money.

| What | Where it is used | Source | Licence |
| --- | --- | --- | --- |
| Portraits of the Proprietor (Ledger Adjudicator), Lady Vesper, the Sightless Oracle, Sir Corvin; the four emblems (ember, thorn, veil, mirror); the Reliquary card back | Floor hosts, title, big-win celebrations, coin faces, card backs | Project owner's art from the owner's `Poker` repository (`art/source/owner-p10/`) | Owner's own work, used with permission |
| Wagerer portrait, playing-card faces (built from Byron Knoll's public-domain Vector Playing Cards) | Player avatar; all card games | Owner's `Poker` repository (`public/assets/portraits`, `art/generated/cards`) | Owner's work / public domain |
| 16×16 pixel items, gems, skulls, torches, blocks | Slot symbols, gems, icons, the pixel hall backgrounds | *Assorted Minecraft style textures* by JoeEnderman (opengameart.org), vendored in the owner's `Claude-AETHERFORGE` repo | CC0 1.0 |
| Tiny Dungeon, Micro Roguelike, Boardgame Pack (chips, dice), Particle Pack, Light Masks, Splat Pack, Fantasy UI Borders (recoloured gold/blood), Board Game Icons | Racers, doors, vials, fiends, dice, particles, glows, pixel frames, interface icons | Kenney (www.kenney.nl), via the CC0 mirror github.com/shorepine/kenney | CC0 1.0 |
| Casino Audio (chips and cards) | Sound effects | Kenney (www.kenney.nl) | CC0 1.0 |
| Cinzel, Cinzel Decorative, Spectral, Pixelify Sans, VT323, Jacquard 24 | All type | Google Fonts via `@fontsource` packages | SIL Open Font Licence 1.1 (`licenses/fonts-OFL.txt`) |
| Music, cues, reel ticks, heartbeats | Audio | Synthesised at runtime with Web Audio (`src/ui/audio.ts`) | Project original |
| Wheels, felt, moon, plinko board, coin, backgrounds composition | Rendering | Drawn in code (`src/ui/`) | Project original |

`scripts/build_assets.py` rebuilds `public/assets/` from those sources: it resizes, packs atlases and recolours. It does not redraw anything.
