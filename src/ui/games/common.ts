import { h, A } from '../dom';
import { Card, cardId } from '../../core/cards';
import { px } from '../px';

export const cardImg = (id: string, cls = 'card-img'): HTMLImageElement => h('img', { class: cls, src: A(`cards/${id === 'back' ? 'back' : id}.webp`), alt: id, draggable: 'false' });
export const cardEl = (c: Card | null, cls = 'card-img'): HTMLImageElement => cardImg(c ? cardId(c) : 'back', cls);
/** A "card" showing a pixel skull — the Skull Deck's doom card. */
export function skullCard(cls = 'card-img'): HTMLElement {
  const el = h('div', { class: cls, style: { display: 'grid', placeItems: 'center', background: 'radial-gradient(circle, #5a0a16, #120206)', boxShadow: '0 0 0 2px #ff4a5e, 0 0 24px #ff2a3a' } });
  el.append(px('lottachievements_crowned_skull', 56));
  return el;
}
export const mfmt = (m: number): string => '×' + (m >= 1000 ? Math.round(m).toLocaleString('en-US') : m >= 100 ? m.toFixed(0) : m.toFixed(2));
export function btn(label: string | Node, cls: string, onclick: () => void): HTMLButtonElement {
  return h('button', { class: `btn ${cls}`, onclick }, label);
}
