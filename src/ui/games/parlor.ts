import { h, A, clear, sleep, tween } from '../dom';
import { px, pxCanvas } from '../px';
import { sfx } from '../audio';
import { burst, shake, coinShower, flash, centerOf, floatText } from '../fx';
import { GameMount } from '../shell';
import * as G from '../../core/games/simple';
import { MACHINES, LINES, spinMachine, Machine } from '../../core/games/slots';
import { hiloStep, hiloP, hiloDraw, SKULL_P } from '../../core/games/table';
import { S, fmt, feat, maxBet } from '../../core/economy';
import { cardImg, skullCard, mfmt, btn } from './common';
import { SUITS } from '../../core/cards';
import { randInt } from '../../core/rng';

/* ============================ FATE'S COIN ============================ */
export const coinGame: GameMount = ctx => {
  type V = 'classic' | 'streak' | 'cursed';
  let v: V = ctx.variants<V>([{ id: 'classic', label: 'Classic ×1.96' }, { id: 'streak', label: 'Streak' }, { id: 'cursed', label: 'Cursed edge ×48' }], 'classic', x => { v = x; render(); });
  const coin = h('div', 'coin3d',
    h('div', 'coin-face heads', h('img', { src: A('emblems/ember.webp'), alt: '' })),
    h('div', 'coin-face tails', h('img', { src: A('emblems/veil.webp'), alt: '' })),
    h('div', 'coin-edge'));
  const wrap = h('div', 'coin-wrap', coin, h('div', 'coin-shadow'));
  const streakInfo = h('div', 'mult-tag', '');
  const legend = h('div', 'label-gold', 'Ember is heads · Veil is tails');
  ctx.stage.append(wrap, streakInfo, legend);
  let rot = 0, chain = 0, chainStake = 0, flipping = false;
  async function flip(call: G.CoinSide): Promise<void> {
    if (flipping) return;
    const stake = ctx.bet();
    if (v !== 'streak' || chain === 0) { if (!ctx.wager(stake)) return; chainStake = stake; }
    flipping = true; ctx.busy(true); ctx.say('');
    const res = G.flipCoin(v === 'cursed');
    sfx.whoosh(); sfx.play('collide', 0.4, 1.5);
    const turns = 6 + randInt(3);
    const target = res === 'heads' ? 0 : 180;
    rot = rot - (rot % 360) + turns * 360 + target;
    coin.style.transition = 'transform 1.6s cubic-bezier(.15,.6,.2,1)';
    coin.style.transform = res === 'edge' ? `rotateY(${rot + 90}deg) rotateX(0deg)` : `rotateY(${rot}deg)`;
    wrap.classList.add('tossing');
    await sleep(1650);
    wrap.classList.remove('tossing');
    sfx.play('chip', 0.8, 0.8);
    const won = res === call;
    if (v === 'streak') {
      if (won) {
        chain++;
        const m = Math.pow(G.COIN.classic.pay, chain);
        streakInfo.textContent = `Chain ${chain} · ${mfmt(m)} · ${fmt(chainStake * m)}`;
        ctx.say('The coin agrees. Ride or take it?', 'win');
        burst(...centerOf(coin), { n: 14 });
        sfx.win(1);
        render();
      } else {
        ctx.settle(chainStake, 0, coin);
        ctx.say(`${res === 'heads' ? 'Ember' : 'Veil'}. The chain breaks.`, 'lose');
        shake(coin, 1.5); chain = 0; streakInfo.textContent = ''; ctx.busy(false); render();
      }
    } else {
      const pay = !won ? 0 : res === 'edge' ? G.COIN.cursed.edge : v === 'cursed' ? G.COIN.cursed.side : G.COIN.classic.pay;
      ctx.settle(stake, stake * pay, coin);
      if (won && res === 'edge') feat('edge');
      ctx.say(res === 'edge' ? 'It stands upon its edge!' : `${res === 'heads' ? 'Ember' : 'Veil'}${won ? ' — yours.' : '.'}`, won ? 'win' : 'lose');
      if (!won) shake(coin);
      ctx.busy(false);
    }
    flipping = false;
  }
  function cashOut(): void {
    const m = Math.pow(G.COIN.classic.pay, chain);
    ctx.settle(chainStake, chainStake * m, coin);
    ctx.say(`Cashed out at ${mfmt(m)}.`, 'win');
    chain = 0; streakInfo.textContent = ''; ctx.busy(false); render();
  }
  function render(): void {
    clear(ctx.controls);
    if (v === 'streak' && chain > 0) {
      ctx.controls.append(btn('Ember', '', () => void flip('heads')), btn(`Take ${fmt(chainStake * Math.pow(G.COIN.classic.pay, chain))}`, 'blood', cashOut), btn('Veil', '', () => void flip('tails')));
      return;
    }
    ctx.controls.append(btn('Ember', 'blood', () => void flip('heads')));
    if (v === 'cursed') ctx.controls.append(btn('Edge', '', () => void flip('edge')));
    ctx.controls.append(btn('Veil', 'blood', () => void flip('tails')));
  }
  render();
};

