/* Floors, games, relics, pacts and feats: everything a player progresses through. */

export type FloorId = 'parlor' | 'salon' | 'catacombs' | 'abyss';
export interface Floor {
  id: FloorId; name: string; sub: string; host: string; hostName: string; rank: number;
  tile: string; accent: string; glow: string; lore: string; emblem: string;
}
export const FLOORS: Floor[] = [
  {
    id: 'parlor', name: 'The Gilded Parlor', sub: 'Floor I', host: 'vesper', hostName: 'Lady Vesper', rank: 1,
    tile: 'red_wood_plank_2', accent: '#e0b062', glow: '#ff9a3c', emblem: 'ember',
    lore: '“Everyone starts with coins and dice, darling. Nobody stays with them.”',
  },
  {
    id: 'salon', name: 'The Velvet Salon', sub: 'Floor II', host: 'corvin', hostName: 'Sir Corvin', rank: 4,
    tile: 'default_obsidian_brick', accent: '#c9485b', glow: '#ff3b5c', emblem: 'thorn',
    lore: '“Cards remember. Every hand you play is a debt of honour.”',
  },
  {
    id: 'catacombs', name: 'The Catacombs', sub: 'Floor III', host: 'oracle', hostName: 'The Sightless Oracle', rank: 8,
    tile: 'default_mossycobble', accent: '#7fd6c2', glow: '#4effc8', emblem: 'veil',
    lore: '“Below the bones the dead still gamble. They have nothing left to lose — have you?”',
  },
  {
    id: 'abyss', name: 'The Abyss', sub: 'Floor IV', host: 'proprietor', hostName: 'The Proprietor', rank: 13,
    tile: 'nether_rack_deep', accent: '#ff5a3a', glow: '#ff2a00', emblem: 'mirror',
    lore: '“Here the stakes are not coin. Sign, and we shall see what you are worth.”',
  },
];

export type GameId =
  | 'coin' | 'dice' | 'reels' | 'hilo'
  | 'blackjack' | 'roulette' | 'poker' | 'baccarat'
  | 'mines' | 'plinko' | 'scratch' | 'keno' | 'derby'
  | 'crash' | 'tower' | 'ruin' | 'chalice' | 'bargain';
