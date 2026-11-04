import { Save, Contract, loadSave, persist, freshSave } from './state';
import { FLOORS, GAMES, FEATS, RELICS, PACTS, GameId, FloorId, RelicId, PactId, gameById, HOST_ARCS, hotGame } from './content';
import { rnd, randInt, pick } from './rng';

type Ev =
  | { t: 'gold' } | { t: 'rank'; rank: number; gold: number; souls: number } | { t: 'feat'; id: string }
  | { t: 'contract'; c: Contract } | { t: 'soul'; n: number; why: string } | { t: 'toast'; text: string; kind?: string }
  | { t: 'floor'; id: FloorId } | { t: 'game'; id: GameId } | { t: 'host'; floor: FloorId };
const subs: ((e: Ev) => void)[] = [];
export const on = (f: (e: Ev) => void): void => { subs.push(f); };
const emit = (e: Ev): void => subs.forEach(f => f(e));

export let S: Save = loadSave();
export const save = (): void => { S.stats.peakGold = Math.max(S.stats.peakGold, S.gold); persist(S); emit({ t: 'gold' }); };
export function resetAll(): void { S = freshSave(); save(); }
export function replaceSave(n: Save): void { S = n; save(); }

/* ---------------- numbers ---------------- */
export function nice(v: number): number {
  if (v < 10) return Math.max(1, Math.round(v));
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const s = steps.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a));
  return Math.round(s * p);
}
export const relic = (id: RelicId): number => S.relics[id] ?? 0;
export const sigilMult = (): number => Math.pow(1.5, S.sigils);
export const baseLimit = (rank: number): number => 25 * Math.pow(1.38, rank - 1);
export const maxBet = (): number => nice(baseLimit(S.rank) * (1 + 0.25 * relic('glove')) * sigilMult());
export const minBet = (): number => Math.max(1, nice(maxBet() / 250));
export const xpFor = (rank: number): number => Math.round(80 + 45 * Math.pow(rank, 1.45));
export const soulPrice = (): number => 5_000_000 * Math.pow(8, S.cycle);
export const titheEvery = 3 * 3600 * 1000;
export const titheReady = (): boolean => Date.now() - S.lastTithe >= titheEvery;
export const loanInterest = (): number => (30 - relic('ledger') * 8) / 100;
export const rakeback = (): number => relic('tooth') * 0.003 + (S.pact?.id === 'avarice' ? 0.025 : 0);
export function fmt(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e12) return (n / 1e12).toFixed(a >= 1e13 ? 1 : 2).replace(/\.0+$/, '') + 'T';
  if (a >= 1e9) return (n / 1e9).toFixed(a >= 1e10 ? 1 : 2).replace(/\.0+$/, '') + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.0+$/, '') + 'M';
  if (a >= 1e5) return Math.round(n / 1e3) + 'K';
  if (a >= 100) return Math.round(n).toLocaleString('en-US');
  return (Math.round(n * 100) / 100).toString();
}
export const floorUnlocked = (f: FloorId): boolean => S.rank >= FLOORS.find(x => x.id === f)!.rank;
export const gameUnlocked = (g: GameId): boolean => S.rank >= gameById(g).rank;

