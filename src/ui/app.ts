import { h, clear, sleep } from './dom';
import { sprite } from '../art';
import { sfx } from './audio';
import { setFloor } from './bg';
import { burst, coinShower, floatText, rise, centerOf, setMotion, floorCard, flyCoins } from './fx';
import { icon, goldIcon, soulIcon, riskPips, toast, modal, confirmBox } from './ui';
import { buildGameShell } from './shell';
import { GAME_VIEWS } from './games';
import * as E from '../core/economy';
import { FLOORS, GAMES, RELICS, PACTS, FEATS, FloorId, GameDef, gameById, HOST_ARCS, hotGame } from '../core/content';
import { exportSave, importSave } from '../core/state';
import { cardImg } from './games/common';

type Tab = 'casino' | 'contracts' | 'relics' | 'ledger';
let app: HTMLElement;
let tab: Tab = 'casino';
let floor: FloorId = 'parlor';
let main: HTMLElement, hud: HTMLElement, nav: HTMLElement;
let seenGames = new Set<string>();
const SHORT: Record<FloorId, string> = { parlor: 'Parlor', salon: 'Salon', catacombs: 'Catacombs', abyss: 'Abyss' };
const ROMAN = ['I', 'II', 'III', 'IV'];

export function startApp(root: HTMLElement): void {
  app = root;
  floor = (FLOORS.filter(f => E.floorUnlocked(f.id)).pop() ?? FLOORS[0]).id;
  try { seenGames = new Set(JSON.parse(localStorage.getItem('va-seen') ?? '[]')); } catch { /* ignore */ }
  sfx.sfxOn = E.S.settings.sfx; sfx.musicOn = E.S.settings.music; setMotion(E.S.settings.motion);
  E.ensureContracts();
  wireEvents();
  title();
}
const markSeen = (id: string) => { seenGames.add(id); try { localStorage.setItem('va-seen', JSON.stringify([...seenGames])); } catch { /* ignore */ } };

/* ---------------- title & intro ---------------- */
function title(): void {
  clear(app);
  setFloor('parlor');
  const scr = h('div', 'title-screen',
    sprite('mask_proprietor', 200, 'title-mask'),
    h('h1', 'logo', 'Velvet Abyss'),
    h('div', 'logo-sub', 'A masquerade beneath the world'),
    h('button', { class: 'btn primary big', onclick: async () => {
      sfx.unlock(); sfx.setVolume(E.S.settings.volume); sfx.whoosh();
      scr.classList.add('out'); await sleep(350); scr.remove();
      if (!E.S.intro) intro(); else shell();
    } }, E.S.intro ? 'Return to the masquerade' : 'Enter'),
    h('div', 'title-foot', 'Play money only. Nothing can be bought or cashed out.'));
  document.body.append(scr);
}
function intro(): void {
  const lines = [
    'Welcome to the masquerade beneath the world.',
    'Your face is mine now — it sits in my ledger. Wear this porcelain mask until you can buy it back.',
    'The price is five million in gold. Here are five hundred to begin.',
    'Four floors, four hosts, eighteen tables. The deeper you go, the stranger the games.',
  ];
  dialog('The Proprietor', 'proprietor', lines, 'Take the gold', () => {
    E.S.intro = true; E.save(); shell();
    setTimeout(() => { coinShower(24); sfx.play('chips'); }, 300);
  });
}
function dialog(name: string, mask: string, lines: string[], last: string, done: (btn: HTMLElement) => void): void {
  let i = 0;
  const speech = h('p', 'speech', lines[0]);
  const next = h('button', { class: 'btn primary wide' }, lines.length > 1 ? 'Continue' : last);
  const close = modal(() => [h('div', 'dialog', sprite('mask_' + mask, 112, 'dialog-mask'), h('div', 'dialog-name', name), speech), next], { dismiss: false });
  next.onclick = () => {
    sfx.click(); i++;
    if (i < lines.length) { speech.textContent = lines[i]; if (i === lines.length - 1) next.textContent = last; return; }
    close(); done(next);
  };
}

