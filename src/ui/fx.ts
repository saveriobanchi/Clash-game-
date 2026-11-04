import { A, h, sleep, tween } from './dom';
import { pxCanvas } from './px';
import { sfx } from './audio';
import { fmt } from '../core/economy';

/* One full-screen canvas for particles: Kenney Particle Pack textures tinted on the fly + pixel-art coins. */
interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; rot: number; vr: number; img: CanvasImageSource; add: boolean; grav: number; fade: number; px?: boolean }
const parts: P[] = [];
let drawFlyers: ((dt: number) => void) | null = null;
let cvs: HTMLCanvasElement, ctx: CanvasRenderingContext2D;
const tex = new Map<string, HTMLImageElement>();
const tinted = new Map<string, HTMLCanvasElement>();
export let motion = true;
export const setMotion = (m: boolean): void => { motion = m; };

export function initFx(): void {
  cvs = h('canvas', { class: 'fx-layer' });
  document.body.append(cvs);
  ctx = cvs.getContext('2d')!;
  const fit = () => { const d = Math.min(2, devicePixelRatio || 1); cvs.width = innerWidth * d; cvs.height = innerHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  fit(); addEventListener('resize', fit);
  for (const n of ['spark_01', 'spark_04', 'spark_06', 'star_04', 'star_06', 'star_08', 'flame_02', 'flame_04', 'magic_02', 'magic_04', 'light_01', 'light_03', 'circle_05', 'smoke_04', 'smoke_07', 'twirl_02', 'flare_01', 'symbol_02']) {
    const i = new Image(); i.src = A(`fx/${n}.png`); tex.set(n, i);
  }
  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const k = p.life / p.max;
      ctx.globalAlpha = p.fade ? Math.min(1, (1 - k) * 2) : 1;
      ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      ctx.imageSmoothingEnabled = !p.px;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      const s = p.size * (p.add ? 0.6 + k * 0.6 : 1);
      ctx.drawImage(p.img, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    drawFlyers?.(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
function tint(name: string, color: string): CanvasImageSource {
  const key = name + color;
  const hit = tinted.get(key);
  if (hit) return hit;
  const src = tex.get(name);
  const c = document.createElement('canvas'); c.width = c.height = 128;
  if (src && src.complete && src.naturalWidth) {
    const g = c.getContext('2d')!;
    g.drawImage(src, 0, 0, 128, 128);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, 128, 128);
    tinted.set(key, c);
  }
  return c;
}
export function burst(x: number, y: number, o: { n?: number; colors?: string[]; tex?: string[]; speed?: number; size?: number; life?: number; grav?: number } = {}): void {
  if (!motion) return;
  const n = o.n ?? 24, colors = o.colors ?? ['#ffd27a', '#ff9a3c', '#fff1c1'], texs = o.tex ?? ['spark_04', 'star_06', 'flare_01'];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = (o.speed ?? 260) * (0.3 + Math.random());
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0, max: (o.life ?? 0.9) * (0.6 + Math.random() * 0.8), size: (o.size ?? 34) * (0.5 + Math.random()), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 6, img: tint(texs[i % texs.length], colors[i % colors.length]), add: true, grav: o.grav ?? 200, fade: 1 });
  }
}
/** Pixel-art gold raining from the top (AETHERFORGE CC0 items). */
export function coinShower(n = 40, sprites = ['default_gold_ingot', 'default_gold_lump', 'default_diamond', 'ruby', 'emerald', 'default_apple_gold']): void {
  if (!motion) return;
  for (let i = 0; i < n; i++) {
    const key = sprites[i % sprites.length];
    parts.push({ x: Math.random() * innerWidth, y: -40 - Math.random() * innerHeight * 0.6, vx: (Math.random() - 0.5) * 80, vy: 120 + Math.random() * 200, life: 0, max: 3.2, size: 26 + Math.random() * 18, rot: Math.random(), vr: (Math.random() - 0.5) * 5, img: pxCanvas(key), add: false, grav: 320, fade: 0, px: true });
  }
}
/** A slow fountain of embers / souls. */
export function rise(x: number, y: number, color = '#ff6a3a', n = 18): void {
  if (!motion) return;
  for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - 0.5) * 80, y, vx: (Math.random() - 0.5) * 30, vy: -60 - Math.random() * 120, life: 0, max: 1.6 + Math.random(), size: 20 + Math.random() * 30, rot: 0, vr: 1, img: tint(i % 2 ? 'magic_02' : 'light_01', color), add: true, grav: -20, fade: 1 });
}
export function floatText(x: number, y: number, text: string, cls = 'gold'): void {
  const el = h('div', `float-text ${cls}`, text);
  el.style.left = x + 'px'; el.style.top = y + 'px';
  document.body.append(el);
  setTimeout(() => el.remove(), 1600);
}
export function shake(el: HTMLElement, power = 1): void {
  if (!motion) return;
  el.style.setProperty('--shake', String(power));
  el.classList.remove('shaking'); void el.offsetWidth; el.classList.add('shaking');
  setTimeout(() => el.classList.remove('shaking'), 500);
}
export function flash(color = 'rgba(255,40,40,.35)'): void {
  const el = h('div', 'flash'); el.style.background = color; document.body.append(el);
  setTimeout(() => el.remove(), 600);
}
export const centerOf = (el: Element): [number, number] => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

