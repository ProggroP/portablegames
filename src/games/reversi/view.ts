import { h } from '../../core/dom';
import { PLAYER_COLOR_NAMES } from '../../core/players';
import type { GameContext, GameInstance, PlayerIndex } from '../../core/types';
import { applyMove, computerMove, countStones, legalMoves, nextTurn, startBoard, type Board } from './logic';

export function createReversi(_host: HTMLElement, ctx: GameContext): GameInstance {
  let board: Board = startBoard();
  let turn: PlayerIndex | null = ctx.starter;
  let last = -1;
  let timer = 0;

  const cells = board.map((_, i) =>
    h('button', { class: 'rv-cell', type: 'button', onclick: () => humanMove(i) })
  );
  const element = h('div', { class: 'rv', role: 'group', 'aria-label': 'Spielbrett' }, ...cells);

  function render(): void {
    const humanTurn = turn !== null && !ctx.players[turn].isComputer;
    const hints = humanTurn && turn !== null ? legalMoves(board, turn) : [];
    board.forEach((v, i) => {
      const cell = cells[i];
      const hint = hints.includes(i);
      cell.replaceChildren();
      if (v !== null) {
        const stone = h('span', { class: 'rv-stone' + (i === last ? ' is-last' : '') });
        stone.style.background = ctx.players[v].color;
        cell.append(stone);
      } else if (hint && turn !== null) {
        const dot = h('span', { class: 'rv-hint' });
        dot.style.background = ctx.players[turn].color;
        cell.append(dot);
      }
      const name = 'ABCDEFGH'[i % 8] + (8 - Math.floor(i / 8));
      const what = v !== null ? PLAYER_COLOR_NAMES[v] : hint ? 'möglicher Zug' : 'frei';
      cell.setAttribute('aria-label', `Feld ${name}: ${what}`);
      cell.disabled = !hint;
    });
  }

  function report(message?: string): void {
    const scores = countStones(board);
    if (turn === null) {
      const winner = scores[0] > scores[1] ? 0 : scores[1] > scores[0] ? 1 : null;
      ctx.report({ current: null, scores, finished: { winner } });
    } else {
      ctx.report({ current: turn, scores, message });
    }
  }

  function play(i: number): void {
    if (turn === null) return;
    const mover: PlayerIndex = turn;
    board = applyMove(board, i, mover);
    last = i;
    turn = nextTurn(board, mover);
    render();
    const passed = turn === mover ? `${ctx.players[1 - mover].name} kann nicht ziehen und setzt aus.` : undefined;
    report(passed);
    scheduleComputer();
  }

  function humanMove(i: number): void {
    if (turn === null || ctx.players[turn].isComputer) return;
    if (legalMoves(board, turn).includes(i)) play(i);
  }

  function scheduleComputer(): void {
    if (turn === null || !ctx.players[turn].isComputer) return;
    const me = turn;
    timer = window.setTimeout(() => play(computerMove(board, me, ctx.level)), 650);
  }

  render();
  report();
  scheduleComputer();

  return {
    element,
    destroy: () => window.clearTimeout(timer)
  };
}