/* ---------------- shell ---------------- */
function shell(): void {
  clear(app);
  hud = h('header', 'hud'); main = h('main', 'screen'); nav = h('nav', 'nav');
  app.append(hud, main, nav);
  renderHud(); renderNav(); show(tab);
}
let shownGold = -1, goldAnim = 0;
function tickGold(el: HTMLElement, to: number): void {
  if (shownGold < 0 || !E.S.settings.motion) { shownGold = to; el.textContent = E.fmt(to); return; }
  const from = shownGold, t0 = performance.now(), dur = to > from ? 800 : 300;
  cancelAnimationFrame(goldAnim);
  const f = (now: number) => {
    const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
    shownGold = from + (to - from) * e; el.textContent = E.fmt(shownGold);
    if (t < 1) goldAnim = requestAnimationFrame(f);
  };
  goldAnim = requestAnimationFrame(f);
}
function renderHud(): void {
  clear(hud);
  const S = E.S;
  shownGold = S.gold;
  const comps = h('button', { class: 'hud-btn' + (S.comps >= 1 ? ' ready' : ''), 'aria-label': 'Collect rakeback', onclick: (ev: Event) => {
    const c = E.collectComps();
    if (c > 0) { const [x, y] = centerOf(ev.currentTarget as Element); flyCoins(x, y, 8); floatText(x, y + 30, '+' + E.fmt(c)); sfx.coin(); }
    else toast([E.rakeback() > 0 ? `Rakeback: ${(E.rakeback() * 100).toFixed(1)}% of every wager collects here.` : 'Rakeback collects here once you own the Gilded Tooth relic.']);
  } }, icon('i_hand', 22));
  hud.append(
    h('button', { class: 'hud-me', 'aria-label': 'Your ledger', onclick: () => show('ledger') }, sprite('mask_player', 40), h('span', 'hud-rank', String(S.rank))),
    h('div', 'hud-mid',
      h('div', 'hud-row',
        h('div', 'pill gold', goldIcon(), h('span', { id: 'gold' }, E.fmt(S.gold))),
        h('div', 'pill soul', soulIcon(), h('span', { id: 'souls' }, String(S.souls)))),
      h('div', 'xp', h('i', { style: { width: Math.min(100, (S.xp / E.xpFor(S.rank)) * 100) + '%' } }))),
    comps);
}
function refreshHud(): void {
  if (!hud || !hud.isConnected) return;
  const g = document.getElementById('gold'), s = document.getElementById('souls');
  if (g) tickGold(g, E.S.gold);
  if (s) s.textContent = String(E.S.souls);
  const bar = hud.querySelector('.xp i') as HTMLElement | null;
  if (bar) bar.style.width = Math.min(100, (E.S.xp / E.xpFor(E.S.rank)) * 100) + '%';
  const r = hud.querySelector('.hud-rank'); if (r) r.textContent = String(E.S.rank);
  hud.querySelector('.hud-btn')?.classList.toggle('ready', E.S.comps >= 1);
  const b = nav?.querySelector('[data-tab=contracts] .badge') as HTMLElement | null;
  const ready = E.S.contracts.filter(x => x.progress >= x.target).length + (E.titheReady() ? 1 : 0);
  if (b) { b.textContent = String(ready); b.style.display = ready ? '' : 'none'; }
}
function renderNav(): void {
  clear(nav);
  const items: [Tab, string, string][] = [['casino', 'Casino', 'i_cards'], ['contracts', 'Contracts', 'i_scroll'], ['relics', 'Relics', 'i_vial'], ['ledger', 'Ledger', 'i_book']];
  for (const [id, label, ic] of items) {
    const b = h('button', { class: tab === id ? 'on' : '', 'data-tab': id, onclick: () => { sfx.click(); show(id); } }, icon(ic, 26), h('span', {}, label));
    if (id === 'contracts') b.append(h('span', 'badge', '0'));
    nav.append(b);
  }
  refreshHud();
}
function show(t: Tab): void {
  tab = t;
  nav.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.getAttribute('data-tab') === t));
  nav.style.display = ''; hud.style.display = '';
  clear(main); main.className = 'screen'; main.style.display = ''; main.scrollTop = 0;
  ({ casino: casinoScreen, contracts: contractsScreen, relics: relicsScreen, ledger: ledgerScreen })[t]();
  refreshHud();
}
const section = (title: string, ...kids: (Node | string | null)[]) => h('section', 'sec', h('h2', 'sec-title', title), ...kids);

