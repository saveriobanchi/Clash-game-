import { build, toRGBA, PAL, Pixels, SpriteDef } from './engine';
import { SPRITES } from './sprites';
import { MASKS } from './masks';

/* Runtime side of the art system: sprites → canvases/URLs, generated cards, the UI frame. */
export { PAL };
const defs: Record<string, SpriteDef> = { ...SPRITES };
for (const [k, v] of Object.entries(MASKS)) defs['mask_' + k] = v;
const pixCache = new Map<string, Pixels>();
const cvCache = new Map<string, HTMLCanvasElement>();
const urlCache = new Map<string, string>();

export function pixels(name: string): Pixels {
  let p = pixCache.get(name);
  if (!p) { p = build(defs[name] ?? defs.skull); pixCache.set(name, p); }
  return p;
}
function canvasOf(p: Pixels, scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = p.w * scale; c.height = p.h * scale;
  const g = c.getContext('2d')!;
  const base = document.createElement('canvas'); base.width = p.w; base.height = p.h;
  base.getContext('2d')!.putImageData(new ImageData(toRGBA(p), p.w, p.h), 0, 0);
  g.imageSmoothingEnabled = false;
  g.drawImage(base, 0, 0, c.width, c.height);
  return c;
}
/** A sprite at an integer scale (cached). */
export function spriteCanvas(name: string, scale = 1): HTMLCanvasElement {
  const k = name + '@' + scale;
  let c = cvCache.get(k);
  if (!c) { c = canvasOf(pixels(name), scale); cvCache.set(k, c); }
  return c;
}
export function spriteUrl(name: string, scale = 1): string {
  const k = name + '@' + scale;
  let u = urlCache.get(k);
  if (!u) { u = spriteCanvas(name, scale).toDataURL(); urlCache.set(k, u); }
  return u;
}
/** An <img> of a sprite, sized to the nearest whole multiple of its pixels at or below `size`. */
export function sprite(name: string, size = 48, cls = ''): HTMLImageElement {
  const p = pixels(name);
  const scale = Math.max(1, Math.floor(size / Math.max(p.w, p.h)));
  const i = new Image();
  i.src = spriteUrl(name, scale);
  i.width = p.w * scale; i.height = p.h * scale;
  i.className = 'spr ' + cls;
  i.alt = ''; i.draggable = false;
  return i;
}
export const spriteSize = (name: string): [number, number] => { const p = pixels(name); return [p.w, p.h]; };

