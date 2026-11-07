import { h, clear, sleep } from '../dom';
import { px } from '../px';
import { sfx } from '../audio';
import { burst, shake, flash, centerOf, floatText } from '../fx';
import { GameMount, GameCtx } from '../shell';
import { Shoe, Card, cardId } from '../../core/cards';
import { BlackjackRound, handTotal, basicStrategy, BJ_RULES, BjVariant, isBlackjack } from '../../core/games/blackjack';
import * as T from '../../core/games/table';
import { S, fmt, feat } from '../../core/economy';
import { cardEl, mfmt, btn } from './common';
import { rnd } from '../../core/rng';
import { toast } from '../ui';

/* ============================ BLACKJACK ============================ */
export const blackjackGame: GameMount = ctx => {
  let v: BjVariant = ctx.variants<BjVariant>([{ id: 'classic', label: 'Classic 3:2' }, { id: 'hellfire', label: 'Hellfire' }], 'classic', x => { v = x; rules.textContent = BJ_RULES[v].label; });
  const shoe = new Shoe(6);
  const eye = (S.relics.eye ?? 0) > 0;
  const dealerRow = h('div', 'cardrow'), dealerTot = h('div', 'label-gold', 'Dealer');
  const handsBox = h('div', 'bj-hands');
  const rules = h('div', 'muted small', { style: { textAlign: 'center' } }, BJ_RULES[v].label);
  const hint = h('div', 'small', { style: { color: 'var(--teal)', minHeight: '1.2em' } });
  let pairOn = false;
  const pairBtn = h('button', { class: 'side-bet', onclick: () => { if (round && !round.finished) return; pairOn = !pairOn; pairBtn.classList.toggle('on', pairOn); sfx.play('chip', 0.5); updPair(); } });
  const updPair = () => { pairBtn.replaceChildren(h('b', {}, 'Blood Pair'), h('span', {}, pairOn ? `on · ${fmt(sideStake())} · pairs pay up to 25:1` : 'side bet off · tap to wager a fifth')); };
  const sideStake = () => Math.max(1, Math.round(ctx.bet() / 5));
  updPair();
  ctx.stage.append(h('div', 'felt', dealerTot, dealerRow, h('div', { style: { height: '14px' } }), handsBox), pairBtn, rules, hint);
  let sidePaid = 0;
  let round: BlackjackRound | null = null;
  let staked = 0;
  function drawTable(revealAll: boolean): void {
    if (!round) return;
    clear(dealerRow);
    round.dealer.forEach((c, i) => { const e = cardEl(i === 1 && !revealAll ? null : c, 'card-img'); dealerRow.append(e); });
    dealerTot.textContent = !round.dealer.length ? 'Dealer' : revealAll ? `Dealer · ${handTotal(round.dealer).total}` : `Dealer · ${handTotal([round.dealer[0]]).total}`;
    clear(handsBox);
    round.hands.forEach((hd, i) => {
      const row = h('div', 'cardrow');
      hd.cards.forEach(c => row.append(cardEl(c, 'card-img')));
      const t = handTotal(hd.cards);
      const label = h('div', 'label-gold', `${round!.hands.length > 1 ? `Hand ${i + 1} · ` : ''}${t.soft && t.total < 21 ? 'soft ' : ''}${t.total}${t.total > 21 ? ' · bust' : ''} · ${fmt(hd.stake)}`);
      const box = h('div', 'bj-hand' + (i === round!.active && !round!.finished ? ' active' : ''), row, label);
      handsBox.append(box);
    });
  }
  async function deal(): Promise<void> {
    const stake = ctx.bet();
    if (!ctx.wager(stake)) return;
    staked = stake; ctx.busy(true); ctx.say('');
    sidePaid = 0;
    let side = 0;
    if (pairOn) { side = sideStake(); if (ctx.wager(side, true)) staked += side; else side = 0; }
    round = new BlackjackRound(shoe, v, stake);
    if (side) {
      const c = round.hands[0].cards;
      sidePaid = side * T.bloodPair(c[0], c[1]);
      if (sidePaid) setTimeout(() => { floatText(...centerOf(handsBox), `Blood Pair +${fmt(sidePaid)}`, 'gold'); sfx.win(2); }, 1200);
    }
    // animate the deal
    const real = { d: round.dealer, p: round.hands[0].cards };
    round.dealer = []; round.hands[0].cards = [];
    for (const [arr, c] of [[round.hands[0].cards, real.p[0]], [round.dealer, real.d[0]], [round.hands[0].cards, real.p[1]], [round.dealer, real.d[1]]] as [Card[], Card][]) {
      arr.push(c); drawTable(false); const last = (arr === round.dealer ? dealerRow : handsBox).querySelectorAll('.card-img'); last[last.length - 1]?.classList.add('deal'); sfx.play('card', 0.7); await sleep(260);
    }
    if (round.finished) return finish();
    render();
  }
  async function act(a: 'hit' | 'stand' | 'double' | 'split'): Promise<void> {
    if (!round || round.finished) return;
    if (a === 'double' || a === 'split') {
      if (!ctx.wager(round.hand.stake, true)) return;
      staked += round.hand.stake;
    }
    const before = round.hand.cards.length;
    round.act(a);
    sfx.play(a === 'stand' ? 'chip' : 'card', 0.7);
    drawTable(false);
    if (a !== 'stand' && round.hands[0].cards.length > before) handsBox.querySelector('.bj-hand:last-child .card-img:last-child')?.classList.add('deal');
    if (round.finished) { await sleep(300); return finish(); }
    render();
  }
  async function finish(): Promise<void> {
    if (!round) return;
    clear(ctx.controls); hint.textContent = '';
    // reveal dealer and their draws one by one
    const full = [...round.dealer];
    round.dealer = full.slice(0, 2);
    drawTable(true); sfx.play('slide', 0.6);
    for (let i = 2; i < full.length; i++) { await sleep(420); round.dealer.push(full[i]); drawTable(true); dealerRow.lastElementChild?.classList.add('deal'); sfx.play('card', 0.7); }
    await sleep(300);
    const pays = round.settle();
    const total = pays.reduce((a, b) => a + b, 0) + sidePaid;
    if (round.hands.some((hd, i) => hd.cards.length >= 5 && pays[i] > hd.stake && v === 'hellfire')) feat('charlie');
    const r = ctx.settle(staked, total, handsBox);
    const pBJ = isBlackjack(round.hands[0].cards) && round.hands.length === 1;
    ctx.say(pBJ && total > staked ? 'Blackjack!' : total > staked ? `You win ${fmt(r.paid)}.` : total === staked ? 'Push.' : handTotal(round.dealer).total === 21 && round.dealer.length === 2 ? 'Dealer blackjack.' : 'The house wins.', total > staked ? 'win' : total === staked ? '' : 'lose');
    if (total < staked) shake(handsBox, 0.6);
    ctx.busy(false);
    render();
  }
  function render(): void {
    clear(ctx.controls);
    if (!round || round.finished) { ctx.controls.append(btn('Deal', 'blood big', () => void deal())); return; }
    const d = btn('Double', '', () => void act('double')); if (!round.canDouble()) d.disabled = true;
    const sp = btn('Split', '', () => void act('split')); if (!round.canSplit()) sp.disabled = true;
    ctx.controls.append(btn('Hit', 'blood', () => void act('hit')), btn('Stand', 'blood', () => void act('stand')), d, sp);
    if (eye) { const a = basicStrategy(round.hand.cards, round.dealer[0], round.canDouble(), round.canSplit()); hint.textContent = `Carrion whispers: ${a}.`; }
  }
  render();
};