/* ---------------- round flow ---------------- */
let roundActive = false;
export const inRound = (): boolean => roundActive;
/** Deducts a stake and starts a round. Returns false if the player cannot afford it. */
export function wager(game: GameId, stake: number, extra = false): boolean {
  stake = Math.round(stake * 100) / 100;
  if (stake <= 0 || stake > S.gold + 1e-9) return false;
  S.gold -= stake;
  S.stats.wagered += stake;
  const gs = (S.games[game] ??= { rounds: 0, wagered: 0, won: 0, best: 0, bestMult: 0 });
  gs.wagered += stake;
  S.comps += stake * rakeback();
  if (game === 'reels') S.hoard += stake * 0.005;
  // infamy
  const share = Math.min(1, stake / maxBet());
  let xp = (extra ? 0 : 4) + 16 * share;
  xp *= 1 + relic('hourglass') * 0.15;
  if (S.pact?.id === 'hunger') xp *= 2;
  if (game === hotGame()) xp *= 2;
  addXp(xp);
  progress('wager', stake, game);
  if (!extra) {
    roundActive = true;
    S.stats.rounds++; gs.rounds++;
    const fl = gameById(game).floor;
    S.favor[fl] = (S.favor[fl] ?? 0) + 1;
    if (pendingArc(fl)) emit({ t: 'host', floor: fl });
    progress('rounds', 1, game);
    progress('floor', 1, game);
    if (S.pact && S.pact.id !== 'fortune') { S.pact.left--; if (S.pact.left <= 0) { emit({ t: 'toast', text: 'Your pact has ended.', kind: 'blood' }); S.pact = null; } }
    if (GAMES.every(g => (S.games[g.id]?.rounds ?? 0) > 0)) feat('allgames');
  }
  save();
  return true;
}
export interface Settled { paid: number; mult: number; loanCut: number; soul: boolean }
/** Ends a round, crediting `payout` (stake included) for a total stake of `stake`. */
export function settle(game: GameId, stake: number, payout: number): Settled {
  roundActive = false;
  const mult = stake > 0 ? payout / stake : 0;
  let paid = payout;
  if (S.pact?.id === 'bloodmoon' && mult >= 10) paid = payout * 1.5;
  paid = Math.round(paid * 100) / 100;
  let loanCut = 0;
  if (S.loan && paid > 0) {
    loanCut = Math.min(S.loan.owed, Math.round(paid * 0.3 * 100) / 100);
    S.loan.owed -= loanCut;
    if (S.loan.owed <= 0.009) { S.loan = null; feat('repaid'); emit({ t: 'toast', text: 'Your debt to the Proprietor is paid.', kind: 'gold' }); }
  }
  S.gold += paid - loanCut;
  S.stats.won += paid;
  const gs = (S.games[game] ??= { rounds: 0, wagered: 0, won: 0, best: 0, bestMult: 0 });
  gs.won += paid;
  let soul = false;
  if (paid > stake) {
    S.stats.wins++;
    S.stats.streak++; S.stats.cold = 0;
    gs.best = Math.max(gs.best, paid); gs.bestMult = Math.max(gs.bestMult, mult);
    S.stats.biggestWin = Math.max(S.stats.biggestWin, paid);
    S.stats.biggestMult = Math.max(S.stats.biggestMult, mult);
    feat('first_win');
    if (mult >= 10) feat('mult10');
    if (mult >= 100) feat('mult100');
    if (mult >= 1000) feat('mult1000');
    if (S.stats.streak >= 5) feat('streak5');
    progress('wins', 1, game);
    progress('mult', mult, game);
    progress('bigwin', paid, game);
    if (mult >= 20 && rnd() < (relic('candle') ? 0.25 + relic('candle') * 0.15 : 0.1)) { soul = true; addSouls(1, 'A soul slips from the winnings'); }
  } else if (paid < stake) {
    S.stats.cold++; S.stats.streak = 0;
    if (S.stats.cold >= 10) feat('cold10');
  }
  if (S.gold >= 1e4) feat('gold10k');
  if (S.gold >= 1e6) feat('gold1m');
  if (S.gold >= 1e8) feat('gold100m');
  save();
  return { paid, mult, loanCut, soul };
}
/** Cancels a started round with a refund (e.g. leaving mid-round where the rules allow it). */
export function refund(game: GameId, stake: number): void { roundActive = false; S.gold += stake; S.stats.wagered -= stake; const g = S.games[game]; if (g) g.wagered -= stake; save(); }
export const endRound = (): void => { roundActive = false; };

