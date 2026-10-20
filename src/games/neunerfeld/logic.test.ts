import { describe, expect, it } from 'vitest';
import { GIVENS, PEERS, conflicts, countSolutions, isSolved, makePuzzle, randomSolution } from './logic';

function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

describe('Neunerfeld', () => {
  it('jedes Feld hat 20 Nachbarn in Zeile, Spalte und Block', () => {
    expect(PEERS.every((p) => p.length === 20)).toBe(true);
  });

  it('eine zufällige Lösung ist vollständig und gültig', () => {
    for (let k = 1; k <= 5; k++) expect(isSolved(randomSolution(seeded(k)))).toBe(true);
  });

  it('Rätsel haben genau eine Lösung und passen zur Stufe', () => {
    for (const level of [0, 1, 2] as const) {
      const { puzzle, solution } = makePuzzle(level, seeded(10 + level));
      const givens = puzzle.filter(Boolean).length;
      expect(countSolutions(puzzle)).toBe(1);
      expect(givens).toBeGreaterThanOrEqual(GIVENS[level]);
      expect(givens).toBeLessThanOrEqual(GIVENS[level] + 6);
      // Vorgaben stimmen mit der Lösung überein
      puzzle.forEach((v, i) => v && expect(v).toBe(solution[i]));
    }
  });

  it('erkennt doppelte Zahlen in Zeile, Spalte und Block', () => {
    const g = new Array(81).fill(0);
    g[0] = 5;
    g[8] = 5; // gleiche Zeile
    g[40] = 3;
    g[30] = 3; // gleicher Block
    expect([...conflicts(g)].sort((a, b) => a - b)).toEqual([0, 8, 30, 40]);
  });

  it('ein Rätsel entsteht schnell genug fürs Handy', () => {
    const t = performance.now();
    makePuzzle(2, seeded(99));
    expect(performance.now() - t).toBeLessThan(1500);
  });
});