/* ============================ WHEEL OF THORNS ============================ */
export const rouletteGame: GameMount = ctx => {
  type V = 'euro' | 'devil';
  let v: V = ctx.variants<V>([{ id: 'euro', label: 'European' }, { id: 'devil', label: "Devil's wheel" }], 'euro', x => { v = x; clearBets(); });
  const cv = h('canvas', { class: 'wheel-cv' }); cv.width = cv.height = 520;
  const g = cv.getContext('2d')!;
  const board = h('div', 'rl-board');
  const totalEl = h('div', 'label-gold', 'No bets');
  const lastRow = h('div', 'rl-last');
  ctx.stage.append(cv, lastRow, board, totalEl);
  const bets = new Map<string, { b: T.RouletteBet; amt: number; el: HTMLElement }>();
  let curses = new Map<number, number>();
  let wheelRot = 0, ballA = 0, ballR = 0.86, spinning = false;
  const last: number[] = [];
  const N = 37, seg = (Math.PI * 2) / N;
  function drawWheel(): void {
    const c = 260;
    g.clearRect(0, 0, 520, 520);
    g.save(); g.translate(c, c);
    // rim
    const rim = g.createRadialGradient(0, 0, 200, 0, 0, 258); rim.addColorStop(0, '#34172c'); rim.addColorStop(0.6, '#c99032'); rim.addColorStop(0.8, '#fff4d0'); rim.addColorStop(1, '#5c1a35');
    g.fillStyle = rim; g.beginPath(); g.arc(0, 0, 258, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0c0710'; g.beginPath(); g.arc(0, 0, 232, 0, Math.PI * 2); g.fill();
    g.rotate(wheelRot);
    T.WHEEL_ORDER.forEach((n, i) => {
      const a0 = i * seg - Math.PI / 2 - seg / 2;
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 224, a0, a0 + seg); g.closePath();
      const cursed = curses.has(n);
      g.fillStyle = n === 0 ? '#174f30' : T.RED.has(n) ? '#9a1f37' : '#1c0e1a'; g.fill();
      if (cursed) { g.fillStyle = 'rgba(255,195,90,.45)'; g.fill(); }
      g.strokeStyle = '#c99032'; g.lineWidth = 1.5; g.stroke();
      g.save(); g.rotate(a0 + seg / 2 + Math.PI / 2); g.fillStyle = cursed ? '#fff4d0' : '#e6d5b0'; g.font = '24px "Jersey 15", monospace'; g.textAlign = 'center'; g.fillText(String(n), 0, -196); g.restore();
    });
    // inner cone
    const cone = g.createRadialGradient(-20, -20, 10, 0, 0, 150); cone.addColorStop(0, '#5c1a35'); cone.addColorStop(1, '#1c0e1a');
    g.fillStyle = cone; g.beginPath(); g.arc(0, 0, 150, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c99032'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 150, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 4; i++) { g.save(); g.rotate((i * Math.PI) / 2); g.fillStyle = '#c99032'; g.fillRect(-6, -130, 12, 110); g.restore(); }
    g.fillStyle = '#ffc35a'; g.beginPath(); g.arc(0, 0, 26, 0, Math.PI * 2); g.fill();
    g.restore();
    // ball
    g.save(); g.translate(c, c);
    const bx = Math.cos(ballA) * 232 * ballR, by = Math.sin(ballA) * 232 * ballR;
    const bg = g.createRadialGradient(bx - 4, by - 4, 1, bx, by, 11); bg.addColorStop(0, '#fff4d0'); bg.addColorStop(1, '#9a8796');
    g.fillStyle = bg; g.beginPath(); g.arc(bx, by, 10, 0, Math.PI * 2); g.fill();
    g.restore();
    // curse labels
    if (curses.size) {
      g.font = '28px "Jersey 15", monospace'; g.textAlign = 'center'; g.fillStyle = '#f6d27a';
      g.fillText([...curses].map(([n, m]) => `${n}: ×${m}`).join('   '), c, 300);
    }
  }
  drawWheel();
  const cell = (b: T.RouletteBet, label: string, cls: string) => {
    const el = h('button', { class: 'rl-cell ' + cls }, h('span', {}, label));
    el.onclick = () => {
      if (spinning) return;
      const key = T.betKey(b);
      const cur = bets.get(key);
      const amt = ctx.bet();
      const total = [...bets.values()].reduce((s, x) => s + x.amt, 0);
      if (total + amt > S.gold) { toast(['Not enough gold for that chip.'], 'blood'); return; }
      if (cur) cur.amt += amt; else bets.set(key, { b, amt, el });
      let chip = el.querySelector('.rl-chip') as HTMLElement | null;
      if (!chip) { chip = h('div', 'rl-chip'); el.append(chip); }
      chip.textContent = fmt(bets.get(key)!.amt);
      sfx.play('chip', 0.6); updTotal();
    };
    return el;
  };
  const nums = h('div', 'rl-nums');
  nums.append(cell({ t: 'n', n: 0 }, '0', 'green zero'));
  for (let n = 1; n <= 36; n++) nums.append(cell({ t: 'n', n }, String(n), T.RED.has(n) ? 'red' : 'black'));
  const outs = h('div', 'rl-outs',
    cell({ t: 'low' }, '1–18', ''), cell({ t: 'even' }, 'Even', ''), cell({ t: 'red' }, '◆', 'red'), cell({ t: 'black' }, '◆', 'black'), cell({ t: 'odd' }, 'Odd', ''), cell({ t: 'high' }, '19–36', ''),
    cell({ t: 'dozen', d: 1 }, '1st 12', 'w2'), cell({ t: 'dozen', d: 2 }, '2nd 12', 'w2'), cell({ t: 'dozen', d: 3 }, '3rd 12', 'w2'),
    cell({ t: 'col', c: 1 }, 'Col 1', 'w2'), cell({ t: 'col', c: 2 }, 'Col 2', 'w2'), cell({ t: 'col', c: 3 }, 'Col 3', 'w2'));
  board.append(nums, outs);
  function updTotal(): void { const t = [...bets.values()].reduce((s, x) => s + x.amt, 0); totalEl.textContent = t ? `Total on the felt: ${fmt(t)}` : v === 'devil' ? 'Straight-ups pay 29:1 — or ×50 to ×500 when cursed' : 'Tap the felt to place chips'; }
  function clearBets(): void { bets.forEach(x => x.el.querySelector('.rl-chip')?.remove()); bets.clear(); curses = new Map(); drawWheel(); updTotal(); }
  async function spin(): Promise<void> {
    if (spinning) return;
    const total = [...bets.values()].reduce((s, x) => s + x.amt, 0);
    if (!total) { toast(['Place a chip on the felt first.']); return; }
    if (!ctx.wager(total)) return;
    spinning = true; ctx.busy(true); ctx.say('');
    if (v === 'devil') {
      curses = T.drawCurses();
      sfx.doom(); flash('rgba(255,195,90,.25)');
      drawWheel();
      ctx.say('Cursed: ' + [...curses].map(([n, m]) => `${n} ×${m}`).join(' · '), 'win');
      await sleep(1100);
    }
    const result = T.spinRoulette();
    const idx = T.WHEEL_ORDER.indexOf(result);
    sfx.whoosh();
    const dur = 5200, t0 = performance.now();
    const w0 = wheelRot, wTurn = Math.PI * 2 * 2.5;
    const finalWheel = w0 + wTurn;
    // ball lands at angle where pocket idx sits after the wheel's final rotation
    const pocketAngle = finalWheel + idx * seg - Math.PI / 2;
    const b0 = ballA, bTurns = -Math.PI * 2 * 6;
    const bFinal = pocketAngle + Math.ceil((b0 + bTurns - pocketAngle) / (Math.PI * 2)) * Math.PI * 2;
    let lastTick = 0;
    await new Promise<void>(res => {
      const f = (now: number) => {
        const t = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - t, 3);
        wheelRot = w0 + wTurn * e;
        ballA = b0 + (bFinal - b0) * (1 - Math.pow(1 - t, 2.2));
        ballR = t < 0.65 ? 0.98 : 0.98 - (t - 0.65) / 0.35 * 0.2 + (t > 0.7 && t < 0.9 ? Math.abs(Math.sin(t * 60)) * 0.03 : 0);
        if (t > 0.65) { const k = Math.floor(t * 40); if (k !== lastTick) { lastTick = k; sfx.tick(k); } }
        drawWheel();
        if (t < 1) requestAnimationFrame(f); else res();
      };
      requestAnimationFrame(f);
    });
    sfx.play('chip', 0.8, 1.4);
    let payout = 0, cursedHit = false;
    for (const { b, amt } of bets.values()) {
      if (!T.betCovers(b, result)) continue;
      if (b.t === 'n' && v === 'devil' && curses.has(result)) { payout += amt * curses.get(result)!; cursedHit = true; }
      else payout += amt * T.betPays(b, v === 'devil');
    }
    if (cursedHit) feat('cursed_hit');
    last.unshift(result); if (last.length > 12) last.pop();
    clear(lastRow); last.forEach((n, i) => lastRow.append(h('span', { class: 'rl-dot ' + (n === 0 ? 'green' : T.RED.has(n) ? 'red' : 'black') + (i === 0 ? ' now' : '') }, String(n))));
    ctx.settle(total, payout, cv);
    ctx.say(`${result} ${result === 0 ? 'green' : T.RED.has(result) ? 'red' : 'black'}${payout > 0 ? ` — you take ${fmt(payout)}` : ''}`, payout > total ? 'win' : payout ? '' : 'lose');
    spinning = false; ctx.busy(false);
  }
  updTotal();
  ctx.controls.append(btn('Clear', 'ghost', clearBets), btn('Spin', 'blood big', () => void spin()));
};

