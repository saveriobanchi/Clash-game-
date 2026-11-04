import type { GameId, PactId, RelicId, FloorId } from './content';

export interface Contract {
  id: number; kind: 'wager' | 'wins' | 'mult' | 'floor' | 'bigwin' | 'rounds';
  game?: GameId; floor?: FloorId; target: number; progress: number; gold: number; souls: number; text: string;
}
export interface GameStats { rounds: number; wagered: number; won: number; best: number; bestMult: number }
export interface Save {
  v: 1;
  gold: number; souls: number; comps: number;
  xp: number; rank: number;
  cycle: number; sigils: number;
  stats: { wagered: number; won: number; rounds: number; wins: number; biggestWin: number; biggestMult: number; peakGold: number; streak: number; cold: number; contractsDone: number; loans: number; started: number };
  games: Partial<Record<GameId, GameStats>>;
  relics: Partial<Record<RelicId, number>>;
  pact: { id: PactId; left: number } | null;
  loan: { owed: number; principal: number } | null;
  contracts: Contract[]; contractSeq: number;
  feats: Record<string, number>;
  lastTithe: number;
  floorsSeen: FloorId[];
  hoard: number;
  bets: Partial<Record<GameId, number>>;
  variants: Partial<Record<GameId, string>>;
  settings: { sfx: boolean; music: boolean; motion: boolean; volume: number };
  intro: boolean;
}
const KEY = 'velvet-abyss-v1';
export function freshSave(): Save {
  return {
    v: 1, gold: 500, souls: 0, comps: 0, xp: 0, rank: 1, cycle: 0, sigils: 0,
    stats: { wagered: 0, won: 0, rounds: 0, wins: 0, biggestWin: 0, biggestMult: 0, peakGold: 500, streak: 0, cold: 0, contractsDone: 0, loans: 0, started: Date.now() },
    games: {}, relics: {}, pact: null, loan: null, contracts: [], contractSeq: 1, feats: {},
    lastTithe: 0, floorsSeen: ['parlor'], hoard: 5000, bets: {}, variants: {},
    settings: { sfx: true, music: true, motion: true, volume: 0.8 }, intro: false,
  };
}
export function loadSave(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    const s = JSON.parse(raw) as Save;
    const base = freshSave();
    return { ...base, ...s, stats: { ...base.stats, ...s.stats }, settings: { ...base.settings, ...s.settings } };
  } catch { return freshSave(); }
}
let timer: number | undefined;
export function persist(s: Save): void {
  clearTimeout(timer);
  timer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage full or blocked */ } }, 150) as unknown as number;
}
export function wipeSave(): void { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
export function exportSave(s: Save): string { return btoa(unescape(encodeURIComponent(JSON.stringify(s)))); }
export function importSave(code: string): Save | null {
  try { const s = JSON.parse(decodeURIComponent(escape(atob(code.trim())))); return s && s.v === 1 ? { ...freshSave(), ...s } : null; } catch { return null; }
}
