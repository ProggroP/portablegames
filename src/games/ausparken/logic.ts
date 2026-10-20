// Ausparken: Schiebe-Rätsel auf einem 6x6-Parkplatz.
// Ein Rätsel ist ein Text aus 36 Zeichen, Zeile für Zeile von oben: '.' frei, 'A' das eigene Auto,
// andere Buchstaben weitere Fahrzeuge. Die Ausfahrt liegt rechts in Zeile 3 (Index 2).
// Ein Zug verschiebt ein Fahrzeug beliebig weit in seiner Richtung.

export const SIZE = 6;
export const EXIT_ROW = 2;
export const TARGET = 'A';

export interface Vehicle {
  id: string;
  row: number;
  col: number;
  len: number;
  horizontal: boolean;
}

export interface ParkMove {
  id: string;
  delta: number;
}

export function parse(puzzle: string): Vehicle[] {
  if (puzzle.length !== SIZE * SIZE) throw new Error('Rätsel braucht 36 Felder');
  const seen = new Map<string, number[]>();
  [...puzzle].forEach((ch, i) => {
    if (ch === '.' || ch === 'x') return;
    if (!seen.has(ch)) seen.set(ch, []);
    seen.get(ch)!.push(i);
  });
  const out: Vehicle[] = [];
  for (const [id, cells] of seen) {
    const rows = cells.map((i) => Math.floor(i / SIZE));
    const cols = cells.map((i) => i % SIZE);
    const horizontal = new Set(rows).size === 1;
    out.push({ id, row: Math.min(...rows), col: Math.min(...cols), len: cells.length, horizontal });
  }
  // Das eigene Auto immer zuerst
  return out.sort((a, b) => (a.id === TARGET ? -1 : b.id === TARGET ? 1 : a.id.localeCompare(b.id)));
}

export function serialize(vs: Vehicle[]): string {
  const g = new Array(SIZE * SIZE).fill('.');
  for (const v of vs) for (let k = 0; k < v.len; k++) g[(v.row + (v.horizontal ? 0 : k)) * SIZE + v.col + (v.horizontal ? k : 0)] = v.id;
  return g.join('');
}

function occupancy(vs: Vehicle[]): (string | null)[] {
  const g: (string | null)[] = new Array(SIZE * SIZE).fill(null);
  for (const v of vs) for (let k = 0; k < v.len; k++) g[(v.row + (v.horizontal ? 0 : k)) * SIZE + v.col + (v.horizontal ? k : 0)] = v.id;
  return g;
}

/** Wie weit sich ein Fahrzeug nach hinten (negativ) und vorne (positiv) schieben lässt. */
export function range(vs: Vehicle[], id: string): [number, number] {
  const g = occupancy(vs);
  const v = vs.find((x) => x.id === id)!;
  const free = (r: number, c: number): boolean => r >= 0 && r < SIZE && c >= 0 && c < SIZE && g[r * SIZE + c] === null;
  let back = 0;
  let fwd = 0;
  if (v.horizontal) {
    while (free(v.row, v.col - back - 1)) back++;
    while (free(v.row, v.col + v.len + fwd)) fwd++;
  } else {
    while (free(v.row - back - 1, v.col)) back++;
    while (free(v.row + v.len + fwd, v.col)) fwd++;
  }
  return [-back, fwd];
}

export function legalMoves(vs: Vehicle[]): ParkMove[] {
  const out: ParkMove[] = [];
  for (const v of vs) {
    const [lo, hi] = range(vs, v.id);
    for (let d = lo; d <= hi; d++) if (d) out.push({ id: v.id, delta: d });
  }
  return out;
}

export function apply(vs: Vehicle[], m: ParkMove): Vehicle[] {
  const [lo, hi] = range(vs, m.id);
  if (m.delta < lo || m.delta > hi || !m.delta) throw new Error('Ungültiger Zug');
  return vs.map((v) => (v.id !== m.id ? v : v.horizontal ? { ...v, col: v.col + m.delta } : { ...v, row: v.row + m.delta }));
}

/** Gelöst, wenn das eigene Auto an der Ausfahrt steht. */
export function isSolved(vs: Vehicle[]): boolean {
  const a = vs.find((v) => v.id === TARGET)!;
  return a.col + a.len === SIZE;
}