export interface GameDef {
  id: GameId; floor: FloorId; name: string; tag: string; rank: number; icon: string; rtp: string; risk: 1 | 2 | 3 | 4 | 5;
  how: string;
}
export const GAMES: GameDef[] = [
  { id: 'coin', floor: 'parlor', name: "Fate's Coin", tag: 'Flip · chain · cursed edge', rank: 1, icon: 'default_gold_lump', rtp: '96–98%', risk: 1,
    how: 'Call heads or tails. Classic pays ×1.96. Streak lets the winnings ride flip after flip. The Cursed coin can land on its edge — ×48.' },
  { id: 'dice', floor: 'parlor', name: 'Bone Dice', tag: 'Any odds · triple bones', rank: 1, icon: 'die', rtp: '97–98.5%', risk: 2,
    how: 'Roll Over/Under: set your own chance — from 98% to 1% — and the multiplier follows. Triple Bones: three dice, bet on small, big, totals or triples.' },
  { id: 'reels', floor: 'parlor', name: 'Reliquary Reels', tag: '3 cursed machines', rank: 2, icon: 'lottachievements_crowned_skull', rtp: '~96%', risk: 3,
    how: '10 lines, 5 reels. Crowned skulls are wild, three bare skulls start free spins. Five crowned skulls on a line win the Proprietor’s Hoard.' },
  { id: 'hilo', floor: 'parlor', name: 'Hi-Lo Ladder', tag: 'Climb the cards', rank: 3, icon: 'card', rtp: '99%', risk: 2,
    how: 'Guess whether the next card is higher-or-equal or lower-or-equal. Each guess multiplies your stake; cash out whenever you dare. The Skull Deck pays more, but a skull ends everything.' },
  { id: 'blackjack', floor: 'salon', name: 'Blackjack', tag: 'Classic · Hellfire', rank: 4, icon: 'card', rtp: '~99%', risk: 2,
    how: 'Six decks, dealer stands on all 17s. Double on any two cards, split once. Hellfire pays 2:1 blackjacks, 3:2 on any 21 and wins five-card charlies — but a dealer 22 is a push.' },
  { id: 'roulette', floor: 'salon', name: 'Wheel of Thorns', tag: 'European · Devil’s wheel', rank: 5, icon: 'wheel', rtp: '97.3%', risk: 2,
    how: 'Single-zero roulette. On the Devil’s Wheel, up to three numbers are cursed before each spin: straight-up bets pay 29:1, or ×50 to ×500 on a cursed number.' },
  { id: 'poker', floor: 'salon', name: 'Jacks of the Damned', tag: 'Video poker · double-up', rank: 6, icon: 'card', rtp: '99.5%', risk: 2,
    how: 'Jacks or Better, full 9/6 pay. Hold, draw, and after any win gamble it double-or-nothing on red or black — up to five times.' },
  { id: 'baccarat', floor: 'salon', name: 'Baccarat Noir', tag: 'Player · Banker · Tie', rank: 7, icon: 'card', rtp: '98.9%', risk: 1,
    how: 'Eight decks, standard drawing rules. Player 1:1, Banker 0.95:1, Tie 8:1, pairs 11:1. The bead road remembers.' },
  { id: 'mines', floor: 'catacombs', name: 'Crypt Delve', tag: 'Ossuary · Crypt · Labyrinth', rank: 8, icon: 'default_diamond', rtp: '97%', risk: 3,
    how: 'Open tombs for gems. Each gem grows the multiplier; one curse takes everything. Choose how many curses lie buried and cash out any time.' },
  { id: 'plinko', floor: 'catacombs', name: 'Bone Drop', tag: '8–16 rows · 3 risks', rank: 9, icon: 'default_snowball', rtp: '98%', risk: 3,
    how: 'Drop a skull through the bone pegs. Edges pay the most. More rows and higher risk widen the extremes.' },
  { id: 'scratch', floor: 'catacombs', name: 'Grave Tickets', tag: 'Scratch three tiers', rank: 10, icon: 'default_coal_lump', rtp: '~95%', risk: 3,
    how: 'Scratch the grave dirt. Three matching symbols win that prize. Obsidian tickets cost 25 stakes and hide ×5000.' },
  { id: 'keno', floor: 'catacombs', name: 'Séance', tag: 'Pick 1–10 of 40', rank: 11, icon: 'crystal', rtp: '96%', risk: 3,
    how: 'Mark up to ten of forty spirits. Ten are summoned. The more you mark, the wilder the table.' },
  { id: 'derby', floor: 'catacombs', name: 'Spectral Derby', tag: 'Six damned racers', rank: 12, icon: 'racer', rtp: '95%', risk: 3,
    how: 'Back one of six creatures. Odds come from their form; long shots pay long.' },
  { id: 'crash', floor: 'abyss', name: 'Blood Moon', tag: 'Cash out before it bursts', rank: 13, icon: 'moon', rtp: '97%', risk: 4,
    how: 'The blood moon rises and the multiplier climbs. Cash out before it bursts — it can burst at ×1.00 or at ×1000.' },
  { id: 'tower', floor: 'abyss', name: 'Ladder of Souls', tag: '9 floors · 4 sins', rank: 14, icon: 'door', rtp: '97%', risk: 4,
    how: 'Pick a door on each floor; behind one waits a fiend. Higher sins have fewer safe doors and wilder multipliers.' },
  { id: 'ruin', floor: 'abyss', name: 'Wheel of Ruin', tag: 'Low · Mid · Ruin', rank: 15, icon: 'wheel', rtp: '96.7–97%', risk: 4,
    how: 'Thirty segments. The Ruin wheel has twenty-nine blanks and one ×29.' },
  { id: 'chalice', floor: 'abyss', name: 'Six Chalices', tag: 'Drink, if you dare', rank: 16, icon: 'glass_bottle', rtp: '97%', risk: 5,
    how: 'One chalice is poisoned (or two, or three of twelve). Drink one at a time; each sip multiplies your stake. Stop whenever you like.' },
  { id: 'bargain', floor: 'abyss', name: "Devil's Bargain", tag: 'Wager your fortune', rank: 18, icon: 'proprietor', rtp: '96%', risk: 5,
    how: 'Stake a share of everything you own. You and the Proprietor each draw a card; higher wins ×2.08, and ties go to the house. Big bargains pay in souls.' },
];
export const gameById = (id: GameId): GameDef => GAMES.find(g => g.id === id)!;

