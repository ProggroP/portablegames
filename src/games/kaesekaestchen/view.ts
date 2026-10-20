import { h } from '../../core/dom';
import type { GameContext, GameInstance, PlayerIndex } from '../../core/types';
import { computerMove, drawLine, isOver, scores, startState, type BoxState } from './logic';

const MARKERS = ['kaes-mark--p1', 'kaes-mark--p2'];

export function createKaesekaestchen(_host: HTMLElement, ctx: GameContext): GameInstance {
  let state: BoxState = startState(ctx.starter);
  let last = -1;
  let message: string | undefined;
  let timer = 0;
  const n = state.n;
  const pct = (k: number): string => `${(k / n) * 100}%`;
  const hCount = n * (n + 1);

  const boxes = state.boxes.map((_, b) => {
    const el = h('span', { class: 'kaes-box', 'aria-hidden': 'true' });
    el.style.left = pct(b % n);
    el.style.top = pct(Math.floor(b / n));
    el.style.width = pct(1);
    el.style.height = pct(1);
    return el;
  });

  const lines = state.lines.map((_, l) => {
    const horizontal = l < hCount;
    const k = horizontal ? l : l - hCount;
    const r = horizontal ? Math.floor(k / n) : Math.floor(k / (n + 1));
    const c = horizontal ? k % n : k % (n + 1);
    const btn = h('button', {
      class: `kaes-line ${horizontal ? 'kaes-line--h' : 'kaes-line--v'}`,
      type: 'button',
      'aria-label': horizontal
        ? `Waagerechte Linie, Reihe ${r + 1}, Abschnitt ${c + 1}`
        : `Senkrechte Linie, Spalte ${c + 1}, Abschnitt ${r + 1}`,
      onclick: () => tap(l)
    }, h('span', { class: 'kaes-line__ink' }));
    btn.style.left = pct(horizontal ? c + 0.5 : c);
    btn.style.top = pct(horizontal ? r : r + 0.5);
    return btn;
  });

  const dots: HTMLElement[] = [];
  for (let r = 0; r <= n; r++) {
    for (let c = 0; c <= n; c++) {
      const d = h('span', { class: 'kaes-dot', 'aria-hidden': 'true' });
      d.style.left = pct(c);
      d.style.top = pct(r);
      dots.push(d);
    }
  }

  const element = h('div', { class: 'kaes', role: 'group', 'aria-label': 'Spielfeld mit Punkten' },
    h('div', { class: 'kaes__inner' }, ...boxes, ...lines, ...dots)
  );
  element.style.setProperty('--cell', `${100 / n}%`);

  const humanTurn = (): boolean => !isOver(state) && !ctx.players[state.turn].isComputer;

  function render(): void {
    const canPlay = humanTurn();
    state.boxes.forEach((owner, b) => {
      const el = boxes[b];
      el.replaceChildren();
      el.style.background = owner === null ? '' : `color-mix(in srgb, ${ctx.players[owner].color} 22%, transparent)`;
      if (owner !== null) {
        const mark = h('span', { class: `kaes-mark ${MARKERS[owner]}` });
        mark.style.background = ctx.players[owner].color;
        el.append(mark);
      }
    });
    state.lines.forEach((drawn, l) => {
      const btn = lines[l];
      btn.classList.toggle('is-drawn', drawn);
      btn.classList.toggle('is-last', l === last);
      btn.style.setProperty('--pc', ctx.players[state.turn].color);
      btn.disabled = drawn || !canPlay;
    });
  }

  function report(): void {
    const sc = scores(state);
    if (isOver(state)) {
      const winner: PlayerIndex | null = sc[0] > sc[1] ? 0 : sc[1] > sc[0] ? 1 : null;
      ctx.report({ current: null, scores: sc, finished: { winner } });
      return;
    }
    ctx.report({ current: state.turn, scores: sc, message, hint: 'Ziehe eine Linie zwischen zwei Punkten.' });
  }

  function play(line: number): void {
    const mover = state.turn;
    const r = drawLine(state, line);
    state = r.state;
    last = line;
    message = r.closed.length
      ? `${ctx.players[mover].name} schließt ${r.closed.length === 1 ? 'ein Kästchen' : 'zwei Kästchen'} und ist nochmal dran.`
      : undefined;
    render();
    report();
    scheduleComputer();
  }

  function tap(line: number): void {
    if (humanTurn() && !state.lines[line]) play(line);
  }

  function scheduleComputer(): void {
    if (isOver(state) || !ctx.players[state.turn].isComputer) return;
    timer = window.setTimeout(() => play(computerMove(state, ctx.level)), 450);
  }

  render();
  report();
  scheduleComputer();

  return { element, destroy: () => window.clearTimeout(timer) };
}
