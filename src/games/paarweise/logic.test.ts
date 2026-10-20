import { describe, expect, it } from 'vitest';
import { MemoBrain, PAIRS, canFlip, flip, isOver, resolve, scores, startState } from './logic';

function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

describe('Paarweise', () => {
  it('jedes Motiv kommt genau zweimal vor', () => {
    const s = startState(0, seeded(1));
    expect(s.cards.length).toBe(PAIRS * 2);
    for (let m = 0; m < PAIRS; m++) expect(s.cards.filter((x) => x === m).length).toBe(2);
  });

  it('ein Paar bleibt beim Spieler, der nochmal dran ist', () => {
    let s = startState(0, seeded(2));
    const a = 0;
    const b = s.cards.indexOf(s.cards[0], 1);
    s = flip(flip(s, a), b);
    const r = resolve(s);
    expect(r.match).toBe(true);
    expect(r.state.turn).toBe(0);
    expect(scores(r.state)).toEqual([1, 0]);
    expect(canFlip(r.state, a)).toBe(false);
  });

  it('kein Paar: Karten zurück, der andere ist dran', () => {
    let s = startState(0, seeded(3));
    const b = s.cards.findIndex((m) => m !== s.cards[0]);
    s = flip(flip(s, 0), b);
    const r = resolve(s);
    expect(r.match).toBe(false);
    expect(r.state.turn).toBe(1);
    expect(r.state.open).toEqual([]);
  });

  it('höchstens zwei Karten gleichzeitig', () => {
    const s = flip(flip(startState(0, seeded(4)), 0), 1);
    expect(() => flip(s, 2)).toThrow();
  });

  it('ein Computer mit gutem Gedächtnis gewinnt meistens', () => {
    let goodWins = 0;
    for (let game = 0; game < 10; game++) {
      const rng = seeded(100 + game);
      let s = startState(game % 2 === 0 ? 0 : 1, rng);
      const brains = [new MemoBrain(2, rng), new MemoBrain(0, rng)];
      while (!isOver(s)) {
        const brain = brains[s.turn];
        const a = brain.first(s);
        s = flip(s, a);
        brains.forEach((b) => b.see(a, s.cards[a]));
        const b = brain.second(s, a);
        s = flip(s, b);
        brains.forEach((x) => x.see(b, s.cards[b]));
        const r = resolve(s);
        if (r.match) brains.forEach((x) => (x.forget(a), x.forget(b)));
        s = r.state;
      }
      const [g, w] = scores(s);
      expect(g + w).toBe(PAIRS);
      if (g > w) goodWins++;
    }
    expect(goodWins).toBeGreaterThanOrEqual(7);
  });
});
