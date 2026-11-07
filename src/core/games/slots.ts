import { weighted } from '../rng';

export interface SlotSymbol { id: string; sprite: string; w: number; pay: [number, number, number]; wild?: boolean; scatter?: boolean; tint?: string }
export interface Machine {
  id: string; name: string; blurb: string; vol: string;
  symbols: SlotSymbol[];
  freeSpins: Record<number, number>; freeMult: number;
  expandingWild?: boolean;
  scale: number; // calibrates the paytable (see tests/slots.test.ts)
}
export const LINES: number[][] = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [1, 0, 1, 2, 1],
];
const WILD = (w: number, pay: [number, number, number]): SlotSymbol => ({ id: 'wild', sprite: 'crown_skull', w, pay, wild: true });
const SCAT = (w: number): SlotSymbol => ({ id: 'scatter', sprite: 'eye', w, pay: [0, 0, 0], scatter: true });

export const MACHINES: Machine[] = [
  {
    id: 'gilded', name: 'Gilded Reliquary', vol: 'Low', blurb: 'Steady little sins. Crowned skulls are wild; three open eyes start 10 free spins at ×2.',
    symbols: [
      { id: 'cherry', sprite: 'rose', w: 30, pay: [4, 10, 25] },
      { id: 'berry', sprite: 'candle', w: 26, pay: [5, 12, 30] },
      { id: 'apple', sprite: 'bell', w: 20, pay: [8, 20, 60] },
      { id: 'ruby', sprite: 'ruby', w: 14, pay: [12, 40, 120] },
      { id: 'emerald', sprite: 'emerald', w: 10, pay: [20, 70, 250] },
      { id: 'diamond', sprite: 'diamond', w: 6, pay: [35, 150, 600] },
      WILD(4, [50, 250, 1500]), SCAT(4),
    ],
    freeSpins: { 3: 10, 4: 15, 5: 25 }, freeMult: 2, scale: 1.137,
  },
  {
    id: 'blood', name: 'Blood Moon Engine', vol: 'Brutal', blurb: 'Long silences, then screaming. Free spins pay ×3 and wilds are scarce.',
    symbols: [
      { id: 'shroom', sprite: 'vial_red', w: 34, pay: [2, 8, 20] },
      { id: 'vial', sprite: 'heart', w: 26, pay: [4, 12, 40] },
      { id: 'heart', sprite: 'dagger', w: 16, pay: [10, 40, 150] },
      { id: 'blade', sprite: 'blood_moon', w: 10, pay: [25, 100, 500] },
      { id: 'mese', sprite: 'amethyst', w: 6, pay: [60, 300, 1500] },
      { id: 'ingot', sprite: 'chalice', w: 3, pay: [150, 1000, 6000] },
      WILD(2.5, [200, 1500, 10000]), SCAT(3.2),
    ],
    freeSpins: { 3: 8, 4: 12, 5: 20 }, freeMult: 3, scale: 0.964,
  },
  {
    id: 'crypt', name: 'Crypt of Crowns', vol: 'Medium', blurb: 'A crowned skull on reels 2–4 swells to fill its whole reel. Three eyes start free spins.',
    symbols: [
      { id: 'torch', sprite: 'candle', w: 30, pay: [3, 10, 25] },
      { id: 'chalice', sprite: 'key', w: 24, pay: [5, 14, 40] },
      { id: 'key', sprite: 'tome', w: 18, pay: [8, 25, 80] },
      { id: 'sword', sprite: 'dagger', w: 12, pay: [15, 50, 200] },
      { id: 'tome', sprite: 'sapphire', w: 8, pay: [25, 100, 400] },
      { id: 'crown', sprite: 'ring', w: 5, pay: [50, 200, 1000] },
      WILD(2.6, [80, 400, 2500]), SCAT(3.4),
    ],
    freeSpins: { 3: 8, 4: 12, 5: 16 }, freeMult: 2, expandingWild: true, scale: 0.832,
  },
];

export interface LineWin { line: number; sym: number; count: number; pay: number }
export interface SpinResult { grid: number[][]; wins: LineWin[]; lineTotal: number; scatters: number; freeSpins: number; expanded: number[]; jackpot: boolean }

/** One spin. `lineTotal` is the return in units of the TOTAL stake (10 lines). */
export function spinMachine(m: Machine): SpinResult {
  const weights = m.symbols.map(s => s.w);
  const grid: number[][] = [];
  for (let r = 0; r < 5; r++) grid.push([weighted(weights), weighted(weights), weighted(weights)]);
  const wildIdx = m.symbols.findIndex(s => s.wild);
  const scatIdx = m.symbols.findIndex(s => s.scatter);
  const expanded: number[] = [];
  if (m.expandingWild) {
    for (let r = 1; r <= 3; r++) if (grid[r].includes(wildIdx)) { grid[r] = [wildIdx, wildIdx, wildIdx]; expanded.push(r); }
  }
  return evaluate(m, grid, wildIdx, scatIdx, expanded);
}
export function evaluate(m: Machine, grid: number[][], wildIdx: number, scatIdx: number, expanded: number[] = []): SpinResult {
  const wins: LineWin[] = [];
  let jackpot = false;
  LINES.forEach((line, li) => {
    const cells = line.map((row, reel) => grid[reel][row]);
    // the line symbol is the first non-wild (wild-only lines pay as wild)
    let sym = cells.find(c => c !== wildIdx) ?? wildIdx;
    if (sym === scatIdx) sym = wildIdx;
    let count = 0;
    for (const c of cells) { if (c === sym || c === wildIdx) count++; else break; }
    // a run of wilds may beat the substituted symbol
    let wildRun = 0;
    for (const c of cells) { if (c === wildIdx) wildRun++; else break; }
    let best = count >= 3 && sym !== scatIdx ? m.symbols[sym].pay[count - 3] : 0;
    let bestSym = sym, bestCount = count;
    if (wildRun >= 3 && m.symbols[wildIdx].pay[wildRun - 3] > best) { best = m.symbols[wildIdx].pay[wildRun - 3]; bestSym = wildIdx; bestCount = wildRun; }
    if (wildRun === 5) jackpot = true;
    if (best > 0) wins.push({ line: li, sym: bestSym, count: bestCount, pay: (best * m.scale) / 10 });
  });
  let scatters = 0;
  for (const reel of grid) for (const c of reel) if (c === scatIdx) scatters++;
  const freeSpins = m.freeSpins[Math.min(5, scatters)] ?? 0;
  const lineTotal = wins.reduce((s, w) => s + w.pay, 0) + (scatters >= 3 ? scatters - 1 : 0) * 0.5;
  return { grid, wins, lineTotal, scatters, freeSpins, expanded, jackpot };
}
/** Simulated RTP of a machine including free spins (for calibration/tests). */
export function simulateMachine(m: Machine, spins: number): number {
  let ret = 0;
  for (let i = 0; i < spins; i++) {
    const r = spinMachine(m);
    ret += r.lineTotal;
    let fs = r.freeSpins;
    let guard = 0;
    while (fs > 0 && guard++ < 200) {
      fs--;
      const f = spinMachine(m);
      ret += f.lineTotal * m.freeMult;
      fs += f.freeSpins;
    }
  }
  return ret / spins;
}
