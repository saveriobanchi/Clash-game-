import { h, clear, sleep } from '../dom';
import { px, pxCanvas, pxUrl } from '../px';
import { sfx } from '../audio';
import { burst, shake, flash, centerOf, floatText, rise } from '../fx';
import { GameMount, GameCtx } from '../shell';
import * as G from '../../core/games/simple';
import { S, fmt, feat } from '../../core/economy';
import { mfmt, btn } from './common';
import { randInt } from '../../core/rng';
import { toast } from '../ui';

/* ---------- shared "pick tiles" engine for Crypt Delve, Six Chalices ---------- */
export function pickEngine(ctx: GameCtx, o: {
  tiles: () => number; bad: () => number; cols: () => number;
  safeSprite: (i: number) => string; badSprite: string; closedClass: string; closedSprite?: string;
  onBad?: () => void; onClear?: () => void; suspense?: number; sequential?: boolean; label?: string;
}): { refresh: () => void } {
  const grid = h('div', 'tile-grid');
  const info = h('div', 'mult-tag', '');
  const next = h('div', 'muted small', '');
  ctx.stage.append(info, grid, next);
  let hazards = new Set<number>(), opened = new Set<number>(), active = false, stake = 0, picking = false, hint = -1;
  const spade = (S.relics.spade ?? 0) > 0;
  const mult = () => G.minesMult(o.tiles(), o.bad(), opened.size);
  const nextMult = () => G.minesMult(o.tiles(), o.bad(), opened.size + 1);
  function build(): void {
    clear(grid);
    grid.style.gridTemplateColumns = `repeat(${o.cols()}, 1fr)`;
    grid.style.maxWidth = o.cols() <= 3 ? '260px' : o.cols() >= 6 ? '380px' : '340px';
    for (let i = 0; i < o.tiles(); i++) {
      const t = h('button', { class: `tile ${o.closedClass}`, onclick: () => void pick(i, t) });
      if (o.closedSprite) t.append(px(o.closedSprite, 40));
      grid.append(t);
    }
    info.textContent = `${o.bad()} ${o.label ?? 'cursed'} · first ${mfmt(G.minesMult(o.tiles(), o.bad(), 1))}`;
    next.textContent = '';
  }
  function tileEl(i: number): HTMLElement { return grid.children[i] as HTMLElement; }
  function start(): boolean {
    stake = ctx.bet();
    if (!ctx.wager(stake)) return false;
    hazards = G.placeHazards(o.tiles(), o.bad()); opened = new Set(); active = true; ctx.busy(true); ctx.say('');
    build();
    if (spade) {
      const safe = [...Array(o.tiles()).keys()].filter(i => !hazards.has(i));
      hint = safe[randInt(safe.length)];
      tileEl(hint).classList.add('hint');
    }
    render();
    return true;
  }
  async function pick(i: number, t: HTMLElement): Promise<void> {
    if (picking || opened.has(i)) return;
    if (!active) { if (!start()) return; t = tileEl(i); }
    if (o.sequential && opened.size !== i && !hazards.has(i) && false) return;
    picking = true;
    t.classList.add('pending');
    if (o.suspense) { sfx.heartbeat(); await sleep(o.suspense); }
    t.classList.remove('pending', 'hint');
    if (hazards.has(i)) {
      t.className = 'tile bad pop'; clear(t); t.append(px(o.badSprite, 44));
      sfx.doom(); shake(grid, 1.5); flash('rgba(160,0,20,.35)');
      o.onBad?.();
      revealAll(i);
      ctx.settle(stake, 0, grid);
      ctx.say('Cursed. Everything is lost.', 'lose');
      active = false; ctx.busy(false);
    } else {
      opened.add(i);
      t.className = 'tile open pop'; clear(t); t.append(px(o.safeSprite(i), 44));
      sfx.tone(520 * Math.pow(1.07, opened.size), 0.18, 'triangle', 0.14, 0, true); sfx.play('chip', 0.4, 1.3);
      burst(...centerOf(t), { n: 8, size: 24, colors: ['#9ff7e0', '#ffe08a'] });
      info.textContent = `${mfmt(mult())} · ${fmt(stake * mult())}`;
      if (opened.size >= o.tiles() - o.bad()) { o.onClear?.(); cash(); }
    }
    picking = false;
    render();
  }
  function revealAll(hit = -1): void {
    for (let k = 0; k < o.tiles(); k++) {
      if (opened.has(k) || k === hit) continue;
      const t = tileEl(k); clear(t);
      t.className = 'tile ghosted ' + (hazards.has(k) ? 'bad' : 'open');
      t.append(px(hazards.has(k) ? o.badSprite : o.safeSprite(k), 34));
    }
  }
  function cash(): void {
    if (!active || opened.size === 0) return;
    const m = mult();
    revealAll();
    ctx.settle(stake, stake * m, grid);
    ctx.say(`Escaped with ${mfmt(m)}.`, 'win');
    active = false; ctx.busy(false); render();
  }
  function render(): void {
    clear(ctx.controls);
    if (!active) {
      ctx.controls.append(btn('Begin', 'blood big', () => { start(); }));
      next.textContent = 'Tap a tile or press Begin.';
      return;
    }
    const b = btn(opened.size ? `Take ${fmt(stake * mult())}` : 'Pick a tile', 'blood big', cash);
    if (!opened.size) b.disabled = true;
    ctx.controls.append(b);
    next.textContent = opened.size < o.tiles() - o.bad() ? `Next: ${mfmt(nextMult())}` : '';
  }
  build(); render();
  return { refresh: () => { if (!active) { build(); render(); } } };
}