/* ---------------- relics: permanent upgrades bought with souls ---------------- */
export type RelicId = 'tooth' | 'hourglass' | 'purse' | 'charm' | 'candle' | 'glove' | 'eye' | 'spade' | 'ledger';
export interface RelicDef { id: RelicId; name: string; max: number; cost: number[]; sprite: string; desc: (lvl: number) => string }
export const RELICS: RelicDef[] = [
  { id: 'tooth', name: 'Gilded Tooth', max: 5, cost: [2, 4, 7, 11, 16], sprite: 'default_gold_lump', desc: l => `Rakeback: ${(l * 0.3).toFixed(1)}% of every wager returns to you.` },
  { id: 'hourglass', name: 'Cracked Hourglass', max: 5, cost: [1, 3, 5, 8, 12], sprite: 'default_glass_detail', desc: l => `+${l * 15}% infamy from every round.` },
  { id: 'glove', name: 'Velvet Glove', max: 5, cost: [2, 4, 6, 9, 14], sprite: 'default_obsidian_shard', desc: l => `Table limits +${l * 25}%.` },
  { id: 'purse', name: "Raven's Purse", max: 5, cost: [1, 2, 4, 6, 9], sprite: 'coins_bucket_scrap_gold', desc: l => `The Tithe pays +${l * 30}%.` },
  { id: 'charm', name: 'Bone Charm', max: 5, cost: [2, 3, 5, 8, 12], sprite: 'default_coral_skeleton', desc: l => `Contracts pay +${l * 25}%.` },
  { id: 'candle', name: 'Black Candle', max: 4, cost: [3, 6, 10, 15], sprite: 'default_torch_3', desc: l => `Wins of ×20 or more have a ${25 + l * 15}% chance to drop a soul.` },
  { id: 'ledger', name: "Corvin's Ledger", max: 3, cost: [2, 4, 7], sprite: 'default_steel_ingot', desc: l => `The Proprietor’s loans cost ${30 - l * 8}% interest.` },
  { id: 'eye', name: "Oracle's Eye", max: 1, cost: [6], sprite: 'default_mese_crystal', desc: () => 'See the odds in Hi-Lo, whispered advice at Blackjack and Jacks.' },
  { id: 'spade', name: "Gravedigger's Spade", max: 1, cost: [8], sprite: 'default_tool_steelshovel', desc: () => 'Crypt Delve, Ladder of Souls and Six Chalices reveal one safe choice each round.' },
];

/* ---------------- pacts: temporary dark boons ---------------- */
export type PactId = 'hunger' | 'avarice' | 'bloodmoon' | 'fortune';
export interface PactDef { id: PactId; name: string; cost: number; rounds: number; desc: string; sprite: string }
export const PACTS: PactDef[] = [
  { id: 'hunger', name: 'Pact of Hunger', cost: 1, rounds: 40, desc: 'Double infamy for 40 rounds.', sprite: 'td92' },
  { id: 'avarice', name: 'Pact of Avarice', cost: 3, rounds: 50, desc: '+2.5% rakeback on every wager for 50 rounds.', sprite: 'td89' },
  { id: 'bloodmoon', name: 'Pact of the Blood Moon', cost: 4, rounds: 30, desc: 'Every win of ×10 or more pays half again, for 30 rounds.', sprite: 'td115' },
  { id: 'fortune', name: 'Pact of Fortune', cost: 2, rounds: 3, desc: 'Your next three claimed contracts pay double.', sprite: 'td116' },
];

