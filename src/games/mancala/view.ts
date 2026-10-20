import { h } from '../../core/dom';
import type { GameContext, GameInstance } from '../../core/types';
import { STORE, computerMove, legalMoves, ownerOf, sow, startState, winnerOf, type MancalaState } from './logic';

const MAX_SEEDS_SHOWN = 15;

export function createMancala(_host: HTMLElement, ctx: GameContext): GameInstance {
  let state: MancalaState = startState(ctx.starter);
  let lastPit = -1;
  let message: string | undefined;
  let timer = 0;
  // Gegenüber stehen Zahlen auf der oberen Seite für Orange richtig herum.
  const flipTop = ctx.mode === 'gegenueber';

  const seedsOf = (n: number): HTMLElement => {
    const wrap = h('span', { class: 'mc-seeds', 'aria-hidden': 'true' });
    for (let k = 0; k < Math.min(n, MAX_SEEDS_SHOWN); k++) wrap.append(h('span', { class: 'mc-seed' }));
    return wrap;
  };

  const cells = new Map<number, HTMLElement>();
  const order = [12, 11, 10, 9, 8, 7, 0, 1, 2, 3, 4, 5];
  order.forEach((i, k) => {
    const btn = h('button', { class: 'mc-pit', type: 'button', onclick: () => tap(i) });
    btn.style.gridColumn = String((k % 6) + 2);
    btn.style.gridRow = k < 6 ? '1' : '2';
    cells.set(i, btn);
  });
  const stores = STORE.map((idx, p) => {
    const el = h('div', { class: 'mc-store' });
    el.style.gridColumn = p === 0 ? '8' : '1';
    el.style.setProperty('--pc', ctx.players[p].color);
    cells.set(idx, el);
    return el;
  });

  const element = h('div', { class: 'mc', role: 'group', 'aria-label': 'Mancala-Brett' }, stores[1], ...order.map((i) => cells.get(i)!), stores[0]);

  const humanTurn = (): boolean => !state.over && !ctx.players[state.turn].isComputer;

  function render(): void {
    const playable = new Set(humanTurn() ? legalMoves(state) : []);
    for (const [i, el] of cells) {
      const n = state.board[i];
      const owner = ownerOf(i);
      const isStore = owner === null;
      const content = h('span', { class: 'mc-content' + (flipTop && (i >= 7) ? ' is-flipped' : '') },
        h('span', { class: 'mc-count' }, n),
        isStore ? h('span', { class: 'mc-label' }, 'Speicher') : seedsOf(n)
      );
      el.replaceChildren(content);
      el.classList.toggle('is-last', i === lastPit);
      if (el instanceof HTMLButtonElement && owner !== null) {
        const btn = el;
        btn.disabled = !playable.has(i);
        btn.classList.toggle('is-playable', playable.has(i));
        btn.style.setProperty('--pc', ctx.players[state.turn].color);
        const k = owner === 0 ? i + 1 : i - 6;
        btn.setAttribute('aria-label', `Mulde ${k} von ${ctx.players[owner].name}: ${n} ${n === 1 ? 'Bohne' : 'Bohnen'}`);
      }
    }
  }

  function report(): void {
    const scores: [number, number] = [state.board[STORE[0]], state.board[STORE[1]]];
    if (state.over) {
      ctx.report({ current: null, scores, finished: { winner: winnerOf(state) }, message: 'Alle Bohnen sind verteilt.' });
      return;
    }
    ctx.report({ current: state.turn, scores, message, hint: 'Wähle eine Mulde auf deiner Seite.' });
  }

  function play(pit: number): void {
    const mover = ctx.players[state.turn].name;
    const r = sow(state, pit);
    state = r.state;
    lastPit = pit;
    message = r.captured
      ? `${mover} erbeutet ${r.captured} Bohnen.`
      : r.extraTurn
        ? `${mover} landet im Speicher und ist nochmal dran.`
        : undefined;
    render();
    report();
    scheduleComputer();
  }

  function tap(pit: number): void {
    if (humanTurn() && legalMoves(state).includes(pit)) play(pit);
  }

  function scheduleComputer(): void {
    if (state.over || !ctx.players[state.turn].isComputer) return;
    timer = window.setTimeout(() => play(computerMove(state, ctx.level)), 700);
  }

  render();
  report();
  scheduleComputer();

  return { element, destroy: () => window.clearTimeout(timer) };
}
