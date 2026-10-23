// Schneller Zuggenerator und Suche für den Computergegner (0x88-Brett).
// Die Spielregeln im Spiel selbst prüft chess.js. Diese Engine dient nur dem Vorausdenken
// und wird per Perft-Test gegen bekannte Referenzzahlen geprüft.

import type { Level } from '../../core/types';

const WHITE = 0;
const BLACK = 8;
const PAWN = 1;
const KNIGHT = 2;
const BISHOP = 3;
const ROOK = 4;
const QUEEN = 5;
const KING = 6;

const KNIGHT_STEPS = [33, 31, 18, 14, -33, -31, -18, -14];
const BISHOP_DIRS = [15, 17, -15, -17];
const ROOK_DIRS = [16, -16, 1, -1];
const KING_STEPS = [...BISHOP_DIRS, ...ROOK_DIRS];

const FLAG_DOUBLE = 1;
const FLAG_EP = 2;
const FLAG_CASTLE = 3;

export interface EMove {
  from: number;
  to: number;
  piece: number;
  captured: number;
  promo: number;
  flag: number;
}

interface Undo {
  captured: number;
  castling: number;
  ep: number;
  halfmove: number;
}

const onBoard = (sq: number): boolean => (sq & 0x88) === 0;
export const sqName = (sq: number): string => 'abcdefgh'[sq & 7] + ((sq >> 4) + 1);
const nameSq = (n: string): number => (Number(n[1]) - 1) * 16 + 'abcdefgh'.indexOf(n[0]);

// Rochaderechte: 1 weiß kurz, 2 weiß lang, 4 schwarz kurz, 8 schwarz lang
const CASTLE_MASK = new Array(128).fill(15);
CASTLE_MASK[4] = 15 & ~3;
CASTLE_MASK[7] = 15 & ~1;
CASTLE_MASK[0] = 15 & ~2;
CASTLE_MASK[116] = 15 & ~12;
CASTLE_MASK[119] = 15 & ~4;
CASTLE_MASK[112] = 15 & ~8;

export class Position {
  board = new Array<number>(128).fill(0);
  side = WHITE;
  castling = 0;
  ep = -1;
  halfmove = 0;
  kings = [4, 116];
  private undos: Undo[] = [];

