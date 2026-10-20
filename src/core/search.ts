import type { PlayerIndex } from './types';

export interface SearchGame<S, M> {
  moves(state: S): M[];
  apply(state: S, move: M): S;
  /** Bewertung aus Sicht von `me`. Wird für Endstellungen und an der Suchgrenze aufgerufen. */
  evaluate(state: S, me: PlayerIndex): number;
  isOver(state: S): boolean;
  turn(state: S): PlayerIndex;
}

class TimeUp extends Error {}

/**
 * Alpha-Beta-Suche mit schrittweiser Vertiefung. Sucht so tief, wie es die
 * Zeit erlaubt, und liefert den besten Zug der letzten vollständigen Tiefe.
 */
export function bestMove<S, M>(
  game: SearchGame<S, M>,
  state: S,
  opts: { timeMs: number; maxDepth: number; minDepth?: number; rng?: () => number }
): M {
  const me = game.turn(state);
  const rng = opts.rng ?? Math.random;
  const deadline = performance.now() + opts.timeMs;
  let nodes = 0;
  // Bis zur Mindesttiefe wird ohne Zeitlimit gesucht, damit langsame Geräte nicht schwächer spielen.
  let timed = false;

  const search = (s: S, depth: number, alpha: number, beta: number): number => {
    if (timed && ++nodes % 512 === 0 && performance.now() > deadline) throw new TimeUp();
    if (depth === 0 || game.isOver(s)) return game.evaluate(s, me);
    const maximizing = game.turn(s) === me;
    let best = maximizing ? -Infinity : Infinity;
    for (const m of game.moves(s)) {
      const v = search(game.apply(s, m), depth - 1, alpha, beta);
      if (maximizing) {
        best = Math.max(best, v);
        alpha = Math.max(alpha, v);
      } else {
        best = Math.min(best, v);
        beta = Math.min(beta, v);
      }
      if (alpha >= beta) break;
    }
    return best;
  };

  // Zufällige Reihenfolge, damit der Computer bei gleich guten Zügen nicht immer gleich spielt.
  const root = game.moves(state).map((m) => ({ m, r: rng() })).sort((a, b) => a.r - b.r).map((x) => x.m);
  if (root.length === 0) throw new Error('Kein Zug möglich');
  let chosen = root[0];

  for (let depth = 1; depth <= opts.maxDepth; depth++) {
    timed = depth > (opts.minDepth ?? 1);
    try {
      let best = -Infinity;
      let bestMove = root[0];
      for (const m of root) {
        const v = search(game.apply(state, m), depth - 1, best, Infinity);
        if (v > best) {
          best = v;
          bestMove = m;
        }
      }
      chosen = bestMove;
      // Den besten Zug zuerst prüfen, das beschleunigt die nächste Tiefe.
      root.splice(root.indexOf(bestMove), 1);
      root.unshift(bestMove);
    } catch (e) {
      if (e instanceof TimeUp) break;
      throw e;
    }
  }
  return chosen;
}