/* ============================ JACKS OF THE DAMNED ============================ */
export const pokerGame: GameMount = ctx => {
  type V = 'job' | 'deuces';
  let v: V = ctx.variants<V>([{ id: 'job', label: 'Jacks or Better 9/6' }, { id: 'deuces', label: 'Deuces Wild' }], 'job', x => { v = x; drawPays(); });
  const pays = () => (v === 'job' ? T.VP_PAYS : T.DW_PAYS);
  const evaluate = (c: Card[]) => (v === 'job' ? T.vpEvaluate(c) : T.dwEvaluate(c));
  const eye = (S.relics.eye ?? 0) > 0;
  const table = h('div', 'vp-table');
  const drawPays = () => { clear(table); pays().forEach(([n, p]) => table.append(h('div', 'vp-row', h('span', {}, n), h('b', {}, '×' + p)))); if (v === 'deuces') table.append(h('div', 'vp-row wild', h('span', {}, 'All deuces are wild'), h('b', {}, '2♠'))); };
  drawPays();
  const row = h('div', 'vp-cards');
  const tip = h('div', 'small', { style: { color: 'var(--teal)', minHeight: '1.2em' } });
  ctx.stage.append(table, row, tip);
  let deck: Card[] = [], hand: Card[] = [], held = [false, false, false, false, false];
  let phase: 'idle' | 'hold' | 'double' = 'idle';
  let stake = 0, winAmt = 0, doubles = 0;
  function drawHand(anim: boolean[] = []): void {
    clear(row);
    hand.forEach((c, i) => {
      const e = cardEl(phase === 'idle' && !hand.length ? null : c, 'card-img vp');
      if (anim[i]) e.classList.add('flip');
      const wrap = h('button', { class: 'vp-slot' + (held[i] ? ' held' : '') + (v === 'deuces' && c.r === 2 && hand.length ? ' wildcard' : ''), onclick: () => { if (phase !== 'hold') return; held[i] = !held[i]; sfx.click(); drawHand(); } }, e, h('div', 'vp-held', 'HELD'));
      row.append(wrap);
    });
    if (!hand.length) for (let i = 0; i < 5; i++) row.append(h('div', 'vp-slot', cardEl(null, 'card-img vp')));
  }
  drawHand();
  function hl(idx: number): void { table.querySelectorAll('.vp-row').forEach((r, i) => r.classList.toggle('on', i === idx)); }
  async function deal(): Promise<void> {
    stake = ctx.bet();
    if (!ctx.wager(stake)) return;
    ctx.busy(true); ctx.say(''); hl(-1); ctx.lockVariants?.(true);
    deck = T.vpDeck(); hand = deck.splice(0, 5); held = [false, false, false, false, false];
    phase = 'hold';
    for (let i = 0; i < 5; i++) { drawHand([...Array(5)].map((_, k) => k === i)); sfx.play('card', 0.6); await sleep(90); }
    drawHand();
    const pre = evaluate(hand); if (pre >= 0) { hl(pre); }
    if (eye) { held = v === 'job' ? T.vpAdvice(hand) : T.dwAdvice(hand); tip.textContent = 'Sir Carrion has marked the cards he would keep.'; drawHand(); }
    render();
  }
  async function draw(): Promise<void> {
    const anim = held.map(x => !x);
    hand = hand.map((c, i) => (held[i] ? c : deck.shift()!));
    phase = 'idle';
    drawHand(anim); sfx.play('slide', 0.7);
    await sleep(350);
    const r = evaluate(hand);
    hl(r);
    tip.textContent = '';
    if (r === 0) feat('royal');
    if (r >= 0) {
      winAmt = stake * pays()[r][1];
      ctx.say(`${pays()[r][0]}! ${fmt(winAmt)}`, 'win');
      sfx.win(2); burst(...centerOf(row), { n: 20 });
      phase = 'double'; doubles = 0;
    } else {
      ctx.settle(stake, 0, row, true); sfx.lose();
      ctx.say(v === 'job' ? 'Nothing. The damned keep their jacks.' : 'Nothing. The deuces laugh.', 'lose'); ctx.busy(false);
    }
    render();
  }
  async function doubleUp(red: boolean): Promise<void> {
    const c = T.vpDeck()[0];
    const el = cardEl(c, 'card-img lg flip');
    clear(row); row.append(el); sfx.play('card', 0.8);
    await sleep(400);
    const isRed = c.s === 'h' || c.s === 'd';
    if (isRed === red) {
      winAmt *= 2; doubles++;
      ctx.say(`Doubled! ${fmt(winAmt)}`, 'win'); sfx.win(2);
      if (doubles >= 5) return collect();
    } else {
      ctx.settle(stake, 0, row); ctx.say('Lost it all to the colour.', 'lose'); shake(row); phase = 'idle'; ctx.busy(false); hand = []; drawHand();
    }
    render();
  }
  function collect(): void { ctx.settle(stake, winAmt, row); phase = 'idle'; ctx.busy(false); render(); }
  function render(): void {
    clear(ctx.controls);
    if (phase === 'idle') ctx.controls.append(btn('Deal', 'blood big', () => void deal()));
    else if (phase === 'hold') ctx.controls.append(btn('Draw', 'blood big', () => void draw()));
    else ctx.controls.append(btn('Red ×2', 'blood', () => void doubleUp(true)), btn(`Collect ${fmt(winAmt)}`, '', collect), btn('Black ×2', 'ghost', () => void doubleUp(false)));
  }
  render();
};

