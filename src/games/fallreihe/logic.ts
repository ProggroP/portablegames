import { bestMove, type SearchGame } from '../../core/search';
import type { Level, PlayerIndex } from '../../core/types';

// 7 Spalten, 6 Reihen. Reihe 0 ist oben. Wer zuerst vier Steine in einer Reihe hat, gewinnt.

export const COLS = 7;
export const ROWS = 6;
export type Cell = PlayerIndex | null;

export interface FallState {
  board: Cell[];
  turn: PlayerIndex;
  winner: PlayerIndex | null;
  winLine: number[];
  full: boolean;
}

const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
const CENTER_FIRST = [3, 2, 4, 1, 5, 0, 6];

export function startState(starter: PlayerIndex): FallState {
  return { board: new Array<Cell>(COLS * ROWS).fill(null), turn: starter, winner: null, winLine: [], full: false };
}

/** Unterster freier Platz einer Spalte oder -1, wenn sie voll ist. */
export function landingRow(b: Cell[], col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) if (b[r * COLS + col] === null) return r;
  return -1;
}

export function legalMoves(s: FallState): number[] {
  if (s.winner !== null || s.full) return [];
  return CENTER_FIRST.filter((c) => landingRow(s.board, c) >= 0);
}

export function drop(s: FallState, col: number): FallState {
  const r = landingRow(s.board, col);
  if (r < 0 || s.winner !== null) throw new Error('Ungültiger Zug');
  const board = s.board.slice();
  const p = s.turn;
  const i = r * COLS + col;
  board[i] = p;
  for (const [dr, dc] of DIRS) {
    const line = [i];
    for (const sgn of [1, -1]) {
      let rr = r + sgn * dr;
      let cc = col + sgn * dc;
      while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && board[rr * COLS + cc] === p) {
        line.push(rr * COLS + cc);
        rr += sgn * dr;
        cc += sgn * dc;
      }
    }
    if (line.length >= 4) return { board, turn: p, winner: p, winLine: line.sort((a, b) => a - b), full: false };
  }
  return { board, turn: (1 - p) as PlayerIndex, winner: null, winLine: [], full: board.every((v) => v !== null) };
}

function evaluate(s: FallState, me: PlayerIndex): number {
  if (s.winner !== null) {
    // Frühe Siege zählen mehr als späte
    const empty = s.board.filter((v) => v === null).length;
    return (s.winner === me ? 1 : -1) * (100000 + empty);
  }
  if (s.full) return 0;
  const opp = (1 - me) as PlayerIndex;
  let score = 0;
  for (let r = 0; r < ROWS; r++) {
    if (s.board[r * COLS + 3] === me) score += 3;
    else if (s.board[r * COLS + 3] === opp) score -= 3;
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of DIRS) {
        const er = r + 3 * dr;
        const ec = c + 3 * dc;
        if (er < 0 || er >= ROWS || ec < 0 || ec >= COLS) continue;
        let mine = 0;
        let theirs = 0;
        for (let k = 0; k < 4; k++) {
          const v = s.board[(r + k * dr) * COLS + c + k * dc];
          if (v === me) mine++;
          else if (v === opp) theirs++;
        }
        if (theirs === 0) score += mine === 3 ? 5 : mine === 2 ? 2 : 0;
        else if (mine === 0) score -= theirs === 3 ? 4 : theirs === 2 ? 2 : 0;
      }
    }
  }
  return score;
}

const GAME: SearchGame<FallState, number> = {
  moves: legalMoves,
  apply: drop,
  evaluate,
  isOver: (s) => s.winner !== null || s.full,
  turn: (s) => s.turn
};

export function computerMove(s: FallState, level: Level, rng: () => number = Math.random): number {
  const moves = legalMoves(s);
  if (!moves.length) throw new Error('Kein Zug möglich');
  if (level === 0) {
    const win = moves.find((c) => drop(s, c).winner !== null);
    if (win !== undefined && rng() < 0.7) return win;
    return moves[Math.floor(rng() * moves.length)];
  }
  return level === 1
    ? bestMove(GAME, s, { timeMs: 250, maxDepth: 3, minDepth: 2, rng })
    : bestMove(GAME, s, { timeMs: 800, maxDepth: 12, minDepth: 6, rng });
}