/* ============================ CRYPT DELVE ============================ */
export const minesGame: GameMount = ctx => {
  type V = 'ossuary' | 'crypt' | 'labyrinth';
  const SIZES: Record<V, [number, number]> = { ossuary: [9, 3], crypt: [25, 5], labyrinth: [36, 6] };
  let v: V = ctx.variants<V>([{ id: 'ossuary', label: 'Ossuary 3×3' }, { id: 'crypt', label: 'Crypt 5×5' }, { id: 'labyrinth', label: 'Labyrinth 6×6' }], 'crypt', x => { v = x; bad = Math.min(bad, SIZES[v][0] - 1); eng.refresh(); upd(); });
  let bad = 3;
  const gems = ['default_diamond', 'ruby', 'emerald', 'default_mese_crystal', 'default_gold_ingot', 'crystal'];
  const badCtl = h('div', 'betbar', { style: { justifyContent: 'center' } });
  const badVal = h('div', 'betbox', { style: { flex: '0 0 150px', fontSize: '22px' } });
  const upd = () => { badVal.textContent = `${bad} curse${bad > 1 ? 's' : ''}`; };
  badCtl.append(h('button', { class: 'stepbtn', onclick: () => { bad = Math.max(1, bad - 1); upd(); eng.refresh(); sfx.click(); } }, '−'), badVal, h('button', { class: 'stepbtn', onclick: () => { bad = Math.min(SIZES[v][0] - 1, bad + 1); upd(); eng.refresh(); sfx.click(); } }, '+'));
  upd();
  const eng = pickEngine(ctx, {
    tiles: () => SIZES[v][0], bad: () => bad, cols: () => SIZES[v][1],
    safeSprite: i => gems[i % gems.length], badSprite: 'td20', closedClass: 'tomb', label: 'cursed',
  });
  ctx.stage.prepend(badCtl);
};