/* ---------------- casino ---------------- */
function gameIcon(g: GameDef): HTMLElement {
  if (g.icon === 'card') {
    const pairs: Record<string, string[]> = { hilo: ['Qh', 'As'], blackjack: ['Ah', 'Ks'], poker: ['Kc', 'Kh'], baccarat: ['9d', 'Qs'] };
    const [a, b] = pairs[g.id] ?? ['As', 'Ks'];
    return h('div', 'icon-cards', cardImg(a, 'card-img mini'), cardImg(b, 'card-img mini'));
  }
  if (g.icon === 'wheel') return miniWheel(g.id === 'ruin');
  return sprite(g.icon, 56);
}
function miniWheel(ruin: boolean): HTMLElement {
  const c = h('canvas', { class: 'spr' }); c.width = c.height = 24; c.style.width = c.style.height = '48px';
  const g = c.getContext('2d')!;
  const n = 12;
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    const dx = x - 11.5, dy = y - 11.5, r = Math.hypot(dx, dy);
    if (r > 11.5) continue;
    const seg = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * n);
    g.fillStyle = r > 10.3 ? '#0c0710' : r > 9 ? '#c99032' : r < 3 ? '#f6d27a' : ruin ? (seg === 0 ? '#f6d27a' : seg % 2 ? '#34172c' : '#5c1a35') : seg === 0 ? '#2f9d55' : seg % 2 ? '#9a1f37' : '#1c0e1a';
    g.fillRect(x, y, 1, 1);
  }
  return c;
}
function casinoScreen(): void {
  const fl = FLOORS.find(f => f.id === floor)!;
  setFloor(floor);
  document.documentElement.dataset.floor = floor;
  // floor tabs
  const tabs = h('div', 'floor-tabs', { role: 'tablist' });
  FLOORS.forEach((f, i) => {
    const unlocked = E.floorUnlocked(f.id);
    tabs.append(h('button', { class: `ftab ${f.id === floor ? 'on' : ''} ${unlocked ? '' : 'locked'}`, role: 'tab', onclick: () => {
      if (!unlocked) { toast([`${f.name} opens at rank ${f.rank}.`]); return; }
      if (f.id === floor) return;
      floor = f.id; void floorCard(`Floor ${ROMAN[i]}`, f.name, f.host, f.lore); setTimeout(() => show('casino'), 300);
    } }, h('b', {}, ROMAN[i]), h('span', {}, unlocked ? SHORT[f.id] : `Rank ${f.rank}`)));
  });
  // host strip
  const arcs = HOST_ARCS[floor], stage = E.arcStage(floor);
  const nextAt = arcs[stage]?.at, prevAt = stage ? arcs[stage - 1].at : 0, fav = E.S.favor[floor] ?? 0;
  const favPct = nextAt === undefined ? 100 : Math.min(100, ((fav - prevAt) / Math.max(1, nextAt - prevAt)) * 100);
  const pending = E.pendingArc(floor);
  const host = h('div', 'host panel',
    sprite('mask_' + fl.host, 96, 'host-mask'),
    h('div', 'host-body',
      h('div', 'host-name', fl.hostName), h('div', 'host-floor', fl.name),
      h('p', 'host-quote', fl.lore),
      h('div', 'favor', h('span', {}, E.hostTitle(floor)), h('div', 'bar', h('i', { style: { width: favPct + '%' } })), h('span', 'num', nextAt === undefined ? 'max' : `${fav}/${nextAt}`))),
    pending ? h('button', { class: 'btn gold sm talk', onclick: () => hostDialog(floor) }, 'Speak') : null);
  if (pending && !arcShown.has(floor + stage)) { arcShown.add(floor + stage); setTimeout(() => hostDialog(floor), 450); }
  // tables
  const grid = h('div', 'tables');
  const hot = hotGame();
  for (const g of GAMES.filter(x => x.floor === floor)) {
    const unlocked = E.gameUnlocked(g.id);
    const tag = !unlocked ? h('span', 'tag lock', `Rank ${g.rank}`) : g.id === hot ? h('span', 'tag hot', 'Hot ×2') : !seenGames.has(g.id) ? h('span', 'tag new', 'New') : null;
    grid.append(h('button', { class: 'table-card' + (unlocked ? '' : ' locked'), onclick: () => {
      if (!unlocked) { toast([`${g.name} opens at rank ${g.rank}.`]); return; }
      markSeen(g.id); openGame(g);
    } },
      h('div', 'tc-art', gameIcon(g)), tag,
      h('div', 'tc-name', g.name), h('div', 'tc-tag', g.tag),
      h('div', 'tc-foot', h('span', {}, 'RTP ' + g.rtp), riskPips(g.risk))));
  }
  // tonight
  const rows: HTMLElement[] = [];
  const left = Math.max(0, E.titheEvery - (Date.now() - E.S.lastTithe));
  rows.push(row('bell', 'The Tithe', left ? `A gift from the house in ${Math.ceil(left / 60000)} min.` : 'A gift from the house is ready.', left ? null : h('button', { class: 'btn primary sm', onclick: titheWheel }, 'Spin')));
  if (E.S.loan) rows.push(row('chest', 'Debt', `You owe ${E.fmt(E.S.loan.owed)}. 30% of every win repays it.`, null, 'danger'));
  const price = E.soulPrice();
  rows.push(row('mask_player', 'Your face', `${E.fmt(E.S.gold)} of ${E.fmt(price)} to buy it back.`, h('button', { class: 'btn gold sm', disabled: E.S.gold < price ? true : undefined, onclick: redeem }, 'Redeem'), '', Math.min(100, (E.S.gold / price) * 100)));
  main.append(tabs, host, section('Tables', grid), section('Tonight', h('div', 'rows', ...rows)));
}
function row(spr: string, name: string, text: string, action: HTMLElement | null, cls = '', pct?: number): HTMLElement {
  return h('div', `row panel ${cls}`, h('div', 'row-ic', sprite(spr, 36)), h('div', 'row-body', h('div', 'row-name', name), h('div', 'row-text', text), pct !== undefined ? h('div', 'bar', h('i', { style: { width: pct + '%' } })) : null), action);
}
const arcShown = new Set<string>();
function hostDialog(f: FloorId): void {
  const st = E.pendingArc(f);
  if (!st) return;
  const fl = FLOORS.find(x => x.id === f)!;
  dialog(`${fl.hostName} · ${st.title}`, fl.host, st.lines, 'Accept the gift', btn => {
    const [x, y] = centerOf(btn);
    const r = E.claimArc(f);
    if (r) { flyCoins(x, y, 14); sfx.win(3); toast([`${st.title}: +${E.fmt(r.gold)} gold${r.souls ? `, +${r.souls} soul${r.souls > 1 ? 's' : ''}` : ''}`], 'gold'); }
    if (tab === 'casino') setTimeout(() => show('casino'), 250);
  });
}
function titheWheel(): void {
  const c = h('canvas', { class: 'tithe-cv' }); c.width = c.height = 280;
  const g = c.getContext('2d')!;
  const sl = E.TITHE_SLICES;
  const draw = (rot: number) => {
    g.clearRect(0, 0, 280, 280); g.save(); g.translate(140, 140); g.rotate(rot);
    sl.forEach((v, i) => {
      const a0 = (i / sl.length) * Math.PI * 2, a1 = ((i + 1) / sl.length) * Math.PI * 2;
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 128, a0, a1); g.closePath();
      g.fillStyle = v >= 20 ? '#9a1f37' : i % 2 ? '#1c0e1a' : '#34172c'; g.fill();
      g.strokeStyle = '#c99032'; g.lineWidth = 2; g.stroke();
      g.save(); g.rotate((a0 + a1) / 2); g.fillStyle = '#f6d27a'; g.font = '24px "Jersey 15", monospace'; g.textAlign = 'right'; g.fillText('×' + v, 116, 8); g.restore();
    });
    g.restore();
    g.fillStyle = '#f6d27a'; g.beginPath(); g.moveTo(140, 6); g.lineTo(130, 26); g.lineTo(150, 26); g.fill();
    g.beginPath(); g.arc(140, 140, 18, 0, Math.PI * 2); g.fillStyle = '#c99032'; g.fill();
  };
  draw(0);
  const btn = h('button', { class: 'btn primary big wide' }, 'Spin');
  const close = modal(() => [h('h3', 'm-title', 'The Tithe'), h('p', 'm-text', 'Each slice multiplies your table limit.'), c, btn]);
  btn.onclick = async () => {
    btn.disabled = true;
    const r = E.claimTithe();
    if (!r) { close(); return; }
    const n = sl.length;
    const target = -Math.PI / 2 - ((r.slice + 0.5) / n) * Math.PI * 2 + Math.PI * 2 * 6;
    const t0 = performance.now(), dur = 3600;
    let lastTick = 0;
    await new Promise<void>(res => {
      const f = (now: number) => {
        const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 4);
        draw(target * e);
        const tk = Math.floor(((target * e) / (Math.PI * 2)) * n); if (tk !== lastTick) { lastTick = tk; sfx.tick(tk); }
        if (t < 1) requestAnimationFrame(f); else res();
      };
      requestAnimationFrame(f);
    });
    sfx.win(3);
    btn.textContent = `+${E.fmt(r.gold)} gold${r.souls ? ' · +1 soul' : ''}`;
    const [x, y] = centerOf(btn); flyCoins(x, y, 14);
    setTimeout(() => { close(); if (tab === 'casino') show('casino'); }, 1500);
  };
}
function redeem(): void {
  confirmBox('Buy back your face?', `Pay ${E.fmt(E.soulPrice())} gold. Gold, rank and contracts reset. Relics, souls and feats stay, and you gain a Sigil: every table limit ×1.5, for good. The next face costs more.`, 'Redeem', () => {
    if (E.buyFreedom()) {
      coinShower(60); sfx.bigWin();
      dialog('The Proprietor', 'proprietor', ['Your own face again. How quaint.', 'You will be back — they always come back. The next one will cost a little more.'], 'Begin again', () => { floor = 'parlor'; shell(); });
    }
  }, true);
}
function openGame(g: GameDef): void {
  sfx.play('shove', 0.5);
  setFloor(g.floor);
  clear(main);
  nav.style.display = 'none';
  main.className = 'screen game-host';
  main.append(buildGameShell(g, GAME_VIEWS[g.id], () => { renderHud(); show('casino'); }));
}

