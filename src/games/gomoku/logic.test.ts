import { describe, expect, it } from 'vitest';
import { N, candidates, computerMove, isOver, place, startState, type GomokuState } from './logic';

const at = (r: number, c: number): number => r * N + c;

function withStones(blue: [number, number][], orange: [number, number][], turn: 0 | 1 = 0): GomokuState {
  const s = startState(turn);
  for (const [r, c] of blue) s.board[at(r, c)] = 0;
  for (const [r, c] of orange) s.board[at(r, c)] = 1;
  return s;
}

describe('Gomoku', () => {
  it('fünf in einer Reihe gewinnen, auch diagonal', () => {
    const s = withStones([[2, 2], [3, 3], [4, 4], [5, 5]], []);
    const after = place(s, at(6, 6));
    expect(after.winner).toBe(0);
    expect(after.winLine).toEqual([at(2, 2), at(3, 3), at(4, 4), at(5, 5), at(6, 6)]);
  });

  it('vier reichen nicht', () => {
    const s = withStones([[0, 0], [0, 1], [0, 2]], []);
    expect(place(s, at(0, 3)).winner).toBeNull();
  });

  it('auf belegte Punkte darf nicht gesetzt werden', () => {
    const s = place(startState(0), 0);
    expect(() => place(s, 0)).toThrow();
  });

  it('der erste Computerzug geht in die Mitte, danach nur in die Nähe', () => {
    expect(computerMove(startState(1), 2)).toBe(at(6, 6));
    const s = withStones([[6, 6]], [], 1);
    expect(candidates(s.board).length).toBe(24);
  });

  it('Mittel und Schwer gewinnen sofort, wenn es geht', () => {
    const s = withStones([[0, 0]], [[5, 1], [5, 2], [5, 3], [5, 4]], 1);
    for (const level of [1, 2] as const) expect([at(5, 0), at(5, 5)]).toContain(computerMove(s, level));
  });

  it('Mittel und Schwer blockieren eine offene Drei und eine Vier', () => {
    const three = withStones([[6, 4], [6, 5], [6, 6]], [[0, 0], [12, 12]], 1);
    for (const level of [1, 2] as const) expect([at(6, 3), at(6, 7)]).toContain(computerMove(three, level));
    const four = withStones([[3, 3], [4, 4], [5, 5], [6, 6]], [[2, 2], [0, 12]], 1);
    for (const level of [1, 2] as const) expect(computerMove(four, level)).toBe(at(7, 7));
  });

  it('Computer gegen Computer endet ohne Fehler', () => {
    let s = startState(0);
    while (!isOver(s)) s = place(s, computerMove(s, s.turn === 0 ? 2 : 1));
    expect(s.winner === null ? s.full : true).toBe(true);
  });
});