/* ---------------- infamy ---------------- */
function addXp(x: number): void {
  S.xp += x;
  while (S.xp >= xpFor(S.rank)) {
    S.xp -= xpFor(S.rank);
    S.rank++;
    const gold = nice(maxBet() * 8);
    const souls = 1 + (S.rank % 5 === 0 ? 2 : 0);
    S.gold += gold;
    S.souls += souls;
    emit({ t: 'rank', rank: S.rank, gold, souls });
    for (const [r, f] of [[5, 'rank5'], [10, 'rank10'], [20, 'rank20'], [30, 'rank30']] as const) if (S.rank >= r) feat(f);
    for (const fl of FLOORS) if (S.rank === fl.rank && !S.floorsSeen.includes(fl.id)) { S.floorsSeen.push(fl.id); emit({ t: 'floor', id: fl.id }); if (fl.id === 'abyss') feat('abyss'); }
    for (const g of GAMES) if (g.rank === S.rank) emit({ t: 'game', id: g.id });
  }
}
export function addSouls(n: number, why: string): void { S.souls += n; emit({ t: 'soul', n, why }); save(); }
export function feat(id: string): void {
  if (S.feats[id]) return;
  S.feats[id] = Date.now();
  const f = FEATS.find(x => x.id === id);
  if (f) { S.souls += f.souls; emit({ t: 'feat', id }); }
}
export function collectComps(): number { const c = Math.floor(S.comps * 100) / 100; if (c <= 0) return 0; S.gold += c; S.comps -= c; save(); return c; }

/* ---------------- contracts ---------------- */
function makeContract(): Contract {
  const unlocked = GAMES.filter(g => gameUnlocked(g.id));
  const floors = FLOORS.filter(f => floorUnlocked(f.id));
  const mb = maxBet();
  const kinds: Contract['kind'][] = ['wager', 'wins', 'wins', 'mult', 'floor', 'bigwin', 'rounds'];
  const kind = pick(kinds);
  const id = S.contractSeq++;
  let c: Contract;
  const reward = (k: number) => nice(mb * k * (1 + relic('charm') * 0.25));
  const souls = rnd() < 0.3 ? 1 : 0;
  switch (kind) {
    case 'wager': { const t = nice(mb * (20 + randInt(30))); c = { id, kind, target: t, progress: 0, gold: reward(6), souls, text: `Wager ${fmt(t)} gold` }; break; }
    case 'wins': { const g = pick(unlocked); const t = 3 + randInt(6); c = { id, kind, game: g.id, target: t, progress: 0, gold: reward(5 + t), souls, text: `Win ${t} rounds of ${g.name}` }; break; }
    case 'mult': { const t = pick([3, 5, 10, 25]); c = { id, kind, target: t, progress: 0, gold: reward(4 + t), souls: t >= 10 ? 1 : souls, text: `Win ×${t} or more in a single round` }; break; }
    case 'floor': { const f = pick(floors); const t = 10 + randInt(15); c = { id, kind, floor: f.id, target: t, progress: 0, gold: reward(t / 2 + 4), souls, text: `Play ${t} rounds in ${f.name}` }; break; }
    case 'bigwin': { const t = nice(mb * pick([5, 10, 20])); c = { id, kind, target: t, progress: 0, gold: reward(8), souls: 1, text: `Collect a single payout of ${fmt(t)}` }; break; }
    default: { const g = pick(unlocked); const t = 10 + randInt(20); c = { id, kind: 'rounds', game: g.id, target: t, progress: 0, gold: reward(t / 3 + 3), souls, text: `Play ${t} rounds of ${g.name}` }; }
  }
  return c;
}
export function ensureContracts(): void { while (S.contracts.length < 3) S.contracts.push(makeContract()); }
function progress(kind: Contract['kind'], amount: number, game: GameId): void {
  const floor = gameById(game).floor;
  for (const c of S.contracts) {
    if (c.kind !== kind || c.progress >= c.target) continue;
    if (c.game && c.game !== game) continue;
    if (c.floor && c.floor !== floor) continue;
    if (kind === 'mult' || kind === 'bigwin') { if (amount >= c.target) c.progress = c.target; }
    else c.progress = Math.min(c.target, c.progress + amount);
    if (c.progress >= c.target) emit({ t: 'contract', c });
  }
}
export function claimContract(id: number): { gold: number; souls: number } | null {
  const i = S.contracts.findIndex(c => c.id === id);
  if (i < 0 || S.contracts[i].progress < S.contracts[i].target) return null;
  const c = S.contracts[i];
  let mult = 1;
  if (S.pact?.id === 'fortune') { mult = 2; S.pact.left--; if (S.pact.left <= 0) S.pact = null; }
  S.gold += c.gold * mult; S.souls += c.souls;
  S.stats.contractsDone++;
  if (S.stats.contractsDone >= 10) feat('contracts10');
  S.contracts.splice(i, 1, makeContract());
  save();
  return { gold: c.gold * mult, souls: c.souls };
}
export function rerollContract(id: number): boolean {
  const cost = nice(maxBet() * 2);
  const i = S.contracts.findIndex(c => c.id === id);
  if (i < 0 || S.gold < cost) return false;
  S.gold -= cost; S.contracts.splice(i, 1, makeContract()); save(); return true;
}
export const rerollCost = (): number => nice(maxBet() * 2);

