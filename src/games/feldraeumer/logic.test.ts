import { describe, expect, it } from 'vitest';
import { SIZES, chord, countAround, minesLeft, neighbors, placeMines, reveal, startState, toggleFlag, type FieldState } from './logic';

function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

/** Kleines Feld mit festen Minen */
function fixed(rows: number, cols: number, mineCells: number[]): FieldState {
  const size = { rows, cols, mines: mineCells.length };
  const s = startState(size);
  const mines = new Array(rows * cols).fill(false);
  for (const m of mineCells) mines[m] = true;
  return { ...s, mines };
}

describe('Feldräumer', () => {
  it('der erste Tipp und seine Nachbarn sind immer minenfrei', () => {
    for (let k = 0; k < 50; k++) {
      const size = SIZES[2];
      const safe = k % (size.rows * size.cols);
      const mines = placeMines(size, safe, seeded(k + 1));
      expect(mines.filter(Boolean).length).toBe(size.mines);
      expect(mines[safe]).toBe(false);
      for (const n of neighbors(size, safe)) expect(mines[n]).toBe(false);
    }
  });

  it('Ecken haben 3 Nachbarn, Ränder 5, die Mitte 8', () => {
    const size = { rows: 3, cols: 3, mines: 0 };
    expect(neighbors(size, 0).length).toBe(3);
    expect(neighbors(size, 1).length).toBe(5);
    expect(neighbors(size, 4).length).toBe(8);
  });

  it('ein Feld ohne Minen ringsum öffnet die Umgebung', () => {
    // 3x4, Mine ganz rechts unten
    const s = reveal(fixed(3, 4, [11]), 0);
    expect(s.revealed.filter(Boolean).length).toBe(11);
    expect(s.won).toBe(true);
  });

  it('wer eine Mine aufdeckt, verliert', () => {
    const s = reveal(fixed(3, 3, [4]), 4);
    expect(s.exploded).toBe(4);
    expect(reveal(s, 0)).toBe(s);
  });

  it('Fahnen schützen vor dem Aufdecken und zählen die Minen herunter', () => {
    let s = fixed(3, 3, [4]);
    s = toggleFlag(s, 4);
    expect(minesLeft(s)).toBe(0);
    expect(reveal(s, 4)).toBe(s);
  });

  it('Zahl antippen deckt die übrigen Nachbarn auf, wenn genug Fahnen stehen', () => {
    // Minen auf 0, Zahl auf 1
    let s = fixed(2, 3, [0]);
    s = reveal(s, 1);
    expect(countAround(s, 1)).toBe(1);
    expect(chord(s, 1)).toBe(s);
    s = toggleFlag(s, 0);
    s = chord(s, 1);
    expect(s.won).toBe(true);
  });
});
