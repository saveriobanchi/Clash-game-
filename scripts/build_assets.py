#!/usr/bin/env python3
"""Builds public/assets/ from the source art.

Usage:
  python3 scripts/build_assets.py --poker <Poker repo> --aether <Claude-AETHERFORGE repo> \
      --kenney <Kenney CC0 mirror (shorepine/kenney)> --sfx <dir with Kenney Casino Audio mp3s>

Every input is either the project owner's art (from the owner's Poker and
Claude-AETHERFORGE repositories) or a CC0 pack. See CREDITS.md.
"""
import argparse, json, os, shutil, glob
from PIL import Image, ImageOps

ap = argparse.ArgumentParser()
ap.add_argument('--poker', required=True)
ap.add_argument('--aether', required=True)
ap.add_argument('--kenney', required=True)
ap.add_argument('--sfx', required=True)
ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..', 'public', 'assets'))
a = ap.parse_args()
OUT = os.path.abspath(a.out)
for d in ['portraits', 'cards', 'px', 'fx', 'ui', 'sfx', 'emblems']:
    os.makedirs(os.path.join(OUT, d), exist_ok=True)

def webp(im, path, q=86):
    im.save(path, 'WEBP', quality=q, method=6)

# ---------- owner painted art (Poker repo) ----------
P = a.poker
portraits = {
    'proprietor': 'art/source/owner-p10/portrait-adjudicator.png',
    'vesper': 'art/source/owner-p10/portrait-vesper.png',
    'oracle': 'art/source/owner-p10/portrait-oracle.png',
    'corvin': 'art/source/owner-p10/portrait-corvin.png',
}
for k, f in portraits.items():
    im = Image.open(os.path.join(P, f)).convert('RGBA')
    im.thumbnail((560, 560), Image.LANCZOS)
    webp(im, os.path.join(OUT, 'portraits', k + '.webp'))
im = Image.open(os.path.join(P, 'public/assets/portraits/wagerer.webp')).convert('RGBA')
im.thumbnail((560, 560), Image.LANCZOS)
webp(im, os.path.join(OUT, 'portraits', 'wagerer.webp'))
for e in ['ember', 'mirror', 'thorn', 'veil']:
    im = Image.open(os.path.join(P, f'art/source/owner-p10/emblem-{e}.png')).convert('RGBA')
    im.thumbnail((320, 320), Image.LANCZOS)
    webp(im, os.path.join(OUT, 'emblems', e + '.webp'))
for f in glob.glob(os.path.join(P, 'art/generated/cards/*.png')):
    im = Image.open(f).convert('RGBA').resize((210, 294), Image.LANCZOS)
    webp(im, os.path.join(OUT, 'cards', os.path.basename(f)[:-4] + '.webp'), 88)
im = Image.open(os.path.join(P, 'art/source/owner-p10/back-reliquary.png')).convert('RGBA').resize((210, 294), Image.LANCZOS)
webp(im, os.path.join(OUT, 'cards', 'back.webp'), 88)

# ---------- pixel atlases ----------
def pack(files, name, cell=16):
    """Packs 16px sprites (taller ones become vertical strips) into one atlas."""
    entries = []
    for key, f in files:
        im = Image.open(f).convert('RGBA')
        entries.append((key, im))
    cols = 32
    # each entry occupies ceil(h/cell) rows in a single column slot; keep simple: place strips at the end
    x = y = 0
    meta = {}
    rowh = cell
    W = cols * cell
    placed = []
    for key, im in entries:
        w, h = im.size
        if x + w > W:
            x = 0; y += rowh; rowh = cell
        placed.append((key, im, x, y))
        meta[key] = [x, y, w, h]
        x += max(w, cell)
        rowh = max(rowh, h)
    H = y + rowh
    atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for key, im, px, py in placed:
        atlas.paste(im, (px, py))
    atlas.save(os.path.join(OUT, 'px', name + '.png'), optimize=True)
    return meta

AE = os.path.join(a.aether, 'ClaudeMobile/art/cc0')
items = []
for f in sorted(glob.glob(os.path.join(AE, 'assorted/*.png'))):
    key = os.path.basename(f)[:-4].lower().replace(' ', '_').replace("'", '')
    items.append((key, f))
# tall torch strips last so rows stay tidy
items.sort(key=lambda kv: Image.open(kv[1]).size[1] > 16)
meta = {'items': pack(items, 'items')}
K = a.kenney
td = [(f'td{int(os.path.basename(f)[5:9])}', f) for f in sorted(glob.glob(os.path.join(K, '2d/Tiny Dungeon/Tiles/*.png')))]
meta['tiny'] = pack(td, 'tiny')
mr = [(f'mr{int(os.path.basename(f)[5:9])}', f) for f in sorted(glob.glob(os.path.join(K, '2d/Micro Roguelike/Tiles/Colored/*.png')))]
meta['micro'] = pack(mr, 'micro', 8)
with open(os.path.join(OUT, 'px', 'atlas.json'), 'w') as fh:
    json.dump(meta, fh, separators=(',', ':'))

