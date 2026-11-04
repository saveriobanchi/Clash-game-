import { Card, Shoe } from '../cards';

export const bjValue = (c: Card): number => (c.r === 14 ? 11 : c.r >= 10 ? 10 : c.r);
export function handTotal(cards: Card[]): { total: number; soft: boolean } {
  let t = 0, aces = 0;
  for (const c of cards) { t += bjValue(c); if (c.r === 14) aces++; }
  while (t > 21 && aces > 0) { t -= 10; aces--; }
  return { total: t, soft: aces > 0 };
}
export const isBlackjack = (cards: Card[]): boolean => cards.length === 2 && handTotal(cards).total === 21;

export type BjVariant = 'classic' | 'hellfire';
export interface BjRules { bjPay: number; push22: boolean; charlie: boolean; bonus21: number; label: string }
export const BJ_RULES: Record<BjVariant, BjRules> = {
  classic: { bjPay: 2.5, push22: false, charlie: false, bonus21: 2, label: 'Classic · blackjack pays 3:2' },
  hellfire: { bjPay: 3, push22: true, charlie: true, bonus21: 2.5, label: 'Hellfire · BJ 2:1 · any 21 pays 3:2 · five-card charlie · dealer 22 pushes' },
};
export interface BjHand { cards: Card[]; stake: number; done: boolean; doubled: boolean; fromSplit: boolean }
export type BjAction = 'hit' | 'stand' | 'double' | 'split';

export class BlackjackRound {
  hands: BjHand[] = [];
  dealer: Card[] = [];
  active = 0;
  finished = false;
  constructor(public shoe: Shoe, public variant: BjVariant, stake: number) {
    if (shoe.needsShuffle()) shoe.shuffle();
    const p1 = shoe.draw(), d1 = shoe.draw(), p2 = shoe.draw(), d2 = shoe.draw();
    this.hands = [{ cards: [p1, p2], stake, done: false, doubled: false, fromSplit: false }];
    this.dealer = [d1, d2];
    if (isBlackjack(this.dealer) || isBlackjack(this.hands[0].cards)) { this.hands[0].done = true; this.finished = true; }
  }
  get hand(): BjHand { return this.hands[this.active]; }
  canDouble(): boolean { return !this.finished && this.hand.cards.length === 2 && !this.hand.done; }
  canSplit(): boolean {
    const h = this.hand;
    return !this.finished && this.hands.length < 2 && h.cards.length === 2 && bjValue(h.cards[0]) === bjValue(h.cards[1]);
  }
  /** Applies an action; returns the extra stake it required (double/split). */
  act(a: BjAction): number {
    if (this.finished) return 0;
    const h = this.hand;
    let extra = 0;
    if (a === 'hit') { h.cards.push(this.shoe.draw()); if (handTotal(h.cards).total >= 21) h.done = true; }
    else if (a === 'stand') h.done = true;
    else if (a === 'double' && this.canDouble()) { extra = h.stake; h.stake *= 2; h.doubled = true; h.cards.push(this.shoe.draw()); h.done = true; }
    else if (a === 'split' && this.canSplit()) {
      extra = h.stake;
      const second: BjHand = { cards: [h.cards.pop() as Card, this.shoe.draw()], stake: h.stake, done: false, doubled: false, fromSplit: true };
      h.cards.push(this.shoe.draw()); h.fromSplit = true;
      this.hands.push(second);
      if (h.cards[0].r === 14) { h.done = true; second.done = true; } // split aces get one card
    }
    this.advance();
    return extra;
  }
  private advance(): void {
    while (this.active < this.hands.length && this.hands[this.active].done) this.active++;
    if (this.active >= this.hands.length) {
      this.active = this.hands.length - 1;
      this.finished = true;
      if (this.hands.some(h => handTotal(h.cards).total <= 21)) this.playDealer();
    } else if (handTotal(this.hand.cards).total >= 21) { this.hand.done = true; this.advance(); }
  }
  playDealer(): void {
    while (true) {
      const { total } = handTotal(this.dealer);
      if (total < 17) this.dealer.push(this.shoe.draw()); else break;
    }
  }
  /** Total return for each hand (stake included). */
  settle(): number[] {
    const rules = BJ_RULES[this.variant];
    const d = handTotal(this.dealer).total;
    const dealerBJ = isBlackjack(this.dealer);
    return this.hands.map(h => {
      const p = handTotal(h.cards).total;
      const pBJ = isBlackjack(h.cards) && !h.fromSplit;
      if (pBJ && dealerBJ) return h.stake;
      if (pBJ) return h.stake * rules.bjPay;
      if (dealerBJ) return 0;
      if (p > 21) return 0;
      if (rules.charlie && h.cards.length >= 5) return h.stake * (p === 21 ? rules.bonus21 : 2);
      if (p === 21 && rules.bonus21 > 2 && (d !== 21)) return h.stake * rules.bonus21;
      if (d > 21) return rules.push22 && d === 22 ? h.stake : h.stake * 2;
      if (p > d) return h.stake * 2;
      if (p === d) return h.stake;
      return 0;
    });
  }
}

/** Basic strategy (dealer stands soft 17, DAS, no surrender). */
export function basicStrategy(cards: Card[], up: Card, canDouble: boolean, canSplit: boolean): BjAction {
  const u = bjValue(up);
  if (canSplit) {
    const v = bjValue(cards[0]);
    if (v === 11 || v === 8) return 'split';
    if ((v === 2 || v === 3 || v === 7) && u <= 7) return 'split';
    if (v === 6 && u <= 6) return 'split';
    if (v === 9 && u !== 7 && u <= 9) return 'split';
    if (v === 4 && (u === 5 || u === 6)) return 'split';
  }
  const { total, soft } = handTotal(cards);
  if (soft) {
    if (total >= 19) return total === 19 && u === 6 && canDouble ? 'double' : 'stand';
    if (total === 18) { if (u >= 3 && u <= 6 && canDouble) return 'double'; return u >= 9 ? 'hit' : 'stand'; }
    if (canDouble && ((total === 17 && u >= 3 && u <= 6) || ((total === 15 || total === 16) && u >= 4 && u <= 6) || ((total === 13 || total === 14) && u >= 5 && u <= 6))) return 'double';
    return 'hit';
  }
  if (total >= 17) return 'stand';
  if (total >= 13) return u <= 6 ? 'stand' : 'hit';
  if (total === 12) return u >= 4 && u <= 6 ? 'stand' : 'hit';
  if (total === 11) return canDouble ? 'double' : 'hit';
  if (total === 10) return canDouble && u <= 9 ? 'double' : 'hit';
  if (total === 9) return canDouble && u >= 3 && u <= 6 ? 'double' : 'hit';
  return 'hit';
}
