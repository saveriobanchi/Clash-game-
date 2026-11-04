import { describe, it, expect, beforeAll } from 'vitest';
import { setRng, seeded, choose } from '../src/core/rng';
import * as S from '../src/core/games/simple';
import { MACHINES, simulateMachine } from '../src/core/games/slots';
import { BlackjackRound, basicStrategy, BJ_RULES, BjVariant } from '../src/core/games/blackjack';
import { Shoe } from '../src/core/cards';
import { playBaccarat, BAC_PAYS, cursedStraightRtp, vpEvaluate, hiloStep, hiloP, SKULL_P } from '../src/core/games/table';

beforeAll(() => setRng(seeded(7)));
const band = (v: number, lo: number, hi: number) => { expect(v).toBeGreaterThanOrEqual(lo); expect(v).toBeLessThanOrEqual(hi); };

describe('returns stay between 93% and 99.9%', () => {
  it('coin and dice', () => {
    band(S.COIN.classic.pay * 0.5, 0.97, 0.99);
    band(S.COIN.cursed.side * 0.49, 0.96, 0.99);
    band(S.COIN.cursed.edge * 0.02, 0.95, 0.99);
    for (const c of [0.01, 0.1, 0.5, 0.9, 0.98]) band(S.diceMultiplier(c) * c, 0.98, 0.986);
  });
  it('triple bones', () => {
    const bets: S.TripleBet[] = [{ kind: 'small' }, { kind: 'big' }, { kind: 'anyTriple' }, { kind: 'triple', n: 6 }];
    for (let n = 4; n <= 17; n++) bets.push({ kind: 'total', n });
    for (const b of bets) band(S.triplePay(b) * S.tripleProb(b), 0.94, 0.975);
  });
  it('mines, tower, chalices are below 97%', () => {
    for (const bad of [1, 3, 10, 24]) for (let k = 1; k <= 25 - bad; k++) {
      const p = choose(25 - bad, k) / choose(25, k);
      band(S.minesMult(25, bad, k) * p, 0.9, 0.9701);
    }
    for (const m of Object.keys(S.TOWER_MODES) as S.TowerMode[]) for (let l = 1; l <= S.TOWER_LEVELS; l++) {
      const md = S.TOWER_MODES[m]; const p = Math.pow((md.doors - md.bad) / md.doors, l);
      band(S.towerMult(m, l) * p, 0.95, 0.9701);
    }
  });
  it('crash', () => {
    let ret = 0; const N = 200000, target = 2;
    for (let i = 0; i < N; i++) if (S.crashPoint() >= target) ret += target;
    band(ret / N, 0.95, 0.99);
  });
  it('plinko, keno, wheel, scratch', () => {
    for (const r of S.PLINKO_ROWS) for (const k of ['low', 'mid', 'high'] as const) band(S.plinkoRtp(r, k), 0.97, 0.981);
    for (let p = 1; p <= 10; p++) band(S.kenoRtp(p), 0.95, 0.961);
    for (const k of ['low', 'mid', 'high'] as const) band(S.wheelRtp(k), 0.96, 0.971);
    for (const t of S.SCRATCH_TIERS) band(S.scratchRtp(t), 0.94, 0.96);
  });
  it('scratch tickets show exactly the drawn prize', () => {
    for (let i = 0; i < 3000; i++) {
      const t = S.SCRATCH_TIERS[i % 3];
      const { prizeIdx, grid } = S.scratchTicket(t);
      const counts = new Map<number, number>();
      grid.forEach(g => counts.set(g, (counts.get(g) ?? 0) + 1));
      const triples = [...counts.entries()].filter(([, c]) => c >= 3).map(([k]) => k);
      expect(triples).toEqual(prizeIdx >= 0 ? [prizeIdx] : []);
    }
  });
  it('derby odds', () => {
    for (let i = 0; i < 200; i++) for (const r of S.newRace()) expect(r.odds * r.p).toBeLessThanOrEqual(0.951);
  });
  it('slots (simulated)', () => {
    for (const m of MACHINES) band(simulateMachine(m, 150000), 0.93, 0.99);
  });
  it('roulette', () => { band(36 / 37, 0.97, 0.98); band(cursedStraightRtp(), 0.96, 0.975); });
  it('hi-lo steps', () => {
    for (let r = 1; r <= 13; r++) for (const d of ['hi', 'lo'] as const) {
      band(hiloStep(r, d, false) * hiloP(r, d), 0.98, 0.9901);
      band(hiloStep(r, d, true) * hiloP(r, d) * (1 - SKULL_P), 0.98, 0.9901);
    }
  });
});

describe('card games', () => {
  const bj = (v: BjVariant) => {
    const shoe = new Shoe(6);
    let staked = 0, ret = 0;
    for (let i = 0; i < 120000; i++) {
      const r = new BlackjackRound(shoe, v, 1);
      staked += 1;
      while (!r.finished) {
        const a = basicStrategy(r.hand.cards, r.dealer[0], r.canDouble(), r.canSplit());
        staked += r.act(a);
      }
      ret += r.settle().reduce((a, b) => a + b, 0);
    }
    return ret / staked;
  };
  it('blackjack classic ~99%+', () => band(bj('classic'), 0.975, 1.005));
  it('blackjack hellfire', () => { expect(BJ_RULES.hellfire.bjPay).toBe(3); band(bj('hellfire'), 0.97, 1.0); });
  it('baccarat', () => {
    const shoe = new Shoe(8);
    let p = 0, b = 0, t = 0; const N = 200000;
    for (let i = 0; i < N; i++) {
      const r = playBaccarat(shoe);
      if (r.winner === 'player') p += BAC_PAYS.player; else if (r.winner === 'banker') b += BAC_PAYS.banker; else { t += BAC_PAYS.tie; p += 1; b += 1; }
    }
    band(p / N, 0.98, 0.995); band(b / N, 0.98, 0.995); band(t / N, 0.8, 0.9);
  });
  it('video poker evaluator', () => {
    const h = (s: string) => s.split(' ').map(x => ({ r: '23456789TJQKA'.indexOf(x[0]) + 2, s: x[1] as 's' }));
    expect(vpEvaluate(h('Ts Js Qs Ks As'))).toBe(0);
    expect(vpEvaluate(h('As 2s 3s 4s 5s'))).toBe(1);
    expect(vpEvaluate(h('9h 9s 9d 9c 2s'))).toBe(2);
    expect(vpEvaluate(h('9h 9s 9d 2c 2s'))).toBe(3);
    expect(vpEvaluate(h('Ah 2d 3s 4c 5s'))).toBe(5);
    expect(vpEvaluate(h('Jh Jd 3s 4c 5s'))).toBe(8);
    expect(vpEvaluate(h('Th Td 3s 4c 5s'))).toBe(-1);
  });
});
