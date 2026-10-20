import { describe, expect, it } from 'vitest';
import {
  AI_SPEED, LENGTH, PADDLE_R, PUCK_R, clampToHalf, computerTarget, halfOf, homePosition, startState, step, winnerOf,
  type HockeyState, type Vec
} from './logic';

const still = (s: HockeyState): [Vec, Vec] => [s.paddles[0].pos, s.paddles[1].pos];

function withPuck(x: number, y: number, vx: number, vy: number): HockeyState {
  const s = startState(0);
  s.puck = { pos: { x, y }, vel: { x: vx, y: vy } };
  return s;
}

describe('Air-Hockey: Physik', () => {
  it('der Puck prallt von der Seitenwand ab', () => {
    const r = step(withPuck(0.1, 0.8, -2, 0), 0.1, still(startState(0)));
    expect(r.state.puck.vel.x).toBeGreaterThan(0);
    expect(r.state.puck.pos.x).toBeGreaterThanOrEqual(PUCK_R);
    expect(r.events.some((e) => e.type === 'wall')).toBe(true);
  });

  it('neben dem Tor prallt er von der Stirnwand ab', () => {
    const s = withPuck(0.1, 0.1, 0, -2);
    const r = step(s, 0.1, still(s));
    expect(r.state.puck.vel.y).toBeGreaterThan(0);
    expect(r.state.score).toEqual([0, 0]);
  });

  it('durch die Toröffnung oben ist es ein Tor für Blau', () => {
    const s = withPuck(0.5, 0.3, 0, -3);
    s.paddles[1].pos = { x: 0.1, y: 0.1 };
    let state = s;
    let goal = null;
    for (let k = 0; k < 60 && !goal; k++) {
      const r = step(state, 1 / 60, [state.paddles[0].pos, { x: 0.1, y: 0.1 }]);
      state = r.state;
      goal = r.events.find((e) => e.type === 'goal') ?? null;
    }
    expect(goal).toEqual({ type: 'goal', scorer: 0 });
    expect(state.score).toEqual([1, 0]);
    // Anstoß für Orange: Puck ruht in der oberen Hälfte
    expect(halfOf(state.puck.pos)).toBe(1);
    expect(state.puck.vel).toEqual({ x: 0, y: 0 });
  });

  it('ein schneller Schläger schießt den Puck weg', () => {
    const s = withPuck(0.5, 1.2, 0, 0);
    s.paddles[0].pos = { x: 0.5, y: 1.2 + PUCK_R + PADDLE_R + 0.05 };
    // Schläger fährt in 1/60 s um 0.1 nach oben
    const r = step(s, 1 / 60, [{ x: 0.5, y: s.paddles[0].pos.y - 0.1 }, s.paddles[1].pos]);
    expect(r.state.puck.vel.y).toBeLessThan(-1);
    expect(r.events.some((e) => e.type === 'hit')).toBe(true);
  });

  it('Schläger bleiben in der eigenen Hälfte', () => {
    expect(clampToHalf(0, { x: 0.5, y: 0.1 }).y).toBeCloseTo(LENGTH / 2 + PADDLE_R);
    expect(clampToHalf(1, { x: 2, y: 1.5 })).toEqual({ x: 1 - PADDLE_R, y: LENGTH / 2 - PADDLE_R });
  });

  it('Reibung bremst den Puck langsam ab', () => {
    const s = withPuck(0.5, 0.8, 0.5, 0);
    const r = step(s, 0.5, still(s));
    const speed = Math.hypot(r.state.puck.vel.x, r.state.puck.vel.y);
    expect(speed).toBeLessThan(0.5);
    expect(speed).toBeGreaterThan(0.25);
  });

  it('bei 7 Toren steht der Sieger fest', () => {
    const s = startState(0);
    s.score = [6, 7];
    expect(winnerOf(s)).toBe(1);
  });
});

describe('Air-Hockey: Computer', () => {
  it('verteidigt vor dem eigenen Tor, wenn der Puck weit weg ist', () => {
    const s = withPuck(0.8, 1.3, 0, 0);
    const t = computerTarget(s, 1);
    expect(t.y).toBeLessThan(0.3);
    expect(t.x).toBeGreaterThan(0.5);
  });

  it('greift den Puck in der eigenen Hälfte von hinten an', () => {
    const s = withPuck(0.5, 0.5, 0, 0);
    const t = computerTarget(s, 2);
    expect(t.y).toBeLessThan(0.5);
  });

  it('der Computer auf Schwer trifft einen ruhenden Puck Richtung gegnerisches Tor', () => {
    let s = withPuck(0.45, 0.55, 0, 0);
    s.paddles[1].pos = homePosition(1);
    let hit = false;
    for (let k = 0; k < 120 && !hit; k++) {
      const r = step(s, 1 / 60, [s.paddles[0].pos, computerTarget(s, 2)], [Infinity, AI_SPEED[2]]);
      s = r.state;
      hit = r.events.some((e) => e.type === 'hit');
    }
    expect(hit).toBe(true);
    expect(s.puck.vel.y).toBeGreaterThan(0);
  });

  it('simulierte Partie Computer gegen Computer bleibt stabil und endet', () => {
    let s = startState(0);
    let frames = 0;
    while (winnerOf(s) === null && frames++ < 60 * 60 * 15) {
      // Blau spielt gespiegelt mit derselben Logik
      const mirrored: HockeyState = {
        ...s,
        puck: { pos: { x: s.puck.pos.x, y: LENGTH - s.puck.pos.y }, vel: { x: s.puck.vel.x, y: -s.puck.vel.y } }
      };
      const tb = computerTarget(mirrored, 1);
      const r = step(s, 1 / 60, [{ x: tb.x, y: LENGTH - tb.y }, computerTarget(s, 2)], [AI_SPEED[1], AI_SPEED[2]]);
      s = r.state;
      expect(Number.isFinite(s.puck.pos.x) && Number.isFinite(s.puck.pos.y)).toBe(true);
      expect(s.puck.pos.x).toBeGreaterThanOrEqual(PUCK_R - 1e-9);
      expect(s.puck.pos.x).toBeLessThanOrEqual(1 - PUCK_R + 1e-9);
    }
    expect(s.score[0] + s.score[1]).toBeGreaterThan(0);
  });
});
