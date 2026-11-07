import { h, clear } from './dom';
import { sfx } from './audio';
import { burst, floatText, bigWin, centerOf, shake, flash, flyCoins } from './fx';
import { hotGame } from '../core/content';
import { goldIcon, toast, icon, modal } from './ui';
import * as E from '../core/economy';
import type { GameDef } from '../core/content';

/** What every game screen receives. */
export interface GameCtx {
  def: GameDef;
  stage: HTMLElement;         // scrollable centre area
  controls: HTMLElement;      // area above the bet bar for game buttons
  result: HTMLElement;
  bet(): number;
  setBet(v: number): void;
  lockBet(on: boolean): void;
  busy(on: boolean): void;    // blocks leaving + bet changes
  variants<T extends string>(opts: { id: T; label: string }[], def: T, onChange: (v: T) => void): T;
  wager(stake: number, extra?: boolean): boolean;
  settle(stake: number, payout: number, anchor?: Element | null, quiet?: boolean): E.Settled;
  say(text: string, cls?: '' | 'win' | 'lose'): void;
  root: HTMLElement;
  addCleanup(f: () => void): void;
  lockVariants?(on: boolean): void;
}
export type GameMount = (ctx: GameCtx) => void | (() => void);

const LADDER = [1, 2, 3, 5, 10, 15, 20, 25, 50, 75, 100, 150, 200, 250, 500, 750];
function ladder(): number[] {
  const out: number[] = [];
  const lo = E.minBet(), hi = E.maxBet();
  for (let p = 1; p <= 1e12; p *= 1000) for (const v of LADDER) { const x = v * p; if (x >= lo && x <= hi) out.push(x); }
  if (!out.includes(hi)) out.push(hi);
  if (!out.includes(lo)) out.unshift(lo);
  return [...new Set(out)].sort((a, b) => a - b);
}

