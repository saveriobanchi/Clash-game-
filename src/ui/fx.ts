import { h, sleep, tween } from './dom';
import { sprite, spriteCanvas, PAL } from '../art';
import { sfx } from './audio';
import { fmt } from '../core/economy';

/* Effects, all in the game's own pixel language: square sparks with a soft glow, coin sprites, masks. */
interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; grav: number; img?: CanvasImageSource; rot: number; vr: number }
const parts: P[] = [];
let cvs: HTMLCanvasElement, ctx: CanvasRenderingContext2D;
let drawFlyers: ((dt: number) => void) | null = null;
export let motion = true;
export const setMotion = (m: boolean): void => { motion = m; };

export function initFx(): void {
  cvs = h('canvas', { class: 'fx-layer' });
  document.body.append(cvs);
  ctx = cvs.getContext('2d')!;
  const fit = () => { const d = Math.min(2, devicePixelRatio || 1); cvs.width = innerWidth * d; cvs.height = innerHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  fit(); addEventListener('resize', fit);
  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.imageSmoothingEnabled = false;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const k = 1 - p.life / p.max;
      if (p.img) {
        ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y)); ctx.rotate(Math.round(p.rot * 4) / 4);
        ctx.drawImage(p.img, -p.size / 2, -p.size / 2, p.size, p.size); ctx.restore();
      } else {
        const s = Math.max(2, Math.round(p.size * (0.4 + k * 0.6) / 2) * 2);
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
        ctx.globalAlpha = Math.min(0.25, k * 0.4); ctx.fillRect(Math.round(p.x - s), Math.round(p.y - s), s * 2, s * 2);
        ctx.globalAlpha = 1;
      }
    }
    drawFlyers?.(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
const GOLDS = [PAL.y, PAL.g, PAL.h, PAL.f];
export function burst(x: number, y: number, o: { n?: number; colors?: string[]; speed?: number; size?: number; life?: number; grav?: number; tex?: string[] } = {}): void {
  if (!motion) return;
  const n = Math.min(40, o.n ?? 18), colors = o.colors ?? GOLDS;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = (o.speed ?? 220) * (0.3 + Math.random());
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, life: 0, max: (o.life ?? 0.8) * (0.6 + Math.random() * 0.6), size: Math.min(10, (o.size ?? 24) / 4) * (0.6 + Math.random()), color: colors[i % colors.length], grav: o.grav ?? 360, rot: 0, vr: 0 });
  }
}
export function coinShower(n = 30): void {
  if (!motion) return;
  const coin = spriteCanvas('coin', 2);
  for (let i = 0; i < Math.min(80, n); i++) parts.push({ x: Math.random() * innerWidth, y: -30 - Math.random() * innerHeight * 0.5, vx: (Math.random() - 0.5) * 50, vy: 80 + Math.random() * 160, life: 0, max: 3, size: 24 + (i % 3) * 4, color: '', img: coin, grav: 300, rot: 0, vr: (Math.random() - 0.5) * 6 });
}
export function rise(x: number, y: number, color: string = PAL.q, n = 14): void {
  if (!motion) return;
  for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - 0.5) * 60, y, vx: (Math.random() - 0.5) * 20, vy: -50 - Math.random() * 90, life: 0, max: 1.4 + Math.random(), size: 6 + Math.random() * 4, color, grav: -10, rot: 0, vr: 0 });
}
export function floatText(x: number, y: number, text: string, cls = 'gold'): void {
  const el = h('div', `float-text ${cls}`, text);
  el.style.left = x + 'px'; el.style.top = y + 'px';
  document.body.append(el);
  setTimeout(() => el.remove(), 1400);
}
export function shake(el: HTMLElement, power = 1): void {
  if (!motion) return;
  el.style.setProperty('--shake', String(Math.min(1.5, power)));
  el.classList.remove('shaking'); void el.offsetWidth; el.classList.add('shaking');
  setTimeout(() => el.classList.remove('shaking'), 450);
}
export function flash(color = 'rgba(214,58,74,.22)'): void {
  const el = h('div', 'flash'); el.style.background = color; document.body.append(el);
  setTimeout(() => el.remove(), 500);
}
export const centerOf = (el: Element): [number, number] => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

