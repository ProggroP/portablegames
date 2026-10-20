import { h } from '../../core/dom';
import type { GameContext, GameInstance } from '../../core/types';
import { N, computerMove, isOver, place, startState, type GomokuState } from './logic';

export function createGomoku(_host: HTMLElement, ctx: GameContext): GameInstance {
  let state: GomokuState = startState(ctx.starter);
  /** Vorgemerkter Punkt: Erst der zweite Tipp setzt den Stein. */
  let pending = -1;
  let last = -1;
  let timer = 0;

  const cells = state.board.map((_, i) => {
    const r = Math.floor(i / N);
    const c = i % N;
    const edges = [r === 0 ? 'gm-top' : '', r === N - 1 ? 'gm-bottom' : '', c === 0 ? 'gm-left' : '', c === N - 1 ? 'gm-right' : '']
      .filter(Boolean)
      .join(' ');
    return h('button', { class: `gm-cell ${edges}`, type: 'button', onclick: () => tap(i) });
  });
  const element = h('div', { class: 'gm', role: 'group', 'aria-label': 'Gomoku-Brett' }, ...cells);
  element.style.setProperty('--n', String(N));

  const humanTurn = (): boolean => !isOver(state) && !ctx.players[state.turn].isComputer;

  function render(): void {
    const canPlay = humanTurn();
    const win = new Set(state.winLine);
    state.board.forEach((v, i) => {
      const cell = cells[i];
      cell.replaceChildren();
      if (v !== null) {
        const stone = h('span', { class: 'gm-stone' + (i === last ? ' is-last' : '') + (win.has(i) ? ' is-win' : '') });
        stone.style.background = ctx.players[v].color;
        cell.append(stone);
      } else if (i === pending) {
        const ghost = h('span', { class: 'gm-stone is-ghost' });
        ghost.style.background = ctx.players[state.turn].color;
        cell.append(ghost);
      }
      cell.disabled = !canPlay || v !== null;
      const r = Math.floor(i / N) + 1;
      const c = (i % N) + 1;
      const what = v === null ? (i === pending ? 'vorgemerkt, nochmal tippen zum Setzen' : 'frei') : ctx.players[v].name;
      cell.setAttribute('aria-label', `Reihe ${r}, Spalte ${c}: ${what}`);
    });
  }

  function report(): void {
    if (state.winner !== null) {
      ctx.report({ current: null, finished: { winner: state.winner }, message: 'Fünf in einer Reihe!' });
    } else if (state.full) {
      ctx.report({ current: null, finished: { winner: null }, message: 'Das Brett ist voll.' });
    } else {
      const hint = pending >= 0 ? 'Nochmal tippen zum Setzen, oder einen anderen Punkt wählen.' : 'Tippe auf einen freien Punkt.';
      ctx.report({ current: state.turn, hint });
    }
  }

  function play(i: number): void {
    state = place(state, i);
    last = i;
    pending = -1;
    render();
    report();
    scheduleComputer();
  }

  function tap(i: number): void {
    if (!humanTurn() || state.board[i] !== null) return;
    if (pending === i) {
      play(i);
      return;
    }
    pending = i;
    render();
    report();
  }

  function scheduleComputer(): void {
    if (isOver(state) || !ctx.players[state.turn].isComputer) return;
    timer = window.setTimeout(() => play(computerMove(state, ctx.level)), 550);
  }

  render();
  report();
  scheduleComputer();

  return { element, destroy: () => window.clearTimeout(timer) };
}
