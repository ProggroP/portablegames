import type { GameDef } from '../core/types';
import { createBackgammon } from './backgammon/view';
import { createDame } from './dame/view';
import { createKaesekaestchen } from './kaesekaestchen/view';
import { createMancala } from './mancala/view';
import { createMuehle } from './muehle/view';
import { createReversi } from './reversi/view';
import { createTicTacToe } from './tictactoe/view';

const BOTH_PORTRAIT = { gegenueber: 'portrait', nebeneinander: 'portrait', allein: 'portrait' } as const;
const BOTH_LANDSCAPE = { gegenueber: 'landscape', nebeneinander: 'landscape', allein: 'landscape' } as const;

export const GAMES: GameDef[] = [
  { id: 'tictactoe', name: 'Tic-Tac-Toe', kind: 'Drei in einer Reihe', seating: BOTH_PORTRAIT, aspect: 1, icon: 'BO__B_O_B', create: createTicTacToe },
  { id: 'reversi', name: 'Reversi', kind: 'Steine umdrehen', seating: BOTH_PORTRAIT, aspect: 1, icon: 'BOBOBOBOB', create: createReversi },
  { id: 'muehle', name: 'Mühle', kind: 'Dreierreihen bilden', seating: BOTH_PORTRAIT, aspect: 1, icon: 'BWBW_WOWO', create: createMuehle },
  { id: 'dame', name: 'Dame', kind: 'Diagonal ziehen und schlagen', seating: BOTH_PORTRAIT, aspect: 1, icon: 'B_B_B_O_O', create: createDame },
  { id: 'kaesekaestchen', name: 'Käsekästchen', kind: 'Linien ziehen, Kästchen schließen', seating: BOTH_PORTRAIT, aspect: 1, icon: 'BBO_BOWWO', create: createKaesekaestchen },
  { id: 'mancala', name: 'Mancala', kind: 'Bohnen säen und ernten', seating: BOTH_LANDSCAPE, aspect: 2.2, aspectMax: 3.2, icon: 'OOO___BBB', create: createMancala },
  { id: 'backgammon', name: 'Backgammon', kind: 'Würfeln und heimziehen', seating: BOTH_LANDSCAPE, aspect: 1.5, aspectMax: 2.6, icon: 'B_OB_OB_O', create: createBackgammon },

  // Geplant, noch nicht spielbar
  { id: 'schach', name: 'Schach', kind: 'Den König mattsetzen', seating: BOTH_PORTRAIT, aspect: 1, icon: '_W_BWBBBB' },
  { id: 'gomoku', name: 'Gomoku', kind: 'Fünf in einer Reihe', seating: BOTH_PORTRAIT, aspect: 1, icon: 'B___B___B' },
  { id: 'airhockey', name: 'Air-Hockey', kind: 'Puck ins Tor schießen', seating: { gegenueber: 'portrait', nebeneinander: 'landscape' }, aspect: 0.6, icon: '_O__W__B_' },
  { id: 'paarweise', name: 'Paarweise', kind: 'Kartenpaare finden', seating: BOTH_PORTRAIT, aspect: 0.7, icon: 'B_B_O_O_W' },
  { id: 'fuenfwuerfel', name: 'Fünf Würfel', kind: 'Würfelkombinationen sammeln', seating: BOTH_PORTRAIT, aspect: 0.6, icon: 'W_W_W_W_W' },
  { id: 'fallreihe', name: 'Fallreihe', kind: 'Steine fallen lassen, vier verbinden', seating: { nebeneinander: 'portrait', allein: 'portrait' }, aspect: 7 / 6, icon: '___OB_BOO' },
  { id: 'solitaer', name: 'Solitär', kind: 'Karten-Patience', seating: { allein: 'portrait' }, aspect: 0.6, icon: 'WOWW_WOWO' },
  { id: 'feldraeumer', name: 'Feldräumer', kind: 'Minen umgehen', seating: { allein: 'portrait' }, aspect: 0.6, icon: '_W_WOW_W_' },
  { id: 'neunerfeld', name: 'Neunerfeld', kind: 'Zahlenrätsel 9 × 9', seating: { allein: 'portrait' }, aspect: 1, icon: 'W_W_B_W_W' }
];

export function findGame(id: string): GameDef | undefined {
  return GAMES.find((g) => g.id === id);
}

export function playerRange(g: GameDef): 'allein' | 'zu-zweit' | 'beides' {
  const solo = !!g.seating.allein;
  const duo = !!(g.seating.gegenueber || g.seating.nebeneinander);
  return solo && duo ? 'beides' : solo ? 'allein' : 'zu-zweit';
}