/* ============================ BONE DROP (plinko) ============================ */
export const plinkoGame: GameMount = ctx => {
  let risk: G.PlinkoRisk = ctx.variants<G.PlinkoRisk>([{ id: 'low', label: 'Low risk' }, { id: 'mid', label: 'Mid risk' }, { id: 'high', label: 'High risk' }], 'mid', x => { risk = x; drawBoard(); });
  let rows = 12;
  const cv = h('canvas', { class: 'plinko-cv' });
  const W = 360, H = 400;
  cv.width = W * 2; cv.height = H * 2;
  const g = cv.getContext('2d')!; g.scale(2, 2);
  ctx.stage.append(cv);
  const balls: { path: number[]; t: number; slot: number; stake: number; done: boolean }[] = [];
  let flashSlot = -1, flashT = 0;
  const skull = pxCanvas('lottacievements_skull');
  const geom = () => {
    const top = 26, bottom = H - 46, gapY = (bottom - top) / rows, gapX = Math.min(26, (W - 30) / (rows + 2));
    return { top, bottom, gapY, gapX };
  };
  const slotColor = (m: number) => m >= 10 ? '#ff2a3a' : m >= 3 ? '#ff7a2a' : m >= 1.2 ? '#e0b062' : m >= 1 ? '#7fd6c2' : '#4a3a44';
  function drawBoard(): void {
    const { top, gapY, gapX } = geom();
    g.clearRect(0, 0, W, H);
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k <= r + 2; k++) {
        const x = W / 2 + (k - (r + 2) / 2) * gapX, y = top + r * gapY;
        g.fillStyle = '#efe2c8'; g.beginPath(); g.arc(x, y, 3.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.arc(x + 1, y + 1.5, 3.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#efe2c8'; g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
      }
    }
    const table = G.plinkoTable(rows, risk);
    const sy = top + rows * gapY + 4;
    table.forEach((m, i) => {
      const x = W / 2 + (i - rows / 2) * gapX;
      const bump = i === flashSlot ? Math.max(0, 1 - flashT) * 6 : 0;
      g.fillStyle = slotColor(m); g.fillRect(x - gapX / 2 + 1.5, sy + bump, gapX - 3, 26);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - gapX / 2 + 1.5, sy + 20 + bump, gapX - 3, 6);
      g.fillStyle = m >= 1 ? '#1a0508' : '#d8c8b0'; g.font = `bold ${gapX < 22 ? 9 : 11}px VT323, monospace`; g.textAlign = 'center';
      g.fillText(m >= 100 ? String(Math.round(m)) : m >= 10 ? m.toFixed(0) : m.toFixed(1), x, sy + 16 + bump);
    });
    g.imageSmoothingEnabled = false;
    for (const b of balls) {
      if (b.done) continue;
      const [x, y] = ballPos(b);
      g.drawImage(skull, x - 8, y - 9, 16, 18);
    }
  }
  function ballPos(b: { path: number[]; t: number }): [number, number] {
    const { top, gapY, gapX } = geom();
    const step = Math.floor(b.t), f = b.t - step;
    let k = 0; for (let i = 0; i < Math.min(step, b.path.length); i++) k += b.path[i];
    const xAt = (s: number, kk: number) => W / 2 + (kk - s / 2) * gapX;
    if (step >= b.path.length) return [xAt(b.path.length, k), top + b.path.length * gapY];
    const x0 = xAt(step, k), x1 = xAt(step + 1, k + b.path[step]);
    const y0 = top - gapY * 0.6 + step * gapY, y1 = y0 + gapY;
    const bounce = Math.sin(f * Math.PI) * gapY * 0.45;
    return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f - bounce];
  }
  let raf = 0, last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    flashT += dt * 3;
    for (const b of balls) {
      if (b.done) continue;
      const prev = Math.floor(b.t);
      b.t += dt * 7.5;
      if (Math.floor(b.t) !== prev && b.t < b.path.length) sfx.tone(1200 + Math.random() * 400, 0.03, 'sine', 0.05);
      if (b.t >= b.path.length + 0.4) {
        b.done = true;
        const m = G.plinkoTable(rows, risk)[b.slot];
        flashSlot = b.slot; flashT = 0;
        const r = cv.getBoundingClientRect();
        const { gapX } = geom();
        const sx = r.left + ((W / 2 + (b.slot - rows / 2) * gapX) / W) * r.width, sy = r.top + r.height * 0.9;
        ctx.settle(b.stake, b.stake * m, null, true);
        floatText(sx, sy - 20, mfmt(m), m >= 1 ? 'gold' : 'red');
        if (m >= 1) { burst(sx, sy, { n: Math.min(40, 6 + m * 2), size: 22 }); sfx.win(Math.min(4, Math.ceil(m / 3))); } else sfx.tone(180, 0.15, 'sine', 0.1);
      }
    }
    for (let i = balls.length - 1; i >= 0; i--) if (balls[i].done) balls.splice(i, 1);
    drawBoard();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  function drop(): void {
    if (balls.length >= 12) return;
    const stake = ctx.bet();
    if (!ctx.wager(stake)) return;
    const { path, slot } = G.dropBall(rows);
    balls.push({ path, slot, t: 0, stake, done: false });
    sfx.play('chip', 0.5, 1.4);
  }
  const rowBtns = h('div', { style: { display: 'flex', gap: '4px' } });
  const setRows = (n: number) => { if (balls.length) { toast(['Wait for the skulls to land.']); return; } rows = n; rowBtns.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.textContent === String(n))); drawBoard(); };
  for (const n of G.PLINKO_ROWS) rowBtns.append(h('button', { class: 'chip-v' + (n === rows ? ' on' : ''), onclick: () => setRows(n) }, String(n)));
  ctx.stage.append(h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, h('span', 'label-gold', 'Rows'), rowBtns));
  ctx.controls.append(btn('Drop a skull', 'blood big', drop));
  return () => cancelAnimationFrame(raf);
};

