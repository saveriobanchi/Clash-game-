import type { GameMount } from '../shell';
import type { GameId } from '../../core/content';
import { coinGame, diceGame, reelsGame, hiloGame } from './parlor';
import { blackjackGame, rouletteGame, pokerGame, baccaratGame } from './salon';
import { minesGame, plinkoGame, scratchGame, kenoGame, derbyGame } from './catacombs';
import { crashGame, towerGame, ruinGame, chaliceGame, bargainGame } from './abyss';

export const GAME_VIEWS: Record<GameId, GameMount> = {
  coin: coinGame, dice: diceGame, reels: reelsGame, hilo: hiloGame,
  blackjack: blackjackGame, roulette: rouletteGame, poker: pokerGame, baccarat: baccaratGame,
  mines: minesGame, plinko: plinkoGame, scratch: scratchGame, keno: kenoGame, derby: derbyGame,
  crash: crashGame, tower: towerGame, ruin: ruinGame, chalice: chaliceGame, bargain: bargainGame,
};
