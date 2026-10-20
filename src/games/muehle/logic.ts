import { bestMove, type SearchGame } from '../../core/search';
import type { Level, PlayerIndex } from '../../core/types';

export type Cell = PlayerIndex | null;

export interface MillState {
  board: Cell[];
  /** Steine, die noch gesetzt werden müssen. */
  hand: [number, number];
  turn: PlayerIndex;
  /** Züge ohne Mühle, seit beide alle Steine gesetzt haben. */
  quiet: number;
}

/** Setzen (ohne from) oder Ziehen, dazu der geschlagene Stein, wenn eine Mühle entsteht. */
export interface MillMove {
  from?: number;
  to: number;
  remove?: number;
}

export const STONES = 9;
/** Unentschieden nach so vielen Zügen ohne Mühle. */
export const DRAW_LIMIT = 50;

function ring(o: number): [number, number][] {
  const a = o;
  const c = 6 - o;
  return [[a, a], [3, a], [c, a], [c, 3], [c, c], [3, c], [a, c], [a, 3]];
}

/** Lage der 24 Punkte auf einem 7x7-Raster: drei Ringe, je im Uhrzeigersinn ab der Ecke oben links. */
export const POINTS: [number, number][] = [...ring(0), ...ring(1), ...ring(2)];

export const NEIGHBORS: number[][] = POINTS.map((_, p) => {
  const r = Math.floor(p / 8);
  const i = p % 8;
  const n = [r * 8 + ((i + 1) % 8), r * 8 + ((i + 7) % 8)];
  if (i % 2 === 1) {
    if (r > 0) n.push(p - 8);
    if (r < 2) n.push(p + 8);
  }
  return n;
});

export const MILLS: number[][] = [
  ...[0, 1, 2].flatMap((r) => [0, 2, 4, 6].map((k) => [8 * r + k, 8 * r + k + 1, 8 * r + ((k + 2) % 8)])),
  ...[1, 3, 5, 7].map((i) => [i, 8 + i, 16 + i])
];

export function startState(starter: PlayerIndex): MillState {
  return { board: new Array<Cell>(24).fill(null), hand: [STONES, STONES], turn: starter, quiet: 0 };
}

export function countOnBoard(b: Cell[], p: PlayerIndex): number {
  let n = 0;
  for (const v of b) if (v === p) n++;
  return n;
}

/** Steine insgesamt, also auf dem Brett und noch in der Hand. */
export function stonesLeft(s: MillState, p: PlayerIndex): number {
  return countOnBoard(s.board, p) + s.hand[p];
}

export function phaseOf(s: MillState, p: PlayerIndex): 'setzen' | 'ziehen' | 'springen' {
  if (s.hand[p] > 0) return 'setzen';
  return countOnBoard(s.board, p) === 3 ? 'springen' : 'ziehen';
}

export function inMill(b: Cell[], point: number): boolean {
  const p = b[point];
  if (p === null) return false;
  return MILLS.some((m) => m.includes(point) && m.every((q) => b[q] === p));
}

/** Steine von p, die geschlagen werden dürfen: keine aus Mühlen, außer es gibt nur solche. */
export function removable(b: Cell[], p: PlayerIndex): number[] {
  const all = b.flatMap((v, i) => (v === p ? [i] : []));
  const free = all.filter((i) => !inMill(b, i));
  return free.length ? free : all;
}

function formsMill(b: Cell[], to: number, p: PlayerIndex): boolean {
  return MILLS.some((m) => m.includes(to) && m.every((q) => b[q] === p));
}

