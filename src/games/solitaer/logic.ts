// Patience nach Klondike-Art: 7 Spalten, 4 Ablagen, Nachziehstapel.
// Farben: Pik (0) und Kreuz (3) schwarz, Herz (1) und Karo (2) rot.

export interface Card {
  suit: number;
  rank: number; // 1 = Ass, 11 = Bube, 12 = Dame, 13 = König
  up: boolean;
}

export interface SolState {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
  /** Wie viele Karten auf einmal nachgezogen werden */
  draw: 1 | 3;
}

export type Place = { kind: 'waste' } | { kind: 'foundation'; index: number } | { kind: 'tableau'; index: number; from?: number };

export const isRed = (c: Card): boolean => c.suit === 1 || c.suit === 2;

export function newDeal(draw: 1 | 3, rng: () => number = Math.random): SolState {
  const deck: Card[] = [];
  for (let suit = 0; suit < 4; suit++) for (let rank = 1; rank <= 13; rank++) deck.push({ suit, rank, up: false });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const tableau: Card[][] = [];
  for (let col = 0; col < 7; col++) {
    const pile = deck.splice(0, col + 1);
    pile[pile.length - 1] = { ...pile[pile.length - 1], up: true };
    tableau.push(pile);
  }
  return { stock: deck, waste: [], foundations: [[], [], [], []], tableau, draw };
}

const top = <T>(pile: T[]): T | undefined => pile[pile.length - 1];

function clone(s: SolState): SolState {
  return {
    stock: s.stock.slice(),
    waste: s.waste.slice(),
    foundations: s.foundations.map((f) => f.slice()),
    tableau: s.tableau.map((t) => t.slice()),
    draw: s.draw
  };
}

/** Karten vom Stapel aufdecken. Ist er leer, kommt der Abwurf umgedreht zurück. */
export function drawCards(s: SolState): SolState {
  const n = clone(s);
  if (!n.stock.length) {
    n.stock = n.waste.reverse().map((c) => ({ ...c, up: false }));
    n.waste = [];
    return n;
  }
  for (let k = 0; k < s.draw && n.stock.length; k++) n.waste.push({ ...n.stock.pop()!, up: true });
  return n;
}

export function canPlaceOnFoundation(card: Card, pile: Card[]): boolean {
  const t = top(pile);
  return t ? t.suit === card.suit && card.rank === t.rank + 1 : card.rank === 1;
}

export function canPlaceOnTableau(card: Card, pile: Card[]): boolean {
  const t = top(pile);
  if (!t) return card.rank === 13;
  return t.up && isRed(t) !== isRed(card) && card.rank === t.rank - 1;
}

/** Die Karten, die von einer Stelle aus bewegt würden (bei Spalten ab Index `from`). */
export function cardsAt(s: SolState, from: Place): Card[] {
  if (from.kind === 'waste') return s.waste.length ? [top(s.waste)!] : [];
  if (from.kind === 'foundation') return s.foundations[from.index].length ? [top(s.foundations[from.index])!] : [];
  const pile = s.tableau[from.index];
  const start = from.from ?? pile.length - 1;
  if (start < 0 || !pile[start]?.up) return [];
  return pile.slice(start);
}

function removeFrom(n: SolState, from: Place, count: number): void {
  if (from.kind === 'waste') n.waste.splice(-count, count);
  else if (from.kind === 'foundation') n.foundations[from.index].splice(-count, count);
  else {
    const pile = n.tableau[from.index];
    pile.splice(pile.length - count, count);
    const t = top(pile);
    if (t && !t.up) pile[pile.length - 1] = { ...t, up: true };
  }
}

/** Bewegt Karten, wenn es erlaubt ist. Sonst null. */
export function move(s: SolState, from: Place, to: Place): SolState | null {
  const cards = cardsAt(s, from);
  if (!cards.length) return null;
  if (to.kind === 'foundation') {
    if (cards.length !== 1 || !canPlaceOnFoundation(cards[0], s.foundations[to.index])) return null;
    if (from.kind === 'foundation' && from.index === to.index) return null;
    const n = clone(s);
    removeFrom(n, from, 1);
    n.foundations[to.index].push(cards[0]);
    return n;
  }
  if (to.kind === 'tableau') {
    if (from.kind === 'tableau' && from.index === to.index) return null;
    if (!canPlaceOnTableau(cards[0], s.tableau[to.index])) return null;
    const n = clone(s);
    removeFrom(n, from, cards.length);
    n.tableau[to.index].push(...cards);
    return n;
  }
  return null;
}

/**
 * Ziel für einen Tipp: erst eine Ablage (nur bei einzelnen Karten), dann eine Spalte mit Karten,
 * zuletzt eine leere Spalte. Ein König, der schon ganz unten in einer Spalte liegt, wandert nicht in eine leere.
 */
export function autoMove(s: SolState, from: Place): SolState | null {
  const cards = cardsAt(s, from);
  if (!cards.length) return null;
  if (cards.length === 1 && from.kind !== 'foundation') {
    for (let f = 0; f < 4; f++) {
      const r = move(s, from, { kind: 'foundation', index: f });
      if (r) return r;
    }
  }
  const order = [0, 1, 2, 3, 4, 5, 6].sort((a, b) => Number(s.tableau[a].length === 0) - Number(s.tableau[b].length === 0));
  for (const t of order) {
    if (!s.tableau[t].length && from.kind === 'tableau' && (from.from ?? s.tableau[from.index].length - 1) === 0) continue;
    const r = move(s, from, { kind: 'tableau', index: t });
    if (r) return r;
  }
  return null;
}

export const isWon = (s: SolState): boolean => s.foundations.every((f) => f.length === 13);

/** Alle Karten liegen offen und der Stapel ist leer: Der Rest lässt sich automatisch ablegen. */
export const canFinish = (s: SolState): boolean =>
  !s.stock.length && !s.waste.length && s.tableau.every((p) => p.every((c) => c.up)) && !isWon(s);

/** Legt eine passende Karte auf eine Ablage, wenn es eine gibt. */
export function stepToFoundation(s: SolState): SolState | null {
  const sources: Place[] = [{ kind: 'waste' }, ...[0, 1, 2, 3, 4, 5, 6].map((i): Place => ({ kind: 'tableau', index: i }))];
  for (const from of sources) {
    for (let f = 0; f < 4; f++) {
      const r = move(s, from, { kind: 'foundation', index: f });
      if (r) return r;
    }
  }
  return null;
}

export const foundationCount = (s: SolState): number => s.foundations.reduce((a, f) => a + f.length, 0);
