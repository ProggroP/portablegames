import { describe, expect, it } from 'vitest';
import { EXIT_ROW, SIZE, TARGET, apply, isSolved, legalMoves, parse, range, serialize, solve } from './logic';
import { PUZZLES } from './puzzles';

describe('Ausparken: Regeln', () => {
  const p = '..EE...DDC.B.AAC.BG..FF.G.....G.....';

  it('liest Rätsel und schreibt sie unverändert zurück', () => {
    expect(serialize(parse(p))).toBe(p);
    const a = parse(p)[0];
    expect(a).toMatchObject({ id: TARGET, row: EXIT_ROW, len: 2, horizontal: true });
  });

  it('Fahrzeuge fahren nur in ihrer Richtung und nur bis zum nächsten Hindernis', () => {
    const vs = parse(p);
    // Das Auto A steht in Spalte 2 bis 3, rechts davon C, links frei bis zum Rand
    expect(range(vs, 'A')).toEqual([-1, 0]);
    expect(() => apply(vs, { id: 'A', delta: 1 })).toThrow();
    expect(apply(vs, { id: 'A', delta: -1 }).find((v) => v.id === 'A')!.col).toBe(0);
  });

  it('gelöst ist es, wenn das eigene Auto an der Ausfahrt steht', () => {
    expect(isSolved(parse('............AA......................'))).toBe(false);
    expect(isSolved(parse('................AA..................'))).toBe(true);
  });

  it('der Löser findet die kürzeste Lösung', () => {
    const path = solve(parse(p))!;
    expect(path.length).toBe(4);
    let vs = parse(p);
    for (const m of path) vs = apply(vs, m);
    expect(isSolved(vs)).toBe(true);
  });

  it('jeder Zug lässt sich zurücknehmen', () => {
    const vs = parse(p);
    for (const m of legalMoves(vs)) {
      const back = apply(apply(vs, m), { id: m.id, delta: -m.delta });
      expect(serialize(back)).toBe(p);
    }
  });
});

describe('Ausparken: mitgelieferte Rätsel', () => {
  it('drei Stufen mit je 30 gültigen, verschiedenen und noch nicht gelösten Rätseln', () => {
    expect(PUZZLES.length).toBe(3);
    const all = new Set<string>();
    for (const level of PUZZLES) {
      expect(level.length).toBe(30);
      for (const { p } of level) {
        expect(p.length).toBe(SIZE * SIZE);
        const vs = parse(p);
        expect(vs[0].id).toBe(TARGET);
        expect(vs[0].row).toBe(EXIT_ROW);
        expect(vs.every((v) => v.len === 2 || v.len === 3)).toBe(true);
        expect(isSolved(vs)).toBe(false);
        all.add(p);
      }
    }
    expect(all.size).toBe(90);
  });

  it('die Stufen werden schwerer', () => {
    const max = PUZZLES.map((l) => Math.max(...l.map((x) => x.n)));
    const min = PUZZLES.map((l) => Math.min(...l.map((x) => x.n)));
    expect(min[1]).toBeGreaterThan(max[0]);
    expect(min[2]).toBeGreaterThan(max[1]);
  });

  it('Stichprobe: angegebene Zugzahl stimmt mit dem Löser überein', () => {
    for (const level of PUZZLES) {
      for (const { p, n } of [level[0], level[level.length - 1]]) expect(solve(parse(p))!.length).toBe(n);
    }
  }, 60000);
});
