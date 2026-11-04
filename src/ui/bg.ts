import { pxCanvas, frames } from './px';
import { A } from './dom';
import { FLOORS, FloorId } from '../core/content';
import { motion } from './fx';

/* The living backdrop: a low-resolution pixel hall (tiles, pillars, torches, embers) under a smooth glow layer. */
const SCALE = 3;
let low: HTMLCanvasElement, glow: HTMLCanvasElement;
let lc: CanvasRenderingContext2D, gc: CanvasRenderingContext2D;
let floor: FloorId = 'parlor';
let intensity = 1;
const light = new Image(); light.src = A('fx/circle_a.png');
const smoke = new Image(); smoke.src = A('fx/smoke_04.png');
interface Ember { x: number; y: number; v: number; s: number; ph: number }
let embers: Ember[] = [];
const fogs = Array.from({ length: 5 }, (_, i) => ({ x: Math.random(), y: 0.75 + Math.random() * 0.25, s: 0.8 + Math.random(), v: 0.004 + Math.random() * 0.006, i }));
const TINT: Record<FloorId, { dark: string; mid: string; wall: string; pillar: string }> = {
  parlor: { dark: '#12060a', mid: 'rgba(60,20,10,.55)', wall: 'red_wood_plank_2', pillar: 'default_gold_block' },
  salon: { dark: '#0e0610', mid: 'rgba(70,8,30,.5)', wall: 'default_obsidian_brick', pillar: 'default_obsidian_block' },
  catacombs: { dark: '#050c0b', mid: 'rgba(8,50,40,.45)', wall: 'default_mossycobble', pillar: 'granite_brick' },
  abyss: { dark: '#100302', mid: 'rgba(90,10,0,.5)', wall: 'nether_rack_deep', pillar: 'nether_brick_deep_alt' },
};
export function setFloor(f: FloorId, i = 1): void { floor = f; intensity = i; }
export function initBg(): void {
  low = document.createElement('canvas'); low.className = 'bg-low';
  glow = document.createElement('canvas'); glow.className = 'bg-glow';
  document.body.prepend(glow); document.body.prepend(low);
  lc = low.getContext('2d')!; gc = glow.getContext('2d')!;
  const fit = () => {
    low.width = Math.ceil(innerWidth / SCALE); low.height = Math.ceil(innerHeight / SCALE);
    glow.width = Math.ceil(innerWidth / 2); glow.height = Math.ceil(innerHeight / 2);
    embers = Array.from({ length: 40 }, () => ({ x: Math.random() * low.width, y: Math.random() * low.height, v: 3 + Math.random() * 10, s: Math.random() < 0.2 ? 2 : 1, ph: Math.random() * 6 }));
  };
  fit(); addEventListener('resize', fit);
  let last = 0;
  const loop = (now: number) => {
    requestAnimationFrame(loop);
    if (now - last < 33) return;
    const dt = (now - last) / 1000; last = now;
    draw(now / 1000, Math.min(dt, 0.1));
  };
  requestAnimationFrame(loop);
}
function draw(t: number, dt: number): void {
  const W = low.width, H = low.height;
  const tn = TINT[floor];
  const fl = FLOORS.find(f => f.id === floor)!;
  lc.imageSmoothingEnabled = false;
  lc.fillStyle = tn.dark; lc.fillRect(0, 0, W, H);
  // wall tiles
  const tile = pxCanvas(tn.wall);
  lc.globalAlpha = 0.55;
  for (let y = 0; y < H; y += 16) for (let x = 0; x < W; x += 16) lc.drawImage(tile, x, y);
  lc.globalAlpha = 1;
  // arches: dark recesses between pillars
  const cols = Math.max(2, Math.round(W / 70));
  const span = W / cols;
  for (let c = 0; c < cols; c++) {
    const cx = c * span + span / 2, aw = span * 0.62, top = H * 0.16;
    lc.fillStyle = 'rgba(0,0,0,.55)';
    lc.beginPath(); lc.moveTo(cx - aw / 2, H); lc.lineTo(cx - aw / 2, top + aw / 2); lc.arc(cx, top + aw / 2, aw / 2, Math.PI, 0); lc.lineTo(cx + aw / 2, H); lc.fill();
    lc.fillStyle = 'rgba(0,0,0,.35)';
    lc.fillRect(Math.round(cx - aw / 2) + 2, Math.round(top + aw / 2), 2, H);
  }
  // pillars
  const pil = pxCanvas(tn.pillar);
  for (let c = 0; c <= cols; c++) {
    const x = Math.round(c * span - 6);
    for (let y = 0; y < H; y += 16) { lc.drawImage(pil, x, y, 12, 16); }
    lc.fillStyle = 'rgba(0,0,0,.35)'; lc.fillRect(x + 9, 0, 3, H);
    lc.fillStyle = 'rgba(255,255,255,.08)'; lc.fillRect(x, 0, 1, H);
  }
  // torches on pillars
  const nTorch = frames('default_torch_on_floor_animated');
  const torchY = Math.round(H * 0.3);
  const torchXs: number[] = [];
  for (let c = 0; c <= cols; c++) {
    const x = Math.round(c * span - 8);
    const f = Math.floor(t * 8 + c * 3) % nTorch;
    lc.drawImage(pxCanvas('default_torch_on_floor_animated', f), x, torchY);
    torchXs.push(x + 8);
  }
  // floor vignette + tint
  const g = lc.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,.65)'); g.addColorStop(0.35, tn.mid); g.addColorStop(1, 'rgba(0,0,0,.85)');
  lc.fillStyle = g; lc.fillRect(0, 0, W, H);
  // embers
  for (const e of embers) {
    if (motion) { e.y -= e.v * dt; e.x += Math.sin(t * 1.3 + e.ph) * 4 * dt; }
    if (e.y < -2) { e.y = H + 2; e.x = Math.random() * W; }
    const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 3 + e.ph));
    lc.globalAlpha = a; lc.fillStyle = fl.glow; lc.fillRect(Math.round(e.x), Math.round(e.y), e.s, e.s);
  }
  lc.globalAlpha = 1;

  // ---- smooth glow layer ----
  const GW = glow.width, GH = glow.height, k = GW / W;
  gc.clearRect(0, 0, GW, GH);
  gc.globalCompositeOperation = 'lighter';
  if (light.complete) {
    for (let i = 0; i < torchXs.length; i++) {
      const flick = 0.75 + 0.25 * Math.sin(t * 9 + i * 2) * Math.sin(t * 5.3 + i);
      const r = 90 * k * flick * intensity;
      gc.globalAlpha = 0.33 * flick * intensity;
      gc.drawImage(tintLight(fl.glow), torchXs[i] * k - r, (torchY + 4) * k - r, r * 2, r * 2);
    }
  }
  gc.globalCompositeOperation = 'source-over';
  if (smoke.complete && motion) {
    for (const f of fogs) {
      f.x += f.v * dt * (f.i % 2 ? 1 : -1);
      if (f.x > 1.3) f.x = -0.3; if (f.x < -0.3) f.x = 1.3;
      const s = GW * 0.9 * f.s;
      gc.globalAlpha = 0.07;
      gc.drawImage(smoke, f.x * GW - s / 2, f.y * GH - s / 2, s, s);
    }
  }
  gc.globalAlpha = 1;
}
const lightCache = new Map<string, HTMLCanvasElement>();
function tintLight(color: string): HTMLCanvasElement {
  let c = lightCache.get(color);
  if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.drawImage(light, 0, 0, 128, 128); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, 128, 128);
  lightCache.set(color, c);
  return c;
}