/* ---------------- contracts ---------------- */
function contractsScreen(): void {
  E.ensureContracts();
  const list = h('div', 'rows');
  for (const c of E.S.contracts) {
    const done = c.progress >= c.target;
    const pct = Math.min(100, (c.progress / c.target) * 100);
    const act = h('button', { class: 'btn sm ' + (done ? 'primary' : 'ghost'), onclick: (ev: Event) => {
      if (!done) { confirmBox('Swap this contract?', `Pay ${E.fmt(E.rerollCost())} gold for a different one.`, 'Swap', () => { if (E.rerollContract(c.id)) show('contracts'); else toast(['Not enough gold.'], 'danger'); }); return; }
      const r = E.claimContract(c.id);
      if (r) { const [x, y] = centerOf(ev.currentTarget as Element); flyCoins(x, y, 12); sfx.win(2); if (r.souls) { rise(x, y); sfx.soul(); } setTimeout(() => show('contracts'), 500); }
    } }, done ? 'Claim' : 'Swap');
    const spr = c.kind === 'mult' ? 'crown_skull' : c.kind === 'wager' ? 'coin' : c.kind === 'bigwin' ? 'diamond' : c.kind === 'floor' ? 'door' : 'i_scroll';
    const progressText = c.kind === 'mult' || c.kind === 'bigwin' ? (done ? 'Done' : 'Not yet') : `${E.fmt(c.progress)} / ${E.fmt(c.target)}`;
    list.append(h('div', `row panel ${done ? 'ready' : ''}`, h('div', 'row-ic', sprite(spr, 36)),
      h('div', 'row-body', h('div', 'row-name', c.text), h('div', 'row-text', `${progressText} · reward ${E.fmt(c.gold)} gold${c.souls ? ` + ${c.souls} soul` : ''}`), h('div', 'bar', h('i', { style: { width: pct + '%' } }))),
      act));
  }
  main.append(section('Contracts', h('p', 'intro', 'Finish one and the house writes another.'), list));
  const left = Math.max(0, E.titheEvery - (Date.now() - E.S.lastTithe));
  main.append(section('The Tithe', row('bell', 'A gift from the house', left ? `Ready in ${Math.ceil(left / 60000)} min.` : 'Ready now.', h('button', { class: 'btn sm ' + (left ? 'ghost' : 'primary'), disabled: left ? true : undefined, onclick: titheWheel }, 'Spin'))));
}

