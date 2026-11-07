import { PAL, spriteCanvas } from '../art';
import { FloorId } from '../core/content';
import { motion } from './fx';

/* The backdrop: a low-resolution pixel scene per floor (same palette as every sprite),
 * with a soft candle-light layer on top. Kept dark in the middle so the interface stays readable. */
const SCALE = 3;
let low: HTMLCanvasElement, glow: HTMLCanvasElement;
let lc: CanvasRenderingContext2D, gc: CanvasRenderingContext2D;
let floor: FloorId = 'parlor';
let cache: HTMLCanvasElement | null = null;
let cacheKey = '';
interface Mote { x: number; y: number; v: number; ph: number }
let motes: Mote[] = [];
const THEME: Record<FloorId, { top: string; mid: string; low: string; pattern: string; curtain: string[] | null; light: string; mote: string }> = {
  parlor: { top: PAL.d, mid: PAL.p, low: PAL.k, pattern: PAL.w, curtain: [PAL.d, PAL.p, PAL.w], light: '255,170,80', mote: PAL.f },
  salon: { top: PAL.k, mid: PAL.d, low: PAL.k, pattern: PAL.p, curtain: [PAL.d, PAL.p, PAL.w], light: '230,70,90', mote: PAL.c },
  catacombs: { top: PAL.k, mid: PAL.s, low: PAL.k, pattern: PAL.T, curtain: null, light: '90,230,200', mote: PAL.q },
  abyss: { top: PAL.k, mid: PAL.d, low: PAL.w, pattern: PAL.p, curtain: null, light: '255,90,40', mote: PAL.e },
};
export function setFloor(f: FloorId, _i = 1): void { floor = f; }

export function initBg(): void {
  low = document.createElement('canvas'); low.className = 'bg-low';
  glow = document.createElement('canvas'); glow.className = 'bg-glow';
  document.body.prepend(glow); document.body.prepend(low);
  lc = low.getContext('2d')!; gc = glow.getContext('2d')!;
  const fit = () => {
    low.width = Math.ceil(innerWidth / SCALE); low.height = Math.ceil(innerHeight / SCALE);
    glow.width = Math.ceil(innerWidth / 4); glow.height = Math.ceil(innerHeight / 4);
    cache = null;
    motes = Array.from({ length: 22 }, () => ({ x: Math.random() * low.width, y: Math.random() * low.height, v: 2 + Math.random() * 5, ph: Math.random() * 6 }));
  };
  fit(); addEventListener('resize', fit);
  let last = 0;
  const loop = (now: number) => {
    requestAnimationFrame(loop);
    if (now - last < 50) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    draw(now / 1000, dt);
  };
  requestAnimationFrame(loop);
}