  static fromFen(fen: string): Position {
    const p = new Position();
    const [placement, side, castling, ep, half] = fen.split(' ');
    const rows = placement.split('/');
    rows.forEach((row, i) => {
      const rank = 7 - i;
      let file = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) {
          file += Number(ch);
          continue;
        }
        const color = ch === ch.toUpperCase() ? WHITE : BLACK;
        const type = ' pnbrqk'.indexOf(ch.toLowerCase());
        const sq = rank * 16 + file;
        p.board[sq] = type | color;
        if (type === KING) p.kings[color ? 1 : 0] = sq;
        file++;
      }
    });
    p.side = side === 'w' ? WHITE : BLACK;
    p.castling = (castling.includes('K') ? 1 : 0) | (castling.includes('Q') ? 2 : 0) | (castling.includes('k') ? 4 : 0) | (castling.includes('q') ? 8 : 0);
    p.ep = ep && ep !== '-' ? nameSq(ep) : -1;
    p.halfmove = Number(half ?? 0);
    return p;
  }

  isAttacked(sq: number, by: number): boolean {
    const b = this.board;
    // Bauern
    if (by === WHITE) {
      if (onBoard(sq - 15) && b[sq - 15] === (PAWN | WHITE)) return true;
      if (onBoard(sq - 17) && b[sq - 17] === (PAWN | WHITE)) return true;
    } else {
      if (onBoard(sq + 15) && b[sq + 15] === (PAWN | BLACK)) return true;
      if (onBoard(sq + 17) && b[sq + 17] === (PAWN | BLACK)) return true;
    }
    for (const d of KNIGHT_STEPS) if (onBoard(sq + d) && b[sq + d] === (KNIGHT | by)) return true;
    for (const d of KING_STEPS) if (onBoard(sq + d) && b[sq + d] === (KING | by)) return true;
    for (const d of BISHOP_DIRS) {
      for (let t = sq + d; onBoard(t); t += d) {
        const pc = b[t];
        if (!pc) continue;
        if ((pc & 8) === by && ((pc & 7) === BISHOP || (pc & 7) === QUEEN)) return true;
        break;
      }
    }
    for (const d of ROOK_DIRS) {
      for (let t = sq + d; onBoard(t); t += d) {
        const pc = b[t];
        if (!pc) continue;
        if ((pc & 8) === by && ((pc & 7) === ROOK || (pc & 7) === QUEEN)) return true;
        break;
      }
    }
    return false;
  }

  inCheck(): boolean {
    return this.isAttacked(this.kings[this.side ? 1 : 0], this.side ^ 8);
  }

  private pseudoMoves(capturesOnly: boolean): EMove[] {
    const out: EMove[] = [];
    const b = this.board;
    const us = this.side;
    const them = us ^ 8;
    const add = (from: number, to: number, piece: number, captured: number, flag = 0): void => {
      if ((piece & 7) === PAWN && ((to >> 4) === 7 || (to >> 4) === 0)) {
        for (const promo of [QUEEN, ROOK, BISHOP, KNIGHT]) out.push({ from, to, piece, captured, promo: promo | us, flag });
      } else {
        out.push({ from, to, piece, captured, promo: 0, flag });
      }
    };
    for (let from = 0; from < 128; from++) {
      if (!onBoard(from)) {
        from += 7;
        continue;
      }
      const piece = b[from];
      if (!piece || (piece & 8) !== us) continue;
      const type = piece & 7;
      if (type === PAWN) {
        const fwd = us === WHITE ? 16 : -16;
        const startRank = us === WHITE ? 1 : 6;
        const one = from + fwd;
        if (!capturesOnly && onBoard(one) && !b[one]) {
          add(from, one, piece, 0);
          const two = one + fwd;
          if ((from >> 4) === startRank && !b[two]) add(from, two, piece, 0, FLAG_DOUBLE);
        } else if (capturesOnly && onBoard(one) && !b[one] && ((one >> 4) === 7 || (one >> 4) === 0)) {
          add(from, one, piece, 0); // Umwandlung zählt in der Ruhesuche mit
        }
        for (const d of us === WHITE ? [15, 17] : [-15, -17]) {
          const to = from + d;
          if (!onBoard(to)) continue;
          if (b[to] && (b[to] & 8) === them) add(from, to, piece, b[to]);
          else if (to === this.ep) add(from, to, piece, PAWN | them, FLAG_EP);
        }
        continue;
      }
      const steps = type === KNIGHT ? KNIGHT_STEPS : type === KING ? KING_STEPS : null;
      if (steps) {
        for (const d of steps) {
          const to = from + d;
          if (!onBoard(to)) continue;
          const t = b[to];
          if (!t) {
            if (!capturesOnly) add(from, to, piece, 0);
          } else if ((t & 8) === them) add(from, to, piece, t);
        }
      } else {
        const dirs = type === BISHOP ? BISHOP_DIRS : type === ROOK ? ROOK_DIRS : KING_STEPS;
        for (const d of dirs) {
          for (let to = from + d; onBoard(to); to += d) {
            const t = b[to];
            if (!t) {
              if (!capturesOnly) add(from, to, piece, 0);
              continue;
            }
            if ((t & 8) === them) add(from, to, piece, t);
            break;
          }
        }
      }
      // Rochade
      if (type === KING && !capturesOnly) {
        const home = us === WHITE ? 4 : 116;
        const kRight = us === WHITE ? 1 : 4;
        const qRight = us === WHITE ? 2 : 8;
        if (from === home && !this.isAttacked(home, them)) {
          if (this.castling & kRight && !b[home + 1] && !b[home + 2] && !this.isAttacked(home + 1, them) && !this.isAttacked(home + 2, them)) {
            add(from, home + 2, piece, 0, FLAG_CASTLE);
          }
          if (this.castling & qRight && !b[home - 1] && !b[home - 2] && !b[home - 3] && !this.isAttacked(home - 1, them) && !this.isAttacked(home - 2, them)) {
            add(from, home - 2, piece, 0, FLAG_CASTLE);
          }
        }
      }
    }
    return out;
  }

  make(m: EMove): void {
    const b = this.board;
    this.undos.push({ captured: m.flag === FLAG_EP ? 0 : b[m.to], castling: this.castling, ep: this.ep, halfmove: this.halfmove });
    b[m.to] = m.promo || m.piece;
    b[m.from] = 0;
    if (m.flag === FLAG_EP) b[m.to + (this.side === WHITE ? -16 : 16)] = 0;
    if (m.flag === FLAG_CASTLE) {
      if (m.to > m.from) {
        b[m.from + 1] = b[m.from + 3];
        b[m.from + 3] = 0;
      } else {
        b[m.from - 1] = b[m.from - 4];
        b[m.from - 4] = 0;
      }
    }
    if ((m.piece & 7) === KING) this.kings[this.side ? 1 : 0] = m.to;
    this.castling &= CASTLE_MASK[m.from] & CASTLE_MASK[m.to];
    this.ep = m.flag === FLAG_DOUBLE ? (m.from + m.to) >> 1 : -1;
    this.halfmove = (m.piece & 7) === PAWN || m.captured ? 0 : this.halfmove + 1;
    this.side ^= 8;
  }

  unmake(m: EMove): void {
    const u = this.undos.pop()!;
    this.side ^= 8;
    const b = this.board;
    b[m.from] = m.piece;
    b[m.to] = u.captured;
    if (m.flag === FLAG_EP) b[m.to + (this.side === WHITE ? -16 : 16)] = m.captured;
    if (m.flag === FLAG_CASTLE) {
      if (m.to > m.from) {
        b[m.from + 3] = b[m.from + 1];
        b[m.from + 1] = 0;
      } else {
        b[m.from - 4] = b[m.from - 1];
        b[m.from - 1] = 0;
      }
    }
    if ((m.piece & 7) === KING) this.kings[this.side ? 1 : 0] = m.from;
    this.castling = u.castling;
    this.ep = u.ep;
    this.halfmove = u.halfmove;
  }

  legalMoves(capturesOnly = false): EMove[] {
    const out: EMove[] = [];
    const us = this.side;
    for (const m of this.pseudoMoves(capturesOnly)) {
      this.make(m);
      if (!this.isAttacked(this.kings[us ? 1 : 0], us ^ 8)) out.push(m);
      this.unmake(m);
    }
    return out;
  }
}

