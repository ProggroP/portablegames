import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { Position, computerMove, perft, sqName } from './engine';

function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

// Referenzwerte aus dem Chess Programming Wiki („Perft Results“)
const PERFT: [string, string, number[]][] = [
  ['Grundstellung', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [20, 400, 8902, 197281]],
  ['Kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['Stellung 3', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['Stellung 4', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['Stellung 5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]]
];

describe('Schach-Engine: Zuggenerator', () => {
  for (const [name, fen, counts] of PERFT) {
    it(`Perft ${name}`, () => {
      const p = Position.fromFen(fen);
      counts.forEach((n, i) => expect(perft(p, i + 1)).toBe(n));
    }, 60000);
  }

  it('stimmt in 300 Zufallsstellungen mit chess.js überein', () => {
    const rng = seeded(42);
    const game = new Chess();
    for (let k = 0; k < 300; k++) {
      if (game.isGameOver()) game.reset();
      const mine = Position.fromFen(game.fen())
        .legalMoves()
        .map((m) => sqName(m.from) + sqName(m.to) + (m.promo ? ' pnbrqk'[m.promo & 7] : ''))
        .sort();
      const theirs = game.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? '')).sort();
      expect(mine).toEqual(theirs);
      const moves = game.moves();
      game.move(moves[Math.floor(rng() * moves.length)]);
    }
  });
});

describe('Schach-Engine: Computer', () => {
  it('findet ein Matt in einem Zug', () => {
    // Weiß: Dame h5, Läufer c4. Matt mit Dxf7.
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
    for (const level of [1, 2] as const) expect(computerMove(fen, level, seeded(1))).toEqual({ from: 'h5', to: 'f7', promotion: undefined });
  });

  it('schlägt eine ungedeckte Dame', () => {
    const fen = 'rnb1kbnr/pppp1ppp/8/4p1q1/3P4/2N5/PPP1PPPP/R1BQKBNR w KQkq - 0 3';
    // Lc1 schlägt die Dame auf g5
    expect(computerMove(fen, 2, seeded(2))).toMatchObject({ from: 'c1', to: 'g5' });
  });

  it('wandelt einen Bauern in eine Dame um', () => {
    const fen = '8/P6k/8/8/8/8/8/K7 w - - 0 1';
    expect(computerMove(fen, 2, seeded(3))).toEqual({ from: 'a7', to: 'a8', promotion: 'q' });
  });

  it('spielt auf allen Stufen nur legale Züge, auch eine ganze Partie lang', () => {
    const game = new Chess();
    const rng = seeded(9);
    let plies = 0;
    while (!game.isGameOver() && plies < 60) {
      const level = (plies % 3) as 0 | 1 | 2;
      const m = computerMove(game.fen(), level === 2 ? 1 : level, rng)!;
      expect(() => game.move(m)).not.toThrow();
      plies++;
    }
  }, 60000);

  it('antwortet auf Schwer in vertretbarer Zeit', () => {
    const t = performance.now();
    computerMove('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', 2, seeded(4));
    expect(performance.now() - t).toBeLessThan(4000);
  });
});
