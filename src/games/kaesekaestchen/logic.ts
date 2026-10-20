import type { Level, PlayerIndex } from '../../core/types';

// N x N Kästchen. Linien: erst alle waagerechten (N+1 Reihen zu je N), dann alle senkrechten (N Reihen zu je N+1).
// Wer ein Kästchen schließt, bekommt es und ist noch einmal dran.

export const SIZE = 5;

export interface BoxState {
  n: number;
  lines: boolean[];
  boxes: (PlayerIndex | null)[];
  turn: PlayerIndex;
}

export const hLine = (n: number, r: number, c: number): number => r * n + c;
export const vLine = (n: number, r: number, c: number): number => n * (n + 1) + r * (n + 1) + c;

export function boxSides(n: number, b: number): number[] {
  const r = Math.floor(b / n);
  const c = b % n;
  return [hLine(n, r, c), hLine(n, r + 1, c), vLine(n, r, c), vLine(n, r, c + 1)];
}

/** Kästchen, die an einer Linie liegen (eins oder zwei). */
export function boxesOfLine(n: number, line: number): number[] {
  const h = n * (n + 1);
  if (line < h) {
    const r = Math.floor(line / n);
    const c = line % n;
    return [r - 1, r].filter((rr) => rr >= 0 && rr < n).map((rr) => rr * n + c);
  }
  const k = line - h;
  const r = Math.floor(k / (n + 1));
  const c = k % (n + 1);
  return [c - 1, c].filter((cc) => cc >= 0 && cc < n).map((cc) => r * n + cc);
}

export function startState(starter: PlayerIndex, n = SIZE): BoxState {
  return { n, lines: new Array(2 * n * (n + 1)).fill(false), boxes: new Array(n * n).fill(null), turn: starter };
}

export function freeLines(s: BoxState): number[] {
  return s.lines.flatMap((v, i) => (v ? [] : [i]));
}

const sidesDrawn = (s: BoxState, b: number): number => boxSides(s.n, b).filter((l) => s.lines[l]).length;

/** Zieht eine Linie. Liefert den neuen Stand und die geschlossenen Kästchen. */
export function drawLine(s: BoxState, line: number): { state: BoxState; closed: number[] } {
  if (s.lines[line]) throw new Error('Linie schon gezogen');
  const lines = s.lines.slice();
  lines[line] = true;
  const boxes = s.boxes.slice();
  const closed: number[] = [];
  for (const b of boxesOfLine(s.n, line)) {
    if (boxSides(s.n, b).every((l) => lines[l])) {
      boxes[b] = s.turn;
      closed.push(b);
    }
  }
  const turn = closed.length ? s.turn : ((1 - s.turn) as PlayerIndex);
  return { state: { ...s, lines, boxes, turn }, closed };
}

export function scores(s: BoxState): [number, number] {
  const out: [number, number] = [0, 0];
  for (const b of s.boxes) if (b !== null) out[b]++;
  return out;
}

export function isOver(s: BoxState): boolean {
  return s.lines.every(Boolean);
}

/** Linien, die ein Kästchen sofort schließen. */
function closingLines(s: BoxState): number[] {
  return freeLines(s).filter((l) => boxesOfLine(s.n, l).some((b) => sidesDrawn(s, b) === 3));
}

/** Linien, nach denen kein Kästchen drei Seiten hat, der Gegner also nichts bekommt. */
function safeLines(s: BoxState): number[] {
  return freeLines(s).filter((l) => boxesOfLine(s.n, l).every((b) => sidesDrawn(s, b) < 2));
}

/** Wie viele Kästchen der Gegner nach dieser Linie nacheinander schließen kann. */
function giveaway(s: BoxState, line: number): number {
  let st = drawLine(s, line).state;
  let taken = 0;
  for (;;) {
    const close = closingLines(st);
    if (!close.length) return taken;
    const r = drawLine(st, close[0]);
    taken += r.closed.length;
    st = r.state;
  }
}

/** Leicht: zufällig, schließt aber meist offene Kästchen. Mittel: verschenkt nichts unnötig. Schwer: gibt am Ende die kürzeste Kette ab. */
export function computerMove(s: BoxState, level: Level, rng: () => number = Math.random): number {
  const pick = (ls: number[]): number => ls[Math.floor(rng() * ls.length)];
  const free = freeLines(s);
  if (!free.length) throw new Error('Kein Zug möglich');
  const closing = closingLines(s);
  if (level === 0) return closing.length && rng() < 0.6 ? pick(closing) : pick(free);
  if (closing.length) return pick(closing);
  const safe = safeLines(s);
  if (safe.length) return pick(safe);
  if (level === 1) return pick(free);
  let best = Infinity;
  let bestLines: number[] = [];
  for (const l of free) {
    const g = giveaway(s, l);
    if (g < best) {
      best = g;
      bestLines = [l];
    } else if (g === best) {
      bestLines.push(l);
    }
  }
  return pick(bestLines);
}
