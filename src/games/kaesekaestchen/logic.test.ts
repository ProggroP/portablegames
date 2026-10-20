import { describe, expect, it } from 'vitest';
import { boxSides, boxesOfLine, computerMove, drawLine, hLine, isOver, scores, startState, vLine } from './logic';

describe('Käsekästchen', () => {
  it('5x5 hat 60 Linien und 25 Kästchen', () => {
    const s = startState(0);
    expect(s.lines.length).toBe(60);
    expect(s.boxes.length).toBe(25);
  });

  it('jede Linie gehört zu ein oder zwei Kästchen, jedes Kästchen hat vier Seiten', () => {
    const s = startState(0);
    for (let l = 0; l < s.lines.length; l++) {
      const boxes = boxesOfLine(5, l);
      expect(boxes.length).toBeGreaterThanOrEqual(1);
      for (const b of boxes) expect(boxSides(5, b)).toContain(l);
    }
  });

  it('wer ein Kästchen schließt, bekommt es und ist nochmal dran', () => {
    let s = startState(0, 2);
    for (const l of [hLine(2, 0, 0), hLine(2, 1, 0), vLine(2, 0, 0)]) s = drawLine(s, l).state;
    const turnBefore = s.turn;
    const r = drawLine(s, vLine(2, 0, 1));
    expect(r.closed).toEqual([0]);
    expect(r.state.boxes[0]).toBe(turnBefore);
    expect(r.state.turn).toBe(turnBefore);
  });

  it('eine Linie kann zwei Kästchen auf einmal schließen', () => {
    let s = startState(0, 2);
    for (const l of [hLine(2, 0, 0), hLine(2, 1, 0), vLine(2, 0, 0), hLine(2, 0, 1), hLine(2, 1, 1), vLine(2, 0, 2)]) {
      s = drawLine(s, l).state;
    }
    expect(drawLine(s, vLine(2, 0, 1)).closed.sort()).toEqual([0, 1]);
  });

  it('eine Linie darf nicht doppelt gezogen werden', () => {
    const s = drawLine(startState(0), 0).state;
    expect(() => drawLine(s, 0)).toThrow();
  });

  it('Computer-Partien enden mit allen 25 Kästchen verteilt', () => {
    for (const level of [0, 1, 2] as const) {
      let s = startState(0);
      while (!isOver(s)) s = drawLine(s, computerMove(s, level)).state;
      const [a, b] = scores(s);
      expect(a + b).toBe(25);
    }
  });

  it('die schwere Stufe gewinnt meistens gegen die leichte', () => {
    let wins = 0;
    for (let game = 0; game < 20; game++) {
      let s = startState(game % 2 === 0 ? 0 : 1);
      while (!isOver(s)) s = drawLine(s, computerMove(s, s.turn === 0 ? 2 : 0)).state;
      const [a, b] = scores(s);
      if (a > b) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(15);
  });
});