export function legalMoves(s: MillState): MillMove[] {
  const p = s.turn;
  const opp = (1 - p) as PlayerIndex;
  const empty = s.board.flatMap((v, i) => (v === null ? [i] : []));
  const steps: MillMove[] = [];
  const phase = phaseOf(s, p);
  if (phase === 'setzen') {
    for (const to of empty) steps.push({ to });
  } else {
    s.board.forEach((v, from) => {
      if (v !== p) return;
      const targets = phase === 'springen' ? empty : NEIGHBORS[from].filter((n) => s.board[n] === null);
      for (const to of targets) steps.push({ from, to });
    });
  }
  const out: MillMove[] = [];
  for (const m of steps) {
    const b = s.board.slice();
    if (m.from !== undefined) b[m.from] = null;
    b[m.to] = p;
    if (formsMill(b, m.to, p)) {
      for (const r of removable(b, opp)) out.push({ ...m, remove: r });
    } else {
      out.push(m);
    }
  }
  return out;
}

export function applyMove(s: MillState, m: MillMove): MillState {
  const p = s.turn;
  const board = s.board.slice();
  const hand: [number, number] = [s.hand[0], s.hand[1]];
  if (m.from !== undefined) board[m.from] = null;
  else hand[p]--;
  board[m.to] = p;
  if (m.remove !== undefined) board[m.remove] = null;
  const placingDone = hand[0] === 0 && hand[1] === 0;
  return {
    board,
    hand,
    turn: (1 - p) as PlayerIndex,
    quiet: placingDone && m.remove === undefined ? s.quiet + 1 : 0
  };
}

/** Ergebnis aus Sicht des Spielers am Zug. null: Das Spiel läuft noch. */
export function outcome(s: MillState): { winner: PlayerIndex | null; reason: string } | null {
  const p = s.turn;
  const opp = (1 - p) as PlayerIndex;
  if (stonesLeft(s, p) < 3) return { winner: opp, reason: 'nur noch zwei Steine' };
  if (legalMoves(s).length === 0) return { winner: opp, reason: 'eingesperrt' };
  if (s.quiet >= DRAW_LIMIT) return { winner: null, reason: `${DRAW_LIMIT} Züge ohne Mühle` };
  return null;
}

function openMills(b: Cell[], p: PlayerIndex): number {
  // Zwei eigene Steine in einer Linie, der dritte Punkt frei.
  let n = 0;
  for (const m of MILLS) {
    let own = 0;
    let free = 0;
    for (const q of m) {
      if (b[q] === p) own++;
      else if (b[q] === null) free++;
    }
    if (own === 2 && free === 1) n++;
  }
  return n;
}

function mobility(b: Cell[], p: PlayerIndex): number {
  let n = 0;
  b.forEach((v, i) => {
    if (v === p) for (const x of NEIGHBORS[i]) if (b[x] === null) n++;
  });
  return n;
}

function evaluate(s: MillState, me: PlayerIndex): number {
  const result = outcome(s);
  const opp = (1 - me) as PlayerIndex;
  if (result) return result.winner === null ? 0 : result.winner === me ? 100000 : -100000;
  let score = (stonesLeft(s, me) - stonesLeft(s, opp)) * 1000;
  score += (openMills(s.board, me) - openMills(s.board, opp)) * 40;
  if (phaseOf(s, me) === 'ziehen') score += mobility(s.board, me) * 8;
  if (phaseOf(s, opp) === 'ziehen') score -= mobility(s.board, opp) * 8;
  return score;
}

const GAME: SearchGame<MillState, MillMove> = {
  moves: legalMoves,
  apply: applyMove,
  evaluate,
  isOver: (s) => outcome(s) !== null,
  turn: (s) => s.turn
};

/** Leicht: zufällig, aber jede Mühle wird genutzt. Mittel: kurze Vorausschau. Schwer: tiefere Vorausschau. */
export function computerMove(s: MillState, level: Level, rng: () => number = Math.random): MillMove {
  const moves = legalMoves(s);
  if (!moves.length) throw new Error('Kein Zug möglich');
  if (level === 0) {
    const mills = moves.filter((m) => m.remove !== undefined);
    const pool = mills.length && rng() < 0.7 ? mills : moves;
    return pool[Math.floor(rng() * pool.length)];
  }
  return level === 1
    ? bestMove(GAME, s, { timeMs: 250, maxDepth: 2, rng })
    : bestMove(GAME, s, { timeMs: 700, maxDepth: 8, rng });
}