/* ---------------- relics & pacts ---------------- */
function relicsScreen(): void {
  const list = h('div', 'rows');
  for (const r of RELICS) {
    const lvl = E.relic(r.id), maxed = lvl >= r.max, cost = r.cost[lvl];
    const lv = h('div', 'lvl'); for (let i = 0; i < r.max; i++) lv.append(h('i', i < lvl ? 'on' : ''));
    list.append(h('div', 'row panel', h('div', 'row-ic', sprite(r.sprite, 36)),
      h('div', 'row-body', h('div', 'row-name', r.name), h('div', 'row-text', r.desc(Math.max(1, maxed ? lvl : lvl + 1))), lv),
      h('button', { class: 'btn sm gold', disabled: maxed || E.S.souls < cost ? true : undefined, onclick: (ev: Event) => {
        if (E.buyRelic(r.id)) { const [x, y] = centerOf(ev.currentTarget as Element); rise(x, y); sfx.soul(); toast([`${r.name} is yours.`], 'soul'); show('relics'); }
      } }, maxed ? 'Owned' : h('span', 'cost', soulIcon(16), String(cost)))));
  }
  main.append(section('Relics', h('p', 'intro', 'Permanent. Paid in souls, which come from ranks, feats, contracts and very large wins.'), list));
  const pl = h('div', 'rows');
  for (const p of PACTS) {
    const active = E.S.pact?.id === p.id;
    pl.append(h('div', `row panel ${active ? 'ready' : ''}`, h('div', 'row-ic', sprite(p.sprite, 36)),
      h('div', 'row-body', h('div', 'row-name', p.name), h('div', 'row-text', active ? `${p.desc} ${E.S.pact!.left} left.` : p.desc)),
      h('button', { class: 'btn sm primary', disabled: !!E.S.pact || E.S.souls < p.cost ? true : undefined, onclick: () => {
        if (E.signPact(p.id)) { sfx.doom(); toast([`${p.name} is signed.`], 'danger'); show('relics'); }
      } }, active ? 'Active' : h('span', 'cost', soulIcon(16), String(p.cost)))));
  }
  main.append(section('Pacts', h('p', 'intro', 'Temporary. One at a time.'), pl));
}

