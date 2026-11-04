import { describe, it, expect, beforeAll } from 'vitest';
import { setRng, seeded } from '../src/core/rng';
import * as E from '../src/core/economy';
import { diceMultiplier, rollD100 } from '../src/core/games/simple';

beforeAll(() => setRng(seeded(3)));

describe('economy', () => {
  it('wagers, settles and ranks up', () => {
    E.resetAll();
    expect(E.S.gold).toBe(500);
    expect(E.wager('dice', 10)).toBe(true);
    expect(E.S.gold).toBe(490);
    E.settle('dice', 10, 19.7);
    expect(E.S.gold).toBeCloseTo(509.7);
    expect(E.wager('dice', 1e9)).toBe(false);
  });
  it('a steady player climbs ranks over a long session without the bankroll exploding', () => {
    E.resetAll();
    E.ensureContracts();
    let rounds = 0;
    while (rounds < 3000) {
      if (E.S.gold < E.minBet()) { if (E.canBorrow()) E.borrow(); else break; }
      const stake = Math.min(E.S.gold, Math.max(E.minBet(), Math.floor(E.maxBet() / 4)));
      if (!E.wager('dice', stake)) break;
      const won = rollD100() > 50.5;
      E.settle('dice', stake, won ? stake * diceMultiplier(0.495) : 0);
      for (const c of E.S.contracts) if (c.progress >= c.target) E.claimContract(c.id);
      rounds++;
    }
    expect(E.S.rank).toBeGreaterThanOrEqual(8);
    expect(E.S.rank).toBeLessThan(40);
    expect(E.S.contracts.length).toBe(3);
  });
  it('loans are only offered to the broke and take a share of wins', () => {
    E.resetAll();
    E.S.gold = 0;
    expect(E.canBorrow()).toBe(true);
    const a = E.borrow();
    expect(a).toBeGreaterThan(0);
    expect(E.canBorrow()).toBe(false);
    const owed = E.S.loan!.owed;
    E.wager('coin', 10); E.settle('coin', 10, 20);
    expect(E.S.loan!.owed).toBeCloseTo(owed - 6);
  });
  it('relics and pacts cost souls', () => {
    E.resetAll();
    E.S.souls = 3;
    expect(E.buyRelic('tooth')).toBe(true);
    expect(E.relic('tooth')).toBe(1);
    expect(E.signPact('avarice')).toBe(false);
    expect(E.signPact('hunger')).toBe(true);
  });
  it('redeeming the soul resets with a sigil', () => {
    E.resetAll();
    E.S.gold = E.soulPrice();
    expect(E.buyFreedom()).toBe(true);
    expect(E.S.sigils).toBe(1);
    expect(E.S.cycle).toBe(1);
    expect(E.maxBet()).toBeGreaterThan(25);
  });
});
