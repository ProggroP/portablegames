import type { Level, PlayerIndex } from '../../core/types';

// Spielfeld in eigenen Einheiten: Breite 1, Länge LENGTH.
// Blau (0) verteidigt das Tor unten (y = LENGTH), Orange (1) das Tor oben (y = 0).

export const LENGTH = 1.6;
export const GOAL_WIDTH = 0.36;
export const PUCK_R = 0.035;
export const PADDLE_R = 0.065;
export const WIN_SCORE = 7;

const RESTITUTION_WALL = 0.9;
const RESTITUTION_PADDLE = 0.92;
const FRICTION_PER_SECOND = 0.6; // Anteil der Geschwindigkeit, der nach einer Sekunde übrig bleibt
const MAX_PUCK_SPEED = 3.2;
const SUBSTEP = 1 / 240;
const CORNER = 0.12;
const CORNER_PUSH = 0.8;

export interface Vec {
  x: number;
  y: number;
}

export interface Paddle {
  pos: Vec;
  vel: Vec;
}

export interface HockeyState {
  puck: { pos: Vec; vel: Vec };
  paddles: [Paddle, Paddle];
  score: [number, number];
}

export type HockeyEvent = { type: 'goal'; scorer: PlayerIndex } | { type: 'hit' } | { type: 'wall' };

const GOAL_LEFT = (1 - GOAL_WIDTH) / 2;
const GOAL_RIGHT = (1 + GOAL_WIDTH) / 2;

export function homePosition(p: PlayerIndex): Vec {
  return { x: 0.5, y: p === 0 ? LENGTH - 0.18 : 0.18 };
}

/** Puck liegt ruhig in der Hälfte von `p`, der damit Anstoß hat. */
export function servePuck(p: PlayerIndex): { pos: Vec; vel: Vec } {
  return { pos: { x: 0.5, y: p === 0 ? LENGTH * 0.72 : LENGTH * 0.28 }, vel: { x: 0, y: 0 } };
}

export function startState(starter: PlayerIndex): HockeyState {
  return {
    puck: servePuck(starter),
    paddles: [
      { pos: homePosition(0), vel: { x: 0, y: 0 } },
      { pos: homePosition(1), vel: { x: 0, y: 0 } }
    ],
    score: [0, 0]
  };
}

/** Bereich, in dem sich der Schläger von `p` bewegen darf: die eigene Hälfte. */
export function clampToHalf(p: PlayerIndex, v: Vec): Vec {
  const x = Math.min(1 - PADDLE_R, Math.max(PADDLE_R, v.x));
  const minY = p === 0 ? LENGTH / 2 + PADDLE_R : PADDLE_R;
  const maxY = p === 0 ? LENGTH - PADDLE_R : LENGTH / 2 - PADDLE_R;
  return { x, y: Math.min(maxY, Math.max(minY, v.y)) };
}

/** Welche Hälfte zu einem Punkt gehört. */
export const halfOf = (v: Vec): PlayerIndex => (v.y > LENGTH / 2 ? 0 : 1);

function limitSpeed(v: Vec, max: number): Vec {
  const s = Math.hypot(v.x, v.y);
  return s > max ? { x: (v.x / s) * max, y: (v.y / s) * max } : v;
}

/**
 * Bewegt die Schläger zu ihren Zielen und rechnet die Physik für `dt` Sekunden.
 * `maxSpeed` begrenzt die Schlägergeschwindigkeit (für den Computer), Menschen haben Infinity.
 */
