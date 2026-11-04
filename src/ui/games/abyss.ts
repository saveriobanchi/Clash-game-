import { h, A, clear, sleep } from '../dom';
import { px, pxCanvas } from '../px';
import { sfx } from '../audio';
import { burst, shake, flash, centerOf, coinShower, floatText } from '../fx';
import { GameMount } from '../shell';
import * as G from '../../core/games/simple';
import { BARGAIN_PAY, BARGAIN_TIERS } from '../../core/games/table';
import { S, fmt, feat, addSouls, save } from '../../core/economy';
import { mfmt, btn, cardEl } from './common';
import { pickEngine } from './catacombs';
import { randomCard } from '../../core/cards';
import { randInt } from '../../core/rng';
import { toast } from '../ui';

/* ============================ BLOOD MOON (crash) ============================ */
export const crashGame: GameMount = ctx => {
  ctx.variants([{ id: 'std', label: 'Blood Moon' }], 'std', () => undefined);
  const W = 360, H = 300;
  const cv = h('canvas', { class: 'crash-cv' }); cv.width = W * 2; cv.height = H * 2;
  const g = cv.getContext('2d')!; g.scale(2, 2);
  const multEl = h('div', 'crash-mult', '×1.00');
  const autoVals = [0, 1.5, 2, 3, 5, 10, 25, 100];
  let autoIdx = 2;
  const autoBtn = h('button', { class: 'chip-v on', onclick: () => { if (phase === 'run') return; autoIdx = (autoIdx + 1) % autoVals.length; updAuto(); sfx.click(); } });
  const updAuto = () => { autoBtn.textContent = autoVals[autoIdx] ? `Auto cash-out ×${autoVals[autoIdx]}` : 'Auto cash-out: off'; };
  updAuto();
  const hist = h('div', 'crash-hist');
  ctx.stage.append(h('div', 'crash-wrap', cv, multEl), autoBtn, hist);
  let phase: 'idle' | 'run' | 'burst' = 'idle';
  let point = 1, t = 0, m = 1, stake = 0, cashed = 0, raf = 0;
  const bats = Array.from({ length: 7 }, () => ({ x: Math.random() * W, y: 40 + Math.random() * 120, s: 0.6 + Math.random() * 0.8, ph: Math.random() * 6 }));
  const bat = pxCanvas('td120');
  const stars = Array.from({ length: 50 }, () => [Math.random() * W, Math.random() * H, Math.random()]);
  const history: number[] = [];
  function draw(): void {
    g.clearRect(0, 0, W, H);
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#12020a'); sky.addColorStop(1, '#3a0610');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    for (const [x, y, b] of stars) { g.fillStyle = `rgba(255,220,200,${0.2 + b * 0.5 * (0.5 + 0.5 * Math.sin(t * 3 + b * 9))})`; g.fillRect(x, y, 1.5, 1.5); }
    // moon rises with the multiplier
    const prog = Math.min(1, Math.log(m) / Math.log(20));
    const mx = 60 + prog * (W - 140), my = H - 50 - prog * (H - 110);
    const r = 26 + prog * 22 + (phase === 'burst' ? 0 : Math.sin(t * 4) * 1.5);
    if (phase !== 'burst') {
      const halo = g.createRadialGradient(mx, my, r * 0.5, mx, my, r * 3.2); halo.addColorStop(0, 'rgba(255,60,60,.55)'); halo.addColorStop(1, 'rgba(255,0,0,0)');
      g.fillStyle = halo; g.beginPath(); g.arc(mx, my, r * 3.2, 0, Math.PI * 2); g.fill();
      const moon = g.createRadialGradient(mx - r * 0.35, my - r * 0.35, r * 0.1, mx, my, r); moon.addColorStop(0, '#ffb39a'); moon.addColorStop(0.5, '#d4202f'); moon.addColorStop(1, '#5a0410');
      g.fillStyle = moon; g.beginPath(); g.arc(mx, my, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(80,0,10,.35)'; g.beginPath(); g.arc(mx + r * 0.3, my - r * 0.1, r * 0.22, 0, Math.PI * 2); g.arc(mx - r * 0.25, my + r * 0.35, r * 0.15, 0, Math.PI * 2); g.fill();
    }
    // trail curve
    g.strokeStyle = phase === 'burst' ? '#5a0a14' : '#ff4a5e'; g.lineWidth = 3; g.shadowColor = '#ff2a3a'; g.shadowBlur = phase === 'burst' ? 0 : 10;
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const pm = 1 + ((m - 1) * i) / 40, pp = Math.min(1, Math.log(pm) / Math.log(20));
      const x = 60 + pp * (W - 140), y = H - 50 - pp * (H - 110);
      if (i === 0) g.moveTo(20, H - 20); g.lineTo(x, y);
    }
    g.stroke(); g.shadowBlur = 0;
    g.imageSmoothingEnabled = false;
    for (const b of bats) {
      b.x += (phase === 'run' ? 1.6 : 0.4) * b.s; if (b.x > W + 20) { b.x = -20; b.y = 30 + Math.random() * 140; }
      const flap = Math.sin(t * 14 + b.ph) > 0 ? 1 : 0.8;
      g.drawImage(bat, b.x, b.y + Math.sin(t * 2 + b.ph) * 6, 18 * b.s, 18 * b.s * flap);
    }
    // ground: graves
    g.fillStyle = '#080204'; g.fillRect(0, H - 22, W, 22);
    const grave = pxCanvas('mr120');
    for (let x = 6; x < W; x += 44) g.drawImage(grave, x, H - 34, 16, 16);
  }
  let lastBeat = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (phase === 'run') {
      t = (now - t0) / 1000;
      m = G.crashCurve(t);
      if (autoVals[autoIdx] && !cashed && m >= autoVals[autoIdx]) cashOut(autoVals[autoIdx]);
      if (m >= point) { m = point; boom(); }
      multEl.textContent = mfmt(m);
      multEl.style.fontSize = Math.min(64, 40 + Math.log(m) * 6) + 'px';
      if (now - lastBeat > Math.max(180, 700 / m)) { lastBeat = now; sfx.heartbeat(); }
      if (!cashed) (ctx.controls.querySelector('.cash') as HTMLElement | null)?.replaceChildren(`Cash out ${fmt(stake * m)}`);
    } else t += 0.016;
    draw();
  };
  let t0 = 0;
  raf = requestAnimationFrame(loop);
  function launch(): void {
    if (phase === 'run') return;
    stake = ctx.bet();
    if (!ctx.wager(stake)) return;
    point = G.crashPoint(); cashed = 0; m = 1; t0 = performance.now(); phase = 'run'; ctx.busy(true); ctx.say('');
    multEl.classList.remove('dead', 'safe');
    sfx.tone(110, 1.2, 'sawtooth', 0.06, 0, true, 2);
    render();
  }
  function cashOut(at?: number): void {
    if (phase !== 'run' || cashed) return;
    cashed = at ?? m;
    const pay = Math.floor(stake * cashed * 100) / 100;
    ctx.settle(stake, pay, multEl);
    if (cashed >= 50) feat('crash50');
    multEl.classList.add('safe');
    ctx.say(`Cashed out at ${mfmt(cashed)}. Watch it climb without you…`, 'win');
    render();
  }
  function boom(): void {
    phase = 'burst';
    const r = cv.getBoundingClientRect();
    burst(r.left + r.width * 0.6, r.top + r.height * 0.35, { n: 50, colors: ['#ff2a3a', '#8a0010', '#ff8a6a'], tex: ['smoke_04', 'magic_02', 'spark_06'], speed: 320, size: 46 });
    sfx.doom(); shake(cv, 1.2);
    if (!cashed) { ctx.settle(stake, 0, null, true); flash('rgba(200,0,20,.4)'); ctx.say(`The moon burst at ${mfmt(point)}.`, 'lose'); }
    multEl.textContent = mfmt(point); multEl.classList.add('dead');
    history.unshift(point); if (history.length > 10) history.pop();
    clear(hist); history.forEach(x => hist.append(h('span', { class: x >= 2 ? 'hi' : 'lo' }, mfmt(x))));
    ctx.busy(false);
    setTimeout(() => { if (phase === 'burst') { phase = 'idle'; m = 1; } render(); }, 1500);
    render();
  }
  function render(): void {
    clear(ctx.controls);
    if (phase === 'run' && !cashed) ctx.controls.append(h('button', { class: 'btn blood big cash pulse', onclick: () => cashOut() }, `Cash out ${fmt(stake * m)}`));
    else if (phase === 'run') ctx.controls.append(btn('Waiting for the burst…', 'ghost big', () => undefined));
    else ctx.controls.append(btn('Raise the moon', 'blood big', launch));
  }
  render();
  return () => { cancelAnimationFrame(raf); if (phase === 'run' && !cashed) { /* leaving forfeits */ } };
};