/* ---------------- ledger: you, debt, records, grimoire, settings ---------------- */
function ledgerScreen(): void {
  const S = E.S;
  main.append(h('div', 'host panel', sprite('mask_player', 96, 'host-mask'),
    h('div', 'host-body', h('div', 'host-name', `Rank ${S.rank}`), h('div', 'host-floor', S.sigils ? `${S.sigils} sigil${S.sigils > 1 ? 's' : ''} · cycle ${S.cycle + 1}` : 'The porcelain guest'),
      h('p', 'host-quote', `Table limit ${E.fmt(E.minBet())}–${E.fmt(E.maxBet())}. Next rank in ${E.fmt(E.xpFor(S.rank) - S.xp)} infamy.`))));
  if (S.loan) {
    main.append(section('Debt', row('chest', `You owe ${E.fmt(S.loan.owed)}`, '30% of every win goes to the Proprietor until it is paid.', h('button', { class: 'btn sm gold', disabled: S.gold < S.loan.owed ? true : undefined, onclick: () => { if (E.repayLoan()) { sfx.win(2); show('ledger'); } } }, 'Repay'), 'danger')));
  } else if (E.canBorrow()) {
    main.append(section('The Proprietor’s mercy', row('mask_proprietor', `Borrow ${E.fmt(E.loanAmount())}`, `Repay ${E.fmt(Math.round(E.loanAmount() * (1 + E.loanInterest())))}. Offered only to the broke.`, h('button', { class: 'btn sm primary', onclick: () => { const a = E.borrow(); if (a) { sfx.doom(); toast([`+${E.fmt(a)} gold. The ink is still wet.`], 'danger'); show('ledger'); } } }, 'Sign'), 'danger')));
  }
  const st = (k: string, v: string) => h('div', 'stat', h('div', 'k', k), h('div', 'v', v));
  main.append(section('Records', h('div', 'stats', st('Rounds', E.fmt(S.stats.rounds)), st('Wins', E.fmt(S.stats.wins)), st('Wagered', E.fmt(S.stats.wagered)), st('Returned', E.fmt(S.stats.won)),
    st('Biggest win', E.fmt(S.stats.biggestWin)), st('Best ×', '×' + E.fmt(S.stats.biggestMult)), st('Peak gold', E.fmt(S.stats.peakGold)), st('Contracts', String(S.stats.contractsDone)))));
  const got = FEATS.filter(f => S.feats[f.id]).length;
  const feats = h('div', 'feats');
  for (const f of FEATS) {
    const has = !!S.feats[f.id];
    feats.append(h('div', `feat ${has ? 'got' : ''}`, { title: f.desc }, sprite(has ? 'crown_skull' : 'skull', 32), h('div', 'feat-name', f.name), h('div', 'feat-desc', `${f.desc}${f.souls ? ` · +${f.souls}` : ''}`)));
  }
  main.append(section(`Grimoire · ${got}/${FEATS.length}`, feats));
  const tog = (label: string, val: boolean, set: (v: boolean) => void) => h('div', 'setting', h('span', {}, label), h('button', { class: 'switch' + (val ? ' on' : ''), role: 'switch', 'aria-checked': String(val), onclick: () => { set(!val); E.save(); show('ledger'); } }, h('i')));
  main.append(section('Settings', h('div', 'panel settings',
    tog('Sound effects', S.settings.sfx, v => { S.settings.sfx = v; sfx.sfxOn = v; }),
    tog('Music', S.settings.music, v => { S.settings.music = v; sfx.setMusic(v); }),
    tog('Motion and particles', S.settings.motion, v => { S.settings.motion = v; setMotion(v); }),
    h('div', 'setting', h('span', {}, 'Save'), h('div', 'm-actions',
      h('button', { class: 'btn sm ghost', onclick: () => { const code = exportSave(S); void navigator.clipboard?.writeText(code).catch(() => undefined); modal(c => [h('h3', 'm-title', 'Your save'), h('textarea', { class: 'save-code', readonly: true }, code), h('button', { class: 'btn gold', onclick: c }, 'Done')]); } }, 'Export'),
      h('button', { class: 'btn sm ghost', onclick: importDialog }, 'Import'))),
    h('div', 'setting', h('span', {}, 'Erase everything'), h('button', { class: 'btn sm primary', onclick: () => confirmBox('Erase everything?', 'Every coin, soul, relic and feat will be lost.', 'Erase', () => { E.resetAll(); location.reload(); }, true) }, 'Reset')))));
  main.append(h('p', 'credit', 'Velvet Abyss · play money only · all art drawn for this game · sounds: Kenney (CC0)'));
}
function importDialog(): void {
  const ta = h('textarea', { class: 'save-code', placeholder: 'Paste a save code' });
  modal(close => [h('h3', 'm-title', 'Import a save'), ta, h('div', 'm-actions', h('button', { class: 'btn ghost', onclick: close }, 'Cancel'), h('button', { class: 'btn gold', onclick: () => { const n = importSave(ta.value); if (n) { close(); E.replaceSave(n); shell(); } else toast(['That code is not a save.'], 'danger'); } }, 'Import'))]);
}

