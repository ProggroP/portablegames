import type { Level, PlayerIndex } from '../../core/types';

// Punkte 0-23. Positive Zahl: Steine von Blau (0), negative: Steine von Orange (1).
// Blau zieht von 23 Richtung 0, Heimfeld 0-5. Orange zieht von 0 Richtung 23, Heimfeld 18-23.
// Aus Sicht von Blau entspricht Index i dem Punkt i + 1.
//
// Regeln: Pasch zählt doppelt. Beide Würfel müssen genutzt werden, wenn es geht.
// Geht nur einer, muss es der höhere sein, wenn möglich. Wer auf der Bar steht,
// muss zuerst einsetzen. Abtragen erst, wenn alle Steine im Heimfeld sind.
// Gewonnen hat, wer zuerst alle 15 Steine abgetragen hat. Ohne Verdopplungswürfel.

export const BAR = -1;
export const OFF = -2;
export const CHECKERS = 15;

export interface BgState {
  points: number[];
  bar: [number, number];
  off: [number, number];
  turn: PlayerIndex;
}

export interface Step {
  from: number;
  to: number;
  die: number;
  hit: boolean;
}

export function startState(starter: PlayerIndex): BgState {
  const points = new Array(24).fill(0);
  points[23] = 2;
  points[12] = 5;
  points[7] = 3;
  points[5] = 5;
  points[0] = -2;
  points[11] = -5;
  points[16] = -3;
  points[18] = -5;
  return { points, bar: [0, 0], off: [0, 0], turn: starter };
}

const sign = (p: PlayerIndex): number => (p === 0 ? 1 : -1);
/** Anzahl der Steine von p auf Punkt i. */
export const countAt = (s: BgState, i: number, p: PlayerIndex): number => Math.max(0, s.points[i] * sign(p));
const inHome = (i: number, p: PlayerIndex): boolean => (p === 0 ? i <= 5 : i >= 18);

/** Die Würfel eines Wurfs: bei einem Pasch vier gleiche. */
export function diceList(a: number, b: number): number[] {
  return a === b ? [a, a, a, a] : [a, b];
}

function allHome(s: BgState, p: PlayerIndex): boolean {
  if (s.bar[p] > 0) return false;
  for (let i = 0; i < 24; i++) if (countAt(s, i, p) > 0 && !inHome(i, p)) return false;
  return true;
}

function canLand(s: BgState, to: number, p: PlayerIndex): boolean {
  return countAt(s, to, (1 - p) as PlayerIndex) <= 1;
}

/** Alle Einzelzüge mit einem Würfel, ohne Rücksicht auf die Pflicht, beide Würfel zu nutzen. */
function stepsForDie(s: BgState, die: number): Step[] {
  const p = s.turn;
  const opp = (1 - p) as PlayerIndex;
  const out: Step[] = [];
  const push = (from: number, to: number): void => {
    out.push({ from, to, die, hit: to >= 0 && countAt(s, to, opp) === 1 });
  };

  if (s.bar[p] > 0) {
    const to = p === 0 ? 24 - die : die - 1;
    if (canLand(s, to, p)) push(BAR, to);
    return out;
  }

  const home = allHome(s, p);
  for (let from = 0; from < 24; from++) {
    if (countAt(s, from, p) === 0) continue;
    const to = p === 0 ? from - die : from + die;
    if (to >= 0 && to < 24) {
      if (canLand(s, to, p)) push(from, to);
      continue;
    }
    if (!home) continue;
    const exact = p === 0 ? to === -1 : to === 24;
    if (exact) {
      push(from, OFF);
      continue;
    }
    // Höherer Würfel: nur vom höchsten besetzten Punkt im Heimfeld.
    let higherOccupied = false;
    if (p === 0) {
      for (let i = from + 1; i <= 5; i++) if (countAt(s, i, p) > 0) higherOccupied = true;
    } else {
      for (let i = 18; i < from; i++) if (countAt(s, i, p) > 0) higherOccupied = true;
    }
    if (!higherOccupied) push(from, OFF);
  }
  return out;
}

