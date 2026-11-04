import { h, A, clear, sleep } from './dom';
import { px } from './px';
import { sfx } from './audio';
import { setFloor } from './bg';
import { burst, coinShower, floatText, rise, centerOf, setMotion } from './fx';
import { icon, goldIcon, soulIcon, skulls, toast, modal, confirmBox } from './ui';
import { buildGameShell } from './shell';
import { GAME_VIEWS } from './games';
import * as E from '../core/economy';
import { FLOORS, GAMES, RELICS, PACTS, FEATS, FloorId, GameDef, gameById } from '../core/content';
import { exportSave, importSave } from '../core/state';
import { cardImg } from './games/common';

type Tab = 'casino' | 'contracts' | 'relics' | 'grimoire' | 'ledger';
let app: HTMLElement;
let tab: Tab = 'casino';
let floor: FloorId = 'parlor';
let main: HTMLElement;
let hud: HTMLElement;
let nav: HTMLElement;
let seenGames = new Set<string>();

export function startApp(root: HTMLElement): void {
  app = root;
  floor = (FLOORS.filter(f => E.floorUnlocked(f.id)).pop() ?? FLOORS[0]).id;
  try { seenGames = new Set(JSON.parse(localStorage.getItem('va-seen') ?? '[]')); } catch { /* ignore */ }
  sfx.sfxOn = E.S.settings.sfx; sfx.musicOn = E.S.settings.music; setMotion(E.S.settings.motion);
  E.ensureContracts();
  wireEvents();
  title();
}

/* ---------------- title & intro ---------------- */
function title(): void {
  clear(app);
  setFloor('abyss', 0.8);
  const enter = h('button', { class: 'btn blood big pulse', onclick: async () => {
    sfx.unlock(); sfx.setVolume(E.S.settings.volume); sfx.whoosh();
    scr.style.transition = 'opacity .6s'; scr.style.opacity = '0';
    await sleep(500); scr.remove();
    if (!E.S.intro) intro(); else shell();
  } }, E.S.intro ? 'Descend' : 'Enter');
  const scr = h('div', 'title-screen',
    h('img', { class: 'title-portrait', src: A('portraits/proprietor.webp'), alt: '' }),
    h('h1', 'logo h1 gild', 'Velvet', h('br'), 'Abyss'),
    h('div', 'logo-sub', 'a casino beneath the world'),
    enter,
    h('div', 'title-foot', 'Play money only. Nothing here can be bought, and nothing can be cashed out.'));
  document.body.append(scr);
}
function intro(): void {
  const lines = [
    'Ah. Another soul washed down from the world above.',
    'You owe me, of course. Everyone who arrives here owes me. Your soul is in my ledger now — five million in gold will buy it back.',
    'Here are five hundred to begin. Play my tables. Climb my floors. Grow infamous… or grow into one of my debtors.',
    'The deeper you go, the stranger the games. Do try not to die of it.',
  ];
  let i = 0;
  const speech = h('div', 'speech', lines[0]);
  const next = h('button', { class: 'btn blood wide', style: { marginTop: '14px' } }, 'Continue');
  const close = modal(() => [h('h3', 'h2 gild', 'The Proprietor'), h('div', 'dialog', h('img', { src: A('portraits/proprietor.webp'), alt: '' }), speech), next], { blood: true, dismiss: false });
  next.onclick = () => {
    sfx.click();
    i++;
    if (i < lines.length) { speech.textContent = lines[i]; if (i === lines.length - 1) next.textContent = 'Take the gold'; return; }
    close(); E.S.intro = true; E.save(); shell();
    setTimeout(() => { coinShower(30, ['default_gold_lump', 'default_gold_ingot']); sfx.play('chips'); }, 400);
  };
}