export function buildGameShell(def: GameDef, mount: GameMount, onBack: () => void): HTMLElement {
  let bet = E.betFor(def.id);
  let isBusy = false;
  const cleanups: (() => void)[] = [];
  const betVal = h('span', {}, E.fmt(bet));
  const variantsBar = h('div', 'variants');
  const stage = h('div', 'stage-inner');
  const controls = h('div', 'actions');
  const result = h('div', 'result-line');
  const minus = h('button', { class: 'stepbtn', onclick: () => step(-1) }, '−');
  const plus = h('button', { class: 'stepbtn', onclick: () => step(1) }, '+');
  const half = h('button', { class: 'stepbtn', onclick: () => setBet(bet / 2) }, '½');
  const dbl = h('button', { class: 'stepbtn', onclick: () => setBet(bet * 2) }, '×2');
  const max = h('button', { class: 'stepbtn', onclick: () => setBet(Math.min(E.maxBet(), E.S.gold)) }, 'MAX');
  const betbar = h('div', 'betbar', minus, half, h('div', 'betbox', h('span', 'bet-label', 'Stake'), goldIcon(18), betVal), dbl, plus, max);
  const ctrlWrap = h('div', 'controls', result, controls, betbar);
  const back = h('button', { class: 'icon-btn', 'aria-label': 'Back to the floor', onclick: () => { if (isBusy) { toast(['Finish the round first.']); return; } leave(); } }, icon('i_back', 22));
  const info = h('button', { class: 'icon-btn', 'aria-label': 'How to play', onclick: () => modal(close => [h('h3', 'm-title', def.name), h('p', 'm-text', def.how), h('p', 'm-note', `Return to player ${def.rtp} · table limit ${E.fmt(E.minBet())}–${E.fmt(E.maxBet())}`), h('button', { class: 'btn gold wide', onclick: close }, 'Got it')]) }, icon('i_info', 22));
  const stageBox = h('div', 'stage panel', stage);
  const title = h('div', 'g-title', h('h1', {}, def.name), def.id === hotGame() ? h('div', 'g-hot', 'Hot table · double infamy') : null);
  const root = h('div', 'game', h('div', 'g-head', back, title, info), variantsBar, stageBox, ctrlWrap);
  root.dataset.floor = def.floor;
  function leave(): void { cleanups.forEach(f => f()); E.endRound(); onBack(); }
  function setBet(v: number): void {
    const L = ladder();
    v = Math.max(E.minBet(), Math.min(E.maxBet(), v));
    // snap to the nearest ladder value at or below
    const snapped = L.filter(x => x <= v + 1e-9).pop() ?? L[0];
    bet = snapped; betVal.textContent = E.fmt(bet); E.setBet(def.id, bet); sfx.play('chip', 0.4);
  }
  function step(d: number): void {
    const L = ladder();
    const i = L.findIndex(x => x >= bet - 1e-9);
    setBet(L[Math.max(0, Math.min(L.length - 1, (i < 0 ? L.length - 1 : i) + d))]);
  }
  const ctx: GameCtx = {
    def, stage, controls, result, root,
    bet: () => bet,
    setBet,
    lockBet: on => ctrlWrap.classList.toggle('locked-ui', on),
    busy: on => { isBusy = on; ctrlWrap.classList.toggle('locked-ui', on); },
    variants: (opts, d, onChange) => {
      clear(variantsBar);
      let cur = E.variantFor(def.id, d) as typeof d;
      if (!opts.some(o => o.id === cur)) cur = d;
      for (const o of opts) {
        const b = h('button', { class: 'chip-v' + (o.id === cur ? ' on' : ''), onclick: () => {
          if (isBusy) { toast(['Finish the round first.']); return; }
          cur = o.id; E.setVariant(def.id, o.id);
          variantsBar.querySelectorAll('.chip-v').forEach(x => x.classList.remove('on')); b.classList.add('on');
          sfx.click(); onChange(o.id);
        } }, o.label);
        variantsBar.append(b);
      }
      return cur;
    },
    wager: (stake, extra = false) => {
      if (stake > E.S.gold + 1e-9) {
        toast([E.canBorrow() ? 'Not enough gold. The Proprietor offers a loan in the Ledger.' : 'Not enough gold. Lower your stake.'], 'danger');
        shake(betbar);
        return false;
      }
      const ok = E.wager(def.id, stake, extra);
      if (ok) sfx.play('chip', 0.6);
      return ok;
    },
    settle: (stake, payout, anchor, quiet) => {
      const r = E.settle(def.id, stake, payout);
      const [x, y] = anchor ? centerOf(anchor) : [innerWidth / 2, innerHeight * 0.45];
      if (r.paid > stake) {
        if (!quiet) {
          floatText(x, y, '+' + E.fmt(r.paid), 'gold');
          flyCoins(x, y, Math.min(24, 6 + Math.round(Math.log2(r.mult + 1) * 4)));
          stageBox.classList.remove('won'); void stageBox.offsetWidth; stageBox.classList.add('won');
          burst(x, y, { n: Math.min(30, 10 + Math.round(r.mult * 2)) });
          sfx.win(Math.min(4, Math.ceil(Math.log2(r.mult + 1))));
        }
        if (r.mult >= 10) setTimeout(() => void bigWin(r.mult, r.paid), 350);
        if (r.loanCut > 0) setTimeout(() => floatText(x, y + 40, `−${E.fmt(r.loanCut)} to the Proprietor`, 'red'), 500);
      } else if (r.paid > 0 && r.paid === stake) {
        if (!quiet) floatText(x, y, 'push', 'gold');
      } else if (!quiet) {
        sfx.lose();
        if (r.paid === 0 && stake >= E.maxBet() * 0.5) flash();
      }
      return r;
    },
    say: (text, cls = '') => { result.textContent = text; result.className = 'result-line ' + cls; },
    busy_: false,
    addCleanup: f => cleanups.push(f),
  } as GameCtx & { busy_: boolean };
  const un = mount(ctx);
  if (un) cleanups.push(un);
  return root;
}
