import { h } from '../../core/dom';
import type { GameContext, GameInstance, PlayerIndex } from '../../core/types';
import { computerMove, emptyBoard, freeCells, winnerOf } from './logic';

const MARKS: [string, string] = [
  '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="12"/></svg>',
  '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M24 24L76 76M76 24L24 76" stroke="currentColor" stroke-width="12" stroke-linecap="round"/></svg>'
];
const MARK_NAMES = ['Kreis', 'Kreuz'];

export function createTicTacToe(_host: HTMLElement, ctx: GameContext): GameInstance {
  const board = emptyBoard();
  let turn: PlayerIndex = ctx.starter;
  let over = false;
  let timer = 0;

  const cells = board.map((_, i) =>
    h('button', { class: 'ttt-cell', type: 'button', onclick: () => humanMove(i) })
  );
  const element = h('div', { class: 'ttt', role: 'group', 'aria-label': 'Spielfeld' }, ...cells);

  function render(winLine: number[] = []): void {
    board.forEach((v, i) => {
      const cell = cells[i];
      cell.innerHTML = v === null ? '' : MARKS[v];
      cell.style.color = v === null ? '' : ctx.players[v].color;
      cell.classList.toggle('is-win', winLine.includes(i));
      const row = Math.floor(i / 3) + 1;
      const col = (i % 3) + 1;
      cell.setAttribute('aria-label', `Reihe ${row}, Spalte ${col}: ${v === null ? 'frei' : MARK_NAMES[v]}`);
      cell.disabled = over || v !== null || ctx.players[turn].isComputer;
    });
  }

  function play(i: number): void {
    if (over || board[i] !== null) return;
    board[i] = turn;
    const w = winnerOf(board);
    if (w) {
      over = true;
      render(w.line);
      ctx.report({ current: null, finished: { winner: w.winner } });
      return;
    }
    if (!freeCells(board).length) {
      over = true;
      render();
      ctx.report({ current: null, finished: { winner: null } });
      return;
    }
    turn = (1 - turn) as PlayerIndex;
    render();
    ctx.report({ current: turn });
    scheduleComputer();
  }

  function humanMove(i: number): void {
    if (!ctx.players[turn].isComputer) play(i);
  }

  function scheduleComputer(): void {
    if (over || !ctx.players[turn].isComputer) return;
    timer = window.setTimeout(() => play(computerMove(board, turn, ctx.level)), 550);
  }

  render();
  ctx.report({ current: turn });
  scheduleComputer();

  return {
    element,
    destroy: () => window.clearTimeout(timer)
  };
}