/* ---------------- shell ---------------- */
function shell(): void {
  clear(app);
  hud = h('div', 'hud');
  main = h('div', 'screen');
  nav = h('nav', 'nav');
  app.append(hud, main, nav);
  app.append(h('div', 'grain'));
  renderHud(); renderNav(); show(tab);
}
function renderHud(): void {
  clear(hud);
  const S = E.S;
  const pct = Math.min(100, (S.xp / E.xpFor(S.rank)) * 100);
  const comps = h('button', { class: 'iconbtn comp-btn' + (S.comps >= 1 ? ' ready' : ''), 'aria-label': 'Collect rakeback', onclick: (ev: Event) => {
    const c = E.collectComps();
    if (c > 0) { const [x, y] = centerOf(ev.currentTarget as Element); floatText(x, y + 30, '+' + E.fmt(c)); burst(x, y, { n: 16 }); sfx.coin(); }
    else toast(['Rakeback collects here. ', E.rakeback() > 0 ? `You earn ${(E.rakeback() * 100).toFixed(1)}% of every wager.` : 'Buy the Gilded Tooth to earn it.']);
  } }, icon('hand_token'));
  hud.append(
    h('div', { class: 'hud-avatar', onclick: () => show('ledger') }, h('img', { src: A('portraits/wagerer.webp'), alt: 'You' }), h('div', 'hud-rank', String(S.rank))),
    h('div', 'hud-mid',
      h('div', 'hud-row',
        h('div', 'pill gold-pill', goldIcon(), h('span', { id: 'gold' }, E.fmt(S.gold))),
        h('div', 'pill soul-pill', soulIcon(), h('span', { id: 'souls' }, String(S.souls)))),
      h('div', 'xpbar', h('i', { style: { width: pct + '%' } }))),
    comps);
}
let lastGold = 0;
function refreshHud(): void {
  if (!hud || !hud.isConnected) return;
  const g = document.getElementById('gold'), s = document.getElementById('souls');
  if (g) { g.textContent = E.fmt(E.S.gold); if (E.S.gold > lastGold + 0.001) g.parentElement!.classList.add('bump'), setTimeout(() => g.parentElement?.classList.remove('bump'), 400); }
  lastGold = E.S.gold;
  if (s) s.textContent = String(E.S.souls);
  const bar = hud.querySelector('.xpbar i') as HTMLElement | null;
  if (bar) bar.style.width = Math.min(100, (E.S.xp / E.xpFor(E.S.rank)) * 100) + '%';
  const r = hud.querySelector('.hud-rank'); if (r) r.textContent = String(E.S.rank);
  const c = hud.querySelector('.comp-btn'); if (c) c.classList.toggle('ready', E.S.comps >= 1);
  const b = nav?.querySelector('[data-tab=contracts] .badge') as HTMLElement | null;
  const ready = E.S.contracts.filter(x => x.progress >= x.target).length + (E.titheReady() ? 1 : 0);
  if (b) { b.textContent = String(ready); b.style.display = ready ? '' : 'none'; }
}
function renderNav(): void {
  clear(nav);
  const items: [Tab, string, string][] = [['casino', 'Casino', 'suit_spades'], ['contracts', 'Contracts', 'book_open'], ['relics', 'Relics', 'flask_full'], ['grimoire', 'Grimoire', 'award'], ['ledger', 'Ledger', 'pouch']];
  for (const [id, label, ic] of items) {
    const b = h('button', { class: tab === id ? 'on' : '', 'data-tab': id, onclick: () => { sfx.click(); show(id); } }, icon(ic, 26), label);
    if (id === 'contracts') b.append(h('span', 'badge', '0'));
    nav.append(b);
  }
  refreshHud();
}
function show(t: Tab): void {
  tab = t;
  nav.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.getAttribute('data-tab') === t));
  nav.style.display = '';
  hud.style.display = '';
  clear(main);
  main.className = 'screen';
  main.scrollTop = 0;
  void main.offsetWidth;
  ({ casino: casinoScreen, contracts: contractsScreen, relics: relicsScreen, grimoire: grimoireScreen, ledger: ledgerScreen })[t]();
}