/** Anzahl aller Zugfolgen bis zur Tiefe, zum Prüfen gegen Referenzwerte. */
export function perft(p: Position, depth: number): number {
  if (depth === 0) return 1;
  let n = 0;
  for (const m of p.legalMoves()) {
    p.make(m);
    n += perft(p, depth - 1);
    p.unmake(m);
  }
  return n;
}

// Bewertung: Material und Feldtabellen nach der „Simplified Evaluation Function“ (Michniewski).
// Die Tabellen sind aus Sicht von Weiß notiert, Zeile 8 oben.
const VALUE = [0, 100, 320, 330, 500, 900, 0];
const PST: number[][] = [
  [],
  [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20]
];
const KING_END = [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50];

/** Bewertung aus Sicht der Seite am Zug. */
export function evaluate(p: Position): number {
  let score = 0;
  let officers = 0;
  for (let sq = 0; sq < 128; sq++) {
    if (!onBoard(sq)) {
      sq += 7;
      continue;
    }
    const pc = p.board[sq];
    if (pc && (pc & 7) !== PAWN && (pc & 7) !== KING) officers += VALUE[pc & 7];
  }
  const endgame = officers <= 1300;
  for (let sq = 0; sq < 128; sq++) {
    if (!onBoard(sq)) {
      sq += 7;
      continue;
    }
    const pc = p.board[sq];
    if (!pc) continue;
    const type = pc & 7;
    const white = (pc & 8) === WHITE;
    const rank = sq >> 4;
    const file = sq & 7;
    const idx = white ? (7 - rank) * 8 + file : rank * 8 + file;
    const table = type === KING && endgame ? KING_END : PST[type];
    const v = VALUE[type] + table[idx];
    score += white ? v : -v;
  }
  return p.side === WHITE ? score : -score;
}

const MATE = 100000;

class TimeUp extends Error {}

export interface EngineOptions {
  timeMs: number;
  maxDepth: number;
  minDepth: number;
  /** Zufällige Abweichung in Centipawns pro Zug an der Wurzel, macht leichtere Stufen schwächer */
  noise: number;
  /** false: am Suchende nur bewerten, ohne Schlagabtausch zu Ende zu rechnen. Übersieht dann Rückschläge wie ein Anfänger. */
  quiesce?: boolean;
  rng: () => number;
}

const orderScore = (m: EMove): number => (m.captured ? 10 * VALUE[m.captured & 7] - VALUE[m.piece & 7] + 10000 : 0) + (m.promo ? 9000 : 0);