/* ============================ LADDER OF SOULS (tower) ============================ */
export const towerGame: GameMount = ctx => {
  let mode: G.TowerMode = ctx.variants<G.TowerMode>((Object.keys(G.TOWER_MODES) as G.TowerMode[]).map(k => ({ id: k, label: G.TOWER_MODES[k].label })), 'normal', x => { mode = x; if (!active) build(); });
  const tower = h('div', 'tower');
  ctx.stage.append(tower);
  let level = 0, active = false, stake = 0, fiends: number[][] = [], busyPick = false;
  const spade = (S.relics.spade ?? 0) > 0;
  function build(): void {
    clear(tower);
    const md = G.TOWER_MODES[mode];
    for (let l = G.TOWER_LEVELS - 1; l >= 0; l--) {
      const row = h('div', 'tower-row' + (active && l === level ? ' current' : '') + (l < level ? ' passed' : ''));
      row.append(h('span', 'tower-mult', mfmt(G.towerMult(mode, l + 1))));
      for (let d = 0; d < md.doors; d++) {
        const door = h('button', { class: 'tower-door', onclick: () => void pick(l, d, door) }, px(l < level ? 'td47' : 'td46', 34));
        if (active && l === level && spade && hintDoor === d) door.classList.add('hint');
        row.append(door);
      }
      tower.append(row);
    }
  }
  let hintDoor = -1;
  function start(): boolean {
    stake = ctx.bet();
    if (!ctx.wager(stake)) return false;
    const md = G.TOWER_MODES[mode];
    fiends = Array.from({ length: G.TOWER_LEVELS }, () => { const s = new Set<number>(); while (s.size < md.bad) s.add(randInt(md.doors)); return [...s]; });
    level = 0; active = true; ctx.busy(true); ctx.say('');
    setHint(); build(); render();
    return true;
  }
  function setHint(): void { if (!spade) return; const md = G.TOWER_MODES[mode]; const safe = [...Array(md.doors).keys()].filter(d => !fiends[level].includes(d)); hintDoor = safe[randInt(safe.length)]; }
  async function pick(l: number, d: number, door: HTMLElement): Promise<void> {
    if (busyPick) return;
    if (!active) { if (l !== 0 || !start()) return; door = tower.children[G.TOWER_LEVELS - 1].children[d + 1] as HTMLElement; }
    if (l !== level) return;
    busyPick = true;
    sfx.play('slide', 0.5, 0.6); door.classList.add('opening');
    await sleep(380);
    if (fiends[l].includes(d)) {
      clear(door); door.append(px('td110', 34)); door.classList.add('bad');
      sfx.doom(); shake(tower, 1.4); flash('rgba(200,0,20,.35)');
      // reveal the row
      const row = door.parentElement!;
      fiends[l].forEach(fd => { const el = row.children[fd + 1] as HTMLElement; if (el !== door) { clear(el); el.append(px('td110', 30)); el.classList.add('bad', 'ghosted'); } });
      ctx.settle(stake, 0, tower); ctx.say('A fiend waits behind the door.', 'lose');
      active = false; ctx.busy(false); busyPick = false; render();
      return;
    }
    clear(door); door.append(px('default_gold_lump', 30)); door.classList.add('safe');
    sfx.tone(440 * Math.pow(1.12, level), 0.25, 'triangle', 0.14, 0, true);
    burst(...centerOf(door), { n: 10, size: 24 });
    level++;
    busyPick = false;
    if (level >= G.TOWER_LEVELS) { feat('tower_top'); cash(); return; }
    setHint();
    await sleep(250);
    build(); render();
    ctx.say(`Floor ${level}: ${mfmt(G.towerMult(mode, level))}`, 'win');
  }
  function cash(): void {
    if (!active || level === 0) return;
    const m = G.towerMult(mode, level);
    ctx.settle(stake, stake * m, tower); ctx.say(`You descend with ${mfmt(m)}.`, 'win');
    active = false; ctx.busy(false); build(); render();
  }
  function render(): void {
    clear(ctx.controls);
    if (!active) { ctx.controls.append(btn('Begin the climb', 'blood big', () => { start(); })); return; }
    const b = btn(level ? `Take ${fmt(stake * G.towerMult(mode, level))}` : 'Pick a door', 'blood big', cash); if (!level) b.disabled = true;
    ctx.controls.append(b);
  }
  build(); render();
};