/* ---------------- cards: 32×45 pixel cards drawn from our own glyphs ---------------- */
const GLYPH: Record<string, string[]> = {
  A: ['.x.', 'x.x', 'xxx', 'x.x', 'x.x'], K: ['x.x', 'xx.', 'x..', 'xx.', 'x.x'], Q: ['.x.', 'x.x', 'x.x', 'xx.', '.xx'], J: ['..x', '..x', '..x', 'x.x', '.x.'],
  T: ['x.xxx', 'x.x.x', 'x.x.x', 'x.x.x', 'x.xxx'], 2: ['xx.', '..x', '.x.', 'x..', 'xxx'], 3: ['xx.', '..x', '.x.', '..x', 'xx.'], 4: ['x.x', 'x.x', 'xxx', '..x', '..x'],
  5: ['xxx', 'x..', 'xx.', '..x', 'xx.'], 6: ['.xx', 'x..', 'xxx', 'x.x', 'xxx'], 7: ['xxx', '..x', '.x.', '.x.', '.x.'], 8: ['xxx', 'x.x', 'xxx', 'x.x', 'xxx'], 9: ['xxx', 'x.x', 'xxx', '..x', 'xx.'],
};
const cardCache = new Map<string, string>();
const CW = 32, CH = 45;
function putGlyph(g: CanvasRenderingContext2D, ch: string, x: number, y: number, color: string, flip = false): void {
  const gl = GLYPH[ch]; if (!gl) return;
  g.fillStyle = color;
  gl.forEach((row, r) => [...row].forEach((c, k) => { if (c === 'x') g.fillRect(flip ? x - k : x + k, flip ? y - r : y + r, 1, 1); }));
}
function blit(g: CanvasRenderingContext2D, name: string, x: number, y: number, flip = false): void {
  const c = spriteCanvas(name, 1);
  if (!flip) { g.drawImage(c, x, y); return; }
  g.save(); g.translate(x + c.width, y + c.height); g.rotate(Math.PI); g.drawImage(c, 0, 0); g.restore();
}
const PIPS: Record<number, [number, number][]> = {
  2: [[12, 6], [12, 32]], 3: [[12, 6], [12, 19], [12, 32]], 4: [[6, 6], [18, 6], [6, 32], [18, 32]],
  5: [[6, 6], [18, 6], [12, 19], [6, 32], [18, 32]], 6: [[6, 6], [18, 6], [6, 19], [18, 19], [6, 32], [18, 32]],
  7: [[6, 6], [18, 6], [12, 12], [6, 19], [18, 19], [6, 32], [18, 32]], 8: [[6, 6], [18, 6], [12, 12], [6, 19], [18, 19], [12, 26], [6, 32], [18, 32]],
  9: [[6, 6], [18, 6], [6, 14], [18, 14], [12, 19], [6, 24], [18, 24], [6, 32], [18, 32]],
  10: [[6, 6], [18, 6], [12, 10], [6, 14], [18, 14], [6, 24], [18, 24], [12, 28], [6, 32], [18, 32]],
};
/** Card id like 'As', 'Th', 'back'. Returns a data URL of the card at 3× scale. */
export function cardUrl(id: string): string {
  let u = cardCache.get(id);
  if (u) return u;
  const c = document.createElement('canvas'); c.width = CW; c.height = CH;
  const g = c.getContext('2d')!;
  const rr = (x: number, y: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  // body with 1px rounded corners
  rr(1, 0, CW - 2, CH, PAL.k); rr(0, 1, CW, CH - 2, PAL.k);
  if (id === 'back') {
    rr(1, 1, CW - 2, CH - 2, PAL.w);
    for (let y = 2; y < CH - 2; y++) for (let x = 2; x < CW - 2; x++) if ((x + y) % 4 === 0 || (x - y + 64) % 4 === 0) rr(x, y, 1, 1, PAL.r);
    rr(2, 2, CW - 4, 1, PAL.g); rr(2, CH - 3, CW - 4, 1, PAL.g); rr(2, 2, 1, CH - 4, PAL.g); rr(CW - 3, 2, 1, CH - 4, PAL.g);
    rr(8, 13, 16, 19, PAL.w);
    blit(g, 'mask_player', 6, 11);
  } else {
    const rank = id[0], suit = id[1];
    const red = suit === 'h' || suit === 'd';
    const ink = red ? PAL.r : PAL.p;
    rr(1, 1, CW - 2, CH - 2, PAL.b);
    rr(1, CH - 3, CW - 2, 2, PAL.n); rr(CW - 3, 1, 2, CH - 2, PAL.n); rr(1, 1, CW - 3, 1, PAL.h);
    putGlyph(g, rank, 3, 3, ink);
    blit(g, 'pip_' + suit, 2, 9);
    putGlyph(g, rank, CW - 4, CH - 4, ink, true);
    blit(g, 'pip_' + suit, CW - 9, CH - 16, true);
    const n = rank === 'A' ? 1 : rank === 'T' ? 10 : +rank;
    if (rank === 'J' || rank === 'Q' || rank === 'K') {
      rr(8, 9, 16, 27, red ? PAL.c : PAL.a);
      rr(9, 10, 14, 25, PAL.b);
      const face = rank === 'J' ? 'raven' : rank === 'Q' ? 'moth' : 'crown_skull';
      const fc = spriteCanvas(face, 1);
      g.drawImage(fc, 16 - Math.floor(fc.width / 2), 22 - Math.floor(fc.height / 2));
    } else if (n === 1) {
      const big = spriteCanvas('pip_' + suit, 1);
      g.drawImage(big, 9, 15, 14, 14);
      rr(7, 13, 18, 1, PAL.g); rr(7, 30, 18, 1, PAL.g);
    } else {
      for (const [x, y] of PIPS[n]) blit(g, 'pip_' + suit, x + 1, y + 1, y > 22);
    }
  }
  const big = document.createElement('canvas'); big.width = CW * 3; big.height = CH * 3;
  const bg = big.getContext('2d')!; bg.imageSmoothingEnabled = false; bg.drawImage(c, 0, 0, big.width, big.height);
  u = big.toDataURL();
  cardCache.set(id, u);
  return u;
}

/* ---------------- the gilded pixel frame used by every panel ---------------- */
const FRAME = [
  '..ggggggg..', '.gyyyyyyyg.', 'gyo.....oyg', 'gy.......yg', 'gy.......yg', 'gy.......yg',
  'gy.......yg', 'gy.......yg', 'gyo.....oyg', '.gooooooog.', '..ggggggg..'];
export function frameUrl(scale = 3, tint?: Record<string, string>): string {
  const p: Pixels = { w: 11, h: 11, px: FRAME.join('').split('').map(ch => (ch === '.' ? null : tint?.[ch] ?? ch)) };
  return canvasOf(p, scale).toDataURL();
}
