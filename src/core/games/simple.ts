import { rnd, randInt, choose, weighted } from '../rng';

/* ---------------- Fate's Coin ---------------- */
export const COIN = {
  classic: { pay: 1.96 },             // 98.0%
  cursed: { side: 1.98, edge: 48, pEdge: 0.02 }, // 97.02% / 96%
};
export type CoinSide = 'heads' | 'tails' | 'edge';
export function flipCoin(cursed: boolean): CoinSide {
  const r = rnd();
  if (cursed && r < COIN.cursed.pEdge) return 'edge';
  const r2 = cursed ? (r - COIN.cursed.pEdge) / (1 - COIN.cursed.pEdge) : r;
  return r2 < 0.5 ? 'heads' : 'tails';
}

/* ---------------- Bone Dice (over/under) ---------------- */
export const DICE_RTP = 0.985;
export const diceMultiplier = (chance: number): number => Math.floor((DICE_RTP / chance) * 10000) / 10000;
/** roll in [0, 100) with two decimals */
export const rollD100 = (): number => Math.floor(rnd() * 10000) / 100;

/* ---------------- Triple Bones (3d6) ---------------- */
export const TRIPLE_RTP = 0.97;
const sumP: number[] = (() => {
  const p = new Array(19).fill(0);
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) p[a + b + c] += 1 / 216;
  return p;
})();
export type TripleBet = { kind: 'small' } | { kind: 'big' } | { kind: 'anyTriple' } | { kind: 'total'; n: number } | { kind: 'triple'; n: number };
export function tripleProb(b: TripleBet): number {
  switch (b.kind) {
    case 'small': { let p = 0; for (let s = 4; s <= 10; s++) p += sumP[s]; return p - 2 / 216; }
    case 'big': { let p = 0; for (let s = 11; s <= 17; s++) p += sumP[s]; return p - 2 / 216; }
    case 'anyTriple': return 6 / 216;
    case 'triple': return 1 / 216;
    case 'total': return sumP[b.n];
  }
}
/** Total return per unit stake (stake included). */
export const triplePay = (b: TripleBet): number => {
  if (b.kind === 'small' || b.kind === 'big') return 1.94;
  return Math.floor((TRIPLE_RTP / tripleProb(b)) * 10) / 10;
};
export function tripleWins(b: TripleBet, d: number[]): boolean {
  const s = d[0] + d[1] + d[2];
  const triple = d[0] === d[1] && d[1] === d[2];
  switch (b.kind) {
    case 'small': return !triple && s >= 4 && s <= 10;
    case 'big': return !triple && s >= 11 && s <= 17;
    case 'anyTriple': return triple;
    case 'triple': return triple && d[0] === b.n;
    case 'total': return s === b.n;
  }
}
export const roll3d6 = (): number[] => [1 + randInt(6), 1 + randInt(6), 1 + randInt(6)];

/* ---------------- Crypt Delve (mines) / Six Chalices ---------------- */
export const MINES_RTP = 0.97;
/** Total return after `picks` safe picks among `tiles` with `bad` hazards. */
export function minesMult(tiles: number, bad: number, picks: number, rtp = MINES_RTP): number {
  if (picks === 0) return 1;
  const m = (rtp * choose(tiles, picks)) / choose(tiles - bad, picks);
  return Math.floor(m * 100) / 100;
}
export function placeHazards(tiles: number, bad: number): Set<number> {
  const s = new Set<number>();
  while (s.size < bad) s.add(randInt(tiles));
  return s;
}

/* ---------------- Ladder of Souls (tower) ---------------- */
export const TOWER_MODES = {
  easy: { doors: 4, bad: 1, label: 'Penitent' },
  normal: { doors: 3, bad: 1, label: 'Sinner' },
  hard: { doors: 2, bad: 1, label: 'Damned' },
  hellish: { doors: 3, bad: 2, label: 'Hellbound' },
} as const;
export type TowerMode = keyof typeof TOWER_MODES;
export const TOWER_LEVELS = 9;
export const TOWER_RTP = 0.97;
export function towerMult(mode: TowerMode, level: number): number {
  if (level === 0) return 1;
  const m = TOWER_MODES[mode];
  const p = (m.doors - m.bad) / m.doors;
  return Math.floor(TOWER_RTP * Math.pow(1 / p, level) * 100) / 100;
}

/* ---------------- Blood Moon (crash) ---------------- */
export const CRASH_RTP = 0.97;
/** Crash point: P(point >= x) = RTP / x for x >= 1. */
export function crashPoint(): number {
  const u = rnd();
  const x = CRASH_RTP / (1 - u);
  if (x < 1) return 1;
  return Math.min(10000, Math.floor(x * 100) / 100);
}
/** Multiplier on screen after t seconds. */
export const crashCurve = (t: number): number => Math.pow(Math.E, 0.11 * t) + 0.0 * t;
export const crashTimeFor = (m: number): number => Math.log(m) / 0.11;

