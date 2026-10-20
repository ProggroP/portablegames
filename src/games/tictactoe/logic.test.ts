import { describe, expect, it } from 'vitest';
import { computerMove, emptyBoard, winnerOf, type Board } from './logic';

const board = (s: string): Board => s.split('').map((ch) => (ch === 'X' ? 0 : ch === 'O' ? 1 : null));

describe('Tic-Tac-Toe', () => {
  it('erkennt Reihen, Spalten und Diagonalen', () => {
    expect(winnerOf(board('XXX......'))?.winner).toBe(0);
    expect(winnerOf(board('O..O..O..'))?.winner).toBe(1);
    expect(winnerOf(board('X...X...X'))?.line).toEqual([0, 4, 8]);
    expect(winnerOf(board('XOXOXOOXO'))).toBeNull();
  });

  it('mittlere Stufe gewinnt sofort und blockt sonst', () => {
    expect(computerMove(board('OO.XX....'), 1, 1)).toBe(2);
    expect(computerMove(board('XX.O.....'), 1, 1)).toBe(2);
  });

  it('schwere Stufe verliert nie gegen einen zufälligen Gegner', () => {
    let seed = 1;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let game = 0; game < 200; game++) {
      const b = emptyBoard();
      let turn: 0 | 1 = game % 2 === 0 ? 0 : 1;
      while (!winnerOf(b) && b.includes(null)) {
        b[turn === 1 ? computerMove(b, 1, 2, rng) : computerMove(b, 0, 0, rng)] = turn;
        turn = turn === 0 ? 1 : 0;
      }
      expect(winnerOf(b)?.winner).not.toBe(0);
    }
  });
});