/* ============================ GRAVE TICKETS ============================ */
export const scratchGame: GameMount = ctx => {
  let tier = G.SCRATCH_TIERS.find(t => t.id === ctx.variants(G.SCRATCH_TIERS.map(t => ({ id: t.id, label: `${t.name} ×${t.price}` })), 'copper', id => { tier = G.SCRATCH_TIERS.find(t => t.id === id)!; idle(); }))!;
  const SYMS = ['default_coal_lump', 'default_copper_ingot', 'moreores_silver_ingot', 'default_gold_ingot', 'default_diamond', 'lottachievements_crowned_skull'];
  const wrap = h('div', 'ticket');
  const prizes = h('div', 'ticket-prizes');
  ctx.stage.append(wrap, prizes);
  const CW = 300, CH = 300;
  let ticket: { prizeIdx: number; grid: number[] } | null = null;
  let stake = 0, revealed = false, cover: HTMLCanvasElement | null = null;
  function drawPrizes(): void {
    clear(prizes);
    tier.prizes.forEach(([m], i) => prizes.append(h('div', 'tp', px(SYMS[i], 22), h('span', {}, `×3 = ${mfmt(m)}`))));
  }
  function idle(): void {
    clear(wrap); ticket = null; revealed = true; drawPrizes();
    wrap.append(h('div', 'ticket-face idle', px('td65', 64), h('div', 'h2 gild', tier.name), h('div', 'muted small', `Costs ${tier.price}× your stake`)));
    render();
  }
  function buy(): void {
    stake = ctx.bet() * tier.price;
    if (!ctx.wager(stake)) return;
    ctx.busy(true); ctx.say('');
    ticket = G.scratchTicket(tier); revealed = false;
    clear(wrap);
    const under = h('canvas'); under.width = CW; under.height = CH; under.className = 'ticket-under';
    const u = under.getContext('2d')!; u.imageSmoothingEnabled = false;
    u.fillStyle = '#e8dcc0'; u.fillRect(0, 0, CW, CH);
    ticket.grid.forEach((s, i) => {
      const x = (i % 3) * 100, y = Math.floor(i / 3) * 100;
      u.fillStyle = (i + Math.floor(i / 3)) % 2 ? '#d9cba8' : '#efe3c8'; u.fillRect(x + 4, y + 4, 92, 92);
      u.drawImage(pxCanvas(SYMS[s]), x + 22, y + 18, 56, 56);
      u.fillStyle = '#5a3410'; u.font = 'bold 18px VT323, monospace'; u.textAlign = 'center'; u.fillText(mfmt(tier.prizes[s][0]), x + 50, y + 90);
    });
    cover = h('canvas'); cover.width = CW; cover.height = CH; cover.className = 'ticket-cover';
    const c = cover.getContext('2d')!; c.imageSmoothingEnabled = false;
    const dirt = pxCanvas('default_coal_block');
    for (let y = 0; y < CH; y += 32) for (let x = 0; x < CW; x += 32) c.drawImage(dirt, x, y, 32, 32);
    c.fillStyle = 'rgba(40,20,10,.35)'; c.fillRect(0, 0, CW, CH);
    c.fillStyle = '#e7bd6a'; c.font = 'bold 22px Cinzel, serif'; c.textAlign = 'center'; c.fillText('SCRATCH THE GRAVE', CW / 2, CH / 2 + 8);
    let scratched = 0, lastSnd = 0;
    const scratchAt = (ev: PointerEvent) => {
      if (revealed || !cover) return;
      const r = cover.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width) * CW, y = ((ev.clientY - r.top) / r.height) * CH;
      c.globalCompositeOperation = 'destination-out';
      c.beginPath(); c.arc(x, y, 20, 0, Math.PI * 2); c.fill();
      c.globalCompositeOperation = 'source-over';
      scratched++;
      if (performance.now() - lastSnd > 70) { sfx.noise(0.06, 0.08, 2500, 0, 0.8); lastSnd = performance.now(); }
      if (scratched % 12 === 0) {
        const d = c.getImageData(0, 0, CW, CH).data; let clearPx = 0;
        for (let i = 3; i < d.length; i += 64) if (d[i] < 40) clearPx++;
        if (clearPx / (d.length / 64) > 0.55) finish();
      }
    };
    let down = false;
    cover.addEventListener('pointerdown', e => { down = true; cover!.setPointerCapture(e.pointerId); scratchAt(e); });
    cover.addEventListener('pointermove', e => { if (down) scratchAt(e); });
    cover.addEventListener('pointerup', () => { down = false; });
    wrap.append(h('div', 'ticket-face', under, cover));
    render();
  }
  function finish(): void {
    if (revealed || !ticket || !cover) return;
    revealed = true;
    cover.style.transition = 'opacity .5s'; cover.style.opacity = '0';
    const m = ticket.prizeIdx >= 0 ? tier.prizes[ticket.prizeIdx][0] : 0;
    if (ticket.prizeIdx === tier.prizes.length - 1) feat('scratch_top');
    ctx.settle(stake, stake * m / tier.price * tier.price, wrap);
    ctx.say(m ? `Three of a kind — ${mfmt(m)}!` : 'Only dirt and bones.', m ? 'win' : 'lose');
    ctx.busy(false); render();
  }
  function render(): void {
    clear(ctx.controls);
    if (ticket && !revealed) ctx.controls.append(btn('Reveal all', '', finish));
    else ctx.controls.append(btn(`Buy ${tier.name}`, 'blood big', buy));
  }
  idle();
};

