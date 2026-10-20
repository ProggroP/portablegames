import { describe, expect, it } from 'vitest';
import { computerMove, legalMoves, sow, startState, winnerOf, type MancalaState } from './logic';

const st = (board: number[], turn: 0 | 1 = 0): MancalaState => ({ board, turn, over: false });

describe('Mancala', () => {
  it('beginnt mit 48 Bohnen und sechs möglichen Zügen', () => {
    const s = startState(0);
    expect(s.board.reduce((a, c) => a + c, 0)).toBe(48);
    expect(legalMoves(s)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('die letzte Bohne im eigenen Speicher gibt einen Extrazug', () => {
    const r = sow(startState(0), 2);
    expect(r.extraTurn).toBe(true);
    expect(r.state.turn).toBe(0);
    expect(r.state.board.slice(0, 7)).toEqual([4, 4, 0, 5, 5, 5, 1]);
  });

  it('der gegnerische Speicher wird übersprungen', () => {
    const board = [0, 0, 0, 0, 0, 10, 0, 1, 1, 1, 1, 1, 1, 0];
    const r = sow(st(board), 5);
    expect(r.state.board[13]).toBe(0);
    expect(r.state.board[0]).toBe(1);
    expect(r.state.board.reduce((a, c) => a + c, 0)).toBe(16);
  });

  it('landet die letzte Bohne in einer leeren eigenen Mulde, wird gegenüber geschlagen', () => {
    const board = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 3, 0];
    const r = sow(st(board), 0);
    expect(r.captured).toBe(6);
    expect(r.state.board[6]).toBe(6);
    expect(r.state.board[11]).toBe(0);
  });

  it('ist eine Seite leer, endet das Spiel und der Rest wird gutgeschrieben', () => {
    const board = [0, 0, 0, 0, 0, 1, 20, 2, 0, 0, 0, 0, 3, 10];
    const r = sow(st(board), 5);
    expect(r.state.over).toBe(true);
    expect(r.state.board[6]).toBe(21);
    expect(r.state.board[13]).toBe(15);
    expect(winnerOf(r.state)).toBe(0);
  });

  it('der Computer spielt auf jeder Stufe gültig bis zum Ende', () => {
    for (const level of [0, 1] as const) {
      let s = startState(0);
      while (!s.over) {
        const m = computerMove(s, level);
        expect(legalMoves(s)).toContain(m);
        s = sow(s, m).state;
      }
      expect(s.board[6] + s.board[13]).toBe(48);
    }
    expect(legalMoves(startState(0))).toContain(computerMove(startState(0), 2));
  }, 20000);

  it('die schwere Stufe spielt Extrazüge in der richtigen Reihenfolge', () => {
    // Mulde 5 (1 Bohne) und Mulde 3 (3 Bohnen) enden beide im Speicher.
    // Erst 5, sonst würde Mulde 3 die Bohne in Mulde 5 verschieben und den zweiten Extrazug zerstören.
    const board = [1, 1, 1, 3, 0, 1, 0, 4, 4, 4, 4, 4, 4, 0];
    expect(computerMove(st(board), 2)).toBe(5);
  }, 5000);
});