/* ============================ BONE DICE ============================ */
export const diceGame: GameMount = ctx => {
  type V = 'roll' | 'triple';
  let v: V = ctx.variants<V>([{ id: 'roll', label: 'Over / Under' }, { id: 'triple', label: 'Triple Bones' }], 'roll', x => { v = x; build(); });
  let over = true, target = 50.5;
  let tbet: G.TripleBet = { kind: 'small' };
  let rolling = false;
  function build(): void {
    clear(ctx.stage); clear(ctx.controls); ctx.say('');
    if (v === 'roll') buildRoll(); else buildTriple();
  }
  function buildRoll(): void {
    const big = h('div', 'big-num gild', '50.00');
    const chanceEl = h('div', 'num'), multEl = h('div', 'num');
    const bar = h('div', 'dice-bar'), fill = h('div', 'dice-fill'), mark = h('div', 'dice-mark', px('lottacievements_skull', 22));
    bar.append(fill, mark);
    const slider = h('input', { type: 'range', min: '2', max: '98', step: '0.5', value: String(target), class: 'dice-range' }) as HTMLInputElement;
    const ou = h('button', { class: 'btn ghost sm', onclick: () => { over = !over; target = 100 - target; slider.value = String(target); upd(); sfx.click(); } });
    const upd = () => {
      target = +slider.value;
      const chance = over ? (100 - target) / 100 : target / 100;
      chanceEl.textContent = `${(chance * 100).toFixed(1)}% chance`;
      multEl.textContent = mfmt(G.diceMultiplier(chance));
      ou.textContent = over ? `Roll over ${target.toFixed(1)}` : `Roll under ${target.toFixed(1)}`;
      fill.style.left = over ? target + '%' : '0'; fill.style.right = over ? '0' : 100 - target + '%';
    };
    slider.oninput = () => { upd(); sfx.tick(); };
    upd();
    ctx.stage.append(h('div', 'dice-dice', h('img', { src: A('ui/die5.png'), alt: '' }), h('img', { src: A('ui/dieR2.png'), alt: '' })), big, bar, slider,
      h('div', { style: { display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '340px', fontSize: '24px', color: 'var(--gold-hi)' } }, chanceEl, multEl), ou);
    ctx.controls.append(btn('Roll the bones', 'blood big', async () => {
      if (rolling) return;
      const stake = ctx.bet();
      if (!ctx.wager(stake)) return;
      rolling = true; ctx.busy(true);
      const chance = over ? (100 - target) / 100 : target / 100;
      const r = G.rollD100();
      sfx.play('collide', 0.6, 0.8);
      await tween(700, t => { big.textContent = (t < 1 ? Math.random() * 100 : r).toFixed(2); if (Math.random() < 0.3) sfx.tick(); }, t => t);
      big.textContent = r.toFixed(2);
      mark.style.left = r + '%';
      const won = over ? r > target : r < target;
      ctx.settle(stake, won ? stake * G.diceMultiplier(chance) : 0, big);
      ctx.say(won ? `${r.toFixed(2)} — the bones favour you.` : `${r.toFixed(2)} — the bones say no.`, won ? 'win' : 'lose');
      big.classList.toggle('lose-num', !won);
      rolling = false; ctx.busy(false);
    }));
  }
  function buildTriple(): void {
    const dice = h('div', 'dice-row');
    const dimg = [1, 2, 3].map(i => h('img', { src: A(`ui/dieR${i + 2}.png`), class: 'die', alt: '' }));
    dice.append(...dimg);
    const sumEl = h('div', 'mult-tag', ' ');
    const grid = h('div', 'tb-grid');
    const bets: [G.TripleBet, string][] = [[{ kind: 'small' }, 'Small 4–10'], [{ kind: 'big' }, 'Big 11–17'], [{ kind: 'anyTriple' }, 'Any triple']];
    for (let n = 4; n <= 17; n++) bets.push([{ kind: 'total', n }, String(n)]);
    for (let n = 1; n <= 6; n++) bets.push([{ kind: 'triple', n }, `${n}${n}${n}`]);
    const same = (a: G.TripleBet, b: G.TripleBet) => JSON.stringify(a) === JSON.stringify(b);
    for (const [b, label] of bets) {
      const el = h('button', { class: 'tb-cell' + (same(b, tbet) ? ' on' : '') + (b.kind === 'small' || b.kind === 'big' || b.kind === 'anyTriple' ? ' wide' : ''), onclick: () => {
        tbet = b; grid.querySelectorAll('.tb-cell').forEach(x => x.classList.remove('on')); el.classList.add('on'); sfx.play('chip', 0.4);
      } }, h('b', {}, label), h('span', {}, mfmt(G.triplePay(b))));
      grid.append(el);
    }
    ctx.stage.append(dice, sumEl, grid);
    ctx.controls.append(btn('Cast the dice', 'blood big', async () => {
      if (rolling) return;
      const stake = ctx.bet();
      if (!ctx.wager(stake)) return;
      rolling = true; ctx.busy(true);
      const d = G.roll3d6();
      sfx.play('collide', 0.7, 0.7);
      dimg.forEach(i => i.classList.add('tumble'));
      for (let k = 0; k < 10; k++) { dimg.forEach(i => (i.src = A(`ui/dieR${1 + randInt(6)}.png`))); await sleep(70); if (k % 3 === 0) sfx.tick(k); }
      dimg.forEach((i, k) => { i.src = A(`ui/dieR${d[k]}.png`); i.classList.remove('tumble'); });
      sfx.play('chip', 0.8, 0.7);
      const won = G.tripleWins(tbet, d);
      sumEl.textContent = `${d.join(' · ')}  =  ${d[0] + d[1] + d[2]}`;
      ctx.settle(stake, won ? stake * G.triplePay(tbet) : 0, dice);
      ctx.say(won ? 'The dice obey.' : 'The dice mock you.', won ? 'win' : 'lose');
      rolling = false; ctx.busy(false);
    }));
  }
  build();
};