/* ============================ BACCARAT NOIR ============================ */
export const baccaratGame: GameMount = ctx => {
  ctx.variants([{ id: 'std', label: 'Punto Banco' }], 'std', () => undefined);
  const shoe = new Shoe(8);
  const pRow = h('div', 'cardrow'), bRow = h('div', 'cardrow');
  const pT = h('div', 'label-gold', 'Player'), bT = h('div', 'label-gold', 'Banker');
  const road = h('div', 'bead-road');
  const spots = h('div', 'bac-spots');
  ctx.stage.append(h('div', 'felt bac-felt', h('div', 'bac-side', pT, pRow), h('div', 'bac-side', bT, bRow)), spots, road);
  type Spot = 'player' | 'banker' | 'tie' | 'ppair' | 'bpair';
  const bets = new Map<Spot, number>();
  const spotEls = new Map<Spot, HTMLElement>();
  const defs: [Spot, string, string][] = [['ppair', 'P pair', '12×'], ['player', 'Player', '2×'], ['tie', 'Tie', '9×'], ['banker', 'Banker', '1.95×'], ['bpair', 'B pair', '12×']];
  for (const [id, label, pay] of defs) {
    const el = h('button', { class: `bac-spot ${id}`, onclick: () => {
      const amt = ctx.bet(); const tot = [...bets.values()].reduce((a, b) => a + b, 0);
      if (tot + amt > S.gold) { toast(['Not enough gold.'], 'blood'); return; }
      bets.set(id, (bets.get(id) ?? 0) + amt); sfx.play('chip', 0.6);
      (el.querySelector('.rl-chip') ?? el.appendChild(h('div', 'rl-chip'))).textContent = fmt(bets.get(id)!);
    } }, h('b', {}, label), h('span', {}, pay));
    spotEls.set(id, el); spots.append(el);
  }
  const history: string[] = [];
  let dealing = false;
  async function deal(): Promise<void> {
    if (dealing) return;
    const total = [...bets.values()].reduce((a, b) => a + b, 0);
    if (!total) { toast(['Place a bet first.']); return; }
    if (!ctx.wager(total)) return;
    dealing = true; ctx.busy(true); ctx.say(''); clear(pRow); clear(bRow); pT.textContent = 'Player'; bT.textContent = 'Banker';
    const r = T.playBaccarat(shoe);
    const order: [HTMLElement, Card][] = [[pRow, r.player[0]], [bRow, r.banker[0]], [pRow, r.player[1]], [bRow, r.banker[1]]];
    if (r.player[2]) order.push([pRow, r.player[2]]);
    if (r.banker[2]) order.push([bRow, r.banker[2]]);
    for (const [row, c] of order) {
      row.append(cardEl(c, 'card-img deal')); sfx.play('card', 0.7);
      pT.textContent = `Player · ${T.bacTotal([...pRow.querySelectorAll('img')].map(i => toCard(i.alt)))}`;
      bT.textContent = `Banker · ${T.bacTotal([...bRow.querySelectorAll('img')].map(i => toCard(i.alt)))}`;
      await sleep(450);
    }
    let pay = 0;
    const pPair = r.player[0].r === r.player[1].r, bPair = r.banker[0].r === r.banker[1].r;
    for (const [id, amt] of bets) {
      if (id === 'ppair' && pPair) pay += amt * T.BAC_PAYS.pair;
      if (id === 'bpair' && bPair) pay += amt * T.BAC_PAYS.pair;
      if (id === 'tie' && r.winner === 'tie') pay += amt * T.BAC_PAYS.tie;
      if (id === 'player') pay += r.winner === 'player' ? amt * T.BAC_PAYS.player : r.winner === 'tie' ? amt : 0;
      if (id === 'banker') pay += r.winner === 'banker' ? amt * T.BAC_PAYS.banker : r.winner === 'tie' ? amt : 0;
    }
    history.push(r.winner[0]); if (history.length > 36) history.shift();
    clear(road); history.forEach(x => road.append(h('i', 'bead ' + x)));
    ctx.settle(total, pay, r.winner === 'banker' ? bRow : pRow);
    ctx.say(r.winner === 'tie' ? `Tie at ${r.p}.` : `${r.winner === 'player' ? 'Player' : 'Banker'} wins, ${Math.max(r.p, r.b)} to ${Math.min(r.p, r.b)}.`, pay > total ? 'win' : pay === total ? '' : 'lose');
    dealing = false; ctx.busy(false);
  }
  function toCard(id: string): Card { return { r: '23456789TJQKA'.indexOf(id[0]) + 2, s: id[1] as Card['s'] }; }
  ctx.controls.append(btn('Clear', 'ghost', () => { bets.clear(); spotEls.forEach(e => e.querySelector('.rl-chip')?.remove()); }), btn('Deal', 'blood big', () => void deal()));
  void cardId; void rnd; void px; void floatText; void mfmt;
};
export type { GameCtx };
