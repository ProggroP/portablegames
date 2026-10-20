import type { Level, PlayerIndex } from '../../core/types';

export type Cell = PlayerIndex | null;
export type Board = Cell[];

const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

// Klassische Feldgewichte: Ecken sind stark, Felder neben den Ecken gefährlich.
const WEIGHTS = [
  100, -20, 10, 5, 5, 10, -20, 100,
  -20, -50, -2, -2, -2, -2, -50, -20,
  10, -2, -1, -1, -1, -1, -2, 10,
  5, -2, -1, -1, -1, -1, -2, 5,
  5, -2, -1, -1, -1, -1, -2, 5,
  10, -2, -1, -1, -1, -1, -2, 10,
  -20, -50, -2, -2, -2, -2, -50, -20,
  100, -20, 10, 5, 5, 10, -20, 100
];

export function startBoard(): Board {
  const b = new Array<Cell>(64).fill(null);
  b[27] = 1;
  b[36] = 1;
  b[28] = 0;
  b[35] = 0;
  return b;
}

/** Steine, die ein Zug von p auf idx umdrehen würde. */
export function flipsFor(b: Board, idx: number, p: PlayerIndex): number[] {
  if (b[idx] !== null) return [];
  const r = Math.floor(idx / 8);
  const c = idx % 8;
  const out: number[] = [];
  for (const [dr, dc] of DIRS) {
    const run: number[] = [];
    let rr = r + dr;
    let cc = c + dc;
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === 1 - p) {
      run.push(rr * 8 + cc);
      rr += dr;
      cc += dc;
    }
    if (run.length && rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === p) out.push(...run);
  }
  return out;
}

export function legalMoves(b: Board, p: PlayerIndex): number[] {
  const moves: number[] = [];
  for (let i = 0; i < 64; i++) if (flipsFor(b, i, p).length) moves.push(i);
  return moves;
}

export function applyMove(b: Board, idx: number, p: PlayerIndex): Board {
  const flips = flipsFor(b, idx, p);
  if (!flips.length) throw new Error('Ungültiger Zug');
  const next = b.slice();
  next[idx] = p;
  for (const f of flips) next[f] = p;
  return next;
}

export function countStones(b: Board): [number, number] {
  let a = 0;
  let o = 0;
  for (const v of b) {
    if (v === 0) a++;
    else if (v === 1) o++;
  }
  return [a, o];
}

/** Wer als Nächstes zieht: der Gegner, sonst derselbe Spieler (Aussetzen), sonst niemand (Ende). */
export function nextTurn(b: Board, justMoved: PlayerIndex): PlayerIndex | null {
  const other = (1 - justMoved) as PlayerIndex;
  if (legalMoves(b, other).length) return other;
  if (legalMoves(b, justMoved).length) return justMoved;
  return null;
}

function evaluate(b: Board, me: PlayerIndex): number {
  const other = (1 - me) as PlayerIndex;
  let score = 0;
  for (let i = 0; i < 64; i++) {
    if (b[i] === me) score += WEIGHTS[i];
    else if (b[i] === other) score -= WEIGHTS[i];
  }
  const mobility = legalMoves(b, me).length - legalMoves(b, other).length;
  return score + 5 * mobility;
}

function search(b: Board, turn: PlayerIndex, me: PlayerIndex, depth: number, alpha: number, beta: number): number {
  const moves = legalMoves(b, turn);
  const other = (1 - turn) as PlayerIndex;
  if (!moves.length) {
    if (!legalMoves(b, other).length) {
      const [a, o] = countStones(b);
      const diff = me === 0 ? a - o : o - a;
      return diff > 0 ? 10000 + diff : diff < 0 ? -10000 + diff : 0;
    }
    return search(b, other, me, depth, alpha, beta);
  }
  if (depth === 0) return evaluate(b, me);
  if (turn === me) {
    let best = -Infinity;
    for (const m of moves) {
      best = Math.max(best, search(applyMove(b, m, turn), other, me, depth - 1, alpha, beta));
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    best = Math.min(best, search(applyMove(b, m, turn), other, me, depth - 1, alpha, beta));
    beta = Math.min(beta, best);
    if (alpha >= beta) break;
  }
  return best;
}

/** Leicht: zufällig, Mittel: beste Feldwertung für einen Zug, Schwer: Vorausschau über mehrere Züge. */
export function computerMove(b: Board, me: PlayerIndex, level: Level, rng: () => number = Math.random): number {
  const moves = legalMoves(b, me);
  if (!moves.length) throw new Error('Kein Zug möglich');
  const pickBest = (score: (m: number) => number) => {
    let best = -Infinity;
    let bestMoves: number[] = [];
    for (const m of moves) {
      const s = score(m);
      if (s > best) {
        best = s;
        bestMoves = [m];
      } else if (s === best) {
        bestMoves.push(m);
      }
    }
    return bestMoves[Math.floor(rng() * bestMoves.length)];
  };
  if (level === 0) return moves[Math.floor(rng() * moves.length)];
  if (level === 1) return pickBest((m) => WEIGHTS[m] + flipsFor(b, m, me).length);
  const other = (1 - me) as PlayerIndex;
  return pickBest((m) => search(applyMove(b, m, me), other, me, 3, -Infinity, Infinity));
}