/* ---------------- casino hub ---------------- */
function gameIcon(g: GameDef, size = 64): HTMLElement {
  switch (g.icon) {
    case 'die': { const i = h('img', { src: A('ui/dieR6.png'), alt: '' }); i.width = size * 0.85; return i; }
    case 'card': {
      const pairs: Record<string, string[]> = { hilo: ['Qh', 'As'], blackjack: ['Ah', 'Ks'], poker: ['Kc', 'Kh'], baccarat: ['9d', 'Qs'] };
      const [a, b] = pairs[g.id] ?? ['As', 'Ks'];
      const w = h('div', { style: { display: 'flex' } }, cardImg(a, 'card-img'), cardImg(b, 'card-img'));
      (w.children[0] as HTMLElement).style.cssText = 'width:46px;transform:rotate(-10deg) translateX(8px)';
      (w.children[1] as HTMLElement).style.cssText = 'width:46px;transform:rotate(8deg) translateX(-8px)';
      return w;
    }
    case 'wheel': return miniWheel(size, g.id === 'ruin');
    case 'moon': return h('div', { style: { width: size * 0.8 + 'px', height: size * 0.8 + 'px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #ff8a6a, #b3122b 50%, #3a0008 100%)', boxShadow: '0 0 24px #ff2a3a' } });
    case 'door': return px('td46', size);
    case 'racer': return px('td121', size);
    case 'proprietor': { const i = h('img', { src: A('portraits/proprietor.webp'), alt: '' }); i.width = size * 1.2; return i; }
    default: return px(g.icon, size);
  }
}
function miniWheel(size: number, ruin: boolean): HTMLElement {
  const c = h('canvas'); c.width = c.height = 128; c.style.width = c.style.height = size + 'px';
  const g = c.getContext('2d')!; const n = ruin ? 30 : 37;
  for (let i = 0; i < n; i++) {
    g.beginPath(); g.moveTo(64, 64); g.arc(64, 64, 60, (i / n) * Math.PI * 2, ((i + 1) / n) * Math.PI * 2); g.closePath();
    g.fillStyle = ruin ? (i === 0 ? '#ffd27a' : i % 2 ? '#2a0a10' : '#3e1018') : i === 0 ? '#1f7a4a' : i % 2 ? '#b3122b' : '#140608'; g.fill();
  }
  g.lineWidth = 5; g.strokeStyle = '#d9a64e'; g.beginPath(); g.arc(64, 64, 61, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#d9a64e'; g.beginPath(); g.arc(64, 64, 14, 0, Math.PI * 2); g.fill();
  return c;
}
function casinoScreen(): void {
  const fl = FLOORS.find(f => f.id === floor)!;
  setFloor(floor);
  document.documentElement.style.setProperty('--accent', fl.accent);
  document.documentElement.style.setProperty('--glow', fl.glow);
  const tabs = h('div', 'floors');
  FLOORS.forEach((f, i) => {
    const unlocked = E.floorUnlocked(f.id);
    const b = h('button', { class: `floor-tab ${f.id === floor ? 'on' : ''} ${unlocked ? '' : 'locked'}`, 'aria-label': f.name, onclick: () => {
      if (!unlocked) { toast([h('b', {}, f.name), ` opens at infamy rank ${f.rank}.`]); return; }
      floor = f.id; sfx.whoosh(); show('casino');
    } }, h('img', { src: A(`portraits/${f.host}.webp`), alt: '' }), h('span', 'roman', ['I', 'II', 'III', 'IV'][i]));
    if (!unlocked) b.append(h('div', 'lock', h('div', {}, icon('lock_closed'), h('div', {}, 'R' + f.rank))));
    tabs.append(b);
  });
  const hero = h('div', 'hero panel frame',
    h('div', 'hero-portrait', h('img', { src: A(`portraits/${fl.host}.webp`), alt: fl.hostName })),
    h('div', {}, h('div', 'sub', `${fl.sub} · ${fl.hostName}`), h('h2', 'h1 gild', fl.name), h('p', 'lore', fl.lore)));
  const grid = h('div', 'games');
  for (const g of GAMES.filter(x => x.floor === floor)) {
    const unlocked = E.gameUnlocked(g.id);
    const fresh = unlocked && !seenGames.has(g.id);
    const card = h('button', { class: 'gcard' + (unlocked ? '' : ' locked'), onclick: () => {
      if (!unlocked) { toast([h('b', {}, g.name), ` unlocks at infamy rank ${g.rank}.`]); return; }
      seenGames.add(g.id); try { localStorage.setItem('va-seen', JSON.stringify([...seenGames])); } catch { /* ignore */ }
      openGame(g);
    } },
      h('div', 'niche', gameIcon(g)),
      h('div', 'body', h('div', 'name', g.name), h('div', 'tag', g.tag), h('div', 'meta', h('span', {}, 'RTP ' + g.rtp), skulls(g.risk))));
    if (!unlocked) card.append(h('div', 'lockbar', 'Rank ' + g.rank));
    if (fresh) card.append(h('div', 'newtag', 'NEW'));
    grid.append(card);
  }
  main.append(tabs, hero);
  // tithe banner
  if (E.titheReady()) {
    main.append(h('button', { class: 'tithe panel frame-thin', style: { width: '100%', border: '9px solid transparent', cursor: 'pointer', textAlign: 'left' }, onclick: titheWheel },
      px('coins_bucket_scrap_gold', 44), h('div', { style: { flex: '1' } }, h('div', 'h2 gild', 'The Tithe is ready'), h('div', 'muted small', 'A gift from the house, every three hours.')), h('span', 'btn sm blood pulse', 'Spin')));
  }
  if (E.S.loan) main.append(h('div', { class: 'tithe panel frame-thin frame-blood', style: { border: '9px solid transparent' } }, px('td92', 40), h('div', {}, h('div', 'h2', { style: { color: '#ff8a96' } }, 'In debt'), h('div', 'muted small', `You owe ${E.fmt(E.S.loan.owed)}. 30% of every win goes to the Proprietor.`))));
  main.append(h('div', 'section-title', 'Tables'), grid);
  // soul price
  const price = E.soulPrice();
  const pct = Math.min(100, (E.S.gold / price) * 100);
  main.append(h('div', 'soulbar panel frame',
    h('div', 'row', h('div', 'h2 gild', 'Your Soul'), h('div', 'num', { style: { fontSize: '22px', color: 'var(--gold-hi)' } }, `${E.fmt(E.S.gold)} / ${E.fmt(price)}`)),
    h('div', 'prog', h('i', { style: { width: pct + '%' } })),
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', gap: '8px' } },
      h('div', 'muted small', E.S.cycle ? `Cycle ${E.S.cycle + 1} · ${E.S.sigils} sigil${E.S.sigils > 1 ? 's' : ''} (limits ×${E.sigilMult().toFixed(2)})` : 'Buy it back to break the cycle — and begin again, stronger.'),
      h('button', { class: 'btn sm blood', disabled: E.S.gold < price ? true : undefined, onclick: redeem }, 'Redeem'))));
}
function titheWheel(): void {
  const c = h('canvas'); c.width = c.height = 300; c.style.cssText = 'width:240px;height:240px;margin:6px auto;display:block';
  const g = c.getContext('2d')!;
  const sl = E.TITHE_SLICES;
  const draw = (rot: number) => {
    g.clearRect(0, 0, 300, 300); g.save(); g.translate(150, 150); g.rotate(rot);
    sl.forEach((v, i) => {
      const a0 = (i / sl.length) * Math.PI * 2, a1 = ((i + 1) / sl.length) * Math.PI * 2;
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 140, a0, a1); g.closePath();
      g.fillStyle = v >= 20 ? '#b3122b' : i % 2 ? '#2a0a12' : '#45131f'; g.fill();
      g.strokeStyle = '#d9a64e'; g.lineWidth = 2; g.stroke();
      g.save(); g.rotate((a0 + a1) / 2); g.fillStyle = '#ffe9b0'; g.font = 'bold 22px VT323, monospace'; g.textAlign = 'right'; g.fillText('×' + v, 128, 7); g.restore();
    });
    g.restore();
    g.fillStyle = '#e7bd6a'; g.beginPath(); g.moveTo(150, 4); g.lineTo(138, 28); g.lineTo(162, 28); g.fill();
    g.beginPath(); g.arc(150, 150, 22, 0, Math.PI * 2); g.fillStyle = '#d9a64e'; g.fill();
  };
  draw(0);
  const btn = h('button', { class: 'btn blood big wide' }, 'Spin the Tithe');
  const close = modal(() => [h('h3', 'h2 gild', 'The Tithe'), h('p', 'muted small', 'Multiplies your table limit.'), c, btn], { dismiss: true });
  btn.onclick = async () => {
    btn.disabled = true;
    const r = E.claimTithe();
    if (!r) { close(); return; }
    const n = sl.length;
    const target = -Math.PI / 2 - ((r.slice + 0.5) / n) * Math.PI * 2 + Math.PI * 2 * 6;
    const t0 = performance.now(), dur = 3800;
    let lastTick = 0;
    await new Promise<void>(res => {
      const f = (now: number) => {
        const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 4);
        const rot = target * e; draw(rot);
        const tk = Math.floor((rot / (Math.PI * 2)) * n); if (tk !== lastTick) { lastTick = tk; sfx.tick(tk); }
        if (t < 1) requestAnimationFrame(f); else res();
      };
      requestAnimationFrame(f);
    });
    sfx.win(3); coinShower(30);
    btn.textContent = `+${E.fmt(r.gold)} gold${r.souls ? ' · +1 soul' : ''}`;
    if (r.souls) sfx.soul();
    setTimeout(() => { close(); if (tab === 'casino') show('casino'); }, 1600);
  };
}
function redeem(): void {
  confirmBox('Buy back your soul?', `Pay ${E.fmt(E.soulPrice())} gold. Your gold, rank and contracts reset; relics, souls and feats remain, and you gain a Sigil: every table limit ×1.5, forever. The price rises for the next cycle.`, 'Redeem', () => {
    if (E.buyFreedom()) {
      coinShower(120); sfx.bigWin();
      modal(close => [h('h3', 'h1 gild', 'Soul Redeemed'), h('div', 'dialog', h('img', { src: A('portraits/proprietor.webp'), alt: '' }), h('div', 'speech', '“Free? How quaint. You will be back — they always come back. Your next soul will cost a little more.”')), h('button', { class: 'btn blood wide', style: { marginTop: '12px' }, onclick: () => { close(); floor = 'parlor'; shell(); } }, 'Begin again')], { blood: true, dismiss: false });
    }
  }, true);
}
function openGame(g: GameDef): void {
  sfx.play('shove', 0.5);
  setFloor(g.floor, 0.85);
  clear(main);
  nav.style.display = 'none';
  main.className = '';
  main.style.display = 'contents';
  const view = GAME_VIEWS[g.id];
  const shellEl = buildGameShell(g, view, () => { main.style.display = ''; renderHud(); show('casino'); });
  main.append(shellEl);
}