/* ---------------- tithe, loans, relics, pacts, freedom ---------------- */
export const TITHE_SLICES = [4, 6, 8, 5, 12, 6, 20, 5, 8, 40];
export function claimTithe(): { slice: number; gold: number; souls: number } | null {
  if (!titheReady()) return null;
  const slice = randInt(TITHE_SLICES.length);
  const gold = nice(maxBet() * TITHE_SLICES[slice] * (1 + relic('purse') * 0.3));
  const souls = rnd() < 0.35 ? 1 : 0;
  S.lastTithe = Date.now(); S.gold += gold; S.souls += souls; save();
  return { slice, gold, souls };
}
export const canBorrow = (): boolean => !S.loan && S.gold < minBet() && !roundActive;
export const loanAmount = (): number => Math.max(200, nice(maxBet() * 10));
export function borrow(): number {
  if (!canBorrow()) return 0;
  const a = loanAmount();
  S.loan = { principal: a, owed: Math.round(a * (1 + loanInterest())) };
  S.gold += a; S.stats.loans++; feat('loan'); save();
  return a;
}
export function repayLoan(): boolean {
  if (!S.loan || S.gold < S.loan.owed) return false;
  S.gold -= S.loan.owed; S.loan = null; feat('repaid'); save(); return true;
}
export function buyRelic(id: RelicId): boolean {
  const r = RELICS.find(x => x.id === id)!;
  const lvl = relic(id);
  if (lvl >= r.max || S.souls < r.cost[lvl]) return false;
  S.souls -= r.cost[lvl]; S.relics[id] = lvl + 1; feat('relic'); save(); return true;
}
export function signPact(id: PactId): boolean {
  const p = PACTS.find(x => x.id === id)!;
  if (S.pact || S.souls < p.cost) return false;
  S.souls -= p.cost; S.pact = { id, left: p.rounds }; feat('pact'); save(); return true;
}
export function buyFreedom(): boolean {
  if (S.gold < soulPrice()) return false;
  feat('freedom');
  const keep = { relics: S.relics, feats: S.feats, settings: S.settings, games: S.games, souls: S.souls };
  const cycle = S.cycle + 1, sigils = S.sigils + 1;
  const fresh = freshSave();
  S = { ...fresh, ...keep, cycle, sigils, intro: true, stats: { ...fresh.stats, started: S.stats.started, contractsDone: S.stats.contractsDone } };
  S.gold = nice(500 * sigilMult());
  save();
  return true;
}
/** Remembered stake for a game, clamped to the current limits. */
export function betFor(game: GameId): number {
  const b = S.bets[game] ?? minBet() * 5;
  return Math.min(maxBet(), Math.max(minBet(), b));
}
export function setBet(game: GameId, v: number): void { S.bets[game] = v; persist(S); }
export function variantFor(game: GameId, def: string): string { return S.variants[game] ?? def; }
export function setVariant(game: GameId, v: string): void { S.variants[game] = v; persist(S); }

/* ---------------- host favor ---------------- */
export const arcStage = (f: FloorId): number => S.arc[f] ?? 0;
/** The next story stage the player has earned but not yet heard, if any. */
export function pendingArc(f: FloorId): typeof HOST_ARCS[FloorId][number] | null {
  const st = HOST_ARCS[f][arcStage(f)];
  return st && (S.favor[f] ?? 0) >= st.at ? st : null;
}
export function claimArc(f: FloorId): { gold: number; souls: number } | null {
  const st = pendingArc(f);
  if (!st) return null;
  const gold = nice(maxBet() * st.gold);
  S.gold += gold; S.souls += st.souls; S.arc[f] = arcStage(f) + 1; save();
  return { gold, souls: st.souls };
}
export function hostTitle(f: FloorId): string { const n = arcStage(f); return n ? HOST_ARCS[f][n - 1].title : 'Stranger'; }
export { hotGame };