export function step(
  s: HockeyState,
  dt: number,
  targets: [Vec, Vec],
  maxSpeed: [number, number] = [Infinity, Infinity]
): { state: HockeyState; events: HockeyEvent[] } {
  const events: HockeyEvent[] = [];
  let puck = { pos: { ...s.puck.pos }, vel: { ...s.puck.vel } };
  const paddles = s.paddles.map((p) => ({ pos: { ...p.pos }, vel: { ...p.vel } })) as [Paddle, Paddle];
  const score: [number, number] = [s.score[0], s.score[1]];

  let remaining = dt;
  while (remaining > 1e-9) {
    const h = Math.min(SUBSTEP, remaining);
    remaining -= h;

    // Schläger
    for (const p of [0, 1] as PlayerIndex[]) {
      const goal = clampToHalf(p, targets[p]);
      const pad = paddles[p];
      let dx = goal.x - pad.pos.x;
      let dy = goal.y - pad.pos.y;
      const dist = Math.hypot(dx, dy);
      const maxMove = maxSpeed[p] * h;
      if (dist > maxMove) {
        dx = (dx / dist) * maxMove;
        dy = (dy / dist) * maxMove;
      }
      pad.vel = { x: dx / h, y: dy / h };
      pad.pos = { x: pad.pos.x + dx, y: pad.pos.y + dy };
    }

    // Puck
    const keep = Math.pow(FRICTION_PER_SECOND, h);
    puck.vel = { x: puck.vel.x * keep, y: puck.vel.y * keep };
    // Luftstrom in den Ecken: ein langsamer Puck klemmt dort nicht dauerhaft fest
    const nearSide = puck.pos.x < CORNER || puck.pos.x > 1 - CORNER;
    const nearEnd = puck.pos.y < CORNER || puck.pos.y > LENGTH - CORNER;
    if (nearSide && nearEnd && Math.hypot(puck.vel.x, puck.vel.y) < 0.4) {
      puck.vel.x += Math.sign(0.5 - puck.pos.x) * CORNER_PUSH * h;
      puck.vel.y += Math.sign(LENGTH / 2 - puck.pos.y) * CORNER_PUSH * h;
    }
    puck.pos = { x: puck.pos.x + puck.vel.x * h, y: puck.pos.y + puck.vel.y * h };

    // Puck gegen Schläger (vor den Wänden, damit ein Schläger den Puck nicht durch die Bande drückt)
    for (const pad of paddles) {
      const nx = puck.pos.x - pad.pos.x;
      const ny = puck.pos.y - pad.pos.y;
      const d = Math.hypot(nx, ny);
      const minD = PUCK_R + PADDLE_R;
      if (d < minD && d > 1e-9) {
        const ux = nx / d;
        const uy = ny / d;
        puck.pos = { x: pad.pos.x + ux * minD, y: pad.pos.y + uy * minD };
        const rvx = puck.vel.x - pad.vel.x;
        const rvy = puck.vel.y - pad.vel.y;
        const along = rvx * ux + rvy * uy;
        if (along < 0) {
          puck.vel = limitSpeed(
            { x: puck.vel.x - (1 + RESTITUTION_PADDLE) * along * ux, y: puck.vel.y - (1 + RESTITUTION_PADDLE) * along * uy },
            MAX_PUCK_SPEED
          );
          events.push({ type: 'hit' });
        }
      }
    }
    // Seitenwände
    if (puck.pos.x < PUCK_R) {
      puck.pos.x = PUCK_R;
      puck.vel.x = Math.abs(puck.vel.x) * RESTITUTION_WALL;
      events.push({ type: 'wall' });
    } else if (puck.pos.x > 1 - PUCK_R) {
      puck.pos.x = 1 - PUCK_R;
      puck.vel.x = -Math.abs(puck.vel.x) * RESTITUTION_WALL;
      events.push({ type: 'wall' });
    }

    // Stirnwände mit Toröffnung
    const inMouth = puck.pos.x > GOAL_LEFT + PUCK_R * 0.5 && puck.pos.x < GOAL_RIGHT - PUCK_R * 0.5;
    if (puck.pos.y < PUCK_R && !inMouth) {
      puck.pos.y = PUCK_R;
      puck.vel.y = Math.abs(puck.vel.y) * RESTITUTION_WALL;
      events.push({ type: 'wall' });
    } else if (puck.pos.y > LENGTH - PUCK_R && !inMouth) {
      puck.pos.y = LENGTH - PUCK_R;
      puck.vel.y = -Math.abs(puck.vel.y) * RESTITUTION_WALL;
      events.push({ type: 'wall' });
    }

    if (puck.pos.y < -PUCK_R || puck.pos.y > LENGTH + PUCK_R) {
      const scorer: PlayerIndex = puck.pos.y < 0 ? 0 : 1;
      score[scorer]++;
      events.push({ type: 'goal', scorer });
      // Anstoß hat, wer das Tor bekommen hat
      puck = servePuck((1 - scorer) as PlayerIndex);
      return { state: { puck, paddles, score }, events };
    }
  }

  return { state: { puck, paddles, score }, events };
}

export function winnerOf(s: HockeyState): PlayerIndex | null {
  if (s.score[0] >= WIN_SCORE) return 0;
  if (s.score[1] >= WIN_SCORE) return 1;
  return null;
}

/** Höchstgeschwindigkeit des Computerschlägers je Stufe (Einheiten pro Sekunde). */
export const AI_SPEED: Record<Level, number> = { 0: 0.9, 1: 1.6, 2: 2.6 };

/**
 * Ziel des Computerschlägers (Orange, oben). Liegt der Puck in der eigenen Hälfte,
 * fährt er von hinten an den Puck heran und schießt Richtung gegnerisches Tor.
 * Sonst stellt er sich zwischen Puck und eigenes Tor.
 */
export function computerTarget(s: HockeyState, level: Level): Vec {
  const puck = s.puck.pos;
  const vel = s.puck.vel;
  const guardY = level === 0 ? 0.22 : 0.16;
  const inOwnHalf = puck.y < LENGTH / 2;
  const comingBack = vel.y < -0.05;

  if (inOwnHalf && (vel.y > -0.6 || level === 0)) {
    // Von der Torseite an den Puck: leicht oberhalb ansetzen, Richtung Mitte des gegnerischen Tors
    const aimX = 0.5 + (level === 2 ? (puck.x < 0.5 ? 0.12 : -0.12) : 0);
    const dirX = aimX - puck.x;
    const dirY = LENGTH - puck.y;
    const len = Math.hypot(dirX, dirY);
    const behind = PUCK_R + PADDLE_R * 0.6;
    const target = { x: puck.x - (dirX / len) * behind, y: puck.y - (dirY / len) * behind };
    // Liegt der Puck an der Torwand, ist hinter ihm kein Platz. Dann kurz zurückweichen,
    // bis ihn der Luftstrom aus der Ecke geschoben hat, statt ihn festzudrücken.
    const reachable = clampToHalf(1, target);
    if (Math.hypot(reachable.x - target.x, reachable.y - target.y) > 0.02) return { x: 0.5, y: 0.3 };
    return target;
  }

  // Verteidigen: auf der Linie zwischen Puck und Tormitte bleiben
  let x = 0.5 + (puck.x - 0.5) * (level === 0 ? 0.4 : 0.7);
  if (comingBack && level === 2 && Math.abs(vel.y) > 1e-6) {
    // Schwer: voraussagen, wo der Puck die Verteidigungslinie kreuzt (ohne Banden)
    const t = (guardY - puck.y) / vel.y;
    if (t > 0) x = puck.x + vel.x * t;
    while (x < 0 || x > 1) x = x < 0 ? -x : 2 - x;
  }
  return { x, y: guardY };
}
