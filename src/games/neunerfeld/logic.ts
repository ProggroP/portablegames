import type { Level } from '../../core/types';

// 9x9 Felder, 0 steht für leer. Jede Zeile, Spalte und jeder 3x3-Block enthält 1 bis 9 genau einmal.

export type Grid = number[];

/** Ungefähr so viele Zahlen bleiben je Stufe stehen. Weniger Vorgaben heißt schwerer. */
export const GIVENS: Record<Level, number> = { 0: 40, 1: 32, 2: 26 };

const ALL = 0b1111111110; // Bits 1 bis 9

export const rowOf = (i: number): number => Math.floor(i / 9);
export const colOf = (i: number): number => i % 9;
export const boxOf = (i: number): number => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

/** Alle Felder, die mit i eine Zeile, Spalte oder einen Block teilen (ohne i selbst). */
export const PEERS: number[][] = Array.from({ length: 81 }, (_, i) => {
  const out: number[] = [];
  for (let j = 0; j < 81; j++) {
    if (j !== i && (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i))) out.push(j);
  }
  return out;
});

function allowed(g: Grid, i: number): number {
  let used = 0;
  for (const p of PEERS[i]) if (g[p]) used |= 1 << g[p];
  return ALL & ~used;
}

const bitCount = (m: number): number => {
  let n = 0;
  while (m) {
    m &= m - 1;
    n++;
  }
  return n;
};

/**
 * Zählt Lösungen bis `limit` (Backtracking, immer das Feld mit den wenigsten Möglichkeiten zuerst).
 * Mit `rng` werden die Ziffern zufällig probiert, und die erste Lösung bleibt in `g` stehen.
 */
function search(g: Grid, limit: number, rng?: () => number): number {
  let best = -1;
  let bestMask = 0;
  let bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (g[i]) continue;
    const m = allowed(g, i);
    const c = bitCount(m);
    if (c === 0) return 0;
    if (c < bestCount) {
      best = i;
      bestMask = m;
      bestCount = c;
      if (c === 1) break;
    }
  }
  if (best < 0) return 1;
  const digits: number[] = [];
  for (let d = 1; d <= 9; d++) if (bestMask & (1 << d)) digits.push(d);
  if (rng) {
    for (let k = digits.length - 1; k > 0; k--) {
      const j = Math.floor(rng() * (k + 1));
      [digits[k], digits[j]] = [digits[j], digits[k]];
    }
  }
  let found = 0;
  for (const d of digits) {
    g[best] = d;
    found += search(g, limit - found, rng);
    if (found >= limit) {
      if (rng) return found; // gefundene Lösung stehen lassen
      break;
    }
  }
  g[best] = 0;
  return found;
}

export function countSolutions(g: Grid, limit = 2): number {
  return search(g.slice(), limit);
}

export function randomSolution(rng: () => number = Math.random): Grid {
  const g = new Array(81).fill(0);
  search(g, 1, rng);
  return g;
}

/** Erzeugt ein Rätsel mit genau einer Lösung. */
export function makePuzzle(level: Level, rng: () => number = Math.random): { puzzle: Grid; solution: Grid } {
  const solution = randomSolution(rng);
  const puzzle = solution.slice();
  const order = Array.from({ length: 81 }, (_, i) => i);
  for (let k = order.length - 1; k > 0; k--) {
    const j = Math.floor(rng() * (k + 1));
    [order[k], order[j]] = [order[j], order[k]];
  }
  let givens = 81;
  for (const i of order) {
    if (givens <= GIVENS[level]) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle) === 1) givens--;
    else puzzle[i] = keep;
  }
  return { puzzle, solution };
}

/** Felder, deren Zahl in Zeile, Spalte oder Block doppelt vorkommt. */
export function conflicts(values: Grid): Set<number> {
  const out = new Set<number>();
  for (let i = 0; i < 81; i++) {
    if (!values[i]) continue;
    for (const p of PEERS[i]) if (values[p] === values[i]) out.add(i);
  }
  return out;
}

export const isSolved = (values: Grid): boolean => values.every((v) => v > 0) && conflicts(values).size === 0;