/* ============================ WHEEL OF RUIN ============================ */
export const ruinGame: GameMount = ctx => {
  let risk: G.WheelRisk = ctx.variants<G.WheelRisk>([{ id: 'low', label: 'Low' }, { id: 'mid', label: 'Mid' }, { id: 'high', label: 'Ruin' }], 'mid', x => { risk = x; rot = 0; draw(); legend(); });
  const cv = h('canvas', { class: 'wheel-cv' }); cv.width = cv.height = 520;
  const g = cv.getContext('2d')!;
  const leg = h('div', 'ruin-legend');
  ctx.stage.append(cv, leg);
  let rot = 0, spinning = false;
  const col = (m: number) => m === 0 ? '#1b0a10' : m < 1.5 ? '#5a2a3a' : m < 2 ? '#8a4a1a' : m < 3 ? '#c9822a' : m < 5 ? '#e0b062' : m < 10 ? '#ff7a2a' : '#ff2a3a';
  function draw(): void {
    const segs = G.WHEEL_SEGMENTS[risk], n = segs.length, c = 260;
    g.clearRect(0, 0, 520, 520);
    g.save(); g.translate(c, c);
    const rim = g.createRadialGradient(0, 0, 220, 0, 0, 256); rim.addColorStop(0, '#2a0a10'); rim.addColorStop(0.7, '#b98232'); rim.addColorStop(1, '#3a1a08');
    g.fillStyle = rim; g.beginPath(); g.arc(0, 0, 256, 0, Math.PI * 2); g.fill();
    g.rotate(rot);
    segs.forEach((m, i) => {
      const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 232, a0, a1); g.closePath(); g.fillStyle = col(m); g.fill();
      g.strokeStyle = 'rgba(231,189,106,.6)'; g.lineWidth = 1.5; g.stroke();
      if (m > 0) { g.save(); g.rotate((a0 + a1) / 2); g.fillStyle = '#fff1d0'; g.font = 'bold 24px VT323, monospace'; g.textAlign = 'right'; g.fillText('×' + m, 222, 8); g.restore(); }
    });
    g.restore();
    g.fillStyle = '#120508'; g.beginPath(); g.arc(c, c, 80, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#e7bd6a'; g.lineWidth = 4; g.stroke();
    g.imageSmoothingEnabled = false; g.drawImage(pxCanvas('lottachievements_crowned_skull'), c - 40, c - 42, 80, 84);
    g.fillStyle = '#ffe08a'; g.beginPath(); g.moveTo(c, 34); g.lineTo(c - 16, 2); g.lineTo(c + 16, 2); g.closePath(); g.fill();
  }
  function legend(): void {
    clear(leg);
    const counts = new Map<number, number>(); G.WHEEL_SEGMENTS[risk].forEach(m => counts.set(m, (counts.get(m) ?? 0) + 1));
    [...counts].sort((a, b) => a[0] - b[0]).forEach(([m, c]) => leg.append(h('span', {}, h('i', { style: { background: col(m) } }), `${m ? '×' + m : '—'} · ${c}/30`)));
  }
  draw(); legend();
  async function spin(): Promise<void> {
    if (spinning) return;
    const stake = ctx.bet();
    if (!ctx.wager(stake)) return;
    spinning = true; ctx.busy(true); ctx.say('');
    const segs = G.WHEEL_SEGMENTS[risk], n = segs.length;
    const idx = G.spinWheel(risk);
    const target = -((idx + 0.5) / n) * Math.PI * 2;
    const start = rot, TAU = Math.PI * 2;
    const final = target - TAU * Math.ceil((target - start) / TAU + 5 + randInt(2));
    const total = final - start;
    const t0 = performance.now(), dur = 4200;
    let lastK = -1;
    await new Promise<void>(res => {
      const f = (now: number) => {
        const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 4);
        rot = start + total * e; draw();
        const k = Math.floor((-rot / (Math.PI * 2)) * n); if (k !== lastK) { lastK = k; sfx.tick(k); }
        if (t < 1) requestAnimationFrame(f); else res();
      };
      requestAnimationFrame(f);
    });
    rot = target; draw();
    const m = segs[idx];
    if (risk === 'high' && m > 0) feat('ruin_hit');
    ctx.settle(stake, stake * m, cv);
    ctx.say(m ? `×${m}` : 'Ruin.', m > 1 ? 'win' : m ? '' : 'lose');
    if (!m) shake(cv, 0.6);
    spinning = false; ctx.busy(false);
  }
  ctx.controls.append(btn('Spin', 'blood big', () => void spin()));
};

