import type { Level } from '../../core/types';

// Fallende Blöcke ohne Zeitdruck: Steine fallen nicht von selbst, abgelegt wird auf Knopfdruck.

export const COLS = 10;
export const ROWS = 18;
export const TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const;
export type PieceType = (typeof TYPES)[number];

/** Form jedes Steins in seinem Kasten (Größe 4 für I, 2 für O, sonst 3), Zeilen von oben. */
const SHAPES: Record<PieceType, string[]> = {
  I: ['....', 'XXXX', '....', '....'],
  O: ['XX', 'XX'],
  T: ['.X.', 'XXX', '...'],
  S: ['.XX', 'XX.', '...'],
  Z: ['XX.', '.XX', '...'],
  J: ['X..', 'XXX', '...'],
  L: ['..X', 'XXX', '...']
};

export interface Piece {
  type: PieceType;
  rot: number;
  x: number;
  y: number;
}

export interface BlockState {
  /** 0 leer, sonst 1 bis 7 für den Steintyp */
  board: number[];
  piece: Piece;
  queue: PieceType[];
  bag: PieceType[];
  score: number;
  lines: number;
  over: boolean;
  /** Schwer: rein zufällige Steine statt gemischter Siebenerbeutel */
  pureRandom: boolean;
}

/** Felder eines Steins auf dem Brett. */
export function cellsOf(p: Piece): [number, number][] {
  const shape = SHAPES[p.type];
  const n = shape.length;
  const out: [number, number][] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (shape[r][c] !== 'X') continue;
      // Drehung im Uhrzeigersinn: (r, c) -> (c, n - 1 - r)
      let rr = r;
      let cc = c;
      for (let k = 0; k < ((p.rot % 4) + 4) % 4; k++) [rr, cc] = [cc, n - 1 - rr];
      out.push([p.x + cc, p.y + rr]);
    }
  }
  return out;
}

export function fits(board: number[], p: Piece): boolean {
  return cellsOf(p).every(([x, y]) => x >= 0 && x < COLS && y >= 0 && y < ROWS && board[y * COLS + x] === 0);
}

function nextType(s: { bag: PieceType[]; pureRandom: boolean }, rng: () => number): { type: PieceType; bag: PieceType[] } {
  if (s.pureRandom) return { type: TYPES[Math.floor(rng() * TYPES.length)], bag: s.bag };
  let bag = s.bag.slice();
  if (!bag.length) {
    bag = [...TYPES];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  return { type: bag.shift()!, bag };
}

function spawn(type: PieceType): Piece {
  const n = SHAPES[type].length;
  return { type, rot: 0, x: Math.floor((COLS - n) / 2), y: type === 'I' ? -1 : 0 };
}

export const PREVIEW: Record<Level, number> = { 0: 3, 1: 1, 2: 1 };

export function startState(level: Level, rng: () => number = Math.random): BlockState {
  let s = { bag: [] as PieceType[], pureRandom: level === 2 };
  const queue: PieceType[] = [];
  for (let k = 0; k < 4; k++) {
    const n = nextType(s, rng);
    queue.push(n.type);
    s = { ...s, bag: n.bag };
  }
  const first = queue.shift()!;
  return { board: new Array(COLS * ROWS).fill(0), piece: spawn(first), queue, bag: s.bag, score: 0, lines: 0, over: false, pureRandom: s.pureRandom };
}

export function move(s: BlockState, dx: number): BlockState {
  if (s.over) return s;
  const p = { ...s.piece, x: s.piece.x + dx };
  return fits(s.board, p) ? { ...s, piece: p } : s;
}

/** Drehen mit einfachen Ausweichversuchen an Wänden und Steinen. */
export function rotate(s: BlockState, dir = 1): BlockState {
  if (s.over || s.piece.type === 'O') return s;
  const turned = { ...s.piece, rot: s.piece.rot + dir };
  // Am oberen Rand darf der Stein beim Drehen auch nach unten ausweichen
  for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1], [0, 1], [0, 2]]) {
    const p = { ...turned, x: turned.x + dx, y: turned.y + dy };
    if (fits(s.board, p)) return { ...s, piece: p };
  }
  return s;
}

/** Wie weit der Stein fallen würde. */
export function dropY(s: BlockState): number {
  let y = s.piece.y;
  while (fits(s.board, { ...s.piece, y: y + 1 })) y++;
  return y;
}

const LINE_POINTS = [0, 100, 300, 500, 800];

/** Stein festsetzen, volle Reihen entfernen, nächsten Stein holen. */
export function lock(s: BlockState, rng: () => number = Math.random): { state: BlockState; cleared: number } {
  const board = s.board.slice();
  const value = TYPES.indexOf(s.piece.type) + 1;
  for (const [x, y] of cellsOf(s.piece)) if (y >= 0) board[y * COLS + x] = value;
  const kept: number[][] = [];
  for (let y = 0; y < ROWS; y++) {
    const row = board.slice(y * COLS, (y + 1) * COLS);
    if (!row.every((v) => v)) kept.push(row);
  }
  const cleared = ROWS - kept.length;
  const fresh = [...Array.from({ length: cleared }, () => new Array(COLS).fill(0)), ...kept].flat();
  const n = nextType(s, rng);
  const queue = [...s.queue, n.type];
  const piece = spawn(queue.shift()!);
  const over = !fits(fresh, piece);
  return {
    state: { ...s, board: fresh, piece, queue, bag: n.bag, score: s.score + LINE_POINTS[cleared], lines: s.lines + cleared, over },
    cleared
  };
}

/** Eine Reihe nach unten. Geht es nicht weiter, wird der Stein abgelegt. */
export function stepDown(s: BlockState, rng: () => number = Math.random): { state: BlockState; cleared: number } {
  if (s.over) return { state: s, cleared: 0 };
  const p = { ...s.piece, y: s.piece.y + 1 };
  if (fits(s.board, p)) return { state: { ...s, piece: p }, cleared: 0 };
  return lock(s, rng);
}

/** Ganz nach unten und ablegen. */
export function hardDrop(s: BlockState, rng: () => number = Math.random): { state: BlockState; cleared: number } {
  if (s.over) return { state: s, cleared: 0 };
  return lock({ ...s, piece: { ...s.piece, y: dropY(s) } }, rng);
}

export const shapeOf = (type: PieceType): string[] => SHAPES[type];