/* ---------------- Plinko (Bone Drop) ---------------- */
export type PlinkoRisk = 'low' | 'mid' | 'high';
export const PLINKO_ROWS = [8, 12, 16] as const;
const PLINKO_SHAPES: Record<PlinkoRisk, (d: number) => number> = {
  low: d => 0.45 + 1.6 * d * d,
  mid: d => 0.25 + 4 * Math.pow(d, 2.6),
  high: d => 0.15 + 22 * Math.pow(d, 4.2),
};
/** Largest scale whose rounded table stays at or under the target return. */
export function fitScale(raw: number[], p: number[], rtp: number, round: (v: number) => number): number[] {
  const ev = (sc: number) => raw.reduce((s, v, i) => s + round(v * sc) * p[i], 0);
  let lo = 0, hi = (rtp / raw.reduce((s, v, i) => s + v * p[i], 0)) * 2;
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (ev(mid) <= rtp) lo = mid; else hi = mid; }
  return raw.map(v => round(v * lo));
}
function binom(n: number): number[] {
  const out: number[] = [];
  for (let k = 0; k <= n; k++) out.push(choose(n, k) / 2 ** n);
  return out;
}
const plinkoCache = new Map<string, number[]>();
/** Multiplier for every slot, normalised to ~98% RTP and rounded for display. */
export function plinkoTable(rows: number, risk: PlinkoRisk, rtp = 0.98): number[] {
  const key = rows + risk;
  const hit = plinkoCache.get(key);
  if (hit) return hit;
  const p = binom(rows);
  const shapeScale = rows === 8 ? 0.55 : rows === 12 ? 0.8 : 1;
  const raw = p.map((_, k) => {
    const d = Math.abs(k - rows / 2) / (rows / 2);
    return PLINKO_SHAPES[risk](d) * (risk === 'low' ? 1 : Math.pow(1 + d, rows * shapeScale * 0.12));
  });
  const round = (v: number) => (v >= 100 ? Math.round(v) : v >= 10 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100);
  const table = fitScale(raw, p, rtp, round);
  plinkoCache.set(key, table);
  return table;
}
export function plinkoRtp(rows: number, risk: PlinkoRisk): number {
  const p = binom(rows);
  return plinkoTable(rows, risk).reduce((s, v, i) => s + v * p[i], 0);
}
/** Returns the path (0 = left, 1 = right per row) and the landing slot. */
export function dropBall(rows: number): { path: number[]; slot: number } {
  const path: number[] = [];
  let slot = 0;
  for (let i = 0; i < rows; i++) { const r = rnd() < 0.5 ? 0 : 1; path.push(r); slot += r; }
  return { path, slot };
}

/* ---------------- Wheel of Ruin ---------------- */
export type WheelRisk = 'low' | 'mid' | 'high';
export const WHEEL_SEGMENTS: Record<WheelRisk, number[]> = (() => {
  const build = (counts: [number, number][]) => counts.flatMap(([m, c]) => new Array(c).fill(m));
  // 30 segments each; RTP: low 96.7%, mid 96.7%, high 96.7%
  const low = build([[0, 9], [1.2, 12], [1.5, 6], [1.7, 1], [2, 2]]);
  const mid = build([[0, 17], [1.5, 5], [2, 4], [3, 3], [4.5, 1]]);
  const high = build([[0, 29], [29, 1]]);
  // interleave so the wheel looks mixed
  const spread = (a: number[]) => {
    const zeros = a.filter(v => v === 0);
    const sorted = a.filter(v => v !== 0).sort((x, y) => x - y);
    const wins: number[] = [];
    while (sorted.length) { wins.push(sorted.shift() as number); if (sorted.length) wins.push(sorted.pop() as number); }
    const out: number[] = [];
    const n = a.length;
    let wi = 0, zi = 0;
    for (let i = 0; i < n; i++) {
      const wantWin = Math.floor(((i + 1) * wins.length) / n) > Math.floor((i * wins.length) / n);
      if ((wantWin && wi < wins.length) || zi >= zeros.length) out.push(wins[wi++]); else out.push(zeros[zi++]);
    }
    return out;
  };
  return { low: spread(low), mid: spread(mid), high: spread(high) };
})();
export const wheelRtp = (r: WheelRisk): number => WHEEL_SEGMENTS[r].reduce((s, v) => s + v, 0) / WHEEL_SEGMENTS[r].length;
export const spinWheel = (r: WheelRisk): number => randInt(WHEEL_SEGMENTS[r].length);