/* ---------------- contracts ---------------- */
function contractsScreen(): void {
  E.ensureContracts();
  main.append(h('div', 'section-title', 'Contracts'));
  main.append(h('p', 'muted small', { style: { textAlign: 'center', margin: '0 0 10px' } }, 'The house always has work for the desperate. Finish one and another takes its place.'));
  const list = h('div', 'list');
  for (const c of E.S.contracts) {
    const done = c.progress >= c.target;
    const pct = Math.min(100, (c.progress / c.target) * 100);
    const claim = h('button', { class: 'btn sm ' + (done ? 'blood pulse' : 'ghost'), onclick: (ev: Event) => {
      if (!done) {
        confirmBox('Tear up this contract?', `Pay ${E.fmt(E.rerollCost())} gold for a new one.`, 'Pay', () => { if (E.rerollContract(c.id)) show('contracts'); else toast(['Not enough gold.'], 'blood'); });
        return;
      }
      const r = E.claimContract(c.id);
      if (r) { const [x, y] = centerOf(ev.currentTarget as Element); floatText(x, y, '+' + E.fmt(r.gold)); burst(x, y, { n: 30 }); sfx.win(2); if (r.souls) { rise(x, y, '#7fe6ff'); sfx.soul(); } setTimeout(() => show('contracts'), 600); }
    } }, done ? 'Claim' : 'Swap');
    list.append(h('div', 'item panel frame-thin',
      h('div', 'ic', px(c.kind === 'mult' ? 'lottachievements_crowned_skull' : c.kind === 'wager' ? 'coins_bucket_scrap_gold' : c.kind === 'bigwin' ? 'default_diamond' : c.kind === 'floor' ? 'td45' : 'td65', 36)),
      h('div', 'tx', h('div', 'nm', c.text),
        h('div', 'ds', `Reward: ${E.fmt(c.gold)} gold${c.souls ? ` + ${c.souls} soul` : ''}`),
        h('div', 'prog', h('i', { style: { width: pct + '%' } })),
        h('div', 'muted small num', { style: { fontSize: '17px' } }, c.kind === 'mult' || c.kind === 'bigwin' ? (done ? 'done' : 'not yet') : `${E.fmt(c.progress)} / ${E.fmt(c.target)}`)),
      claim));
  }
  main.append(list);
  main.append(h('div', 'section-title', 'The Tithe'));
  const left = Math.max(0, E.titheEvery - (Date.now() - E.S.lastTithe));
  main.append(h('div', 'item panel frame-thin', h('div', 'ic', px('coins_bucket_scrap_gold', 36)),
    h('div', 'tx', h('div', 'nm', 'The house’s gift'), h('div', 'ds', left ? `Ready in ${Math.ceil(left / 60000)} min.` : 'Ready now.')),
    h('button', { class: 'btn sm ' + (left ? 'ghost' : 'blood pulse'), disabled: left ? true : undefined, onclick: titheWheel }, 'Spin')));
}

