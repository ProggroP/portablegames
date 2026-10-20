import { describe, expect, it } from 'vitest';
import { applyMove, computerMove, countPieces, legalMoves, outcome, startState, type Cell, type DameState } from './logic';

/** Brett aus 8 Zeilen: b/o einfacher Stein, B/O Dame, . leer */
function state(rows: string[], turn: 0 | 1 = 0, quiet = 0): DameState {
  const board: Cell[] = rows.join('').split('').map((ch) => {
    if (ch === 'b') return { p: 0, king: false };
    if (ch === 'o') return { p: 1, king: false };
    if (ch === 'B') return { p: 0, king: true };
    if (ch === 'O') return { p: 1, king: true };
    return null;
  });
  return { board, turn, quiet };
}
const sq = (name: string): number => (8 - Number(name[1])) * 8 + 'abcdefgh'.indexOf(name[0]);

describe('Dame', () => {
  it('beginnt mit je 12 Steinen und 7 möglichen Zügen', () => {
    const s = startState(0);
    expect(countPieces(s.board)).toEqual([12, 12]);
    expect(legalMoves(s).length).toBe(7);
  });

  it('Steine ziehen nur vorwärts', () => {
    const s = state(['........', '........', '........', '........', '...b....', '........', '........', '........']);
    const targets = legalMoves(s).map((m) => m.path[1]).sort((a, b) => a - b);
    expect(targets).toEqual([sq('c5'), sq('e5')]);
  });

  it('Schlagzwang: gibt es einen Sprung, ist nur der erlaubt', () => {
    const s = state(['........', '........', '........', '..o.....', '...b....', '........', 'b.......', '........']);
    const moves = legalMoves(s);
    expect(moves).toEqual([{ path: [sq('d4'), sq('b6')], captures: [sq('c5')] }]);
  });

  it('einfache Steine schlagen nicht rückwärts', () => {
    const s = state(['........', '........', '........', '........', '...b....', '....o...', '........', '........']);
    expect(legalMoves(s).every((m) => m.captures.length === 0)).toBe(true);
  });

  it('Mehrfachsprünge werden zu Ende geführt', () => {
    const s = state(['........', '........', '..o.....', '........', '..o.....', '...b....', '........', '........']);
    const moves = legalMoves(s);
    expect(moves.length).toBe(1);
    expect(moves[0].captures.length).toBe(2);
    expect(moves[0].path).toEqual([sq('d3'), sq('b5'), sq('d7')]);
  });

  it('auf der letzten Reihe wird der Stein zur Dame', () => {
    const s = state(['........', '..b.....', '........', '........', '........', '........', '........', '.......o']);
    const m = legalMoves(s).find((x) => x.path[1] === sq('b8'))!;
    expect(applyMove(s, m).board[sq('b8')]).toEqual({ p: 0, king: true });
  });

  it('die Dame zieht und schlägt über mehrere Felder', () => {
    const s = state(['........', '........', '........', '........', '........', '..o.....', '........', 'B.......']);
    const moves = legalMoves(s);
    expect(moves.every((m) => m.captures.length === 1)).toBe(true);
    // Landen auf d4, e5, f6, g7 oder h8
    expect(moves.map((m) => m.path[1]).sort((a, b) => a - b)).toEqual(
      [sq('h8'), sq('g7'), sq('f6'), sq('e5'), sq('d4')].sort((a, b) => a - b)
    );
  });

  it('wer nicht ziehen kann, verliert', () => {
    // Blau auf a3 ist von b4 blockiert, und hinter b4 steht c5, also kein Sprung.
    const s = state(['........', '........', '........', '..o.....', '.o......', 'b.......', '........', '........'], 0);
    expect(legalMoves(s)).toEqual([]);
    expect(outcome(s)?.winner).toBe(1);
  });

  it('nach vielen ruhigen Damenzügen ist es unentschieden', () => {
    const s = state(['B.......', '........', '........', '........', '........', '........', '........', '.......O'], 0, 49);
    const next = applyMove(s, legalMoves(s).find((m) => m.captures.length === 0)!);
    expect(outcome(next)?.winner).toBeNull();
  });

  it('der Computer spielt auf den Stufen Leicht und Mittel gültige Züge bis zum Ende', () => {
    for (const level of [0, 1] as const) {
      let s = startState(0);
      let guard = 0;
      while (!outcome(s) && guard++ < 400) {
        const m = computerMove(s, level);
        expect(legalMoves(s)).toContainEqual(m);
        s = applyMove(s, m);
      }
      expect(guard).toBeLessThan(400);
    }
  }, 60000);

  it('der Computer auf Schwer spielt gültige Züge und nimmt einen freien Stein', () => {
    let s = startState(0);
    for (let k = 0; k < 4; k++) {
      const m = computerMove(s, 2);
      expect(legalMoves(s)).toContainEqual(m);
      s = applyMove(s, m);
    }
    const hanging = state(['........', '........', '........', '........', '..o.....', '...b....', '........', '......o.']);
    expect(computerMove(hanging, 2).captures).toEqual([sq('c4')]);
  }, 20000);
});
