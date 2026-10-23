import type { GameDef } from '../core/types';
import { HOW_TO } from './howto';
import { createAirHockey } from './airhockey/view';
import { createAusparken } from './ausparken/view';
import { createBackgammon } from './backgammon/view';
import { createDame } from './dame/view';
import { createFallreihe } from './fallreihe/view';
import { createFeldraeumer } from './feldraeumer/view';
import { createFuenfWuerfel } from './fuenfwuerfel/view';
import { createGomoku } from './gomoku/view';
import { createKaesekaestchen } from './kaesekaestchen/view';
import { createKloetzchen } from './kloetzchen/view';
import { createMancala } from './mancala/view';
import { createMuehle } from './muehle/view';
import { createNeunerfeld } from './neunerfeld/view';
import { createPaarweise } from './paarweise/view';
import { createReversi } from './reversi/view';
import { createSchach } from './schach/view';
import { createSolitaer } from './solitaer/view';
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
  {
    id: 'airhockey',
    name: 'Air-Hockey',
    kind: 'Puck ins Tor schießen',
    seating: { gegenueber: 'portrait', nebeneinander: 'landscape', allein: 'portrait' },
    aspect: 0.6,
    aspectMax: 1.7,
    icon: '_O__W__B_',
    create: createAirHockey
  },
  { id: 'gomoku', name: 'Gomoku', kind: 'Fünf in einer Reihe', seating: BOTH_PORTRAIT, aspect: 1, icon: 'B___B___B', create: createGomoku },
  { id: 'fallreihe', name: 'Fallreihe', kind: 'Steine fallen lassen, vier verbinden', seating: { nebeneinander: 'portrait', allein: 'portrait' }, aspect: 7 / 6, icon: '___OB_BOO', create: createFallreihe },
  { id: 'paarweise', name: 'Paarweise', kind: 'Kartenpaare finden', seating: BOTH_PORTRAIT, aspect: 4 / 6, icon: 'B_B_O_O_W', create: createPaarweise },
  { id: 'fuenfwuerfel', name: 'Fünf Würfel', kind: 'Würfelkombinationen sammeln', seating: BOTH_PORTRAIT, aspect: 0.62, aspectMax: 1, compactHud: true, icon: 'W_W_W_W_W', create: createFuenfWuerfel },
  { id: 'feldraeumer', name: 'Feldräumer', kind: 'Minen umgehen', seating: { allein: 'portrait' }, aspect: 0.55, aspectMax: 0.85, icon: '_W_WOW_W_', create: createFeldraeumer },
  { id: 'neunerfeld', name: 'Neunerfeld', kind: 'Zahlenrätsel 9 × 9', seating: { allein: 'portrait' }, aspect: 0.68, aspectMax: 0.82, icon: 'W_W_B_W_W', create: createNeunerfeld },
  { id: 'solitaer', name: 'Solitär', kind: 'Karten-Patience', seating: { allein: 'portrait' }, aspect: 0.55, aspectMax: 0.78, icon: 'WOWW_WOWO', create: createSolitaer },
  { id: 'schach', name: 'Schach', kind: 'Den König mattsetzen', seating: BOTH_PORTRAIT, aspect: 1, levels: ['Anfänger', 'Einsteiger', 'Leicht', 'Mittel', 'Schwer'], icon: '_W_BWBBBB', create: createSchach },
  { id: 'kloetzchen', name: 'Klötzchen', kind: 'Reihen füllen, in deinem Tempo', seating: { allein: 'portrait' }, aspect: 0.6, aspectMax: 0.8, icon: 'O__OB_BBB', create: createKloetzchen },
  { id: 'ausparken', name: 'Ausparken', kind: 'Autos verschieben, rausfahren', seating: { allein: 'portrait' }, aspect: 0.72, aspectMax: 0.9, icon: 'O_W_BB_W_', create: createAusparken }
];

for (const g of GAMES) g.howTo = HOW_TO[g.id];

export function findGame(id: string): GameDef | undefined {
  return GAMES.find((g) => g.id === id);
}

export function playerRange(g: GameDef): 'allein' | 'zu-zweit' | 'beides' {
  const solo = !!g.seating.allein;
  const duo = !!(g.seating.gegenueber || g.seating.nebeneinander);
  return solo && duo ? 'beides' : solo ? 'allein' : 'zu-zweit';
}