/* ============================ SÉANCE (keno) ============================ */
export const kenoGame: GameMount = ctx => {
  ctx.variants([{ id: 'std', label: '40 spirits · 10 summoned' }], 'std', () => undefined);
  const grid = h('div', 'keno-grid');
  const table = h('div', 'keno-table');
  ctx.stage.append(grid, table);
  const picks = new Set<number>();
  let drawing = false;
  const cells: HTMLElement[] = [];
  for (let n = 1; n <= G.KENO_N; n++) {
    const c = h('button', { class: 'keno-cell', onclick: () => {
      if (drawing) return;
      cells.forEach(x => x.classList.remove('hit', 'drawn'));
      if (picks.has(n)) picks.delete(n); else if (picks.size < 10) picks.add(n); else { toast(['Ten spirits at most.']); return; }
      c.classList.toggle('on', picks.has(n)); sfx.click(); drawTable();
    } }, String(n));
    cells.push(c); grid.append(c);
  }
  function drawTable(hits = -1): void {
    clear(table);
    if (!picks.size) { table.append(h('div', 'muted small', 'Mark 1 to 10 spirits.')); return; }
    G.kenoTable(picks.size).forEach((m, k) => { if (m > 0) table.append(h('div', 'kt' + (k === hits ? ' on' : ''), h('span', {}, `${k} hit${k === 1 ? '' : 's'}`), h('b', {}, mfmt(m)))); });
  }
  drawTable();
  async function summon(): Promise<void> {
    if (drawing) return;
    if (!picks.size) { toast(['Mark at least one spirit.']); return; }
    const stake = ctx.bet();
    if (!ctx.wager(stake)) return;
    drawing = true; ctx.busy(true); ctx.say('');
    cells.forEach(x => x.classList.remove('hit', 'drawn'));
    const drawn = G.kenoDraw();
    let hits = 0;
    for (const n of drawn) {
      const c = cells[n - 1];
      const hit = picks.has(n);
      if (hit) hits++;
      c.classList.add(hit ? 'hit' : 'drawn', 'pop');
      if (hit) { sfx.tone(660 + hits * 90, 0.3, 'sine', 0.14, 0, true); rise(...centerOf(c), '#7fe6ff', 6); } else sfx.tone(200, 0.08, 'triangle', 0.06);
      await sleep(260);
    }
    const m = G.kenoTable(picks.size)[hits];
    drawTable(hits);
    ctx.settle(stake, stake * m, grid);
    ctx.say(`${hits} of ${picks.size} spirits answered${m ? ` — ${mfmt(m)}` : '.'}`, m > 1 ? 'win' : m ? '' : 'lose');
    drawing = false; ctx.busy(false);
  }
  ctx.controls.append(
    btn('Random', 'ghost', () => { if (drawing) return; picks.clear(); cells.forEach(x => x.classList.remove('on', 'hit', 'drawn')); const k = Math.max(1, picks.size || 6); while (picks.size < k) picks.add(1 + randInt(G.KENO_N)); picks.forEach(n => cells[n - 1].classList.add('on')); drawTable(); sfx.play('chips', 0.4); }),
    btn('Clear', 'ghost', () => { if (drawing) return; picks.clear(); cells.forEach(x => x.classList.remove('on', 'hit', 'drawn')); drawTable(); }),
    btn('Summon', 'blood big', () => void summon()));
};

