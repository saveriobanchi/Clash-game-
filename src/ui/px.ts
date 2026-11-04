import { A } from './dom';

/** Pixel-art sprites from the packed atlases (AETHERFORGE CC0 items, Kenney Tiny Dungeon, Kenney Micro Roguelike). */
type Rect = [number, number, number, number];
let meta: Record<string, Record<string, Rect>> = {};
const sheets: Record<string, HTMLImageElement> = {};
const cache = new Map<string, string>();
const canvasCache = new Map<string, HTMLCanvasElement>();

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
export async function loadPixels(): Promise<void> {
  meta = await (await fetch(A('px/atlas.json'))).json();
  const [items, tiny, micro] = await Promise.all([load(A('px/items.png')), load(A('px/tiny.png')), load(A('px/micro.png'))]);
  Object.assign(sheets, { items, tiny, micro });
}
function locate(key: string): { img: HTMLImageElement; r: Rect } | null {
  if (key.startsWith('td') && meta.tiny?.[key]) return { img: sheets.tiny, r: meta.tiny[key] };
  if (key.startsWith('mr') && meta.micro?.[key]) return { img: sheets.micro, r: meta.micro[key] };
  if (meta.items?.[key]) return { img: sheets.items, r: meta.items[key] };
  return null;
}
/** Raw sprite canvas at native resolution (optionally one frame of a vertical strip). */
export function pxCanvas(key: string, frame = -1): HTMLCanvasElement {
  const ck = key + '#' + frame;
  const hit = canvasCache.get(ck);
  if (hit) return hit;
  const c = document.createElement('canvas');
  const loc = locate(key);
  if (!loc) { c.width = c.height = 16; canvasCache.set(ck, c); return c; }
  const [x, y, w, hh] = loc.r;
  const fh = frame >= 0 ? w : hh;
  c.width = w; c.height = fh;
  c.getContext('2d')!.drawImage(loc.img, x, y + (frame >= 0 ? frame * w : 0), w, fh, 0, 0, w, fh);
  canvasCache.set(ck, c);
  return c;
}
export function pxUrl(key: string, frame = -1): string {
  const ck = key + '#' + frame;
  let u = cache.get(ck);
  if (!u) { u = pxCanvas(key, frame).toDataURL(); cache.set(ck, u); }
  return u;
}
export function px(key: string, size = 48, cls = ''): HTMLImageElement {
  const i = new Image();
  i.src = pxUrl(key);
  i.className = 'px ' + cls;
  i.width = size; i.height = size;
  i.draggable = false;
  i.alt = '';
  return i;
}
export const frames = (key: string): number => { const l = locate(key); return l ? Math.max(1, Math.round(l.r[3] / l.r[2])) : 1; };
