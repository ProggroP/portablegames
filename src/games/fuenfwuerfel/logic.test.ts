import { describe, expect, it } from 'vitest';
import {
  CATEGORIES, choose, computerCategory, computerHolds, isOver, openCategories, roll, scoreFor, scores, startState,
  toggleHold, totals, type FwState, type Sheet
} from './logic';

const cat = (id: string): number => CATEGORIES.findIndex((c) => c.id === id);

function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

describe('Fünf Würfel: Wertung', () => {
  it('obere Zeilen zählen die passenden Augen', () => {
    expect(scoreFor([3, 3, 3, 5, 1], cat('dreier'))).toBe(9);
    expect(scoreFor([3, 3, 3, 5, 1], cat('sechser'))).toBe(0);
  });

  it('Pasch, Full House, Straßen, Fünf Gleiche und Chance', () => {
    expect(scoreFor([4, 4, 4, 2, 1], cat('dreierpasch'))).toBe(15);
    expect(scoreFor([4, 4, 2, 2, 1], cat('dreierpasch'))).toBe(0);
    expect(scoreFor([6, 6, 6, 6, 1], cat('viererpasch'))).toBe(25);
    expect(scoreFor([2, 2, 5, 5, 5], cat('fullhouse'))).toBe(25);
    expect(scoreFor([5, 5, 5, 5, 5], cat('fullhouse'))).toBe(0);
    expect(scoreFor([1, 3, 2, 4, 6], cat('kleine'))).toBe(30);
    expect(scoreFor([1, 3, 2, 4, 6], cat('grosse'))).toBe(0);
    expect(scoreFor([2, 3, 4, 5, 6], cat('grosse'))).toBe(40);
    expect(scoreFor([3, 3, 3, 3, 3], cat('fuenfgleiche'))).toBe(50);
    expect(scoreFor([1, 2, 3, 4, 6], cat('chance'))).toBe(16);
  });

  it('ab 63 Punkten oben gibt es 35 Bonus', () => {
    const sheet: Sheet = [3, 6, 9, 12, 15, 18, null, null, null, null, null, null, null];
    expect(totals(sheet)).toEqual({ upper: 63, bonus: 35, lower: 0, total: 98 });
    sheet[0] = 2;
    expect(totals(sheet).bonus).toBe(0);
  });
});

describe('Fünf Würfel: Ablauf', () => {
  it('erst würfeln, dann halten, höchstens drei Würfe', () => {
    let s = startState(0);
    expect(toggleHold(s, 0)).toBe(s);
    expect(() => choose(s, 0)).toThrow();
    s = roll(s, seeded(1));
    s = toggleHold(s, 2);
    const kept = s.dice[2];
    s = roll(s, seeded(2));
    expect(s.dice[2]).toBe(kept);
    s = roll(s, seeded(3));
    expect(s.rollsLeft).toBe(0);
    expect(() => roll(s)).toThrow();
  });

  it('nach dem Eintragen ist der andere dran, belegte Zeilen sind gesperrt', () => {
    let s = roll(startState(0), seeded(4));
    s = choose(s, cat('chance'));
    expect(s.turn).toBe(1);
    expect(s.sheets[0][cat('chance')]).not.toBeNull();
    s = roll(s, seeded(5));
    s = choose(s, cat('chance'));
    s = roll(s, seeded(6));
    expect(() => choose(s, cat('chance'))).toThrow();
  });
});

function playTurn(s: FwState, level: 0 | 1 | 2, rng: () => number): FwState {
  s = roll(s, rng);
  while (s.rollsLeft > 0) {
    const holds = computerHolds(s, level);
    if (!holds) break;
    s = { ...s, held: holds };
    s = roll(s, rng);
  }
  const c = computerCategory(s, level, rng);
  expect(openCategories(s.sheets[s.turn])).toContain(c);
  return choose(s, c);
}

describe('Fünf Würfel: Computer', () => {
  it('eine ganze Partie dauert 26 Züge und endet', () => {
    let s = startState(0);
    let turns = 0;
    const rng = seeded(7);
    while (!isOver(s)) {
      s = playTurn(s, 1, rng);
      turns++;
    }
    expect(turns).toBe(26);
  });

  it('Schwer erzielt im Schnitt deutlich mehr Punkte als Leicht', () => {
    const avg = (level: 0 | 2, seed: number): number => {
      const rng = seeded(seed);
      let total = 0;
      const games = level === 2 ? 6 : 20;
      for (let g = 0; g < games; g++) {
        let s = startState(0);
        // Beide Blöcke mit derselben Stufe füllen, gezählt wird Blau
        while (!isOver(s)) s = playTurn(s, level, rng);
        total += scores(s)[0];
      }
      return total / games;
    };
    const easy = avg(0, 11);
    const hard = avg(2, 12);
    expect(hard).toBeGreaterThan(easy + 40);
    expect(hard).toBeGreaterThan(170);
  }, 120000);
});
