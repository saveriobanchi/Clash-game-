import { h, A } from './dom';
import { px } from './px';
import { sfx } from './audio';

/* Shared UI widgets: modals, toasts, icons. */
export const icon = (name: string, size = 22): HTMLImageElement => { const i = h('img', { src: A(`ui/i-${name}.png`), alt: '' }); i.width = size; i.height = size; return i; };
export const goldIcon = (size = 24): HTMLImageElement => px('default_gold_lump', size);
export const soulIcon = (size = 24): HTMLImageElement => px('crystal', size);
export function skulls(n: number): HTMLElement {
  const el = h('div', 'skulls');
  for (let i = 1; i <= 5; i++) el.append(px('lottacievements_skull', 13, i <= n ? '' : 'off'));
  return el;
}
let toastBox: HTMLElement | null = null;
export function toast(content: (Node | string)[], kind = '', img?: HTMLElement): void {
  if (!toastBox) { toastBox = h('div', 'toasts'); document.body.append(toastBox); }
  const t = h('div', `toast ${kind}`, img ?? '', h('div', {}, ...content));
  toastBox.append(t);
  setTimeout(() => t.remove(), 3300);
  while (toastBox.childElementCount > 3) toastBox.firstElementChild?.remove();
}
export function modal(build: (close: () => void) => (Node | string)[], opts: { blood?: boolean; dismiss?: boolean } = {}): () => void {
  const box = h('div', `modal panel frame ${opts.blood ? 'frame-blood' : ''}`);
  const wrap = h('div', 'modal-wrap', box);
  const close = () => { wrap.remove(); };
  box.append(...build(close));
  if (opts.dismiss !== false) wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  document.body.append(wrap);
  sfx.play('slide', 0.4);
  return close;
}
export function confirmBox(title: string, text: string, yes: string, onYes: () => void, blood = false): void {
  modal(close => [
    h('h3', 'h2 gild', title), h('p', {}, text),
    h('div', { class: 'actions', style: { marginTop: '14px' } },
      h('button', { class: 'btn ghost', onclick: close }, 'Not yet'),
      h('button', { class: `btn ${blood ? 'blood' : ''}`, onclick: () => { close(); onYes(); } }, yes)),
  ], { blood });
}
