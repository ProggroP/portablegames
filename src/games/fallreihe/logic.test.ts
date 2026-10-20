import { describe, expect, it } from 'vitest';
import { COLS, computerMove, drop, landingRow, legalMoves, startState, type FallState } from './logic';

function play(cols: number[], starter: 0 | 1 = 0): FallState {
  return cols.reduce((s, c) => drop(s, c), startState(starter));
}

describe('Fallreihe', () => {
  it('Steine fallen nach unten und stapeln sich', () => {
    const s = play([3, 3]);
    expect(s.board[5 * COLS + 3]).toBe(0);
    expect(s.board[4 * COLS + 3]).toBe(1);
    expect(landingRow(s.board, 3)).toBe(3);
  });

  it('volle Spalten sind gesperrt', () => {
    const s = play([0, 0, 0, 0, 0, 0]);
    expect(legalMoves(s)).not.toContain(0);
    expect(() => drop(s, 0)).toThrow();
  });

  it('vier waagerecht, senkrecht und diagonal gewinnen', () => {
    expect(play([0, 0, 1, 1, 2, 2, 3]).winner).toBe(0);
    expect(play([0, 1, 0, 1, 0, 1, 0]).winner).toBe(0);
    // Diagonale von unten links nach oben rechts für Blau
    const diag = play([0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3]);
    expect(diag.winner).toBe(0);
    expect(diag.winLine.length).toBe(4);
  });

  it('Mittel und Schwer gewinnen sofort und blockieren', () => {
    const win = play([0, 6, 1, 6, 2]); // Orange am Zug, Blau droht auf 3
    for (const level of [1, 2] as const) expect(computerMove(win, level)).toBe(3);
    const own = play([0, 6, 0, 6, 1, 6]); // Blau am Zug, kann mit 6 nicht, Orange droht senkrecht in 6
    for (const level of [1, 2] as const) expect(computerMove(own, level)).toBe(6);
  });

  it('Schwer schlägt Leicht deutlich', () => {
    let seed = 3;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    let wins = 0;
    for (let game = 0; game < 6; game++) {
      let s = startState(game % 2 === 0 ? 0 : 1);
      while (s.winner === null && !s.full) s = drop(s, computerMove(s, s.turn === 0 ? 2 : 0, rng));
      if (s.winner === 0) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(5);
  }, 60000);
});