export function search(p: Position, opts: EngineOptions): { move: EMove | null; depth: number; score: number } {
  const deadline = performance.now() + opts.timeMs;
  let nodes = 0;
  let timed = false;

  const quiesce = (alpha: number, beta: number): number => {
    if (timed && (++nodes & 1023) === 0 && performance.now() > deadline) throw new TimeUp();
    const stand = evaluate(p);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    const moves = p.legalMoves(true).sort((a, b) => orderScore(b) - orderScore(a));
    for (const m of moves) {
      p.make(m);
      const s = -quiesce(-beta, -alpha);
      p.unmake(m);
      if (s >= beta) return beta;
      if (s > alpha) alpha = s;
    }
    return alpha;
  };

  const negamax = (depth: number, alpha: number, beta: number, ply: number): number => {
    if (timed && (++nodes & 1023) === 0 && performance.now() > deadline) throw new TimeUp();
    if (p.halfmove >= 100) return 0;
    const check = p.inCheck();
    // Wer im Schach steht, wird nicht in die Ruhesuche geschickt, sonst übersieht die Suche Matt
    if (depth <= 0 && !check) return opts.quiesce === false ? evaluate(p) : quiesce(alpha, beta);
    const moves = p.legalMoves();
    if (!moves.length) return check ? -MATE + ply : 0;
    // Ohne Ruhesuche wird im Schach nur Matt erkannt, nicht weitergerechnet
    if (depth <= 0 && opts.quiesce === false) return evaluate(p);
    moves.sort((a, b) => orderScore(b) - orderScore(a));
    for (const m of moves) {
      p.make(m);
      const s = -negamax(depth - 1, -beta, -alpha, ply + 1);
      p.unmake(m);
      if (s >= beta) return beta;
      if (s > alpha) alpha = s;
    }
    return alpha;
  };

  const root = p.legalMoves().sort((a, b) => orderScore(b) - orderScore(a));
  if (!root.length) return { move: null, depth: 0, score: p.inCheck() ? -MATE : 0 };
  const noise = new Map(root.map((m) => [m, (opts.rng() * 2 - 1) * opts.noise]));
  let best = root[0];
  let bestScore = -Infinity;
  let reached = 0;

  for (let depth = 1; depth <= opts.maxDepth; depth++) {
    timed = depth > opts.minDepth;
    try {
      let alpha = -Infinity;
      let iterBest = root[0];
      for (const m of root) {
        p.make(m);
        const s = -negamax(depth - 1, -Infinity, -alpha + opts.noise * 2 + 1, 1) + noise.get(m)!;
        p.unmake(m);
        if (s > alpha) {
          alpha = s;
          iterBest = m;
        }
      }
      best = iterBest;
      bestScore = alpha;
      reached = depth;
      root.splice(root.indexOf(iterBest), 1);
      root.unshift(iterBest);
      if (Math.abs(bestScore) > MATE - 1000) break; // Matt gefunden
    } catch (e) {
      if (e instanceof TimeUp) break;
      throw e;
    }
  }
  return { move: best, depth: reached, score: bestScore };
}

/** Stufen von Anfänger bis Schwer, Reihenfolge wie `levels` beim Schach in registry.ts */
const LEVEL_OPTIONS: Omit<EngineOptions, 'rng'>[] = [
  { timeMs: 100, maxDepth: 1, minDepth: 1, noise: 300, quiesce: false },
  { timeMs: 100, maxDepth: 2, minDepth: 2, noise: 150, quiesce: false },
  { timeMs: 150, maxDepth: 1, minDepth: 1, noise: 120 },
  { timeMs: 500, maxDepth: 4, minDepth: 2, noise: 25 },
  { timeMs: 1200, maxDepth: 12, minDepth: 3, noise: 0 }
];

/** Zug des Computers für eine Stellung in FEN, als Felder in algebraischer Schreibweise. */
export function computerMove(
  fen: string,
  level: Level,
  rng: () => number = Math.random
): { from: string; to: string; promotion?: string } | null {
  const p = Position.fromFen(fen);
  const { move } = search(p, { ...LEVEL_OPTIONS[level], rng });
  if (!move) return null;
  return {
    from: sqName(move.from),
    to: sqName(move.to),
    promotion: move.promo ? ' pnbrqk'[move.promo & 7] : undefined
  };
}
