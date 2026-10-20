import type { Level } from '../../core/types';

// Minen werden erst beim ersten Aufdecken verteilt, nie auf das erste Feld oder seine Nachbarn.

export interface FieldSize {
  rows: number;
  cols: number;
  mines: number;
}

/** Feldgrößen je Stufe. Die Spaltenzahl bleibt klein, damit die Felder auf dem Handy gut zu treffen sind. */
export const SIZES: Record<Level, FieldSize> = {
  0: { rows: 10, cols: 8, mines: 10 },
  1: { rows: 12, cols: 9, mines: 18 },
  2: { rows: 14, cols: 9, mines: 28 }
};

export interface FieldState {
  size: FieldSize;
  /** null, solange noch nicht aufgedeckt wurde */
  mines: boolean[] | null;
  revealed: boolean[];
  flagged: boolean[];
  /** Feld, auf dem eine Mine aufgedeckt wurde */
  exploded: number;
  won: boolean;
}

export function startState(size: FieldSize): FieldState {
  const n = size.rows * size.cols;
  return { size, mines: null, revealed: new Array(n).fill(false), flagged: new Array(n).fill(false), exploded: -1, won: false };
}

export function neighbors(size: FieldSize, i: number): number[] {
  const r = Math.floor(i / size.cols);
  const c = i % size.cols;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < size.rows && cc >= 0 && cc < size.cols) out.push(rr * size.cols + cc);
    }
  }
  return out;
}

export function placeMines(size: FieldSize, safe: number, rng: () => number = Math.random): boolean[] {
  const n = size.rows * size.cols;
  const forbidden = new Set([safe, ...neighbors(size, safe)]);
  const pool = Array.from({ length: n }, (_, i) => i).filter((i) => !forbidden.has(i));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const mines = new Array(n).fill(false);
  for (const i of pool.slice(0, size.mines)) mines[i] = true;
  return mines;
}

export function countAround(s: FieldState, i: number): number {
  if (!s.mines) return 0;
  return neighbors(s.size, i).filter((n) => s.mines![n]).length;
}

export const isOver = (s: FieldState): boolean => s.won || s.exploded >= 0;

function checkWon(s: FieldState): FieldState {
  const won = s.mines !== null && s.revealed.every((r, i) => r || s.mines![i]);
  return won ? { ...s, won, flagged: s.mines!.slice() } : s;
}

/** Deckt ein Feld auf. Felder ohne Minen in der Nachbarschaft öffnen ihre Umgebung mit. */
export function reveal(s: FieldState, i: number, rng: () => number = Math.random): FieldState {
  if (isOver(s) || s.revealed[i] || s.flagged[i]) return s;
  const mines = s.mines ?? placeMines(s.size, i, rng);
  if (mines[i]) return { ...s, mines, exploded: i };
  const revealed = s.revealed.slice();
  const next: FieldState = { ...s, mines, revealed };
  const queue = [i];
  while (queue.length) {
    const k = queue.pop()!;
    if (revealed[k] || s.flagged[k]) continue;
    revealed[k] = true;
    if (countAround(next, k) === 0) for (const n of neighbors(s.size, k)) if (!revealed[n]) queue.push(n);
  }
  return checkWon(next);
}

export function toggleFlag(s: FieldState, i: number): FieldState {
  if (isOver(s) || s.revealed[i]) return s;
  const flagged = s.flagged.slice();
  flagged[i] = !flagged[i];
  return { ...s, flagged };
}

/** Tipp auf eine Zahl, um die genug Fahnen stehen: alle übrigen Nachbarn aufdecken. */
export function chord(s: FieldState, i: number): FieldState {
  if (isOver(s) || !s.revealed[i]) return s;
  const around = neighbors(s.size, i);
  const flags = around.filter((n) => s.flagged[n]).length;
  if (flags !== countAround(s, i)) return s;
  let next = s;
  for (const n of around) {
    if (!next.revealed[n] && !next.flagged[n]) next = reveal(next, n);
    if (isOver(next)) break;
  }
  return next;
}

export function minesLeft(s: FieldState): number {
  return s.size.mines - s.flagged.filter(Boolean).length;
}