/* ---------------- Séance (keno, 40 numbers, 10 drawn) ---------------- */
export const KENO_N = 40, KENO_DRAW = 10;
export function kenoHitProb(picks: number, hits: number): number {
  return (choose(picks, hits) * choose(KENO_N - picks, KENO_DRAW - hits)) / choose(KENO_N, KENO_DRAW);
}
const kenoCache = new Map<number, number[]>();
/** Pay table for `picks` spots (index = hits), ~96% RTP. */
export function kenoTable(picks: number, rtp = 0.96): number[] {
  const c = kenoCache.get(picks);
  if (c) return c;
  const minHit = picks <= 2 ? 1 : picks <= 4 ? 2 : picks <= 7 ? 3 : 4;
  const raw: number[] = [];
  for (let h = 0; h <= picks; h++) raw.push(h < minHit ? 0 : Math.pow(h - minHit + 1, 2.2) * Math.pow(3.2, h - minHit));
  const probs = raw.map((_, h) => kenoHitProb(picks, h));
  const t = fitScale(raw, probs, rtp, v => (v === 0 ? 0 : v >= 100 ? Math.round(v) : v >= 10 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100));
  kenoCache.set(picks, t);
  return t;
}
export const kenoRtp = (picks: number): number => kenoTable(picks).reduce((s, v, h) => s + v * kenoHitProb(picks, h), 0);
export function kenoDraw(): number[] {
  const s = new Set<number>();
  while (s.size < KENO_DRAW) s.add(1 + randInt(KENO_N));
  return [...s];
}

/* ---------------- Grave Tickets (scratch) ---------------- */
export interface ScratchTier { id: string; name: string; price: number; prizes: [number, number][] } // [multiplier, probability]
export const SCRATCH_TIERS: ScratchTier[] = [
  { id: 'copper', name: 'Copper Coffin', price: 1, prizes: [[1, 0.2], [2, 0.12], [5, 0.04], [10, 0.014], [50, 0.002], [250, 0.00026]] },
  { id: 'silver', name: 'Silver Shroud', price: 5, prizes: [[1, 0.12], [3, 0.085], [8, 0.028], [25, 0.007], [100, 0.0012], [1000, 0.00006]] },
  { id: 'obsidian', name: 'Obsidian Reliquary', price: 25, prizes: [[2, 0.1], [5, 0.05], [20, 0.01], [100, 0.0015], [666, 0.0001], [5000, 0.000018]] },
];
export const scratchRtp = (t: ScratchTier): number => t.prizes.reduce((s, [m, p]) => s + m * p, 0);
/** Returns the prize multiplier (0 = none) and a 3x3 grid of symbol indices consistent with it. */
export function scratchTicket(t: ScratchTier): { prizeIdx: number; grid: number[] } {
  const r = rnd();
  let acc = 0, prizeIdx = -1;
  for (let i = 0; i < t.prizes.length; i++) { acc += t.prizes[i][1]; if (r < acc) { prizeIdx = i; break; } }
  const n = t.prizes.length;
  const grid: number[] = [];
  if (prizeIdx >= 0) grid.push(prizeIdx, prizeIdx, prizeIdx);
  // fill with symbols appearing at most twice
  const counts = new Array(n).fill(0);
  if (prizeIdx >= 0) counts[prizeIdx] = 3;
  while (grid.length < 9) {
    const s = randInt(n);
    if (counts[s] < 2) { counts[s]++; grid.push(s); }
  }
  for (let i = grid.length - 1; i > 0; i--) { const j = randInt(i + 1); [grid[i], grid[j]] = [grid[j], grid[i]]; }
  return { prizeIdx, grid };
}

/* ---------------- Spectral Derby ---------------- */
export interface Racer { name: string; sprite: string; p: number; odds: number }
export const RACER_POOL = [
  { name: 'Wailing Wisp', sprite: 'ghost' }, { name: 'Gravecrawler', sprite: 'spider' }, { name: 'Cinder Imp', sprite: 'imp' },
  { name: 'Belfry Bat', sprite: 'bat' }, { name: 'Bog Slime', sprite: 'slime' }, { name: 'Lantern Moth', sprite: 'moth' },
];
export const DERBY_RTP = 0.95;
export function newRace(): Racer[] {
  const pool = [...RACER_POOL];
  const out: Racer[] = [];
  const strengths: number[] = [];
  for (let i = 0; i < 6; i++) {
    const idx = randInt(pool.length);
    const r = pool.splice(idx, 1)[0];
    out.push({ ...r, p: 0, odds: 0 });
    strengths.push(Math.pow(0.3 + rnd(), 2.2));
  }
  const tot = strengths.reduce((a, b) => a + b, 0);
  out.forEach((r, i) => { r.p = strengths[i] / tot; r.odds = Math.max(1.1, Math.floor((DERBY_RTP / r.p) * 10) / 10); });
  return out;
}
export const raceWinner = (rs: Racer[]): number => weighted(rs.map(r => r.p));
