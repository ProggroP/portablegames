import { h } from '../../core/dom';
import type { GameContext, GameInstance } from '../../core/types';
import { COLS, ROWS, computerMove, drop, landingRow, startState, type FallState } from './logic';

export function createFallreihe(_host: HTMLElement, ctx: GameContext): GameInstance {
  let state: FallState = startState(ctx.starter);
  let last = -1;
  let timer = 0;

  const slots: HTMLElement[] = [];
  const columns = Array.from({ length: COLS }, (_, c) => {
    const col = h('button', { class: 'fr-col', type: 'button', onclick: () => tap(c) });
    for (let r = 0; r < ROWS; r++) {
      const slot = h('span', { class: 'fr-slot' });
      slots[r * COLS + c] = slot;
      col.append(slot);
    }
    return col;
  });
  const element = h('div', { class: 'fr', role: 'group', 'aria-label': 'Spielfeld mit 7 Spalten' }, ...columns);

  const over = (): boolean => state.winner !== null || state.full;
  const humanTurn = (): boolean => !over() && !ctx.players[state.turn].isComputer;

  function render(): void {
    const canPlay = humanTurn();
    const win = new Set(state.winLine);
    state.board.forEach((v, i) => {
      const slot = slots[i];
      slot.replaceChildren();
      if (v !== null) {
        const disc = h('span', { class: 'fr-disc' + (i === last ? ' is-last' : '') + (win.has(i) ? ' is-win' : '') });
        disc.style.background = ctx.players[v].color;
        slot.append(disc);
      }
    });
    columns.forEach((col, c) => {
      const free = landingRow(state.board, c);
      col.disabled = !canPlay || free < 0;
      col.style.setProperty('--pc', ctx.players[state.turn].color);
      col.setAttribute('aria-label', `Spalte ${c + 1}${free < 0 ? ', voll' : `, noch ${free + 1} frei`}`);
    });
  }

  function report(): void {
    if (state.winner !== null) ctx.report({ current: null, finished: { winner: state.winner }, message: 'Vier in einer Reihe!' });
    else if (state.full) ctx.report({ current: null, finished: { winner: null }, message: 'Das Brett ist voll.' });
    else ctx.report({ current: state.turn, hint: 'Tippe auf eine Spalte.' });
  }

  function play(c: number): void {
    const r = landingRow(state.board, c);
    state = drop(state, c);
    last = r * COLS + c;
    render();
    report();
    scheduleComputer();
  }

  function tap(c: number): void {
    if (humanTurn() && landingRow(state.board, c) >= 0) play(c);
  }

  function scheduleComputer(): void {
    if (over() || !ctx.players[state.turn].isComputer) return;
    timer = window.setTimeout(() => play(computerMove(state, ctx.level)), 500);
  }

  render();
  report();
  scheduleComputer();

  return { element, destroy: () => window.clearTimeout(timer) };
}