/* ---------------- relics & pacts ---------------- */
function relicsScreen(): void {
  main.append(h('div', 'section-title', 'Relics'));
  main.append(h('p', 'muted small', { style: { textAlign: 'center', margin: '0 0 10px' } }, 'Permanent. Bought with souls — which you earn from ranks, feats, contracts and very large wins.'));
  const list = h('div', 'list');
  for (const r of RELICS) {
    const lvl = E.relic(r.id);
    const maxed = lvl >= r.max;
    const cost = r.cost[lvl];
    const lv = h('div', 'lvl'); for (let i = 0; i < r.max; i++) lv.append(h('i', i < lvl ? 'on' : ''));
    list.append(h('div', 'item panel frame-thin',
      h('div', 'ic', px(r.sprite, 36)),
      h('div', 'tx', h('div', 'nm', r.name), h('div', 'ds', r.desc(Math.max(1, maxed ? lvl : lvl + 1))), lv),
      h('button', { class: 'btn sm', disabled: maxed || E.S.souls < cost ? true : undefined, onclick: (ev: Event) => {
        if (E.buyRelic(r.id)) { const [x, y] = centerOf(ev.currentTarget as Element); rise(x, y, '#7fe6ff', 24); sfx.soul(); toast([h('b', {}, r.name), ' is yours.'], 'soul', px(r.sprite, 32)); show('relics'); }
      } }, maxed ? 'Owned' : h('span', {}, soulIcon(16), ' ' + cost))));
  }
  main.append(list);
  main.append(h('div', 'section-title', 'Pacts'));
  main.append(h('p', 'muted small', { style: { textAlign: 'center', margin: '0 0 10px' } }, E.S.pact ? `Active: ${PACTS.find(p => p.id === E.S.pact!.id)!.name} — ${E.S.pact.left} left.` : 'One at a time. Signed in blood, paid in souls.'));
  const pl = h('div', 'list');
  for (const p of PACTS) {
    const active = E.S.pact?.id === p.id;
    pl.append(h('div', `item panel frame-thin ${active ? 'frame-blood' : ''}`,
      h('div', 'ic', px(p.sprite, 36)),
      h('div', 'tx', h('div', 'nm', p.name), h('div', 'ds', p.desc)),
      h('button', { class: 'btn sm blood', disabled: !!E.S.pact || E.S.souls < p.cost ? true : undefined, onclick: () => {
        if (E.signPact(p.id)) { sfx.doom(); toast([h('b', {}, p.name), ' is signed.'], 'blood', px(p.sprite, 32)); show('relics'); }
      } }, active ? 'Active' : h('span', {}, soulIcon(16), ' ' + p.cost))));
  }
  main.append(pl);
}