const TITLES: [number, string, string, string][] = [[1000, 'APOCALYPSE', 'mirror', 't5'], [250, 'DAMNATION', 'ember', 't4'], [100, 'PORTENT', 'thorn', 't3'], [25, 'BLOOD FORTUNE', 'veil', 't2'], [10, 'OMEN', 'ember', 't1']];
let bigOpen = false;
/** Full-screen celebration for wins of ×10 and up. */
export async function bigWin(mult: number, amount: number): Promise<void> {
  if (bigOpen) return;
  bigOpen = true;
  const [, title, emblem, tier] = TITLES.find(t => mult >= t[0]) ?? TITLES[TITLES.length - 1];
  const amt = h('div', 'bw-amount', '0');
  const ov = h('div', `bigwin ${tier}`,
    h('div', 'bw-rays'),
    h('img', { class: 'bw-emblem', src: A(`emblems/${emblem}.webp`), alt: '' }),
    h('div', 'bw-title', title),
    h('div', 'bw-mult', `×${mult >= 100 ? Math.round(mult) : mult.toFixed(2)}`),
    amt,
    h('div', 'bw-tap', 'tap to continue'));
  document.body.append(ov);
  sfx.bigWin();
  coinShower(mult >= 1000 ? 160 : mult >= 100 ? 90 : 50);
  if (mult >= 100) { const app = document.getElementById('app'); if (app) shake(app, mult >= 1000 ? 2.5 : 1.4); }
  if (mult >= 250) setTimeout(() => burst(innerWidth / 2, innerHeight * 0.4, { n: 80, speed: 600, size: 60, colors: ['#ff2a3a', '#ffd27a', '#fff'] }), 600);
  burst(innerWidth / 2, innerHeight * 0.4, { n: 60, speed: 420, size: 50 });
  let done = false;
  const close = () => { if (done) return; done = true; ov.classList.add('out'); setTimeout(() => ov.remove(), 400); bigOpen = false; };
  ov.addEventListener('click', close);
  await tween(1600, t => { amt.textContent = '+' + fmt(amount * t); });
  sfx.coin();
  await sleep(1800);
  close();
}

/* ---------- coins that fly into the gold counter ---------- */
interface Flyer { x0: number; y0: number; cx: number; cy: number; t: number; d: number; delay: number; img: CanvasImageSource; s: number; done: boolean }
const flyers: Flyer[] = [];
export function flyCoins(x: number, y: number, n = 10, onArrive?: () => void): void {
  const target = document.getElementById('gold');
  if (!motion || !target) { onArrive?.(); return; }
  const r = target.getBoundingClientRect();
  const tx = r.left + 10, ty = r.top + r.height / 2;
  for (let i = 0; i < n; i++) {
    flyers.push({ x0: x + (Math.random() - 0.5) * 60, y0: y + (Math.random() - 0.5) * 40, cx: x + (Math.random() - 0.5) * 240, cy: Math.min(y, ty) - 60 - Math.random() * 120, t: 0, d: 0.65 + Math.random() * 0.3, delay: i * 0.035, img: pxCanvas(i % 4 === 0 ? 'default_gold_ingot' : 'default_gold_lump'), s: 18 + Math.random() * 8, done: false });
  }
  const prevDone = onArrive;
  pendingArrive.push(() => prevDone?.());
  drawFlyers = (dt: number) => {
    for (const f of flyers) {
      if (f.done) continue;
      if (f.delay > 0) { f.delay -= dt; continue; }
      f.t += dt / f.d;
      if (f.t >= 1) {
        f.done = true;
        sfx.tone(1900 + Math.random() * 600, 0.04, 'square', 0.02);
        const pill = target.parentElement; if (pill) { pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); }
        continue;
      }
      const t = f.t * f.t, u = 1 - t;
      const x_ = u * u * f.x0 + 2 * u * t * f.cx + t * t * tx, y_ = u * u * f.y0 + 2 * u * t * f.cy + t * t * ty;
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1;
      ctx.translate(x_, y_); ctx.rotate(f.t * 8);
      const sz = f.s * (1 - f.t * 0.4);
      ctx.drawImage(f.img, -sz / 2, -sz / 2, sz, sz); ctx.restore();
    }
    for (let i = flyers.length - 1; i >= 0; i--) if (flyers[i].done) flyers.splice(i, 1);
    if (!flyers.length) { drawFlyers = null; const cbs = pendingArrive.splice(0); cbs.forEach(c => c()); }
  };
}
const pendingArrive: (() => void)[] = [];

/* ---------- descending onto a new floor ---------- */
export async function floorCard(sub: string, name: string, host: string, lore: string): Promise<void> {
  const el = h('div', 'floor-card',
    h('img', { class: 'fc-host', src: A(`portraits/${host}.webp`), alt: '' }),
    h('div', 'fc-sub', sub), h('div', 'fc-name', name), h('div', 'fc-lore', lore));
  document.body.append(el);
  sfx.whoosh(); sfx.doom();
  await sleep(motion ? 1700 : 600);
  el.classList.add('out');
  await sleep(500);
  el.remove();
}