export function applyStep(s: BgState, step: Step): BgState {
  const p = s.turn;
  const opp = (1 - p) as PlayerIndex;
  const points = s.points.slice();
  const bar: [number, number] = [s.bar[0], s.bar[1]];
  const off: [number, number] = [s.off[0], s.off[1]];
  if (step.from === BAR) bar[p]--;
  else points[step.from] -= sign(p);
  if (step.to === OFF) {
    off[p]++;
  } else {
    if (countAt(s, step.to, opp) === 1) {
      points[step.to] = 0;
      bar[opp]++;
    }
    points[step.to] += sign(p);
  }
  return { points, bar, off, turn: p };
}

export function endTurn(s: BgState): BgState {
  return { ...s, turn: (1 - s.turn) as PlayerIndex };
}

const keyOf = (s: BgState): string => s.points.join(',') + '|' + s.bar.join(',') + '|' + s.off.join(',');

function removeDie(dice: number[], die: number): number[] {
  const i = dice.indexOf(die);
  return [...dice.slice(0, i), ...dice.slice(i + 1)];
}

/** Wie viele Würfel sich von hier aus höchstens nutzen lassen. */
function maxUsable(s: BgState, dice: number[], memo: Map<string, number>): number {
  if (!dice.length) return 0;
  const key = keyOf(s) + '#' + [...dice].sort().join('');
  const cached = memo.get(key);
  if (cached !== undefined) return cached;
  let best = 0;
  for (const die of new Set(dice)) {
    for (const step of stepsForDie(s, die)) {
      best = Math.max(best, 1 + maxUsable(applyStep(s, step), removeDie(dice, die), memo));
      if (best === dice.length) break;
    }
    if (best === dice.length) break;
  }
  memo.set(key, best);
  return best;
}

/** Erlaubte nächste Einzelzüge mit den verbleibenden Würfeln, nach allen Pflichtregeln. */
export function legalSteps(s: BgState, dice: number[]): Step[] {
  if (!dice.length) return [];
  const memo = new Map<string, number>();
  const max = maxUsable(s, dice, memo);
  if (max === 0) return [];
  const steps: Step[] = [];
  for (const die of new Set(dice)) {
    for (const step of stepsForDie(s, die)) {
      if (1 + maxUsable(applyStep(s, step), removeDie(dice, die), memo) === max) steps.push(step);
    }
  }
  // Lässt sich nur ein Würfel von zwei verschiedenen nutzen, muss es der höhere sein, wenn möglich.
  if (max === 1 && dice.length === 2 && dice[0] !== dice[1]) {
    const high = Math.max(...dice);
    const withHigh = steps.filter((st) => st.die === high);
    if (withHigh.length) return withHigh;
  }
  return steps;
}

export interface Sequence {
  steps: Step[];
  result: BgState;
}

/** Alle erlaubten Zugfolgen eines Wurfs, je Endstellung nur eine. */
export function allSequences(s: BgState, dice: number[]): Sequence[] {
  const results = new Map<string, Sequence>();
  const seen = new Set<string>();
  const walk = (st: BgState, remaining: number[], steps: Step[]): void => {
    const key = keyOf(st) + '#' + [...remaining].sort().join('');
    if (seen.has(key)) return;
    seen.add(key);
    const next = legalSteps(st, remaining);
    if (!next.length) {
      const k = keyOf(st);
      if (!results.has(k)) results.set(k, { steps, result: st });
      return;
    }
    for (const step of next) walk(applyStep(st, step), removeDie(remaining, step.die), [...steps, step]);
  };
  walk(s, dice, []);
  return [...results.values()];
}

export function winner(s: BgState): PlayerIndex | null {
  if (s.off[0] === CHECKERS) return 0;
  if (s.off[1] === CHECKERS) return 1;
  return null;
}

/** Augenzahl, die p noch bis zum Abtragen braucht. */
export function pipCount(s: BgState, p: PlayerIndex): number {
  let pips = s.bar[p] * 25;
  for (let i = 0; i < 24; i++) {
    const n = countAt(s, i, p);
    if (n) pips += n * (p === 0 ? i + 1 : 24 - i);
  }
  return pips;
}