/* ---------------- grimoire ---------------- */
function grimoireScreen(): void {
  const got = FEATS.filter(f => E.S.feats[f.id]).length;
  main.append(h('div', 'section-title', `Grimoire · ${got}/${FEATS.length}`));
  const list = h('div', 'list');
  for (const f of FEATS) {
    const has = !!E.S.feats[f.id];
    list.append(h('div', `item panel frame-thin ${has ? '' : 'dim'}`,
      h('div', 'ic', px(has ? 'lottachievements_crowned_skull' : 'lottacievements_skull', 34)),
      h('div', 'tx', h('div', 'nm', f.name), h('div', 'ds', f.desc)),
      h('div', 'num', { style: { fontSize: '20px', color: '#bff5ff', display: 'flex', alignItems: 'center', gap: '4px' } }, soulIcon(16), '+' + f.souls)));
  }
  main.append(list);
}

/* ---------------- ledger: stats, loans, settings ---------------- */
function ledgerScreen(): void {
  const S = E.S;
  main.append(h('div', 'hero panel frame',
    h('div', 'hero-portrait', h('img', { src: A('portraits/wagerer.webp'), alt: '' })),
    h('div', {}, h('div', 'sub', `Infamy rank ${S.rank}${S.sigils ? ` · ${S.sigils} sigils` : ''}`), h('h2', 'h1 gild', 'The Wagerer'), h('p', 'lore', `Table limit ${E.fmt(E.minBet())} – ${E.fmt(E.maxBet())}. Next rank in ${E.fmt(E.xpFor(S.rank) - S.xp)} infamy.`))));
  // the proprietor's loan
  main.append(h('div', 'section-title', 'The Proprietor’s Mercy'));
  if (S.loan) {
    main.append(h('div', 'item panel frame-thin frame-blood', h('div', 'ic', px('td92', 36)),
      h('div', 'tx', h('div', 'nm', `You owe ${E.fmt(S.loan.owed)}`), h('div', 'ds', '30% of every winning payout is taken until the debt is paid.')),
      h('button', { class: 'btn sm', disabled: S.gold < S.loan.owed ? true : undefined, onclick: () => { if (E.repayLoan()) { sfx.win(2); show('ledger'); } } }, 'Repay')));
  } else {
    const can = E.canBorrow();
    main.append(h('div', 'item panel frame-thin', h('div', 'ic', h('img', { src: A('portraits/proprietor.webp'), width: 46, alt: '' })),
      h('div', 'tx', h('div', 'nm', `Borrow ${E.fmt(E.loanAmount())}`), h('div', 'ds', can ? `Repay ${E.fmt(Math.round(E.loanAmount() * (1 + E.loanInterest())))}. Offered only to the broke.` : 'Offered only when you cannot cover the smallest bet.')),
      h('button', { class: 'btn sm blood', disabled: can ? undefined : true, onclick: () => { const a = E.borrow(); if (a) { sfx.doom(); coinShower(20, ['default_gold_lump']); toast([h('b', {}, `+${E.fmt(a)} gold. `), 'The ink is still wet.'], 'blood'); show('ledger'); } } }, 'Sign')));
  }
  main.append(h('div', 'section-title', 'Records'));
  const st = (k: string, v: string) => h('div', 'stat', h('div', 'k', k), h('div', 'v', v));
  main.append(h('div', 'stat-grid', st('Rounds', E.fmt(S.stats.rounds)), st('Wins', E.fmt(S.stats.wins)), st('Wagered', E.fmt(S.stats.wagered)), st('Returned', E.fmt(S.stats.won)),
    st('Biggest win', E.fmt(S.stats.biggestWin)), st('Best ×', '×' + E.fmt(S.stats.biggestMult)), st('Peak gold', E.fmt(S.stats.peakGold)), st('Contracts', String(S.stats.contractsDone))));
  const fav = Object.entries(S.games).sort((a, b) => (b[1]?.rounds ?? 0) - (a[1]?.rounds ?? 0)).slice(0, 5);
  if (fav.length) {
    main.append(h('div', 'section-title', 'Favourite tables'));
    const l = h('div', 'list');
    for (const [id, g] of fav) l.append(h('div', 'item panel frame-thin', h('div', 'tx', h('div', 'nm', gameById(id as GameDef['id']).name), h('div', 'ds', `${g!.rounds} rounds · net ${g!.won - g!.wagered >= 0 ? '+' : ''}${E.fmt(g!.won - g!.wagered)} · best ×${E.fmt(g!.bestMult)}`))));
    main.append(l);
  }
  main.append(h('div', 'section-title', 'Settings'));
  const tog = (label: string, val: boolean, set: (v: boolean) => void) => {
    const b = h('button', { class: 'btn sm ' + (val ? '' : 'ghost'), onclick: () => { set(!val); E.save(); show('ledger'); } }, val ? 'On' : 'Off');
    return h('div', 'toggle', h('span', 'h2', { style: { fontSize: '.8rem' } }, label), b);
  };
  main.append(h('div', 'panel frame-thin', { style: { padding: '4px 10px' } },
    tog('Sound effects', S.settings.sfx, v => { S.settings.sfx = v; sfx.sfxOn = v; }),
    tog('Music', S.settings.music, v => { S.settings.music = v; sfx.setMusic(v); }),
    tog('Motion & particles', S.settings.motion, v => { S.settings.motion = v; setMotion(v); }),
    h('div', 'toggle', h('span', 'h2', { style: { fontSize: '.8rem' } }, 'Save'),
      h('div', { style: { display: 'flex', gap: '6px' } },
        h('button', { class: 'btn sm ghost', onclick: () => { const code = exportSave(S); void navigator.clipboard?.writeText(code); modal(c => [h('h3', 'h2 gild', 'Your save'), h('textarea', { style: { width: '100%', height: '120px', background: '#000', color: '#ddd' }, readonly: true }, code), h('button', { class: 'btn', onclick: c }, 'Done')]); } }, 'Export'),
        h('button', { class: 'btn sm ghost', onclick: () => { const code = prompt('Paste a save code'); if (!code) return; const n = importSave(code); if (n) { E.replaceSave(n); shell(); } else toast(['That code is not a save.'], 'blood'); } }, 'Import'))),
    h('div', 'toggle', h('span', 'h2', { style: { fontSize: '.8rem', color: '#ff8a96' } }, 'Burn the ledger'),
      h('button', { class: 'btn sm blood', onclick: () => confirmBox('Erase everything?', 'Every coin, soul, relic and feat will be lost.', 'Erase', () => { E.resetAll(); location.reload(); }, true) }, 'Reset'))));
  main.append(h('p', 'muted small', { style: { textAlign: 'center', margin: '18px 0' } }, 'Velvet Abyss · play money only · art: the project owner’s portraits & cards, CC0 pixel art by Kenney, ARoachIFoundOnMyPillow and JoeEnderman · see CREDITS.md'));
}

