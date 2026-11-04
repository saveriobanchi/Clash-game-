import { Card, Shoe } from '../cards';
import { randInt, rnd, weighted } from '../rng';

/* ---------------- Wheel of Thorns (European roulette) ---------------- */
export const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
export type RouletteBet =
  | { t: 'n'; n: number } | { t: 'red' } | { t: 'black' } | { t: 'odd' } | { t: 'even' } | { t: 'low' } | { t: 'high' }
  | { t: 'dozen'; d: number } | { t: 'col'; c: number };
export const betKey = (b: RouletteBet): string => b.t + ('n' in b ? b.n : 'd' in b ? b.d : 'c' in b ? b.c : '');
export function betCovers(b: RouletteBet, n: number): boolean {
  switch (b.t) {
    case 'n': return b.n === n;
    case 'red': return RED.has(n);
    case 'black': return n !== 0 && !RED.has(n);
    case 'odd': return n !== 0 && n % 2 === 1;
    case 'even': return n !== 0 && n % 2 === 0;
    case 'low': return n >= 1 && n <= 18;
    case 'high': return n >= 19;
    case 'dozen': return n !== 0 && Math.ceil(n / 12) === b.d;
    case 'col': return n !== 0 && ((n - 1) % 3) + 1 === b.c;
  }
}
/** Total return per unit (stake included). */
export function betPays(b: RouletteBet, cursedStraight = false): number {
  if (b.t === 'n') return cursedStraight ? 30 : 36;
  if (b.t === 'dozen' || b.t === 'col') return 3;
  return 2;
}
export const spinRoulette = (): number => randInt(37);
/** Cursed numbers for the "Devil's Wheel": 1–3 numbers with big straight-up multipliers. */
export const CURSE_MULTS: [number, number][] = [[50, 0.4], [100, 0.3], [200, 0.15], [300, 0.09], [500, 0.06]];
export function drawCurses(): Map<number, number> {
  const k = 1 + randInt(3);
  const m = new Map<number, number>();
  while (m.size < k) {
    const n = randInt(37);
    if (!m.has(n)) m.set(n, CURSE_MULTS[weighted(CURSE_MULTS.map(c => c[1]))][0]);
  }
  return m;
}
/** Expected straight-up return on the Devil's Wheel. */
export function cursedStraightRtp(): number {
  const em = CURSE_MULTS.reduce((s, [m, p]) => s + m * p, 0);
  const ek = 2; // uniform 1..3
  return (30 + (ek / 37) * (em - 30)) / 37;
}

/* ---------------- Baccarat ---------------- */
export const bacValue = (c: Card): number => (c.r >= 10 && c.r <= 13 ? 0 : c.r === 14 ? 1 : c.r);
export const bacTotal = (cs: Card[]): number => cs.reduce((s, c) => s + bacValue(c), 0) % 10;
export interface BacResult { player: Card[]; banker: Card[]; p: number; b: number; winner: 'player' | 'banker' | 'tie' }
export function playBaccarat(shoe: Shoe): BacResult {
  if (shoe.needsShuffle()) shoe.shuffle();
  const player = [shoe.draw(), shoe.draw()];
  const banker = [shoe.draw(), shoe.draw()];
  let p = bacTotal(player), b = bacTotal(banker);
  if (p < 8 && b < 8) {
    let p3: Card | null = null;
    if (p <= 5) { p3 = shoe.draw(); player.push(p3); }
    const bDraw = (() => {
      if (!p3) return b <= 5;
      const v = bacValue(p3);
      if (b <= 2) return true;
      if (b === 3) return v !== 8;
      if (b === 4) return v >= 2 && v <= 7;
      if (b === 5) return v >= 4 && v <= 7;
      if (b === 6) return v === 6 || v === 7;
      return false;
    })();
    if (bDraw) banker.push(shoe.draw());
    p = bacTotal(player); b = bacTotal(banker);
  }
  return { player, banker, p, b, winner: p > b ? 'player' : b > p ? 'banker' : 'tie' };
}
export const BAC_PAYS = { player: 2, banker: 1.95, tie: 9, pair: 12 };

