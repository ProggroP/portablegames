import type { Level, PlayerIndex } from '../../core/types';

export type Cell = PlayerIndex | null;
export type Board = Cell[];

export const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

export function emptyBoard(): Board {
  return new Array<Cell>(9).fill(null);
}

export function winnerOf(b: Board): { winner: PlayerIndex; line: number[] } | null {
  for (const line of LINES) {
    const [a, c, d] = line;
    const v = b[a];
    if (v !== null && v === b[c] && v === b[d]) return { winner: v, line };
  }
  return null;
}

export function freeCells(b: Board): number[] {
  return b.flatMap((v, i) => (v === null ? [i] : []));
}

// Bewertung ohne Suchtiefe: Ein früher Sieg lässt mehr Felder frei und zählt deshalb mehr.
// So lässt sich jede Stellung zwischenspeichern.
const memo = new Map<string, number>();

function minimax(b: Board, turn: PlayerIndex, me: PlayerIndex): number {
  const key = b.map((v) => (v === null ? '.' : v)).join('') + turn + me;
  const cached = memo.get(key);
  if (cached !== undefined) return cached;
  const free = freeCells(b);
  const w = winnerOf(b);
  let result: number;
  if (w) {
    result = (w.winner === me ? 1 : -1) * (1 + free.length);
  } else if (!free.length) {
    result = 0;
  } else {
    const scores = free.map((i) => {
      b[i] = turn;
      const s = minimax(b, (1 - turn) as PlayerIndex, me);
      b[i] = null;
      return s;
    });
    result = turn === me ? Math.max(...scores) : Math.min(...scores);
  }
  memo.set(key, result);
  return result;
}

/** Wählt den Zug des Computers. Leicht: zufällig, Mittel: gewinnt und blockt, Schwer: perfekt. */
export function computerMove(b: Board, me: PlayerIndex, level: Level, rng: () => number = Math.random): number {
  const free = freeCells(b);
  const pick = (cells: number[]) => cells[Math.floor(rng() * cells.length)];
  if (level === 0) return pick(free);

  if (level === 1) {
    const other = (1 - me) as PlayerIndex;
    for (const who of [me, other]) {
      for (const i of free) {
        const next = b.slice();
        next[i] = who;
        if (winnerOf(next)) return i;
      }
    }
    return free.includes(4) ? 4 : pick(free);
  }

  let best = -Infinity;
  let bestCells: number[] = [];
  for (const i of free) {
    const next = b.slice();
    next[i] = me;
    const s = minimax(next, (1 - me) as PlayerIndex, me);
    if (s > best) {
      best = s;
      bestCells = [i];
    } else if (s === best) {
      bestCells.push(i);
    }
  }
  return pick(bestCells);
}