/* ---------------- events → toasts ---------------- */
function wireEvents(): void {
  E.on(ev => {
    switch (ev.t) {
      case 'gold': refreshHud(); break;
      case 'rank': {
        sfx.win(4); setTimeout(() => sfx.soul(), 300);
        toast([h('b', {}, `Infamy rank ${ev.rank}! `), `+${E.fmt(ev.gold)} gold, +${ev.souls} soul${ev.souls > 1 ? 's' : ''}. Limit now ${E.fmt(E.maxBet())}.`], 'gold', px('lottachievements_crowned_skull', 32));
        rise(innerWidth / 2, 80, '#ffd27a', 20);
        renderHudSoon();
        break;
      }
      case 'feat': { const f = FEATS.find(x => x.id === ev.id)!; toast([h('b', {}, f.name), ` — ${f.desc}${f.souls ? ` +${f.souls} soul${f.souls > 1 ? 's' : ''}` : ''}`], 'soul', px('lottachievements_crowned_skull', 32)); sfx.soul(); break; }
      case 'contract': toast([h('b', {}, 'Contract fulfilled: '), ev.c.text], 'gold', px('td65', 32)); break;
      case 'soul': toast([h('b', {}, `+${ev.n} soul. `), ev.why], 'soul', soulIcon(32)); rise(innerWidth / 2, innerHeight / 2, '#7fe6ff'); sfx.soul(); break;
      case 'toast': toast([ev.text], ev.kind ?? ''); break;
      case 'floor': { const f = FLOORS.find(x => x.id === ev.id)!; toast([h('b', {}, `${f.name} is open. `), f.lore], 'blood', h('img', { src: A(`portraits/${f.host}.webp`), width: 36, alt: '' })); break; }
      case 'game': { const g = gameById(ev.id); toast([h('b', {}, 'New table: '), g.name], 'gold', px('td45', 32)); break; }
    }
  });
}
let hudTimer = 0;
function renderHudSoon(): void { clearTimeout(hudTimer); hudTimer = window.setTimeout(() => { if (hud?.isConnected) renderHud(); }, 50); }