/* ============================ SIX CHALICES ============================ */
export const chaliceGame: GameMount = ctx => {
  type V = 'one' | 'twin' | 'rites';
  const CFG: Record<V, [number, number, number]> = { one: [6, 1, 3], twin: [6, 2, 3], rites: [12, 3, 4] };
  let v: V = ctx.variants<V>([{ id: 'one', label: 'One poison' }, { id: 'twin', label: 'Twin venom' }, { id: 'rites', label: 'Last rites 12' }], 'one', x => { v = x; eng.refresh(); });
  const host = h('div', 'chalice-host', h('img', { src: A('portraits/proprietor.webp'), alt: '' }), h('div', 'speech small', '“Drink, my guest. Only one of them is unkind.”'));
  ctx.stage.append(host);
  const vials = ['td113', 'td114', 'td115', 'td116'];
  const eng = pickEngine(ctx, {
    tiles: () => CFG[v][0], bad: () => CFG[v][1], cols: () => CFG[v][2],
    safeSprite: () => 'default_apple_gold', badSprite: 'lottacievements_skull', closedClass: 'chalice', closedSprite: undefined,
    suspense: 850, label: 'poisoned',
    onBad: () => { (host.querySelector('.speech') as HTMLElement).textContent = '“Oh dear. That one was mine.”'; },
    onClear: () => feat('chalice_all'),
  });
  // put vial art on closed tiles
  const paint = () => ctx.stage.querySelectorAll('.tile.chalice').forEach((t, i) => { if (!t.childElementCount) t.append(px(vials[i % vials.length], 44)); });
  const mo = new MutationObserver(paint); mo.observe(ctx.stage, { childList: true, subtree: true }); paint();
  return () => mo.disconnect();
};