/* ---------- coins that fly into the gold counter ---------- */
interface Flyer { x0: number; y0: number; cx: number; cy: number; t: number; d: number; delay: number; done: boolean }
const flyers: Flyer[] = [];
const pendingArrive: (() => void)[] = [];
export function flyCoins(x: number, y: number, n = 10, onArrive?: () => void): void {
  const target = document.getElementById('gold');
  if (!motion || !target) { onArrive?.(); return; }
  const r = target.getBoundingClientRect();
  const tx = r.left + 8, ty = r.top + r.height / 2;
  const coin = spriteCanvas('coin', 1);
  for (let i = 0; i < Math.min(16, n); i++) flyers.push({ x0: x + (Math.random() - 0.5) * 50, y0: y + (Math.random() - 0.5) * 30, cx: x + (Math.random() - 0.5) * 200, cy: Math.min(y, ty) - 40 - Math.random() * 90, t: 0, d: 0.6 + Math.random() * 0.25, delay: i * 0.04, done: false });
  if (onArrive) pendingArrive.push(onArrive);
  drawFlyers = (dt: number) => {
    for (const f of flyers) {
      if (f.done) continue;
      if (f.delay > 0) { f.delay -= dt; continue; }
      f.t += dt / f.d;
      if (f.t >= 1) {
        f.done = true;
        sfx.tone(1900 + Math.random() * 500, 0.04, 'square', 0.02);
        const pill = target.parentElement; if (pill) { pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); }
        continue;
      }
      const t = f.t * f.t, u = 1 - t;
      const X = u * u * f.x0 + 2 * u * t * f.cx + t * t * tx, Y = u * u * f.y0 + 2 * u * t * f.cy + t * t * ty;
      ctx.drawImage(coin, Math.round(X - 8), Math.round(Y - 7), 16, 14);
    }
    for (let i = flyers.length - 1; i >= 0; i--) if (flyers[i].done) flyers.splice(i, 1);
    if (!flyers.length) { drawFlyers = null; pendingArrive.splice(0).forEach(c => c()); }
  };
}

/* ---------- descending onto a floor ---------- */
export async function floorCard(sub: string, name: string, host: string, lore: string): Promise<void> {
  const el = h('div', 'floor-card', sprite('mask_' + host, 160, 'fc-host'), h('div', 'fc-sub', sub), h('div', 'fc-name', name), h('div', 'fc-lore', lore));
  document.body.append(el);
  sfx.whoosh();
  await sleep(motion ? 1500 : 500);
  el.classList.add('out');
  await sleep(400);
  el.remove();
}

/* ---------- big wins: the hosts unmask their approval ---------- */
const TIERS: [number, string, string][] = [[1000, 'Apocalypse', 'proprietor'], [250, 'Damnation', 'marrow'], [100, 'Portent', 'carrion'], [25, 'Blood Fortune', 'moth'], [10, 'Omen', 'moth']];
let bigOpen = false;
export async function bigWin(mult: number, amount: number): Promise<void> {
  if (bigOpen) return;
  bigOpen = true;
  const [, title, mask] = TIERS.find(t => mult >= t[0]) ?? TIERS[TIERS.length - 1];
  const amt = h('div', 'bw-amount', '0');
  const ov = h('div', `bigwin ${mult >= 250 ? 'high' : ''}`,
    h('div', 'bw-rays'), sprite('mask_' + mask, 168, 'bw-emblem'),
    h('div', 'bw-title', title), h('div', 'bw-mult', `×${mult >= 100 ? Math.round(mult) : mult.toFixed(2)}`), amt,
    h('div', 'bw-tap', 'Tap to continue'));
  document.body.append(ov);
  sfx.bigWin();
  coinShower(mult >= 250 ? 70 : 36);
  let done = false;
  const close = () => { if (done) return; done = true; ov.classList.add('out'); setTimeout(() => ov.remove(), 300); bigOpen = false; };
  ov.addEventListener('click', close);
  await tween(1400, t => { amt.textContent = '+' + fmt(amount * t); });
  await sleep(1800);
  close();
}
