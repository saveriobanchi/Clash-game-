/* Velvet Abyss art engine.
 * Every sprite in the game is authored as text in this folder and rendered here, so the whole
 * game shares one palette, one pixel scale, one outline colour and one light direction (top-left). */

export const PAL: Record<string, string> = {
  k: '#0c0710', d: '#1c0e1a', p: '#34172c', w: '#5c1a35', r: '#9a1f37', c: '#d63a4a', e: '#f2783a', f: '#ffc35a',
  o: '#7d4e1f', g: '#c99032', y: '#f6d27a', h: '#fff4d0',
  n: '#9c8569', b: '#e6d5b0',
  s: '#2e2530', a: '#5e4e5e', i: '#9a8796',
  T: '#164a45', t: '#3aa592', q: '#a6f5e2',
  M: '#174f30', m: '#2f9d55', l: '#8fe08a',
  U: '#1f3570', u: '#4a7fe0', j: '#a8d0ff',
  V: '#3a1f5e', v: '#8a5ad6', x: '#c7a6ff',
};
const LIGHT: Record<string, string> = { o: 'g', g: 'y', y: 'h', h: 'h', n: 'b', b: 'h', d: 'p', p: 'w', w: 'r', r: 'c', c: 'e', e: 'f', f: 'h', s: 'a', a: 'i', i: 'b', T: 't', t: 'q', q: 'h', M: 'm', m: 'l', l: 'h', U: 'u', u: 'j', j: 'h', V: 'v', v: 'x', x: 'h' };
const DARK: Record<string, string> = { g: 'o', y: 'g', h: 'y', o: 'p', b: 'n', n: 'a', c: 'r', r: 'w', w: 'p', p: 'd', e: 'r', f: 'e', a: 's', i: 'a', s: 'd', d: 'k', t: 'T', q: 't', T: 'd', m: 'M', l: 'm', M: 'd', u: 'U', j: 'u', U: 'd', v: 'V', x: 'v', V: 'd' };

export interface SpriteDef {
  rows: string[];
  /** 'even': rows are the left half, mirrored whole; 'odd': left half including the centre column. */
  mirror?: 'even' | 'odd';
  outline?: boolean; // default true
  shade?: boolean;   // default true
  map?: Record<string, string>; // recolour
}
export interface Pixels { w: number; h: number; px: (string | null)[] }

export function build(def: SpriteDef): Pixels {
  let rows = def.rows;
  if (def.mirror) rows = rows.map(r => r + [...r].reverse().slice(def.mirror === 'odd' ? 1 : 0).join(''));
  if (def.map) rows = rows.map(r => [...r].map(ch => def.map![ch] ?? ch).join(''));
  const outline = def.outline !== false;
  const pad = outline ? 1 : 0;
  const w0 = Math.max(...rows.map(r => r.length)), h0 = rows.length;
  const w = w0 + pad * 2, h = h0 + pad * 2;
  const at = (x: number, y: number): string | null => {
    const r = rows[y - pad];
    if (!r) return null;
    const ch = r[x - pad];
    return ch && ch !== '.' && ch !== ' ' ? ch : null;
  };
  const px: (string | null)[] = new Array(w * h).fill(null);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let ch = at(x, y);
    if (ch && def.shade !== false && ch !== 'k') {
      const up = at(x, y - 1), left = at(x - 1, y), down = at(x, y + 1), right = at(x + 1, y);
      if ((!up || up === 'k') && LIGHT[ch]) ch = LIGHT[ch];
      else if ((!left || left === 'k') && LIGHT[ch] && !down) ch = LIGHT[ch];
      else if ((!down || down === 'k') && DARK[ch]) ch = DARK[ch];
      else if ((!right || right === 'k') && DARK[ch] && up) ch = DARK[ch];
    }
    px[y * w + x] = ch;
  }
  if (outline) {
    const copy = px.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (copy[y * w + x]) continue;
      const n = (dx: number, dy: number) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < w && Y < h && copy[Y * w + X] && copy[Y * w + X] !== 'k'; };
      if (n(1, 0) || n(-1, 0) || n(0, 1) || n(0, -1)) px[y * w + x] = 'k';
    }
  }
  return { w, h, px };
}
export function toRGBA(p: Pixels): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(new ArrayBuffer(p.w * p.h * 4));
  p.px.forEach((ch, i) => {
    if (!ch) return;
    const hex = PAL[ch] ?? '#ff00ff';
    out[i * 4] = parseInt(hex.slice(1, 3), 16); out[i * 4 + 1] = parseInt(hex.slice(3, 5), 16); out[i * 4 + 2] = parseInt(hex.slice(5, 7), 16); out[i * 4 + 3] = 255;
  });
  return out;
}
