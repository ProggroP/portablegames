import { h } from '../../core/dom';
import type { GameContext, GameInstance, PlayerIndex } from '../../core/types';
import { applyMove, computerMove, countPieces, isDark, legalMoves, outcome, startState, type DameMove, type DameState } from './logic';

export function createDame(_host: HTMLElement, ctx: GameContext): GameInstance {
  let state: DameState = startState(ctx.starter);
  let selected: number | null = null;
  let last: DameMove | null = null;
  let timer = 0;

  const name = (p: PlayerIndex): string => ctx.players[p].name;

  const cells = state.board.map((_, i) =>
    h('button', { class: `dm-cell ${isDark(i) ? 'dm-dark' : 'dm-light'}`, type: 'button', onclick: () => tap(i) })
  );
  const element = h('div', { class: 'dm', role: 'group', 'aria-label': 'Damebrett' }, ...cells);

  const humanTurn = (): boolean => !outcome(state) && !ctx.players[state.turn].isComputer;

  function render(): void {
    const moves = humanTurn() ? legalMoves(state) : [];
    const mustCapture = moves.some((m) => m.captures.length > 0);
    const movable = new Set(moves.map((m) => m.path[0]));
    // Kann nur ein Stein ziehen, ist er gleich ausgewählt.
    if (selected === null && movable.size === 1) selected = [...movable][0];
    const targets = new Set(moves.filter((m) => m.path[0] === selected).map((m) => m.path[m.path.length - 1]));
    const lastPath = new Set(last?.path ?? []);

    state.board.forEach((piece, i) => {
      const cell = cells[i];
      cell.replaceChildren();
      if (piece) {
        const stone = h('span', { class: 'dm-stone' + (piece.king ? ' is-king' : '') });
        stone.style.background = ctx.players[piece.p].color;
        cell.append(stone);
      } else if (targets.has(i)) {
        const dot = h('span', { class: 'dm-hint' });
        dot.style.background = ctx.players[state.turn].color;
        cell.append(dot);
      }
      cell.classList.toggle('is-selected', i === selected);
      cell.classList.toggle('is-must', mustCapture && movable.has(i) && i !== selected);
      cell.classList.toggle('is-last', lastPath.has(i));
      cell.style.setProperty('--pc', ctx.players[state.turn].color);
      cell.disabled = !(movable.has(i) || targets.has(i));
      if (isDark(i)) {
        const sq = 'abcdefgh'[i % 8] + (8 - Math.floor(i / 8));
        const what = piece ? `${name(piece.p)}${piece.king ? ', Dame' : ''}` : targets.has(i) ? 'Ziel' : 'frei';
        cell.setAttribute('aria-label', `Feld ${sq}: ${what}`);
      } else {
        cell.setAttribute('aria-hidden', 'true');
        cell.tabIndex = -1;
      }
    });
  }

  function report(): void {
    const scores = countPieces(state.board);
    const o = outcome(state);
    if (o) {
      const loser = state.turn;
      const message =
        o.winner === null
          ? '50 Züge ohne Schlagen.'
          : scores[loser] === 0
            ? `${name(loser)} hat keine Steine mehr.`
            : `${name(loser)} kann nicht mehr ziehen.`;
      ctx.report({ current: null, scores, finished: { winner: o.winner }, message });
      return;
    }
    const capture = legalMoves(state).some((m) => m.captures.length > 0);
    const hint = capture ? 'Schlagen ist Pflicht.' : selected === null ? 'Wähle einen Stein.' : 'Tippe auf ein Zielfeld.';
    ctx.report({ current: state.turn, scores, hint });
  }

  function commit(m: DameMove): void {
    state = applyMove(state, m);
    last = m;
    selected = null;
    render();
    report();
    scheduleComputer();
  }

  function tap(i: number): void {
    if (!humanTurn()) return;
    const moves = legalMoves(state);
    if (moves.some((m) => m.path[0] === i)) {
      selected = i;
      render();
      report();
      return;
    }
    if (selected === null) return;
    const m = moves.find((x) => x.path[0] === selected && x.path[x.path.length - 1] === i);
    if (m) commit(m);
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