/* ============================ SPECTRAL DERBY ============================ */
export const derbyGame: GameMount = ctx => {
  ctx.variants([{ id: 'std', label: 'Six racers · win only' }], 'std', () => undefined);
  const track = h('div', 'derby-track');
  const list = h('div', 'derby-list');
  ctx.stage.append(track, list);
  let race = G.newRace();
  let choice = 0, running = false;
  const lanes: HTMLElement[] = [];
  function build(): void {
    clear(track); clear(list); lanes.length = 0;
    race.forEach((r, i) => {
      const runner = h('div', 'derby-runner', px(r.sprite, 34));
      const lane = h('div', 'derby-lane', h('span', 'derby-no', String(i + 1)), runner);
      lanes.push(runner); track.append(lane);
      const row = h('button', { class: 'derby-pick' + (i === choice ? ' on' : ''), onclick: () => { if (running) return; choice = i; list.querySelectorAll('.derby-pick').forEach((x, k) => x.classList.toggle('on', k === i)); sfx.click(); } },
        px(r.sprite, 28), h('span', 'dn', r.name), h('span', 'form', '●'.repeat(Math.max(1, Math.round(r.p * 12))).slice(0, 6)), h('b', {}, mfmt(r.odds)));
      list.append(row);
    });
  }
  build();
  async function go(): Promise<void> {
    if (running) return;
    const stake = ctx.bet();
    if (!ctx.wager(stake)) return;
    running = true; ctx.busy(true); ctx.say('');
    const winner = G.raceWinner(race);
    // finish times: winner fastest
    const times = race.map((_, i) => (i === winner ? 0 : 0.06 + Math.random() * 0.35));
    const base = 5200;
    const seeds = race.map(() => Math.random() * 10);
    sfx.play('fan', 0.7); sfx.whoosh();
    const t0 = performance.now();
    await new Promise<void>(res => {
      const f = (now: number) => {
        const el = (now - t0) / base;
        let all = true;
        race.forEach((_, i) => {
          const dur = 1 + times[i];
          const p = Math.min(1, el / dur);
          const wobble = Math.sin(el * 9 + seeds[i]) * 0.025 * (1 - p) + Math.sin(el * 3.1 + seeds[i]) * 0.04 * p * (1 - p) * 4;
          const pos = Math.min(1, Math.max(0, p + wobble));
          lanes[i].style.left = `calc(${pos * 100}% - ${pos * 34}px)`;
          lanes[i].style.transform = `translateY(${Math.sin(el * 30 + i) * 2}px)`;
          if (p < 1) all = false;
        });
        if (Math.random() < 0.08) sfx.tick();
        if (!all) requestAnimationFrame(f); else res();
      };
      requestAnimationFrame(f);
    });
    const won = winner === choice;
    burst(...centerOf(lanes[winner]), { n: 20 });
    ctx.settle(stake, won ? stake * race[choice].odds : 0, lanes[winner]);
    ctx.say(`${race[winner].name} wins!${won ? '' : ` ${race[choice].name} limps home.`}`, won ? 'win' : 'lose');
    await sleep(1400);
    race = G.newRace(); choice = 0; build();
    running = false; ctx.busy(false);
  }
  ctx.controls.append(btn('Release the racers', 'blood big', () => void go()));
  void pxUrl; void flash;
};