/* ============================ DEVIL'S BARGAIN ============================ */
export const bargainGame: GameMount = ctx => {
  ctx.variants([{ id: 'std', label: 'High card against the house' }], 'std', () => undefined);
  ctx.lockBet(true);
  const devilRow = h('div', 'bargain-side', h('img', { class: 'bargain-portrait', src: A('portraits/proprietor.webp'), alt: '' }), h('div', 'bargain-card'));
  const youRow = h('div', 'bargain-side', h('img', { class: 'bargain-portrait you', src: A('portraits/wagerer.webp'), alt: '' }), h('div', 'bargain-card'));
  const stakeEl = h('div', 'mult-tag', '');
  const tiers = h('div', 'bargain-tiers');
  ctx.stage.append(devilRow, h('div', 'label-gold', 'higher card wins ×2.08 · ties belong to the house'), youRow, stakeEl, tiers);
  let tier = 1, playing = false;
  const stakeOf = () => Math.floor(S.gold * BARGAIN_TIERS[tier].frac);
  function drawTiers(): void {
    clear(tiers);
    BARGAIN_TIERS.forEach((t, i) => tiers.append(h('button', { class: 'bargain-tier' + (i === tier ? ' on' : ''), onclick: () => { if (playing) return; tier = i; drawTiers(); sfx.click(); } }, h('b', {}, t.label), h('span', {}, t.sub))));
    stakeEl.textContent = `Stake: ${fmt(stakeOf())}`;
  }
  drawTiers();
  const setCard = (row: HTMLElement, el: HTMLElement) => { const slot = row.querySelector('.bargain-card')!; clear(slot); slot.append(el); };
  setCard(devilRow, cardEl(null, 'card-img lg')); setCard(youRow, cardEl(null, 'card-img lg'));
  async function play(): Promise<void> {
    if (playing) return;
    const stake = stakeOf();
    if (stake < 10) { toast(['You have too little left to bargain with.'], 'blood'); return; }
    if (!ctx.wager(stake)) return;
    playing = true; ctx.busy(true); ctx.say('');
    setCard(devilRow, cardEl(null, 'card-img lg')); setCard(youRow, cardEl(null, 'card-img lg'));
    sfx.doom();
    let dc = randomCard(), yc = randomCard();
    await sleep(700);
    setCard(devilRow, cardEl(dc, 'card-img lg flip')); sfx.play('card', 0.9);
    await sleep(900); sfx.heartbeat(); await sleep(500); sfx.heartbeat(); await sleep(500);
    setCard(youRow, cardEl(yc, 'card-img lg flip')); sfx.play('card', 0.9);
    await sleep(400);
    while (dc.r === yc.r && S.souls > 0) {
      const again = await new Promise<boolean>(res => {
        clear(ctx.controls);
        ctx.say('A tie — the house takes ties. Burn a soul to draw again?', 'lose');
        ctx.controls.append(btn('Accept', 'ghost', () => res(false)), btn('Burn 1 soul', 'blood', () => res(true)));
      });
      if (!again) break;
      S.souls--; save(); sfx.soul();
      dc = randomCard(); yc = randomCard();
      setCard(devilRow, cardEl(dc, 'card-img lg flip')); await sleep(800);
      setCard(youRow, cardEl(yc, 'card-img lg flip')); await sleep(400);
    }
    const won = yc.r > dc.r;
    ctx.settle(stake, won ? stake * BARGAIN_PAY : 0, youRow);
    if (won) {
      const souls = BARGAIN_TIERS[tier].souls;
      if (souls) addSouls(souls, 'The Proprietor pays what he owes.');
      if (tier === 3) feat('bargain_all');
      coinShower(tier >= 2 ? 60 : 20);
      ctx.say('“Well played. This time.”', 'win');
    } else {
      shake(youRow, 1.6); flash('rgba(120,0,10,.5)');
      ctx.say(dc.r === yc.r ? '“A tie is mine, as agreed.”' : '“Mine. As it always was.”', 'lose');
    }
    playing = false; ctx.busy(false); ctx.lockBet(true); drawTiers(); render();
  }
  function render(): void { clear(ctx.controls); ctx.controls.append(btn('Strike the bargain', 'blood big', () => void play())); }
  render();
  void burst; void centerOf; void floatText;
};
