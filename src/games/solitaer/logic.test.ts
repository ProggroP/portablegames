import { describe, expect, it } from 'vitest';
import {
  autoMove, canFinish, canPlaceOnTableau, cardsAt, drawCards, foundationCount, isWon, move, newDeal, stepToFoundation,
  type Card, type SolState
} from './logic';

const c = (suit: number, rank: number, up = true): Card => ({ suit, rank, up });

function empty(): SolState {
  return { stock: [], waste: [], foundations: [[], [], [], []], tableau: [[], [], [], [], [], [], []], draw: 1 };
}

function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

describe('Solitär', () => {
  it('Austeilen: 28 Karten in 7 Spalten, oben je eine offen, 24 im Stapel', () => {
    const s = newDeal(1, seeded(1));
    expect(s.tableau.map((p) => p.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(s.tableau.every((p) => p[p.length - 1].up && p.slice(0, -1).every((x) => !x.up))).toBe(true);
    expect(s.stock.length).toBe(24);
    const all = [...s.stock, ...s.tableau.flat()].map((x) => `${x.suit}-${x.rank}`);
    expect(new Set(all).size).toBe(52);
  });

  it('Nachziehen: eine oder drei Karten, leerer Stapel holt den Abwurf zurück', () => {
    let s = newDeal(3, seeded(2));
    s = drawCards(s);
    expect(s.waste.length).toBe(3);
    expect(s.stock.length).toBe(21);
    for (let k = 0; k < 7; k++) s = drawCards(s);
    expect(s.stock.length).toBe(0);
    s = drawCards(s);
    expect(s.stock.length).toBe(24);
    expect(s.waste.length).toBe(0);
  });

  it('auf Spalten abwechselnd Farbe und absteigend, auf leere Spalten nur Könige', () => {
    expect(canPlaceOnTableau(c(1, 6), [c(0, 7)])).toBe(true);
    expect(canPlaceOnTableau(c(3, 6), [c(0, 7)])).toBe(false);
    expect(canPlaceOnTableau(c(1, 5), [c(0, 7)])).toBe(false);
    expect(canPlaceOnTableau(c(2, 13), [])).toBe(true);
    expect(canPlaceOnTableau(c(2, 12), [])).toBe(false);
  });

  it('ein Stapel offener Karten wandert zusammen, darunter wird aufgedeckt', () => {
    const s = empty();
    s.tableau[0] = [c(2, 9, false), c(0, 8), c(1, 7)];
    s.tableau[1] = [c(1, 9)];
    const r = move(s, { kind: 'tableau', index: 0, from: 1 }, { kind: 'tableau', index: 1 })!;
    expect(r.tableau[1].map((x) => x.rank)).toEqual([9, 8, 7]);
    expect(r.tableau[0]).toEqual([c(2, 9, true)]);
  });

  it('verdeckte Karten lassen sich nicht bewegen', () => {
    const s = empty();
    s.tableau[0] = [c(2, 9, false), c(0, 8)];
    expect(cardsAt(s, { kind: 'tableau', index: 0, from: 0 })).toEqual([]);
  });

  it('ein Tipp bringt ein Ass auf die Ablage und sonst die Karte auf eine passende Spalte', () => {
    const s = empty();
    s.waste = [c(3, 1)];
    expect(autoMove(s, { kind: 'waste' })!.foundations[0]).toEqual([c(3, 1)]);
    s.waste = [c(1, 6)];
    s.tableau[4] = [c(0, 7)];
    expect(autoMove(s, { kind: 'waste' })!.tableau[4].length).toBe(2);
  });

  it('ein König ganz unten in einer Spalte wandert nicht sinnlos in eine leere Spalte', () => {
    const s = empty();
    s.tableau[0] = [c(0, 13)];
    expect(autoMove(s, { kind: 'tableau', index: 0 })).toBeNull();
  });

  it('wenn alles offen liegt, lässt sich der Rest automatisch ablegen', () => {
    let s = empty();
    for (let suit = 0; suit < 4; suit++) {
      s.foundations[suit] = Array.from({ length: 11 }, (_, k) => c(suit, k + 1));
    }
    s.tableau[0] = [c(0, 13), c(1, 12)];
    s.tableau[1] = [c(1, 13), c(0, 12)];
    s.tableau[2] = [c(2, 13), c(3, 12)];
    s.tableau[3] = [c(3, 13), c(2, 12)];
    expect(canFinish(s)).toBe(true);
    let guard = 0;
    while (!isWon(s) && guard++ < 20) s = stepToFoundation(s)!;
    expect(isWon(s)).toBe(true);
    expect(foundationCount(s)).toBe(52);
  });

  it('die Kartenzahl bleibt bei vielen Zufallszügen immer 52', () => {
    const rng = seeded(5);
    let s = newDeal(1, rng);
    for (let k = 0; k < 400; k++) {
      const moves = [
        () => drawCards(s),
        () => autoMove(s, { kind: 'waste' }),
        () => autoMove(s, { kind: 'tableau', index: Math.floor(rng() * 7) })
      ];
      s = moves[Math.floor(rng() * moves.length)]() ?? s;
      const count = s.stock.length + s.waste.length + foundationCount(s) + s.tableau.reduce((a, p) => a + p.length, 0);
      expect(count).toBe(52);
    }
  });
});