/* ---------------- Jacks of the Damned (video poker 9/6) ---------------- */
export const VP_PAYS: [string, number][] = [
  ['Royal Flush', 800], ['Straight Flush', 50], ['Four of a Kind', 25], ['Full House', 9], ['Flush', 6],
  ['Straight', 4], ['Three of a Kind', 3], ['Two Pair', 2], ['Jacks or Better', 1],
];
/** Returns index into VP_PAYS or -1. */
export function vpEvaluate(h: Card[]): number {
  const rs = h.map(c => c.r).sort((a, b) => a - b);
  const flush = h.every(c => c.s === h[0].s);
  const uniq = [...new Set(rs)];
  let straight = uniq.length === 5 && (rs[4] - rs[0] === 4 || rs.join() === '2,3,4,5,14');
  const counts = new Map<number, number>();
  rs.forEach(r => counts.set(r, (counts.get(r) ?? 0) + 1));
  const cv = [...counts.values()].sort((a, b) => b - a);
  if (straight && flush) return rs[0] === 10 ? 0 : 1;
  if (cv[0] === 4) return 2;
  if (cv[0] === 3 && cv[1] === 2) return 3;
  if (flush) return 4;
  if (straight) return 5;
  if (cv[0] === 3) return 6;
  if (cv[0] === 2 && cv[1] === 2) return 7;
  if (cv[0] === 2) { const pr = [...counts.entries()].find(([, c]) => c === 2)![0]; if (pr >= 11) return 8; }
  straight = false;
  return -1;
}
export function vpDeck(): Card[] {
  const d: Card[] = [];
  for (const s of ['s', 'h', 'd', 'c'] as const) for (let r = 2; r <= 14; r++) d.push({ r, s });
  for (let i = d.length - 1; i > 0; i--) { const j = randInt(i + 1); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
/** Simple hold advice good enough for a hint (not perfect strategy). */
export function vpAdvice(h: Card[]): boolean[] {
  const made = vpEvaluate(h);
  const hold = new Array(5).fill(false);
  if (made >= 0 && made <= 5) return hold.map(() => true);
  const counts = new Map<number, number[]>();
  h.forEach((c, i) => counts.set(c.r, [...(counts.get(c.r) ?? []), i]));
  // 4 to a flush
  const bySuit = new Map<string, number[]>();
  h.forEach((c, i) => bySuit.set(c.s, [...(bySuit.get(c.s) ?? []), i]));
  const groups = [...counts.values()].filter(g => g.length >= 2);
  if (groups.length) { groups.flat().forEach(i => (hold[i] = true)); if (made === 6 || made === 7 || made === 8) return hold; }
  const fl = [...bySuit.values()].find(g => g.length >= 4);
  if (fl && !groups.some(g => h[g[0]].r >= 11)) { const out = new Array(5).fill(false); fl.forEach(i => (out[i] = true)); return out; }
  if (groups.length) return hold;
  h.forEach((c, i) => { if (c.r >= 11) hold[i] = true; });
  return hold;
}

/* ---------------- Hi-Lo Ladder ---------------- */
/** rank 1 (Ace) .. 13 (King) */
export const hiloP = (rank: number, dir: 'hi' | 'lo'): number => (dir === 'hi' ? (14 - rank) / 13 : rank / 13);
export const HILO_EDGE = 0.99;
export const SKULL_P = 1 / 14;
export function hiloStep(rank: number, dir: 'hi' | 'lo', skullDeck: boolean): number {
  const p = hiloP(rank, dir);
  const base = HILO_EDGE / p;
  return Math.floor((skullDeck ? base / (1 - SKULL_P) : base) * 100) / 100;
}
/** Draws a rank 1..13, or 0 for the skull. */
export function hiloDraw(skullDeck: boolean): number {
  if (skullDeck && rnd() < SKULL_P) return 0;
  return 1 + randInt(13);
}

/* ---------------- Devil's Bargain ---------------- */
export const BARGAIN_PAY = 2.08;
export const BARGAIN_TIERS = [
  { frac: 0.1, souls: 0, label: 'A Tithe', sub: '10% of everything' },
  { frac: 0.25, souls: 0, label: 'A Quarter', sub: '25% of everything' },
  { frac: 0.5, souls: 1, label: 'Half Your Soul', sub: '50% · +1 soul on a win' },
  { frac: 1, souls: 3, label: 'Everything', sub: '100% · +3 souls on a win' },
];
