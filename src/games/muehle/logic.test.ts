import { describe, expect, it } from 'vitest';
import {
  MILLS, NEIGHBORS, POINTS, applyMove, computerMove, legalMoves, outcome, phaseOf, removable, startState, stonesLeft,
  type Cell, type MillState
} from './logic';

function state(board: string, hand: [number, number], turn: 0 | 1 = 0, quiet = 0): MillState {
  const b: Cell[] = board.replace(/\s/g, '').split('').map((c) => (c === 'B' ? 0 : c === 'O' ? 1 : null));
  return { board: b, hand, turn, quiet };
}

describe('Mühle: Brett', () => {
  it('hat 24 Punkte, 16 Mühlen und 32 Verbindungen', () => {
    expect(POINTS.length).toBe(24);
    expect(new Set(POINTS.map((p) => p.join(','))).size).toBe(24);
    expect(MILLS.length).toBe(16);
    expect(NEIGHBORS.reduce((a, n) => a + n.length, 0) / 2).toBe(32);
  });

  it('Mühlen liegen auf einer geraden Linie', () => {
    for (const m of MILLS) {
      const [a, b, c] = m.map((i) => POINTS[i]);
      const straight = (a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1]);
      expect(straight).toBe(true);
    }
  });
});

describe('Mühle: Regeln', () => {
  it('zu Beginn wird gesetzt, auf jeden der 24 Punkte', () => {
    const s = startState(0);
    expect(phaseOf(s, 0)).toBe('setzen');
    expect(legalMoves(s).length).toBe(24);
  });

  it('eine geschlossene Mühle erlaubt das Schlagen, aber nicht aus einer Mühle', () => {
    // Blau hat 0 und 1, setzt auf 2. Orange hat eine Mühle 8,9,10 und einen freien Stein auf 20.
    const s = state('BB______ OOO_____ ____O___', [5, 5]);
    const mills = legalMoves(s).filter((m) => m.to === 2);
    expect(mills.map((m) => m.remove)).toEqual([20]);
  });

  it('stehen alle gegnerischen Steine in Mühlen, darf jeder geschlagen werden', () => {
    const b = state('________ OOO_____ ________', [0, 0]).board;
    expect(removable(b, 1).sort((x, y) => x - y)).toEqual([8, 9, 10]);
  });

  it('nach dem Setzen wird nur zu Nachbarpunkten gezogen, mit drei Steinen gesprungen', () => {
    const s = state('B_______ ________ ________ '.replace(/ /g, ''), [0, 0]);
    s.board[5] = 0;
    s.board[13] = 0;
    s.board[23] = 1;
    s.board[22] = 1;
    s.board[21] = 1;
    s.board[20] = 1;
    expect(phaseOf(s, 0)).toBe('springen');
    expect(phaseOf(s, 1)).toBe('ziehen');
    expect(legalMoves(s).filter((m) => m.from === 0).length).toBe(24 - 7);
  });

  it('wer nur noch zwei Steine hat, verliert', () => {
    const s = state('BB______ OOO_____ ________', [0, 0], 0);
    expect(stonesLeft(s, 0)).toBe(2);
    expect(outcome(s)?.winner).toBe(1);
  });

  it('wer nicht mehr ziehen kann, verliert', () => {
    // Blau auf 0, rundum von Orange eingeschlossen (1 und 7), Orange hat genug Steine.
    const s = state('BO_____O ________ ___OO___', [0, 0], 0);
    s.board[3] = 0;
    s.board[2] = 1;
    s.board[4] = 1;
    s.board[11] = 1;
    s.board[5] = 0;
    s.board[6] = 1;
    s.board[13] = 1;
    // Blau hat drei Steine und darf springen, ist also nicht eingesperrt.
    expect(outcome(s)).toBeNull();
    s.board[16] = 0;
    // Mit vier Steinen ohne freie Nachbarn ist Blau eingesperrt.
    s.board[16] = null;
    s.board[9] = 0;
    s.board[1] = 0;
    s.board[17] = 1;
    s.board[8] = 1;
    s.board[10] = 1;
    expect(legalMoves(s).length).toBe(0);
    expect(outcome(s)?.winner).toBe(1);
  });

  it(`zählt Züge ohne Mühle und endet unentschieden`, () => {
    const s = state('B_B_B_B_ O_O_O_O_ ________', [0, 0], 0, 49);
    const next = applyMove(s, legalMoves(s).find((m) => m.remove === undefined)!);
    expect(next.quiet).toBe(50);
    expect(outcome(next)?.winner).toBeNull();
  });
});

describe('Mühle: Computer', () => {
  it('spielt auf den Stufen Leicht und Mittel gültige Züge bis zum Ende', () => {
    for (const level of [0, 1] as const) {
      let s = startState(0);
      let guard = 0;
      while (!outcome(s) && guard++ < 300) {
        const m = computerMove(s, level);
        expect(legalMoves(s)).toContainEqual(m);
        s = applyMove(s, m);
      }
      expect(outcome(s)).not.toBeNull();
    }
  }, 60000);

  it('spielt auf Schwer gültige Züge', () => {
    let s = startState(0);
    for (let k = 0; k < 4; k++) {
      const m = computerMove(s, 2);
      expect(legalMoves(s)).toContainEqual(m);
      s = applyMove(s, m);
    }
  }, 20000);

  it('schließt eine offene Mühle', () => {
    const s = state('BB______ ________ ____O___', [5, 5]);
    for (const level of [1, 2] as const) expect(computerMove(s, level).to).toBe(2);
  });

  it('verhindert eine Mühle des Gegners', () => {
    const s = state('OO______ ________ ____B___', [5, 5]);
    for (const level of [1, 2] as const) expect(computerMove(s, level).to).toBe(2);
  });

  it('findet die Zwickmühle: blockieren und zugleich zwei eigene Drohungen bauen', () => {
    const s = state('BB______ O_O_____ ____O___', [5, 5]);
    expect(computerMove(s, 2).to).toBe(9);
  });
});
