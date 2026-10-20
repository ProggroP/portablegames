import { describe, expect, it } from 'vitest';
import {
  BAR, OFF, allSequences, applyStep, computerSequence, diceList, endTurn, legalSteps, pipCount, startState, winner,
  type BgState
} from './logic';

function empty(turn: 0 | 1 = 0): BgState {
  return { points: new Array(24).fill(0), bar: [0, 0], off: [0, 0], turn };
}

function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

describe('Backgammon: Grundlagen', () => {
  it('Startaufstellung: je 15 Steine und 167 Augen', () => {
    const s = startState(0);
    expect(s.points.filter((n) => n > 0).reduce((a, c) => a + c, 0)).toBe(15);
    expect(s.points.filter((n) => n < 0).reduce((a, c) => a - c, 0)).toBe(15);
    expect(pipCount(s, 0)).toBe(167);
    expect(pipCount(s, 1)).toBe(167);
  });

  it('ein Pasch zählt viermal', () => {
    expect(diceList(3, 3)).toEqual([3, 3, 3, 3]);
    expect(diceList(6, 1)).toEqual([6, 1]);
  });

  it('auf Punkte mit zwei gegnerischen Steinen darf man nicht ziehen', () => {
    const s = startState(0);
    // Blau von 12 (Punkt 13) mit einer 1 auf 11, dort stehen 5 orange Steine.
    expect(legalSteps(s, [1, 2]).some((st) => st.from === 12 && st.to === 11)).toBe(false);
  });

  it('ein einzelner gegnerischer Stein wird geschlagen und kommt auf die Bar', () => {
    const s = empty();
    s.points[10] = 1;
    s.points[7] = -1;
    const step = legalSteps(s, [3, 5]).find((st) => st.from === 10 && st.to === 7)!;
    expect(step.hit).toBe(true);
    const next = applyStep(s, step);
    expect(next.bar[1]).toBe(1);
    expect(next.points[7]).toBe(1);
  });

  it('wer auf der Bar steht, muss zuerst einsetzen', () => {
    const s = startState(0);
    s.bar[0] = 1;
    s.points[23] = 1;
    const steps = legalSteps(s, [3, 5]);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.every((st) => st.from === BAR)).toBe(true);
    // Mit einer 6 landet Blau auf Index 18, dort stehen 5 orange Steine: nicht möglich.
    expect(legalSteps(s, [6, 6])).toEqual([]);
  });
});

describe('Backgammon: Pflichtregeln', () => {
  it('beide Würfel müssen genutzt werden, wenn es geht', () => {
    // Blau hat einen Stein auf Index 10. Mit 6 käme er auf 4, danach mit 5 nicht weiter (blockiert).
    // Mit 5 auf 5, danach mit 6 nur ins Abtragen, was nicht erlaubt ist (nicht alle im Heimfeld? doch, nur ein Stein).
    const s = empty();
    s.points[10] = 1;
    s.points[4] = -2; // 10 - 6 = 4 blockiert
    const steps = legalSteps(s, [6, 5]);
    // Nur 5 zuerst (auf 5), danach 6 zum Abtragen. 6 zuerst geht nicht.
    expect(steps.map((st) => st.die)).toEqual([5]);
  });

  it('geht nur ein Würfel, muss es der höhere sein', () => {
    const s = empty();
    s.points[20] = 1;
    // Nach dem Zug ist kein weiterer möglich, weil alles blockiert ist.
    for (const i of [17, 16, 15, 14, 13, 12, 11, 10, 9]) s.points[i] = -2;
    s.points[18] = 0;
    s.points[19] = -2;
    // 20 - 2 = 18 frei, 20 - 1 = 19 blockiert. Danach von 18 alles blockiert.
    const steps = legalSteps(s, [2, 1]);
    expect(steps.map((st) => [st.from, st.to])).toEqual([[20, 18]]);
  });

  it('abtragen nur, wenn alle Steine im Heimfeld sind', () => {
    const s = empty();
    s.points[2] = 2;
    s.points[8] = 1;
    expect(legalSteps(s, [3, 1]).some((st) => st.to === OFF)).toBe(false);
    s.points[8] = 0;
    s.points[3] = 1;
    expect(legalSteps(s, [3, 1]).some((st) => st.to === OFF && st.from === 2)).toBe(true);
  });

  it('mit höherem Würfel darf nur der höchste Stein abgetragen werden', () => {
    const s = empty();
    s.points[1] = 1;
    s.points[3] = 1;
    const sixes = legalSteps(s, [6, 6]);
    expect(sixes.map((st) => st.from)).toEqual([3]);
  });

  it('Zugfolgen nutzen alle Würfel und enden in verschiedenen Stellungen', () => {
    const seqs = allSequences(startState(0), [3, 1]);
    expect(seqs.length).toBeGreaterThan(5);
    expect(seqs.every((q) => q.steps.length === 2)).toBe(true);
    const keys = new Set(seqs.map((q) => q.result.points.join(',')));
    expect(keys.size).toBe(seqs.length);
  });
});

describe('Backgammon: Computer', () => {
  it('spielt Partien auf Leicht und Mittel gültig bis zum Ende', () => {
    for (const level of [0, 1] as const) {
      const rng = seeded(level + 7);
      const die = () => 1 + Math.floor(rng() * 6);
      let s = startState(0);
      let turns = 0;
      while (winner(s) === null && turns++ < 600) {
        const dice = diceList(die(), die());
        let remaining = dice;
        for (const step of computerSequence(s, dice, level, rng)) {
          expect(legalSteps(s, remaining)).toContainEqual(step);
          s = applyStep(s, step);
          remaining = remaining.filter((_, i) => i !== remaining.indexOf(step.die));
        }
        expect(legalSteps(s, remaining)).toEqual([]);
        if (winner(s) === null) s = endTurn(s);
      }
      expect(winner(s)).not.toBeNull();
      expect(s.off[winner(s)!]).toBe(15);
    }
  }, 60000);

  it('Mittel und Schwer schlagen einen weit vorgerückten gegnerischen Stein', () => {
    // Ein oranger Stein steht kurz vor seinem Heimfeld. Geschlagen verliert Orange 21 Augen.
    const s = startState(0);
    s.points[18] = -4;
    s.points[20] = -1;
    for (const level of [1, 2] as const) {
      const steps = computerSequence(s, [3, 1], level, seeded(3));
      expect(steps.some((st) => st.hit && st.to === 20)).toBe(true);
    }
  }, 20000);

  it('die schwere Stufe antwortet schnell genug', () => {
    const t = performance.now();
    computerSequence(startState(0), [5, 2], 2, seeded(1));
    expect(performance.now() - t).toBeLessThan(3000);
  });
});
