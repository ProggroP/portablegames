import type { Level, PlayerIndex } from '../../core/types';

// 24 Karten, 12 Paare. Wer ein Paar aufdeckt, behält es und ist noch einmal dran.

export const PAIRS = 12;

export interface MemoState {
  /** Motiv jeder Karte (0 bis PAIRS-1) */
  cards: number[];
  owner: (PlayerIndex | null)[];
  /** Aufgedeckte Karten dieses Zugs, höchstens zwei */
  open: number[];
  turn: PlayerIndex;
}

export function startState(starter: PlayerIndex, rng: () => number = Math.random, pairs = PAIRS): MemoState {
  const cards = Array.from({ length: pairs * 2 }, (_, i) => Math.floor(i / 2));
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return { cards, owner: cards.map(() => null), open: [], turn: starter };
}

export const canFlip = (s: MemoState, i: number): boolean =>
  s.open.length < 2 && s.owner[i] === null && !s.open.includes(i);

export function flip(s: MemoState, i: number): MemoState {
  if (!canFlip(s, i)) throw new Error('Diese Karte kann nicht aufgedeckt werden');
  return { ...s, open: [...s.open, i] };
}

/** Nach zwei aufgedeckten Karten: Paar behalten oder zurückdrehen und den Zug abgeben. */
export function resolve(s: MemoState): { state: MemoState; match: boolean } {
  if (s.open.length !== 2) throw new Error('Es sind nicht zwei Karten aufgedeckt');
  const [a, b] = s.open;
  if (s.cards[a] === s.cards[b]) {
    const owner = s.owner.slice();
    owner[a] = s.turn;
    owner[b] = s.turn;
    return { state: { ...s, owner, open: [] }, match: true };
  }
  return { state: { ...s, open: [], turn: (1 - s.turn) as PlayerIndex }, match: false };
}

export function scores(s: MemoState): [number, number] {
  const out: [number, number] = [0, 0];
  for (const o of s.owner) if (o !== null) out[o]++;
  return [out[0] / 2, out[1] / 2];
}

export const isOver = (s: MemoState): boolean => s.owner.every((o) => o !== null);

/** Gedächtnis des Computers. Er merkt sich jede gesehene Karte nur mit einer gewissen Wahrscheinlichkeit. */
export class MemoBrain {
  private known = new Map<number, number>();
  private readonly recall: number;

  constructor(level: Level, private readonly rng: () => number = Math.random) {
    this.recall = [0.3, 0.65, 0.95][level];
  }

  see(index: number, motif: number): void {
    if (this.rng() < this.recall) this.known.set(index, motif);
  }

  forget(index: number): void {
    this.known.delete(index);
  }

  private unknown(s: MemoState, exclude: number[] = []): number[] {
    return s.cards
      .map((_, i) => i)
      .filter((i) => s.owner[i] === null && !this.known.has(i) && !exclude.includes(i));
  }

  private pick(list: number[]): number {
    return list[Math.floor(this.rng() * list.length)];
  }

  /** Erste Karte: ein bekanntes Paar, sonst eine unbekannte Karte. */
  first(s: MemoState): number {
    const seen = new Map<number, number>();
    for (const [i, m] of this.known) {
      if (s.owner[i] !== null) continue;
      if (seen.has(m)) return seen.get(m)!;
      seen.set(m, i);
    }
    const fresh = this.unknown(s);
    if (fresh.length) return this.pick(fresh);
    return this.pick(s.owner.map((o, i) => (o === null ? i : -1)).filter((i) => i >= 0));
  }

  /** Zweite Karte: der passende Partner, wenn bekannt, sonst eine unbekannte Karte. */
  second(s: MemoState, first: number): number {
    const motif = s.cards[first];
    for (const [i, m] of this.known) if (i !== first && m === motif && s.owner[i] === null) return i;
    const fresh = this.unknown(s, [first]);
    if (fresh.length) return this.pick(fresh);
    return this.pick(s.owner.map((o, i) => (o === null && i !== first ? i : -1)).filter((i) => i >= 0));
  }
}