/* ---------------- feats (the Grimoire) ---------------- */
export interface FeatDef { id: string; name: string; desc: string; souls: number }
export const FEATS: FeatDef[] = [
  { id: 'first_win', name: 'Beginner’s Luck', desc: 'Win any round.', souls: 1 },
  { id: 'mult10', name: 'Omen', desc: 'Win ×10 or more in one round.', souls: 1 },
  { id: 'mult100', name: 'Portent', desc: 'Win ×100 or more in one round.', souls: 2 },
  { id: 'mult1000', name: 'Apocalypse', desc: 'Win ×1000 or more in one round.', souls: 5 },
  { id: 'streak5', name: 'Hot Blood', desc: 'Win five rounds in a row.', souls: 1 },
  { id: 'cold10', name: 'The Abyss Stares Back', desc: 'Lose ten rounds in a row.', souls: 1 },
  { id: 'rank5', name: 'Known Face', desc: 'Reach infamy rank 5.', souls: 1 },
  { id: 'rank10', name: 'Notorious', desc: 'Reach infamy rank 10.', souls: 2 },
  { id: 'rank20', name: 'Infamous', desc: 'Reach infamy rank 20.', souls: 3 },
  { id: 'rank30', name: 'Legend of the Deep', desc: 'Reach infamy rank 30.', souls: 5 },
  { id: 'gold10k', name: 'Purse of Teeth', desc: 'Hold 10,000 gold.', souls: 1 },
  { id: 'gold1m', name: 'Gilded Sinner', desc: 'Hold 1,000,000 gold.', souls: 3 },
  { id: 'gold100m', name: 'Midas in Chains', desc: 'Hold 100,000,000 gold.', souls: 5 },
  { id: 'loan', name: 'Signed in Ink', desc: 'Take the Proprietor’s loan.', souls: 0 },
  { id: 'repaid', name: 'Debt Unbound', desc: 'Repay a loan in full.', souls: 1 },
  { id: 'allgames', name: 'Connoisseur of Sin', desc: 'Play all eighteen games.', souls: 3 },
  { id: 'jackpot', name: 'The Hoard', desc: 'Win the Proprietor’s Hoard.', souls: 5 },
  { id: 'edge', name: 'On the Edge', desc: 'Win on the coin’s edge.', souls: 2 },
  { id: 'royal', name: 'Royal Blood', desc: 'Draw a royal flush.', souls: 5 },
  { id: 'charlie', name: 'Five Souls', desc: 'Win with a five-card charlie.', souls: 1 },
  { id: 'crash50', name: 'Moonwalker', desc: 'Cash out the Blood Moon at ×50 or more.', souls: 2 },
  { id: 'tower_top', name: 'Ascendant', desc: 'Reach the top of the Ladder of Souls.', souls: 3 },
  { id: 'chalice_all', name: 'Iron Stomach', desc: 'Drink every safe chalice.', souls: 2 },
  { id: 'bargain_all', name: 'Everything, Twice', desc: 'Win a Devil’s Bargain staking everything.', souls: 2 },
  { id: 'cursed_hit', name: 'Thorn in the Side', desc: 'Hit a cursed number on the Devil’s Wheel.', souls: 2 },
  { id: 'ruin_hit', name: 'Ruinous', desc: 'Hit the ×29 on the Ruin wheel.', souls: 1 },
  { id: 'scratch_top', name: 'Grave Robber', desc: 'Win the top prize of a grave ticket.', souls: 4 },
  { id: 'contracts10', name: 'Contractor', desc: 'Complete ten contracts.', souls: 2 },
  { id: 'relic', name: 'Collector', desc: 'Buy your first relic.', souls: 0 },
  { id: 'pact', name: 'Blood Signature', desc: 'Sign your first pact.', souls: 0 },
  { id: 'abyss', name: 'Into the Abyss', desc: 'Open the fourth floor.', souls: 2 },
  { id: 'freedom', name: 'Soul Redeemed', desc: 'Buy back your soul.', souls: 10 },
];
