import type { Level, PlayerIndex } from '../../core/types';

// Fünf Würfel, bis zu drei Würfe pro Zug, 13 Zeilen auf dem Block.
// Oben: Einser bis Sechser, ab 63 Punkten gibt es 35 Bonus.

export interface Category {
  id: string;
  name: string;
  /** Augenzahl für die oberen Zeilen, sonst 0 */
  face: number;
}

export const CATEGORIES: Category[] = [
  { id: 'einser', name: 'Einser', face: 1 },
  { id: 'zweier', name: 'Zweier', face: 2 },
  { id: 'dreier', name: 'Dreier', face: 3 },
  { id: 'vierer', name: 'Vierer', face: 4 },
  { id: 'fuenfer', name: 'Fünfer', face: 5 },
  { id: 'sechser', name: 'Sechser', face: 6 },
  { id: 'dreierpasch', name: 'Dreierpasch', face: 0 },
  { id: 'viererpasch', name: 'Viererpasch', face: 0 },
  { id: 'fullhouse', name: 'Full House', face: 0 },
  { id: 'kleine', name: 'Kleine Straße', face: 0 },
  { id: 'grosse', name: 'Große Straße', face: 0 },
  { id: 'fuenfgleiche', name: 'Fünf Gleiche', face: 0 },
  { id: 'chance', name: 'Chance', face: 0 }
];

export const UPPER_BONUS_AT = 63;
export const UPPER_BONUS = 35;
export const ROLLS_PER_TURN = 3;

export type Sheet = (number | null)[];

export interface FwState {
  sheets: [Sheet, Sheet];
  turn: PlayerIndex;
  dice: number[];
  held: boolean[];
  /** Würfe, die in diesem Zug noch übrig sind. Bei 3 muss erst gewürfelt werden. */
  rollsLeft: number;
}

export function startState(starter: PlayerIndex): FwState {
  const empty = (): Sheet => CATEGORIES.map(() => null);
  return { sheets: [empty(), empty()], turn: starter, dice: [1, 1, 1, 1, 1], held: [false, false, false, false, false], rollsLeft: ROLLS_PER_TURN };
}

function counts(dice: number[]): number[] {
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) c[d]++;
  return c;
}

const sum = (dice: number[]): number => dice.reduce((a, b) => a + b, 0);

