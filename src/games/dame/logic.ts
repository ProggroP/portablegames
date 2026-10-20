import { bestMove, type SearchGame } from '../../core/search';
import type { Level, PlayerIndex } from '../../core/types';

// Regeln (verbreitete deutsche Hausregeln):
// - 8x8, gespielt auf den dunklen Feldern, je 12 Steine.
// - Steine ziehen und schlagen nur vorwärts, jeweils diagonal.
// - Schlagzwang. Ein Mehrfachsprung wird bis zum Ende ausgeführt.
// - Wer die gegenüberliegende Grundlinie erreicht, bekommt eine Dame. Der Zug endet dort.
// - Die Dame zieht und schlägt beliebig weit diagonal, vorwärts und rückwärts.
// - Verloren hat, wer keine Steine mehr hat oder nicht mehr ziehen kann.
// Blau (0) beginnt unten und zieht nach oben, Orange (1) umgekehrt.

export interface Piece {
  p: PlayerIndex;
  king: boolean;
}
export type Cell = Piece | null;

export interface DameState {
  board: Cell[];
  turn: PlayerIndex;
  /** Züge ohne Schlagen und ohne Zug eines einfachen Steins. */
  quiet: number;
}

export interface DameMove {
  /** Felder von Start bis Ziel, bei Mehrfachsprüngen mit allen Zwischenfeldern. */
  path: number[];
  captures: number[];
}

export const DRAW_LIMIT = 50;
const DIAGONALS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

export const isDark = (i: number): boolean => (Math.floor(i / 8) + (i % 8)) % 2 === 1;
const forward = (p: PlayerIndex): number => (p === 0 ? -1 : 1);
const lastRow = (p: PlayerIndex): number => (p === 0 ? 0 : 7);
const at = (r: number, c: number): number => (r >= 0 && r < 8 && c >= 0 && c < 8 ? r * 8 + c : -1);

export function startState(starter: PlayerIndex): DameState {
  const board: Cell[] = new Array(64).fill(null);
  for (let i = 0; i < 64; i++) {
    if (!isDark(i)) continue;
    const r = Math.floor(i / 8);
    if (r <= 2) board[i] = { p: 1, king: false };
    if (r >= 5) board[i] = { p: 0, king: false };
  }
  return { board, turn: starter, quiet: 0 };
}

function captureSequences(board: Cell[], from: number, piece: Piece): DameMove[] {
  const results: DameMove[] = [];
  const dirs = piece.king ? DIAGONALS : DIAGONALS.filter(([dr]) => dr === forward(piece.p));

  const walk = (pos: number, path: number[], captured: number[]): void => {
    let extended = false;
    const r = Math.floor(pos / 8);
    const c = pos % 8;
    for (const [dr, dc] of dirs) {
      let k = 1;
      // Die Dame darf bis zum ersten Stein gleiten.
      if (piece.king) while (at(r + k * dr, c + k * dc) >= 0 && isEmpty(at(r + k * dr, c + k * dc))) k++;
      const over = at(r + k * dr, c + k * dc);
      if (over < 0) continue;
      const target = board[over];
      if (!target || target.p === piece.p || captured.includes(over)) continue;
      // Landefelder hinter dem geschlagenen Stein
      let j = k + 1;
      while (true) {
        const land = at(r + j * dr, c + j * dc);
        if (land < 0 || !isEmpty(land)) break;
        extended = true;
        const nextPath = [...path, land];
        const nextCaptured = [...captured, over];
        if (!piece.king && Math.floor(land / 8) === lastRow(piece.p)) {
          results.push({ path: nextPath, captures: nextCaptured });
        } else {
          walk(land, nextPath, nextCaptured);
        }
        if (!piece.king) break;
        j++;
      }
    }
    if (!extended && captured.length) results.push({ path, captures: captured });
  };

  // Der Startpunkt gilt während des Zugs als frei, geschlagene Steine bleiben bis zum Ende liegen.
  const isEmpty = (i: number): boolean => board[i] === null || i === from;
  walk(from, [from], []);
  return results;
}

