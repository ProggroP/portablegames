import { h } from '../../core/dom';
import type { GameContext, GameInstance } from '../../core/types';
import { MemoBrain, canFlip, flip, isOver, resolve, scores, startState, type MemoState } from './logic';

// Motive, die auch um 180 Grad gedreht gleich aussehen. So passt es gegenüber für beide.
const MOTIFS = [
  '<circle cx="50" cy="50" r="30"/>',
  '<circle cx="50" cy="50" r="26" fill="none" stroke="currentColor" stroke-width="12"/>',
  '<rect x="22" y="22" width="56" height="56" rx="6"/>',
  '<rect x="24" y="24" width="52" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="11"/>',
  '<polygon points="50,14 86,50 50,86 14,50"/>',
  '<path d="M41 16h18v25h25v18H59v25H41V59H16V41h25z"/>',
  '<path d="M41 16h18v25h25v18H59v25H41V59H16V41h25z" transform="rotate(45 50 50)"/>',
  '<polygon points="50,14 81,32 81,68 50,86 19,68 19,32"/>',
  '<path d="M18 20L50 50L18 80Z M82 20L50 50L82 80Z"/>',
  '<rect x="14" y="38" width="72" height="24" rx="6"/>',
  '<circle cx="32" cy="32" r="15"/><circle cx="68" cy="68" r="15"/>',
  '<circle cx="31" cy="31" r="12"/><circle cx="69" cy="31" r="12"/><circle cx="31" cy="69" r="12"/><circle cx="69" cy="69" r="12"/>'
];
const MOTIF_COLORS = ['#2EC4A6', '#FF5C8A', '#FFD23F', '#A78BFA', '#4ADE80', '#F87171', '#38BDF8', '#FDBA74', '#E879F9', '#A3E635', '#F9A8D4', '#CBD5E1'];
const MOTIF_NAMES = ['Kreis', 'Ring', 'Quadrat', 'Rahmen', 'Raute', 'Plus', 'Kreuz', 'Sechseck', 'Fliege', 'Balken', 'Zwei Punkte', 'Vier Punkte'];

const HIDE_DELAY = 1100;

export function createPaarweise(_host: HTMLElement, ctx: GameContext): GameInstance {
  let state: MemoState = startState(ctx.starter);
  let message: string | undefined;
  let busy = false;
  let timer = 0;
  const brain = new MemoBrain(ctx.level);
  const name = (p: 0 | 1): string => ctx.players[p].name;

  const cards = state.cards.map((_, i) => h('button', { class: 'pw-card', type: 'button', onclick: () => tap(i) }));
  const element = h('div', { class: 'pw', role: 'group', 'aria-label': 'Karten' }, ...cards);

  const humanTurn = (): boolean => !isOver(state) && !ctx.players[state.turn].isComputer && !busy;

  function face(motif: number): HTMLElement {
    const tpl = document.createElement('template');
    tpl.innerHTML = `<svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">${MOTIFS[motif]}</svg>`;
    const wrap = h('span', { class: 'pw-face' });
    wrap.style.color = MOTIF_COLORS[motif];
    wrap.append(tpl.content.firstElementChild!);
    return wrap;
  }

  function render(): void {
    const canPlay = humanTurn();
    state.cards.forEach((motif, i) => {
      const card = cards[i];
      const owner = state.owner[i];
      const shown = owner !== null || state.open.includes(i);
      card.replaceChildren(shown ? face(motif) : h('span', { class: 'pw-back' }));
      card.classList.toggle('is-open', shown);
      card.classList.toggle('is-owned', owner !== null);
      if (owner !== null) card.style.setProperty('--oc', ctx.players[owner].color);
      card.disabled = !canPlay || !canFlip(state, i);
      card.setAttribute('aria-label', shown ? `${MOTIF_NAMES[motif]}${owner !== null ? `, gehört ${name(owner)}` : ''}` : `Karte ${i + 1}, verdeckt`);
    });
  }

  function report(): void {
    const sc = scores(state);
    if (isOver(state)) {
      const winner = sc[0] > sc[1] ? 0 : sc[1] > sc[0] ? 1 : null;
      ctx.report({ current: null, scores: sc, finished: { winner }, message: 'Alle Paare sind gefunden.' });
      return;
    }
    const hint = state.open.length === 1 ? 'Deck eine zweite Karte auf.' : 'Deck eine Karte auf.';
    ctx.report({ current: state.turn, scores: sc, message, hint });
  }

  function reveal(i: number): void {
    state = flip(state, i);
    brain.see(i, state.cards[i]);
    message = undefined;
    render();
    report();
    if (state.open.length === 2) {
      busy = true;
      const [a, b] = state.open;
      const r = resolve(state);
      const delay = r.match ? 500 : HIDE_DELAY;
      timer = window.setTimeout(() => {
        const mover = state.turn;
        state = r.state;
        busy = false;
        if (r.match) {
          brain.forget(a);
          brain.forget(b);
          message = `${name(mover)} hat ein Paar und ist nochmal dran.`;
        }
        render();
        report();
        scheduleComputer();
      }, delay);
    }
  }

  function tap(i: number): void {
    if (humanTurn() && canFlip(state, i)) reveal(i);
  }

  function scheduleComputer(): void {
    if (isOver(state) || !ctx.players[state.turn].isComputer) return;
    timer = window.setTimeout(() => {
      const first = brain.first(state);
      reveal(first);
      timer = window.setTimeout(() => reveal(brain.second(state, first)), 700);
    }, 700);
  }

  render();
  report();
  scheduleComputer();

  return { element, destroy: () => window.clearTimeout(timer) };
}
