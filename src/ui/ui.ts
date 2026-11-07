import { h } from './dom';
import { sprite } from '../art';
import { sfx } from './audio';

/* Shared widgets. Icons are sprites from src/art like everything else. */
export const icon = (name: string, size = 24): HTMLImageElement => sprite(name, size, 'ico');
export const goldIcon = (size = 20): HTMLImageElement => sprite('coin', size, 'ico');
export const soulIcon = (size = 20): HTMLImageElement => sprite('i_soul', size, 'ico');
export function riskPips(n: number): HTMLElement {
  const el = h('div', 'risk', { title: `Risk ${n} of 5` });
  for (let i = 1; i <= 5; i++) el.append(h('i', i <= n ? 'on' : ''));
  return el;
}
export const skulls = riskPips;

/* one notification at a time, queued */
const queue: { content: (Node | string)[]; kind: string; img?: HTMLElement }[] = [];
let showing = false;
let box: HTMLElement | null = null;
export function toast(content: (Node | string)[], kind = '', img?: HTMLElement): void {
  if (queue.length > 4) queue.shift();
  queue.push({ content, kind, img });
  if (!showing) next();
}
function next(): void {
  const item = queue.shift();
  if (!item) { showing = false; return; }
  showing = true;
  if (!box) { box = h('div', 'toasts'); document.body.append(box); }
  const t = h('div', `toast ${item.kind}`, item.img ?? '', h('div', 'toast-text', ...item.content));
  box.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => { t.remove(); next(); }, 250); }, 2300);
}
export function modal(build: (close: () => void) => (Node | string)[], opts: { blood?: boolean; dismiss?: boolean } = {}): () => void {
  const box_ = h('div', `modal panel ${opts.blood ? 'blood' : ''}`);
  const wrap = h('div', 'modal-wrap', box_);
  const close = () => { wrap.remove(); };
  box_.append(...build(close));
  if (opts.dismiss !== false) wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  document.body.append(wrap);
  sfx.play('slide', 0.35);
  return close;
}
export function confirmBox(title: string, text: string, yes: string, onYes: () => void, danger = false): void {
  modal(close => [
    h('h3', 'm-title', title), h('p', 'm-text', text),
    h('div', 'm-actions', h('button', { class: 'btn ghost', onclick: close }, 'Cancel'), h('button', { class: `btn ${danger ? 'primary' : 'gold'}`, onclick: () => { close(); onYes(); } }, yes)),
  ], { blood: danger });
}