function simpleMoves(board: Cell[], from: number, piece: Piece): DameMove[] {
  const out: DameMove[] = [];
  const r = Math.floor(from / 8);
  const c = from % 8;
  const dirs = piece.king ? DIAGONALS : DIAGONALS.filter(([dr]) => dr === forward(piece.p));
  for (const [dr, dc] of dirs) {
    for (let k = 1; ; k++) {
      const to = at(r + k * dr, c + k * dc);
      if (to < 0 || board[to]) break;
      out.push({ path: [from, to], captures: [] });
      if (!piece.king) break;
    }
  }
  return out;
}

export function legalMoves(s: DameState): DameMove[] {
  const captures: DameMove[] = [];
  const simple: DameMove[] = [];
  s.board.forEach((piece, i) => {
    if (!piece || piece.p !== s.turn) return;
    captures.push(...captureSequences(s.board, i, piece));
    if (!captures.length) simple.push(...simpleMoves(s.board, i, piece));
  });
  return captures.length ? captures : simple;
}

export function applyMove(s: DameState, m: DameMove): DameState {
  const board = s.board.slice();
  const from = m.path[0];
  const to = m.path[m.path.length - 1];
  const piece = board[from]!;
  board[from] = null;
  for (const c of m.captures) board[c] = null;
  const promote = !piece.king && Math.floor(to / 8) === lastRow(piece.p);
  board[to] = { p: piece.p, king: piece.king || promote };
  const quiet = m.captures.length || !piece.king ? 0 : s.quiet + 1;
  return { board, turn: (1 - s.turn) as PlayerIndex, quiet };
}

export function countPieces(b: Cell[]): [number, number] {
  const n: [number, number] = [0, 0];
  for (const x of b) if (x) n[x.p]++;
  return n;
}

/** Ergebnis aus Sicht des Spielers am Zug. null: Das Spiel läuft noch. */
export function outcome(s: DameState): { winner: PlayerIndex | null } | null {
  const opp = (1 - s.turn) as PlayerIndex;
  if (countPieces(s.board)[s.turn] === 0 || legalMoves(s).length === 0) return { winner: opp };
  if (s.quiet >= DRAW_LIMIT) return { winner: null };
  return null;
}

function evaluate(s: DameState, me: PlayerIndex): number {
  const result = outcome(s);
  if (result) return result.winner === null ? 0 : result.winner === me ? 100000 : -100000;
  let score = 0;
  s.board.forEach((x, i) => {
    if (!x) return;
    const r = Math.floor(i / 8);
    const c = i % 8;
    let v = x.king ? 300 : 100;
    if (!x.king) v += (x.p === 0 ? 7 - r : r) * 4; // Fortschritt Richtung Dame
    if (c >= 2 && c <= 5 && r >= 2 && r <= 5) v += 6; // Mitte
    if (!x.king && r === (x.p === 0 ? 7 : 0)) v += 8; // Grundlinie schützt vor gegnerischen Damen
    score += x.p === me ? v : -v;
  });
  return score;
}

const GAME: SearchGame<DameState, DameMove> = {
  moves: legalMoves,
  apply: applyMove,
  evaluate,
  isOver: (s) => outcome(s) !== null,
  turn: (s) => s.turn
};

export function computerMove(s: DameState, level: Level, rng: () => number = Math.random): DameMove {
  const moves = legalMoves(s);
  if (!moves.length) throw new Error('Kein Zug möglich');
  if (level === 0) return moves[Math.floor(rng() * moves.length)];
  return level === 1
    ? bestMove(GAME, s, { timeMs: 250, maxDepth: 2, rng })
    : bestMove(GAME, s, { timeMs: 700, maxDepth: 10, rng });
}