# ---------- particles / light (Kenney CC0) ----------
fx = ['spark_01', 'spark_04', 'spark_06', 'star_04', 'star_06', 'star_08', 'flame_02', 'flame_04', 'fire_01',
      'magic_02', 'magic_04', 'light_01', 'light_03', 'circle_05', 'smoke_04', 'smoke_07', 'twirl_02', 'symbol_02',
      'flare_01', 'trace_04', 'slash_02', 'scorch_02', 'window_03']
for n in fx:
    im = Image.open(os.path.join(K, '2d/Particle Pack/PNG (Transparent)', n + '.png')).convert('RGBA')
    im = im.resize((128, 128), Image.LANCZOS)
    im.save(os.path.join(OUT, 'fx', n + '.png'), optimize=True)
for n in ['circle_a', 'circle_b_noise', 'cone_composed_d_noise']:
    src = os.path.join(K, '2d/Light Masks/Transparent', n + '.png')
    if os.path.exists(src):
        im = Image.open(src).convert('RGBA').resize((256, 256), Image.LANCZOS)
        im.save(os.path.join(OUT, 'fx', n + '.png'), optimize=True)
for i in [0, 3, 7, 12, 18, 24]:
    im = Image.open(os.path.join(K, f'2d/Splat Pack/Default (256px)/splat{i:02d}.png')).convert('RGBA')
    r, g, b, al = im.split()
    lum = ImageOps.grayscale(im.convert('RGB'))
    col = Image.merge('RGBA', (lum.point(lambda v: 60 + v // 3), lum.point(lambda v: v // 14), lum.point(lambda v: v // 10), al))
    col.save(os.path.join(OUT, 'fx', f'blood{i}.png'), optimize=True)

# ---------- UI: gold-tinted fantasy borders + white icons ----------
def tint(im, rgb_dark, rgb_light):
    im = im.convert('RGBA')
    r, g, b, al = im.split()
    lum = ImageOps.grayscale(im.convert('RGB'))
    out = ImageOps.colorize(lum, rgb_dark, rgb_light).convert('RGBA')
    out.putalpha(al)
    return out
def gild(im, stops):
    im = im.convert('RGBA'); w, h = im.size
    al = im.split()[3]
    out = Image.new('RGBA', (w, h))
    px = out.load()
    for y in range(h):
        t = y / (h - 1) * (len(stops) - 1); i = min(int(t), len(stops) - 2); f = t - i
        c = tuple(int(stops[i][k] * (1 - f) + stops[i + 1][k] * f) for k in range(3))
        for x in range(w):
            px[x, y] = c + (255,)
    out.putalpha(al)
    return out
for n in ['panel-border-000', 'panel-border-003', 'panel-border-010', 'panel-border-014', 'panel-border-021']:
    src = os.path.join(K, 'ui/Fantasy UI Borders/Border', n + '.png')
    if os.path.exists(src):
        gild(Image.open(src), [(255, 236, 170), (214, 160, 70), (140, 86, 30), (232, 190, 110)]).save(os.path.join(OUT, 'ui', n + '-gold.png'))
        gild(Image.open(src), [(240, 90, 90), (176, 28, 40), (96, 8, 18), (160, 30, 40)]).save(os.path.join(OUT, 'ui', n + '-blood.png'))
icons = ['crown_a', 'skull', 'dice', 'hourglass', 'lock_closed', 'pouch', 'suit_hearts', 'suit_spades', 'suit_clubs',
         'suit_diamonds', 'fire', 'flask_full', 'shield', 'book_open', 'award', 'cards_fan', 'cards_skull', 'dice_skull',
         'spinner', 'token', 'tokens_stack', 'structure_gate', 'arrow_counterclockwise', 'hand_token', 'dollar',
         'structure_church', 'flip_head', 'flip_tails', 'card_flip', 'suit_hearts_broken', 'hexagon_question', 'sword']
for n in icons:
    shutil.copy(os.path.join(K, 'icons/Board Game Icons/Double (128px)', n + '.png'), os.path.join(OUT, 'ui', 'i-' + n + '.png'))
for c in ['chipBlackWhite', 'chipBlueWhite', 'chipGreenWhite', 'chipRedWhite', 'chipWhiteBlue']:
    for v in ['', '_side']:
        shutil.copy(os.path.join(K, '2d/Boardgame Pack/Chips', c + v + '.png'), os.path.join(OUT, 'ui', c + v + '.png'))
for i in range(1, 7):
    shutil.copy(os.path.join(K, f'2d/Boardgame Pack/Dice/dieWhite_border{i}.png'), os.path.join(OUT, 'ui', f'die{i}.png'))
    shutil.copy(os.path.join(K, f'2d/Boardgame Pack/Dice/dieRed_border{i}.png'), os.path.join(OUT, 'ui', f'dieR{i}.png'))

# ---------- audio (Kenney Casino Audio, CC0) ----------
for f in glob.glob(os.path.join(a.sfx, '*.mp3')):
    shutil.copy(f, os.path.join(OUT, 'sfx', os.path.basename(f)))
print('assets ->', OUT)