/* ============================ RELIQUARY REELS ============================ */
export const reelsGame: GameMount = ctx => {
  let m: Machine = MACHINES.find(x => x.id === ctx.variants(MACHINES.map(x => ({ id: x.id, label: x.name })), 'gilded', id => { m = MACHINES.find(x => x.id === id)!; draw(); blurb.textContent = m.blurb; }))!;
  const CELL = 64, W = CELL * 5, H = CELL * 3;
  const cv = h('canvas', { class: 'reels-cv' }); cv.width = W * 2; cv.height = H * 2;
  const c = cv.getContext('2d')!;
  c.scale(2, 2); c.imageSmoothingEnabled = false;
  const hoard = h('div', 'hoard', px('lottachievements_crowned_skull', 26), h('span', {}, 'Hoard '), h('b', { class: 'num' }, fmt(S.hoard)));
  const fsTag = h('div', 'mult-tag', '');
  const blurb = h('div', 'muted small', { style: { textAlign: 'center', maxWidth: '340px' } }, m.blurb);
  ctx.stage.append(hoard, h('div', 'reels-frame', cv), fsTag, blurb);
  let grid: number[][] = Array.from({ length: 5 }, () => [0, 1, 2].map(() => randInt(6)));
  let offsets = [0, 0, 0, 0, 0];
  let strips: number[][] = grid.map(r => [...r]);
  let winLines: { line: number; count: number }[] = [];
  let anticip = -1;
  let spinning = false, auto = 0;
  let pulse = 0;
  function sym(i: number): HTMLCanvasElement { return pxCanvas(m.symbols[Math.min(i, m.symbols.length - 1)].sprite); }
  function draw(): void {
    c.clearRect(0, 0, W, H);
    for (let r = 0; r < 5; r++) {
      const x = r * CELL;
      c.fillStyle = r % 2 ? '#1a0a10' : '#220d15'; c.fillRect(x, 0, CELL, H);
      const strip = strips[r];
      const off = offsets[r];
      for (let k = 0; k < strip.length; k++) {
        const idx = k;
        const y = k * CELL + off;
        if (y < -CELL || y > H) continue;
        const s = m.symbols[strip[idx]];
        if (s.wild) { c.fillStyle = 'rgba(255,190,80,.14)'; c.fillRect(x + 4, y + 4, CELL - 8, CELL - 8); }
        if (s.scatter) { c.fillStyle = 'rgba(120,220,255,.12)'; c.fillRect(x + 4, y + 4, CELL - 8, CELL - 8); }
        c.drawImage(sym(strip[idx]), x + 10, y + 10, CELL - 20, CELL - 20);
      }
      c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(x + CELL - 1, 0, 1, H);
      if (spinning && anticip >= 0 && r >= anticip) {
        const a = 0.25 + 0.2 * Math.sin(performance.now() / 80);
        c.fillStyle = `rgba(120,220,255,${a})`; c.fillRect(x + 2, 0, CELL - 4, H);
      }
    }
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(0.18, 'rgba(0,0,0,0)'); g.addColorStop(0.82, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (winLines.length && !spinning) {
      const wl = winLines[Math.floor(pulse / 50) % winLines.length];
      const line = LINES[wl.line];
      c.lineWidth = 4; c.strokeStyle = `hsla(${30 + wl.line * 25}, 100%, 65%, .95)`; c.shadowColor = '#ff9a3c'; c.shadowBlur = 12;
      c.beginPath(); line.forEach((row, reel) => { const px_ = reel * CELL + CELL / 2, py = row * CELL + CELL / 2; if (reel === 0) c.moveTo(px_, py); else c.lineTo(px_, py); }); c.stroke();
      c.shadowBlur = 0;
      const pz = 1 + 0.12 * Math.abs(Math.sin(pulse / 8));
      for (let reel = 0; reel < wl.count; reel++) {
        const cx = reel * CELL + CELL / 2, cy = line[reel] * CELL + CELL / 2, sz = (CELL - 20) * pz;
        c.fillStyle = 'rgba(255,200,90,.18)'; c.fillRect(reel * CELL + 3, line[reel] * CELL + 3, CELL - 6, CELL - 6);
        c.drawImage(sym(grid[reel][line[reel]]), cx - sz / 2, cy - sz / 2, sz, sz);
        c.strokeStyle = '#ffe08a'; c.lineWidth = 2; c.strokeRect(reel * CELL + 4, line[reel] * CELL + 4, CELL - 8, CELL - 8);
      }
    }
  }
  let raf = 0;
  const loop = () => { pulse++; if (!spinning && winLines.length) draw(); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  draw();
  async function spinOnce(inFree: boolean, freeMult: number): Promise<{ total: number; res: ReturnType<typeof spinMachine> }> {
    const res = spinMachine(m);
    winLines = [];
    spinning = true;
    const n = m.symbols.length - 1;
    // the result sits at the top of a long strip; the strip scrolls down until it is in view
    strips = res.grid.map((col, r) => { const extra = 14 + r * 5; const s: number[] = []; for (let i = 0; i < extra; i++) s.push(randInt(n)); return [...col, ...s]; });
    const dist = strips.map(s => (s.length - 3) * CELL);
    offsets = dist.map(() => 0);
    const t0 = performance.now();
    const durs = [700, 900, 1100, 1300, 1500].map(d => d * (inFree ? 0.6 : 1));
    // anticipation: two skulls showing on the first reels slows the rest down
    let sc = 0;
    for (let r = 0; r < 5; r++) {
      if (sc >= 2) { for (let k = r; k < 5; k++) durs[k] += 900 * (k - r + 1); anticip = r; break; }
      sc += res.grid[r].filter(i => m.symbols[i].scatter).length;
    }
    const stopped = [false, false, false, false, false];
    await new Promise<void>(resolve => {
      const f = (now: number) => {
        let all = true;
        for (let r = 0; r < 5; r++) {
          const t = Math.min(1, (now - t0) / durs[r]);
          const e = t < 1 ? 1 - Math.pow(1 - t, 3) : 1;
          const bounce = t < 1 ? 0 : 0;
          offsets[r] = -dist[r] * (1 - e) + bounce;
          if (anticip >= 0 && r >= anticip && t < 1 && t > 0.3 && Math.random() < 0.15) sfx.heartbeat();
          if (t >= 1 && !stopped[r]) { stopped[r] = true; sfx.reelStop(r); if (res.grid[r].some(i => m.symbols[i].scatter)) sfx.tone(880 + r * 120, 0.25, 'sine', 0.12); }
          if (t < 1) all = false;
        }
        draw();
        if (!all) requestAnimationFrame(f); else resolve();
      };
      requestAnimationFrame(f);
    });
    strips = res.grid.map(col => [...col]);
    offsets = [0, 0, 0, 0, 0];
    anticip = -1;
    grid = res.grid;
    spinning = false;
    if (res.expanded.length) { sfx.tone(220, 0.6, 'sawtooth', 0.08, 0, true); }
    winLines = res.wins.map(w => ({ line: w.line, count: w.count }));
    draw();
    return { total: res.lineTotal * freeMult, res };
  }
  async function spin(): Promise<void> {
    if (spinning) return;
    const stake = ctx.bet();
    if (!ctx.wager(stake)) { auto = 0; renderControls(); return; }
    ctx.busy(true); ctx.say('');
    let total = 0;
    const first = await spinOnce(false, 1);
    total += first.total;
    let jackpot = first.res.jackpot;
    let fs = first.res.freeSpins;
    if (fs > 0) {
      sfx.soul(); flash('rgba(120,220,255,.25)');
      ctx.say(`${fs} free spins at ×${m.freeMult}!`, 'win');
      await sleep(900);
      let played = 0;
      while (fs > 0) {
        fs--; played++;
        fsTag.textContent = `Free spin ${played} · ${fs} left · won ${fmt(total * stake)}`;
        const r = await spinOnce(true, m.freeMult);
        total += r.total;
        if (r.res.jackpot) jackpot = true;
        if (r.res.freeSpins) { fs += r.res.freeSpins; sfx.soul(); ctx.say(`+${r.res.freeSpins} more free spins!`, 'win'); }
        if (r.total > 0) { sfx.win(1); burst(...centerOf(cv), { n: 10 }); }
        await sleep(r.total > 0 ? 650 : 250);
      }
      fsTag.textContent = '';
    }
    let payout = total * stake;
    if (jackpot) {
      const hoardWin = S.hoard * Math.min(1, stake / maxBet());
      payout += hoardWin; S.hoard = Math.max(5000, S.hoard - hoardWin); feat('jackpot');
      coinShower(150); ctx.say(`THE PROPRIETOR'S HOARD! +${fmt(hoardWin)}`, 'win');
    }
    const r = ctx.settle(stake, payout, cv);
    if (!jackpot) ctx.say(payout > 0 ? `${r.mult >= 1 ? 'Won' : 'Returned'} ${fmt(r.paid)} (${mfmt(r.mult)})` : first.res.scatters === 2 ? 'Two skulls… so close.' : '', payout > 0 ? 'win' : '');
    (hoard.querySelector('b') as HTMLElement).textContent = fmt(S.hoard);
    ctx.busy(false);
    if (auto > 0) { auto--; renderControls(); await sleep(payout > stake * 5 ? 2600 : 450); if (auto > 0 || auto === 0) { if (auto >= 0 && autoArmed) void spin(); } }
  }
  let autoArmed = false;
  function renderControls(): void {
    clear(ctx.controls);
    ctx.controls.append(
      btn(auto > 0 ? `Stop (${auto})` : 'Auto ×10', 'ghost', () => { if (auto > 0) { auto = 0; autoArmed = false; } else { auto = 10; autoArmed = true; void spin(); } renderControls(); }),
      btn('Spin', 'blood big', () => { autoArmed = false; auto = 0; void spin(); }));
  }
  renderControls();
  return () => { cancelAnimationFrame(raf); auto = 0; autoArmed = false; };
};

/* ============================ HI-LO LADDER ============================ */
export const hiloGame: GameMount = ctx => {
  type V = 'classic' | 'skull';
  let v: V = ctx.variants<V>([{ id: 'classic', label: 'Classic deck' }, { id: 'skull', label: 'Skull deck' }], 'classic', x => { v = x; reset(); });
  const eye = (S.relics.eye ?? 0) > 0;
  const cardBox = h('div', 'hilo-card');
  const multEl = h('div', 'mult-tag', '×1.00');
  const hist = h('div', 'hilo-hist');
  const odds = h('div', 'muted small', '');
  ctx.stage.append(multEl, cardBox, odds, hist);
  let rank = 0, mult = 1, stake = 0, active = false, skips = 0, busyAnim = false;
  const SUIT = () => SUITS[randInt(4)];
  const RK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
  const idOf = (r: number, s: string) => RK[r] + s;
  function showCard(r: number): void {
    clear(cardBox);
    const el = r === 0 ? skullCard('card-img lg') : cardImg(idOf(r, SUIT()), 'card-img lg');
    el.classList.add('flip'); cardBox.append(el);
    sfx.play('card', 0.7);
  }
  function reset(): void {
    active = false; mult = 1; rank = 0; skips = 0; clear(hist); clear(cardBox); cardBox.append(cardImg('back', 'card-img lg')); multEl.textContent = '×1.00'; odds.textContent = v === 'skull' ? `Each draw has a ${(SKULL_P * 100).toFixed(1)}% chance of a skull. Steps pay ${((1 / (1 - SKULL_P) - 1) * 100).toFixed(1)}% more.` : 'Ties count for either guess.';
    ctx.busy(false); render();
  }
  function start(): void {
    stake = ctx.bet();
    if (!ctx.wager(stake)) return;
    active = true; ctx.busy(true); ctx.say('');
    rank = 1 + randInt(13);
    showCard(rank); render();
  }
  async function guess(dir: 'hi' | 'lo'): Promise<void> {
    if (!active || busyAnim) return;
    busyAnim = true;
    const step = hiloStep(rank, dir, v === 'skull');
    const next = hiloDraw(v === 'skull');
    const prev = rank;
    hist.append(cardImg(idOf(prev, 's'), 'card-img mini'));
    await sleep(120);
    showCard(next);
    if (next === 0) {
      sfx.doom(); flash('rgba(200,0,30,.35)'); shake(cardBox, 2);
      ctx.settle(stake, 0, cardBox); ctx.say('A skull. The ladder collapses.', 'lose'); active = false; ctx.busy(false);
    } else {
      const ok = dir === 'hi' ? next >= prev : next <= prev;
      if (ok) {
        mult = Math.floor(mult * step * 100) / 100; rank = next; multEl.textContent = mfmt(mult);
        sfx.tone(440 * Math.pow(1.06, hist.childElementCount), 0.15, 'triangle', 0.12); burst(...centerOf(cardBox), { n: 8, size: 26 });
        ctx.say(`${mfmt(mult)} — ${fmt(stake * mult)} if you stop now.`, 'win');
      } else {
        ctx.settle(stake, 0, cardBox); ctx.say('Wrong. The ladder burns.', 'lose'); shake(cardBox); active = false; ctx.busy(false);
      }
    }
    busyAnim = false;
    render();
  }
  function cash(): void {
    if (!active || mult <= 1) return;
    ctx.settle(stake, stake * mult, cardBox); ctx.say(`Climbed down with ${mfmt(mult)}.`, 'win'); active = false; ctx.busy(false); render();
  }
  function render(): void {
    clear(ctx.controls);
    if (!active) { ctx.controls.append(btn(mult > 1 || hist.childElementCount ? 'Deal again' : 'Deal', 'blood big', () => { if (hist.childElementCount) { clear(hist); mult = 1; multEl.textContent = '×1.00'; } start(); })); return; }
    const hi = hiloStep(rank, 'hi', v === 'skull'), lo = hiloStep(rank, 'lo', v === 'skull');
    const hb = btn(h('span', {}, '▲ Higher', h('br'), mfmt(hi)), '', () => void guess('hi'));
    const lb = btn(h('span', {}, '▼ Lower', h('br'), mfmt(lo)), '', () => void guess('lo'));
    if (hi < 1.01) hb.disabled = true;
    if (lo < 1.01) lb.disabled = true;
    hb.style.minHeight = lb.style.minHeight = '58px';
    const cb = btn(mult > 1 ? `Take ${fmt(stake * mult)}` : 'Take', 'blood', cash); if (mult <= 1) cb.disabled = true;
    const sk = btn(`Skip (${3 - skips})`, 'ghost sm', () => { if (skips >= 3) return; skips++; rank = 1 + randInt(13); showCard(rank); render(); });
    if (skips >= 3) sk.disabled = true;
    ctx.controls.append(lb, h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', flex: '1' } }, cb, sk), hb);
    if (eye) odds.textContent = `Oracle’s Eye: higher-or-same ${(hiloP(rank, 'hi') * 100).toFixed(0)}% · lower-or-same ${(hiloP(rank, 'lo') * 100).toFixed(0)}%`;
  }
  reset();
  void floatText;
};
