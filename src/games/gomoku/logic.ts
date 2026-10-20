import type { Level, PlayerIndex } from '../../core/types';

// 13x13 Punkte. Wer zuerst fünf (oder mehr) Steine in einer Reihe hat, gewinnt.

export const N = 13;
export type Cell = PlayerIndex | null;

export interface GomokuState {
  board: Cell[];
  turn: PlayerIndex;
  winner: PlayerIndex | null;
  winLine: number[];
  full: boolean;
}

const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
const inside = (r: number, c: number): boolean => r >= 0 && r < N && c >= 0 && c < N;

export function startState(starter: PlayerIndex): GomokuState {
  return { board: new Array<Cell>(N * N).fill(null), turn: starter, winner: null, winLine: [], full: false };
}

/** Steine von p in einer Richtung ab (r, c), ohne den Startpunkt. */
function run(b: Cell[], r: number, c: number, dr: number, dc: number, p: PlayerIndex): number[] {
  const out: number[] = [];
  let rr = r + dr;
  let cc = c + dc;
  while (inside(rr, cc) && b[rr * N + cc] === p) {
    out.push(rr * N + cc);
    rr += dr;
    cc += dc;
  }
  return out;
}

export function place(s: GomokuState, i: number): GomokuState {
  if (s.winner !== null || s.board[i] !== null) throw new Error('Ungültiger Zug');
  const board = s.board.slice();
  const p = s.turn;
  board[i] = p;
  const r = Math.floor(i / N);
  const c = i % N;
  for (const [dr, dc] of DIRS) {
    const line = [...run(board, r, c, -dr, -dc, p).reverse(), i, ...run(board, r, c, dr, dc, p)];
    if (line.length >= 5) return { board, turn: p, winner: p, winLine: line, full: false };
  }
  const full = board.every((v) => v !== null);
  return { board, turn: (1 - p) as PlayerIndex, winner: null, winLine: [], full };
}

export const isOver = (s: GomokuState): boolean => s.winner !== null || s.full;

/** Bewertung eines freien Punkts für Spieler p: Reihen, die dort entstehen würden. */
function lineValue(count: number, openEnds: number): number {
  if (count >= 5) return 1_000_000;
  if (openEnds === 0) return 0;
  switch (count) {
    case 4:
      return openEnds === 2 ? 100_000 : 10_000;
    case 3:
      return openEnds === 2 ? 5_000 : 400;
    case 2:
      return openEnds === 2 ? 200 : 20;
    default:
      return openEnds === 2 ? 10 : 1;
  }
}

export function pointValue(b: Cell[], i: number, p: PlayerIndex): number {
  const r = Math.floor(i / N);
  const c = i % N;
  let total = 0;
  for (const [dr, dc] of DIRS) {
    const fwd = run(b, r, c, dr, dc, p).length;
    const back = run(b, r, c, -dr, -dc, p).length;
    const fr = r + (fwd + 1) * dr;
    const fc = c + (fwd + 1) * dc;
    const br = r - (back + 1) * dr;
    const bc = c - (back + 1) * dc;
    const open = (inside(fr, fc) && b[fr * N + fc] === null ? 1 : 0) + (inside(br, bc) && b[br * N + bc] === null ? 1 : 0);
    total += lineValue(1 + fwd + back, open);
  }
  return total;
}

/** Freie Punkte in der Nähe vorhandener Steine. */
export function candidates(b: Cell[]): number[] {
  if (b.every((v) => v === null)) return [Math.floor((N * N) / 2)];
  const out: number[] = [];
  for (let i = 0; i < N * N; i++) {
    if (b[i] !== null) continue;
    const r = Math.floor(i / N);
    const c = i % N;
    let near = false;
    for (let dr = -2; dr <= 2 && !near; dr++) {
      for (let dc = -2; dc <= 2 && !near; dc++) {
        if (inside(r + dr, c + dc) && b[(r + dr) * N + c + dc] !== null) near = true;
      }
    }
    if (near) out.push(i);
  }
  return out;
}

/** Leicht: einer der acht besten Punkte. Mittel: guter Punkt mit etwas Zufall. Schwer: stärkster Angriff oder nötige Abwehr. */
export function computerMove(s: GomokuState, level: Level, rng: () => number = Math.random): number {
  const me = s.turn;
  const opp = (1 - me) as PlayerIndex;
  const defense = level === 2 ? 0.95 : level === 1 ? 0.75 : 0.6;
  const scored = candidates(s.board)
    .map((i) => {
      const attack = pointValue(s.board, i, me);
      // Ein eigener Sieg geht immer vor
      const v = attack >= 1_000_000 ? Infinity : attack + defense * pointValue(s.board, i, opp);
      return { i, v: level === 1 ? v * (1 + rng() * 0.25) : v + rng() };
    })
    .sort((a, b) => b.v - a.v);
  if (level === 0) {
    if (scored[0].v === Infinity) return scored[0].i;
    const pool = scored.slice(0, 8);
    return pool[Math.floor(rng() * pool.length)].i;
  }
  return scored[0].i;
}
