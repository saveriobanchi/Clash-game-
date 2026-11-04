import { randInt } from './rng';

export type Suit = 's' | 'h' | 'd' | 'c';
export interface Card { r: number; s: Suit } // r: 2..14 (14 = Ace)
export const SUITS: Suit[] = ['s', 'h', 'd', 'c'];
const RANK_CH = ['', '', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const cardId = (c: Card): string => RANK_CH[c.r] + c.s;
export const rankLabel = (r: number): string => (r === 10 ? '10' : RANK_CH[r]);
export const isRed = (c: Card): boolean => c.s === 'h' || c.s === 'd';

/** A multi-deck shoe that reshuffles itself past the cut card. */
export class Shoe {
  private cards: Card[] = [];
  private pos = 0;
  constructor(private decks = 6, private cut = 0.75) { this.shuffle(); }
  shuffle(): void {
    this.cards = [];
    for (let d = 0; d < this.decks; d++) for (const s of SUITS) for (let r = 2; r <= 14; r++) this.cards.push({ r, s });
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    this.pos = 0;
  }
  needsShuffle(): boolean { return this.pos > this.cards.length * this.cut; }
  draw(): Card {
    if (this.pos >= this.cards.length) this.shuffle();
    return this.cards[this.pos++];
  }
}
/** A card drawn from an infinite deck. */
export const randomCard = (): Card => ({ r: 2 + randInt(13), s: (['s', 'h', 'd', 'c'] as Suit[])[randInt(4)] });