function longestRun(dice: number[]): number {
  const has = new Set(dice);
  let best = 0;
  let run = 0;
  for (let v = 1; v <= 6; v++) {
    run = has.has(v) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Punkte, die die Würfel in einer Zeile bringen würden. */
export function scoreFor(dice: number[], cat: number): number {
  const c = counts(dice);
  const max = Math.max(...c);
  const def = CATEGORIES[cat];
  if (def.face) return c[def.face] * def.face;
  switch (def.id) {
    case 'dreierpasch':
      return max >= 3 ? sum(dice) : 0;
    case 'viererpasch':
      return max >= 4 ? sum(dice) : 0;
    case 'fullhouse':
      return c.includes(3) && c.includes(2) ? 25 : 0;
    case 'kleine':
      return longestRun(dice) >= 4 ? 30 : 0;
    case 'grosse':
      return longestRun(dice) >= 5 ? 40 : 0;
    case 'fuenfgleiche':
      return max === 5 ? 50 : 0;
    default:
      return sum(dice);
  }
}

export function totals(sheet: Sheet): { upper: number; bonus: number; lower: number; total: number } {
  let upper = 0;
  let lower = 0;
  sheet.forEach((v, i) => {
    if (v === null) return;
    if (CATEGORIES[i].face) upper += v;
    else lower += v;
  });
  const bonus = upper >= UPPER_BONUS_AT ? UPPER_BONUS : 0;
  return { upper, bonus, lower, total: upper + bonus + lower };
}

export const openCategories = (sheet: Sheet): number[] => sheet.flatMap((v, i) => (v === null ? [i] : []));

export function roll(s: FwState, rng: () => number = Math.random): FwState {
  if (s.rollsLeft <= 0) throw new Error('Keine Würfe mehr');
  const fresh = s.rollsLeft === ROLLS_PER_TURN;
  const dice = s.dice.map((d, i) => (!fresh && s.held[i] ? d : 1 + Math.floor(rng() * 6)));
  return { ...s, dice, held: fresh ? [false, false, false, false, false] : s.held, rollsLeft: s.rollsLeft - 1 };
}

export function toggleHold(s: FwState, i: number): FwState {
  if (s.rollsLeft === ROLLS_PER_TURN || s.rollsLeft === 0) return s;
  const held = s.held.slice();
  held[i] = !held[i];
  return { ...s, held };
}

/** Ergebnis eintragen und den Zug abgeben. */
export function choose(s: FwState, cat: number): FwState {
  if (s.rollsLeft === ROLLS_PER_TURN) throw new Error('Erst würfeln');
  if (s.sheets[s.turn][cat] !== null) throw new Error('Zeile schon belegt');
  const sheets = [s.sheets[0].slice(), s.sheets[1].slice()] as [Sheet, Sheet];
  sheets[s.turn][cat] = scoreFor(s.dice, cat);
  const other = (1 - s.turn) as PlayerIndex;
  // Ist der andere schon fertig (kommt bei ungleicher Zugzahl nicht vor), bleibt der Zug.
  const next = openCategories(sheets[other]).length ? other : s.turn;
  return { sheets, turn: next, dice: s.dice, held: [false, false, false, false, false], rollsLeft: ROLLS_PER_TURN };
}

export const isOver = (s: FwState): boolean => s.sheets.every((sh) => openCategories(sh).length === 0);

export function scores(s: FwState): [number, number] {
  return [totals(s.sheets[0]).total, totals(s.sheets[1]).total];
}

// Computer

/** Ungefähre Durchschnittswerte je Zeile bei guter Spielweise. Eine Zeile unter Wert zu füllen kostet. */
const BASE = [2.1, 5.3, 8.6, 12.2, 15.7, 19.2, 21.7, 13.1, 22.6, 29.5, 32.7, 16.9, 22.0];

function value(dice: number[], cat: number, sheet: Sheet): number {
  const score = scoreFor(dice, cat);
  let v = score - BASE[cat];
  const face = CATEGORIES[cat].face;
  if (face) {
    // Oben zählt jeder Punkt über dem Schnitt von drei gleichen extra, wegen des Bonus
    const { upper } = totals(sheet);
    if (upper < UPPER_BONUS_AT) v += (score - 3 * face) * 0.8;
  }
  return v;
}

export function bestCategory(dice: number[], sheet: Sheet): number {
  let best = -Infinity;
  let bestCat = -1;
  for (const cat of openCategories(sheet)) {
    const v = value(dice, cat, sheet);
    if (v > best) {
      best = v;
      bestCat = cat;
    }
  }
  return bestCat;
}

const bestValue = (dice: number[], sheet: Sheet): number => value(dice, bestCategory(dice, sheet), sheet);

/** Erwarteter Wert, wenn die nicht gehaltenen Würfel noch einmal geworfen werden (exakt über alle Ergebnisse). */
function expectedAfterReroll(dice: number[], held: boolean[], sheet: Sheet): number {
  const free = held.flatMap((h, i) => (h ? [] : [i]));
  const outcomes = 6 ** free.length;
  let total = 0;
  const d = dice.slice();
  for (let k = 0; k < outcomes; k++) {
    let x = k;
    for (const i of free) {
      d[i] = 1 + (x % 6);
      x = Math.floor(x / 6);
    }
    total += bestValue(d, sheet);
  }
  return total / outcomes;
}

/** Welche Würfel der Computer festhält. null bedeutet: nicht mehr würfeln, sondern eintragen. */
export function computerHolds(s: FwState, level: Level): boolean[] | null {
  const sheet = s.sheets[s.turn];
  const dice = s.dice;
  if (level === 2) {
    const stay = bestValue(dice, sheet);
    let best = stay;
    let bestMask: boolean[] | null = null;
    for (let mask = 0; mask < 31; mask++) {
      const held = dice.map((_, i) => (mask & (1 << i)) !== 0);
      const ev = expectedAfterReroll(dice, held, sheet);
      if (ev > best + 0.01) {
        best = ev;
        bestMask = held;
      }
    }
    return bestMask;
  }
  // Leicht und Mittel: die häufigste Augenzahl halten, Mittel achtet zusätzlich auf Straßen
  const c = counts(dice);
  if (level === 1 && longestRun(dice) >= 4 && sheet[10] === null) {
    if (longestRun(dice) === 5) return null;
    const seen = new Set<number>();
    return dice.map((d) => {
      const keep = !seen.has(d) && dice.some((x) => x === d + 1 || x === d - 1);
      seen.add(d);
      return keep;
    });
  }
  const max = Math.max(...c);
  if (max === 5) return null;
  const face = c.lastIndexOf(max);
  return dice.map((d) => d === face);
}

export function computerCategory(s: FwState, level: Level, rng: () => number = Math.random): number {
  const sheet = s.sheets[s.turn];
  if (level === 0) {
    // Leicht: nimmt einfach die meisten Punkte, bei Gleichstand zufällig
    const open = openCategories(sheet);
    const best = Math.max(...open.map((c) => scoreFor(s.dice, c)));
    const pool = open.filter((c) => scoreFor(s.dice, c) === best);
    return pool[Math.floor(rng() * pool.length)];
  }
  return bestCategory(s.dice, sheet);
}