/** Gibt es noch Berührung, oder ist es ein reines Wettrennen? */
function contact(s: BgState): boolean {
  if (s.bar[0] || s.bar[1]) return true;
  let lowestOrange = 24;
  let highestBlue = -1;
  for (let i = 0; i < 24; i++) {
    if (countAt(s, i, 1) > 0) lowestOrange = Math.min(lowestOrange, i);
    if (countAt(s, i, 0) > 0) highestBlue = Math.max(highestBlue, i);
  }
  return highestBlue > lowestOrange;
}

export function evaluate(s: BgState, me: PlayerIndex): number {
  const opp = (1 - me) as PlayerIndex;
  const w = winner(s);
  if (w !== null) return w === me ? 100000 : -100000;
  let score = (pipCount(s, opp) - pipCount(s, me)) * 2 + (s.off[me] - s.off[opp]) * 4;
  if (!contact(s)) return score;

  score += (s.bar[opp] - s.bar[me]) * 18;
  for (const [p, f] of [[me, 1], [opp, -1]] as [PlayerIndex, number][]) {
    const enemy = (1 - p) as PlayerIndex;
    let prime = 0;
    for (let k = 0; k < 24; k++) {
      // Reihenfolge in Zugrichtung von p, damit Blockaden vor dem Gegner zählen
      const i = p === 0 ? 23 - k : k;
      const n = countAt(s, i, p);
      if (n >= 2) {
        score += f * (inHome(i, p) ? 7 : 4);
        prime++;
        if (prime >= 3) score += f * prime * 2;
      } else {
        prime = 0;
      }
      if (n === 1) {
        // Einzelner Stein: Wie viele gegnerische Steine stehen in Schlagweite dahinter?
        let threats = s.bar[enemy] > 0 ? 2 : 0;
        for (let d = 1; d <= 12; d++) {
          const src = p === 0 ? i - d : i + d;
          if (src >= 0 && src < 24 && countAt(s, src, enemy) > 0) threats += d <= 6 ? 2 : 1;
        }
        score -= f * (4 + threats * (inHome(i, p) ? 3 : 2));
      }
    }
  }
  return score;
}

/** Wahrscheinlichkeit jedes der 21 verschiedenen Würfe. */
const ROLLS: [number, number, number][] = [];
for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) ROLLS.push([a, b, a === b ? 1 / 36 : 2 / 36]);

/**
 * Leicht: zufällige Zugfolge. Mittel: beste Stellung nach eigener Bewertung.
 * Schwer: prüft die besten Kandidaten zusätzlich gegen alle 21 möglichen Würfe des Gegners.
 */
export function computerSequence(s: BgState, dice: number[], level: Level, rng: () => number = Math.random): Step[] {
  const seqs = allSequences(s, dice);
  if (seqs.length === 0) return [];
  if (level === 0) return seqs[Math.floor(rng() * seqs.length)].steps;
  const me = s.turn;
  const ranked = seqs
    .map((q) => ({ q, v: evaluate(q.result, me) + rng() * 0.01 }))
    .sort((a, b) => b.v - a.v);
  if (level === 1 || ranked.length === 1) return ranked[0].q.steps;

  let best = ranked[0];
  let bestValue = -Infinity;
  for (const cand of ranked.slice(0, 6)) {
    if (winner(cand.q.result) === me) return cand.q.steps;
    const after = endTurn(cand.q.result);
    let expected = 0;
    for (const [a, b, prob] of ROLLS) {
      const replies = allSequences(after, diceList(a, b));
      let worst = Infinity;
      if (!replies.length) worst = evaluate(after, me);
      for (const r of replies) worst = Math.min(worst, evaluate(r.result, me));
      expected += prob * worst;
    }
    if (expected > bestValue) {
      bestValue = expected;
      best = cand;
    }
  }
  return best.q.steps;
}
