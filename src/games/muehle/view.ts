import { h } from '../../core/dom';
import type { GameContext, GameInstance, PlayerIndex } from '../../core/types';
import {
  POINTS, applyMove, computerMove, legalMoves, outcome, phaseOf, startState, stonesLeft, type Cell, type MillMove, type MillState
} from './logic';

const LINES =
  '<path d="M0 0H6V6H0Z M1 1H5V5H1Z M2 2H4V4H2Z M3 0V2 M3 4V6 M0 3H2 M4 3H6"/>';

export function createMuehle(_host: HTMLElement, ctx: GameContext): GameInstance {
  let state: MillState = startState(ctx.starter);
  let selected: number | null = null;
  /** Züge, die eine Mühle schließen und noch auf die Wahl des geschlagenen Steins warten. */
  let pending: MillMove[] | null = null;
  let last: MillMove | null = null;
  let timer = 0;

  const name = (p: PlayerIndex): string => ctx.players[p].name;

  const lines = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  lines.setAttribute('viewBox', '-0.05 -0.05 6.1 6.1');
  lines.setAttribute('class', 'mill-lines');
  lines.setAttribute('aria-hidden', 'true');
  lines.innerHTML = LINES;

  const points = POINTS.map(([x, y], i) => {
    const btn = h('button', { class: 'mill-point', type: 'button', onclick: () => tap(i) });
    btn.style.left = `${(x / 6) * 100}%`;
    btn.style.top = `${(y / 6) * 100}%`;
    return btn;
  });
  const element = h('div', { class: 'mill', role: 'group', 'aria-label': 'Mühlebrett' },
    h('div', { class: 'mill__inner' }, lines, ...points)
  );

  function previewBoard(): Cell[] {
    if (!pending) return state.board;
    const b = state.board.slice();
    const m = pending[0];
    if (m.from !== undefined) b[m.from] = null;
    b[m.to] = state.turn;
    return b;
  }

  function humanTurn(): boolean {
    return !outcome(state) && !ctx.players[state.turn].isComputer;
  }

  function render(): void {
    const board = previewBoard();
    const moves = humanTurn() ? legalMoves(state) : [];
    const phase = phaseOf(state, state.turn);
    const removable = new Set(pending?.map((m) => m.remove));
    const movable = new Set(moves.map((m) => m.from).filter((f) => f !== undefined));
    const targets = new Set(
      phase === 'setzen' ? [] : moves.filter((m) => m.from === selected).map((m) => m.to)
    );
    const placeable = new Set(phase === 'setzen' ? moves.map((m) => m.to) : []);

    points.forEach((btn, i) => {
      const v = board[i];
      btn.replaceChildren();
      if (v !== null) {
        const stone = h('span', { class: `mill-stone mill-stone--p${v + 1}` });
        stone.style.background = ctx.players[v].color;
        btn.append(stone);
      } else if (targets.has(i)) {
        const dot = h('span', { class: 'mill-hint' });
        dot.style.background = ctx.players[state.turn].color;
        btn.append(dot);
      }
      btn.classList.toggle('is-selected', i === selected);
      btn.classList.toggle('is-last', !pending && last?.to === i);
      btn.classList.toggle('is-removable', removable.has(i));
      btn.style.setProperty('--pc', ctx.players[state.turn].color);
      const actionable = pending ? removable.has(i) : placeable.has(i) || movable.has(i) || targets.has(i);
      btn.disabled = !actionable;
      const what = v === null ? 'frei' : name(v);
      btn.setAttribute('aria-label', `Punkt ${i + 1}: ${what}${removable.has(i) ? ', schlagen' : ''}`);
    });
  }

  function hint(): string {
    const p = state.turn;
    const opp = (1 - p) as PlayerIndex;
    if (pending) return `Mühle! Nimm einen Stein von ${name(opp)}.`;
    switch (phaseOf(state, p)) {
      case 'setzen':
        return `Setze einen Stein. Noch ${state.hand[p]} in der Hand.`;
      case 'springen':
        return selected === null ? 'Du hast drei Steine und darfst springen.' : 'Tippe auf einen freien Punkt.';
      default:
        return selected === null ? 'Wähle einen Stein zum Ziehen.' : 'Tippe auf einen freien Nachbarpunkt.';
    }
  }

  function report(): void {
    const scores: [number, number] = [stonesLeft(state, 0), stonesLeft(state, 1)];
    const o = outcome(state);
    if (o) {
      const loser = name(state.turn);
      const message =
        o.winner === null
          ? `${o.reason}.`
          : o.reason === 'eingesperrt'
            ? `${loser} kann nicht mehr ziehen.`
            : `${loser} hat nur noch zwei Steine.`;
      ctx.report({ current: null, scores, finished: { winner: o.winner }, message });
      return;
    }
    ctx.report({ current: state.turn, scores, hint: hint() });
  }

  function commit(m: MillMove): void {
    state = applyMove(state, m);
    last = m;
    selected = null;
    pending = null;
    render();
    report();
    scheduleComputer();
  }

  function tap(i: number): void {
    if (!humanTurn()) return;
    const moves = legalMoves(state);
    if (pending) {
      const m = pending.find((x) => x.remove === i);
      if (m) commit(m);
      return;
    }
    let candidates: MillMove[];
    if (phaseOf(state, state.turn) === 'setzen') {
      candidates = moves.filter((m) => m.to === i);
    } else if (state.board[i] === state.turn) {
      selected = selected === i ? null : i;
      render();
      report();
      return;
    } else {
      candidates = moves.filter((m) => m.from === selected && m.to === i);
    }
    if (!candidates.length) return;
    if (candidates[0].remove !== undefined) {
      pending = candidates;
      selected = null;
      render();
      report();
    } else {
      commit(candidates[0]);
    }
  }

  function scheduleComputer(): void {
    if (outcome(state) || !ctx.players[state.turn].isComputer) return;
    timer = window.setTimeout(() => commit(computerMove(state, ctx.level)), 600);
  }

  render();
  report();
  scheduleComputer();

  return { element, destroy: () => window.clearTimeout(timer) };
}