/** Kürzeste Lösung per Breitensuche. Liefert die Zugfolge oder null, wenn es keine gibt. */
export function solve(start: Vehicle[], limit = 200000): ParkMove[] | null {
  const startKey = serialize(start);
  const prev = new Map<string, { key: string; move: ParkMove } | null>([[startKey, null]]);
  const states = new Map<string, Vehicle[]>([[startKey, start]]);
  const queue = [startKey];
  for (let head = 0; head < queue.length && prev.size < limit; head++) {
    const key = queue[head];
    const vs = states.get(key)!;
    if (isSolved(vs)) {
      const path: ParkMove[] = [];
      let k = key;
      for (let step = prev.get(k); step; step = prev.get(k)) {
        path.unshift(step.move);
        k = step.key;
      }
      return path;
    }
    for (const m of legalMoves(vs)) {
      const next = apply(vs, m);
      const nk = serialize(next);
      if (prev.has(nk)) continue;
      prev.set(nk, { key, move: m });
      states.set(nk, next);
      queue.push(nk);
    }
  }
  return null;
}

// Erzeugen von Rätseln (läuft vorab per scripts/generate-ausparken.ts, nicht in der App)

/** Zufällige Aufstellung. Waagerechte Fahrzeuge in der Ausfahrtzeile gibt es nicht, sie wären unlösbar. */
export function randomLayout(rng: () => number, count: number): Vehicle[] {
  const vs: Vehicle[] = [{ id: TARGET, row: EXIT_ROW, col: Math.floor(rng() * 3), len: 2, horizontal: true }];
  const letters = 'BCDEFGHIJKLMNOPQRSTUVWXYZ';
  let tries = 0;
  while (vs.length < count + 1 && tries++ < 500) {
    const len = rng() < 0.75 ? 2 : 3;
    const horizontal = rng() < 0.5;
    const row = Math.floor(rng() * (horizontal ? SIZE : SIZE - len + 1));
    const col = Math.floor(rng() * (horizontal ? SIZE - len + 1 : SIZE));
    if (horizontal && row === EXIT_ROW) continue;
    const cand: Vehicle = { id: letters[vs.length - 1], row, col, len, horizontal };
    const g = occupancy(vs);
    let ok = true;
    for (let k = 0; k < len; k++) if (g[(row + (horizontal ? 0 : k)) * SIZE + col + (horizontal ? k : 0)]) ok = false;
    if (ok) vs.push(cand);
  }
  return vs;
}

/**
 * Erkundet alle Stellungen, die von `start` aus erreichbar sind, und berechnet für jede die
 * kürzeste Entfernung zur Lösung. Liefert die am weitesten entfernte lösbare Stellung.
 */
export function hardestInComponent(start: Vehicle[], limit = 60000): { puzzle: string; moves: number } | null {
  const keys: string[] = [serialize(start)];
  const index = new Map<string, number>([[keys[0], 0]]);
  const edges: number[][] = [];
  for (let i = 0; i < keys.length; i++) {
    if (keys.length > limit) return null;
    const vs = parse(keys[i]);
    edges[i] = [];
    for (const m of legalMoves(vs)) {
      const nk = serialize(apply(vs, m));
      let j = index.get(nk);
      if (j === undefined) {
        j = keys.length;
        index.set(nk, j);
        keys.push(nk);
      }
      edges[i].push(j);
    }
  }
  // Züge sind umkehrbar, also Breitensuche von allen gelösten Stellungen aus
  const dist = new Array(keys.length).fill(-1);
  const queue: number[] = [];
  keys.forEach((k, i) => {
    if (isSolved(parse(k))) {
      dist[i] = 0;
      queue.push(i);
    }
  });
  for (let h = 0; h < queue.length; h++) {
    for (const j of edges[queue[h]]) {
      if (dist[j] < 0) {
        dist[j] = dist[queue[h]] + 1;
        queue.push(j);
      }
    }
  }
  let best = -1;
  for (let i = 0; i < keys.length; i++) if (dist[i] > (best < 0 ? -1 : dist[best])) best = i;
  return best < 0 || dist[best] <= 0 ? null : { puzzle: keys[best], moves: dist[best] };
}
