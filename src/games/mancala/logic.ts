import { bestMove, type SearchGame } from '../../core/search';
import type { Level, PlayerIndex } from '../../core/types';

// Regeln (Kalah-Variante, 6 Mulden, 4 Bohnen je Mulde):
// - Gesät wird gegen den Uhrzeigersinn, eine Bohne pro Mulde, der gegnerische Speicher wird übersprungen.
// - Landet die letzte Bohne im eigenen Speicher, ist man noch einmal dran.
// - Landet sie in einer leeren eigenen Mulde und gegenüber liegen Bohnen, kommen beide in den eigenen Speicher.
// - Ist eine Seite leer, endet das Spiel. Die übrigen Bohnen gehören dem, auf dessen Seite sie liegen.
//
// Felder: 0-5 Mulden Blau (unten, links nach rechts), 6 Speicher Blau (rechts),
//         7-12 Mulden Orange (oben, rechts nach links), 13 Speicher Orange (links)

export const PITS = 6;
export const SEEDS = 4;
export const STORE: [number, number] = [6, 13];

export interface MancalaState {
  board: number[];
  turn: PlayerIndex;
  over: boolean;
}

export function startState(starter: PlayerIndex, seeds = SEEDS): MancalaState {
  const board = new Array(14).fill(seeds);
  board[6] = 0;
  board[13] = 0;
  return { board, turn: starter, over: false };
}

export function ownerOf(i: number): PlayerIndex | null {
  if (i >= 0 && i <= 5) return 0;
  if (i >= 7 && i <= 12) return 1;
  return null;
}

export const opposite = (i: number): number => 12 - i;

export function legalMoves(s: MancalaState): number[] {
  if (s.over) return [];
  const base = s.turn === 0 ? 0 : 7;
  const out: number[] = [];
  for (let i = base; i < base + PITS; i++) if (s.board[i] > 0) out.push(i);
  return out;
}

export interface SowResult {
  state: MancalaState;
  extraTurn: boolean;
  captured: number;
}

export function sow(s: MancalaState, pit: number): SowResult {
  const p = s.turn;
  if (ownerOf(pit) !== p || s.board[pit] === 0 || s.over) throw new Error('Ungültiger Zug');
  const board = s.board.slice();
  const store = STORE[p];
  const skip = STORE[1 - p];
  let seeds = board[pit];
  board[pit] = 0;
  let j = pit;
  while (seeds > 0) {
    j = (j + 1) % 14;
    if (j === skip) continue;
    board[j]++;
    seeds--;
  }
  let captured = 0;
  const extraTurn = j === store;
  if (!extraTurn && ownerOf(j) === p && board[j] === 1 && board[opposite(j)] > 0) {
    captured = board[opposite(j)] + 1;
    board[store] += captured;
    board[opposite(j)] = 0;
    board[j] = 0;
  }
  const side = (q: PlayerIndex): number => board.slice(q === 0 ? 0 : 7, q === 0 ? 6 : 13).reduce((a, c) => a + c, 0);
  let over = false;
  if (side(0) === 0 || side(1) === 0) {
    board[6] += side(0);
    board[13] += side(1);
    for (let k = 0; k < 14; k++) if (k !== 6 && k !== 13) board[k] = 0;
    over = true;
  }
  return { state: { board, turn: extraTurn || over ? p : ((1 - p) as PlayerIndex), over }, extraTurn: extraTurn && !over, captured };
}

export function winnerOf(s: MancalaState): PlayerIndex | null {
  const [a, b] = [s.board[6], s.board[13]];
  return a > b ? 0 : b > a ? 1 : null;
}

function evaluate(s: MancalaState, me: PlayerIndex): number {
  const mine = s.board[STORE[me]];
  const theirs = s.board[STORE[1 - me]];
  if (s.over) return mine > theirs ? 10000 + mine : mine < theirs ? -10000 - theirs : 0;
  const side = (q: PlayerIndex): number => s.board.slice(q === 0 ? 0 : 7, q === 0 ? 6 : 13).reduce((a, c) => a + c, 0);
  return (mine - theirs) * 10 + (side(me) - side((1 - me) as PlayerIndex));
}

const GAME: SearchGame<MancalaState, number> = {
  moves: legalMoves,
  apply: (s, m) => sow(s, m).state,
  evaluate,
  isOver: (s) => s.over,
  turn: (s) => s.turn
};

export function computerMove(s: MancalaState, level: Level, rng: () => number = Math.random): number {
  const moves = legalMoves(s);
  if (!moves.length) throw new Error('Kein Zug möglich');
  if (level === 0) return moves[Math.floor(rng() * moves.length)];
  return level === 1
    ? bestMove(GAME, s, { timeMs: 200, maxDepth: 2, minDepth: 2, rng })
    : bestMove(GAME, s, { timeMs: 700, maxDepth: 14, minDepth: 5, rng });
}