/** Ordered dither between two colours: t in [0,1]. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function dither(g: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, a: string, b: string, t: (x: number, y: number) => number): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    g.fillStyle = t(x, y) * 16 > BAYER[(y & 3) * 4 + (x & 3)] ? b : a;
    g.fillRect(x, y, 1, 1);
  }
}
function paintStatic(W: number, H: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const th = THEME[floor];
  // wall: top → mid → bottom, dithered
  dither(g, 0, 0, W, Math.ceil(H * 0.55), th.top, th.mid, (_x, y) => y / (H * 0.55));
  dither(g, 0, Math.floor(H * 0.55), W, Math.ceil(H * 0.45), th.mid, th.low, (_x, y) => (y - H * 0.55) / (H * 0.45));
  // wall pattern
  g.fillStyle = th.pattern;
  if (floor === 'parlor') {
    for (let y = 6; y < H * 0.8; y += 18) for (let x = (y / 18) % 2 ? 9 : 0; x < W; x += 18) {
      g.fillRect(x, y - 3, 1, 7); g.fillRect(x - 3, y, 7, 1); g.fillRect(x - 1, y - 1, 3, 3);
    }
  } else if (floor === 'salon') {
    for (let x = 4; x < W; x += 10) for (let y = 0; y < H * 0.85; y++) if ((y + x) % 3 !== 0) g.fillRect(x, y, 1, 1);
  } else if (floor === 'catacombs') {
    const sk = spriteCanvas('skull', 1);
    for (let y = 10; y < H * 0.75; y += 22) for (let x = (y / 22) % 2 ? 4 : 15; x < W - 10; x += 22) {
      g.fillStyle = 'rgba(12,7,16,.5)'; g.fillRect(x - 2, y - 2, 20, 18);
      g.globalAlpha = 0.16; g.drawImage(sk, x, y); g.globalAlpha = 1;
    }
  } else {
    g.fillStyle = PAL.k;
    for (let i = 0; i < W * H / 260; i++) { const x = (i * 97) % W, y = (i * 53) % H; g.fillRect(x, y, 3, 1); g.fillRect(x + 1, y + 1, 1, 2); }
    g.fillStyle = PAL.r;
    for (let i = 0; i < 14; i++) {
      let x = (i * 41) % W, y = H - 6 - ((i * 13) % 30);
      for (let k = 0; k < 18; k++) { g.fillRect(x, y, 1, 1); x += (k + i) % 3 - 1; y -= 1; }
    }
    // chains
    for (const cx of [Math.round(W * 0.12), Math.round(W * 0.88)]) for (let y = 0; y < H * 0.6; y += 4) {
      g.fillStyle = PAL.a; g.fillRect(cx - 1, y, 3, 1); g.fillRect(cx - 1, y + 2, 1, 1); g.fillRect(cx + 1, y + 2, 1, 1);
      g.fillStyle = PAL.i; g.fillRect(cx, y + 1, 1, 2);
    }
  }
  // central archway, darker so the UI reads
  const aw = Math.min(W * 0.7, 160), ax = W / 2 - aw / 2, atop = H * 0.12;
  g.fillStyle = 'rgba(12,7,16,.55)';
  g.beginPath(); g.moveTo(ax, H); g.lineTo(ax, atop + aw / 2); g.arc(W / 2, atop + aw / 2, aw / 2, Math.PI, 0); g.lineTo(ax + aw, H); g.fill();
  g.strokeStyle = PAL.o; g.lineWidth = 1;
  g.beginPath(); g.moveTo(ax + 0.5, H); g.lineTo(ax + 0.5, atop + aw / 2); g.arc(W / 2, atop + aw / 2, aw / 2 - 0.5, Math.PI, 0); g.lineTo(ax + aw - 0.5, H); g.stroke();
  // curtains
  if (th.curtain) {
    const cw = Math.round(W * 0.2);
    for (const side of [0, 1]) for (let i = 0; i < cw; i++) {
      const x = side ? W - 1 - i : i;
      const fold = Math.sin(i * 0.9) * 0.5 + 0.5;
      const col = th.curtain[fold > 0.75 ? 2 : fold > 0.3 ? 1 : 0];
      const hem = H - Math.round(Math.abs(Math.sin(i * 0.25)) * 6);
      g.fillStyle = col; g.fillRect(x, 0, 1, hem);
      g.fillStyle = PAL.k; g.fillRect(x, hem, 1, 1);
    }
    // valance swag
    for (let x = 0; x < W; x++) {
      const sag = Math.round(10 + Math.abs(Math.sin((x / W) * Math.PI * 3)) * 8);
      g.fillStyle = th.curtain[2]; g.fillRect(x, 0, 1, sag);
      g.fillStyle = PAL.g; g.fillRect(x, sag, 1, 1);
      if (x % 6 === 0) { g.fillStyle = PAL.y; g.fillRect(x, sag + 1, 1, 2); }
    }
    // tie-backs
    g.fillStyle = PAL.g; g.fillRect(cw - 3, Math.round(H * 0.55), 4, 2); g.fillRect(W - cw - 1, Math.round(H * 0.55), 4, 2);
  }
  // floor line
  g.fillStyle = PAL.k; g.fillRect(0, Math.round(H * 0.86), W, 1);
  dither(g, 0, Math.round(H * 0.86) + 1, W, H, PAL.k, th.low === PAL.w ? PAL.d : PAL.d, (_x, y) => 1 - (y - H * 0.86) / (H * 0.14));
  return c;
}
function candlesAt(W: number, H: number): [number, number][] {
  return floor === 'catacombs' ? [[Math.round(W * 0.2), Math.round(H * 0.8)], [Math.round(W * 0.8), Math.round(H * 0.8)]]
    : [[Math.round(W * 0.27), Math.round(H * 0.8)], [Math.round(W * 0.73), Math.round(H * 0.8)]];
}
function draw(t: number, dt: number): void {
  const W = low.width, H = low.height;
  const key = floor + W + 'x' + H;
  if (!cache || cacheKey !== key) { cache = paintStatic(W, H); cacheKey = key; }
  const th = THEME[floor];
  lc.imageSmoothingEnabled = false;
  lc.drawImage(cache, 0, 0);
  const cand = spriteCanvas('candle', 1);
  const cs = candlesAt(W, H);
  for (const [x, y] of cs) lc.drawImage(cand, x - 8, y - 14);
  // flame flicker: a pixel that hops
  for (const [i, [x, y]] of cs.entries()) {
    lc.fillStyle = Math.sin(t * 13 + i * 2) > 0 ? PAL.h : PAL.f;
    lc.fillRect(x - 1 + (Math.sin(t * 7 + i) > 0.6 ? 1 : 0), y - 13, 1, 1);
  }
  for (const m of motes) {
    if (motion) { m.y -= m.v * dt; m.x += Math.sin(t + m.ph) * 3 * dt; }
    if (m.y < 0) { m.y = H; m.x = Math.random() * W; }
    lc.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2 + m.ph);
    lc.fillStyle = th.mote; lc.fillRect(Math.round(m.x), Math.round(m.y), 1, 1);
  }
  lc.globalAlpha = 1;
  // light layer
  const GW = glow.width, GH = glow.height, k = GW / W;
  gc.clearRect(0, 0, GW, GH);
  const pool = gc.createRadialGradient(GW / 2, GH * 0.42, 0, GW / 2, GH * 0.42, GW * 0.7);
  pool.addColorStop(0, `rgba(${th.light},.10)`); pool.addColorStop(1, 'rgba(0,0,0,0)');
  gc.fillStyle = pool; gc.fillRect(0, 0, GW, GH);
  cs.forEach(([x, y], i) => {
    const fl = 0.8 + 0.2 * Math.sin(t * 9 + i * 3) * Math.sin(t * 4.3 + i);
    const r = 34 * k * fl;
    const gr = gc.createRadialGradient(x * k, (y - 13) * k, 0, x * k, (y - 13) * k, r);
    gr.addColorStop(0, `rgba(${th.light},${0.32 * fl})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    gc.fillStyle = gr; gc.fillRect(0, 0, GW, GH);
  });
}