/* ---------------- events → notifications ---------------- */
function wireEvents(): void {
  E.on(ev => {
    switch (ev.t) {
      case 'gold': refreshHud(); break;
      case 'rank': sfx.win(4); toast([`Rank ${ev.rank}. +${E.fmt(ev.gold)} gold, +${ev.souls} soul${ev.souls > 1 ? 's' : ''}. Limit ${E.fmt(E.maxBet())}.`], 'gold', sprite('crown_skull', 28)); renderHudSoon(); break;
      case 'feat': { const f = FEATS.find(x => x.id === ev.id)!; toast([`Feat: ${f.name}${f.souls ? ` · +${f.souls} soul${f.souls > 1 ? 's' : ''}` : ''}`], 'soul', sprite('crown_skull', 28)); break; }
      case 'contract': toast([`Contract done: ${ev.c.text}`], 'gold', sprite('i_scroll', 28)); break;
      case 'soul': toast([`+${ev.n} soul. ${ev.why}`], 'soul', sprite('i_soul', 28)); sfx.soul(); break;
      case 'toast': toast([ev.text], ev.kind === 'blood' ? 'danger' : ev.kind ?? ''); break;
      case 'floor': { const f = FLOORS.find(x => x.id === ev.id)!; toast([`${f.name} is open.`], 'gold', sprite('mask_' + f.host, 28)); break; }
      case 'host': { const f = FLOORS.find(x => x.id === ev.floor)!; toast([`${f.hostName} wishes a word.`], 'gold', sprite('mask_' + f.host, 28)); break; }
      case 'game': toast([`New table: ${gameById(ev.id).name}`], 'gold', sprite('door', 28)); break;
    }
  });
}
let hudTimer = 0;
function renderHudSoon(): void { clearTimeout(hudTimer); hudTimer = window.setTimeout(() => { if (hud?.isConnected) renderHud(); }, 50); }
void burst; void floatText;
