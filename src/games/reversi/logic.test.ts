import { describe, expect, it } from 'vitest';
import { applyMove, computerMove, countStones, flipsFor, legalMoves, nextTurn, startBoard } from './logic';

describe('Reversi', () => {
  it('beginnt mit vier Steinen und vier möglichen Zügen', () => {
    const b = startBoard();
    expect(countStones(b)).toEqual([2, 2]);
    expect(legalMoves(b, 0).sort((a, c) => a - c)).toEqual([19, 26, 37, 44]);
    expect(legalMoves(b, 1).length).toBe(4);
  });

  it('dreht eingeschlossene Steine um', () => {
    const b = startBoard();
    expect(flipsFor(b, 19, 0)).toEqual([27]);
    const after = applyMove(b, 19, 0);
    expect(countStones(after)).toEqual([4, 1]);
  });

  it('lehnt ungültige Züge ab', () => {
    expect(() => applyMove(startBoard(), 0, 0)).toThrow();
  });

  it('lässt aussetzen, wenn der Gegner keinen Zug hat', () => {
    // Blau, Orange, frei: Nur Blau kann ziehen, Orange muss aussetzen.
    const b = new Array(64).fill(null);
    b[0] = 0;
    b[1] = 1;
    expect(legalMoves(b, 1)).toEqual([]);
    expect(nextTurn(b, 1)).toBe(0);
    b[2] = 0;
    b[1] = 0;
    expect(nextTurn(b, 0)).toBeNull();
  });

  it('der Computer spielt auf jeder Stufe nur gültige Züge bis zum Ende', () => {
    for (const level of [0, 1, 2] as const) {
      let b = startBoard();
      let turn: 0 | 1 | null = 0;
      let guard = 0;
      while (turn !== null && guard++ < 100) {
        const m = computerMove(b, turn, level);
        expect(legalMoves(b, turn)).toContain(m);
        b = applyMove(b, m, turn);
        turn = nextTurn(b, turn);
      }
      expect(turn).toBeNull();
    }
  });

  it('die mittlere Stufe nimmt eine freie Ecke', () => {
    const b = new Array(64).fill(null);
    b[9] = 1;
    b[18] = 0;
    b[10] = 1;
    b[11] = 0;
    expect(legalMoves(b, 0)).toContain(0);
    expect(computerMove(b, 0, 1)).toBe(0);
  });
});
