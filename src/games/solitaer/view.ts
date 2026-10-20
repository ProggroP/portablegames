import { formatTime } from '../../core/clock';
import { h } from '../../core/dom';
import type { GameContext, GameInstance } from '../../core/types';
import {
  autoMove, canFinish, drawCards, foundationCount, isRed, isWon, newDeal, stepToFoundation, type Card, type Place, type SolState
} from './logic';

const SUITS = [
  'M12 2C9 6 4 9 4 13a4 4 0 0 0 7 2.6V18l-2 4h6l-2-4v-2.4A4 4 0 0 0 20 13c0-4-5-7-8-11z',
  'M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z',
  'M12 2l7 10-7 10-7-10z',
  'M12 2.5a4 4 0 0 0-3.4 6.1A4 4 0 1 0 11 15.5V18l-2 4h6l-2-4v-2.5a4 4 0 1 0 2.4-6.9A4 4 0 0 0 12 2.5z'
];
const SUIT_NAMES = ['Pik', 'Herz', 'Karo', 'Kreuz'];
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'B', 'D', 'K'];
const RANK_NAMES = ['', 'Ass', 'Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs', 'Sieben', 'Acht', 'Neun', 'Zehn', 'Bube', 'Dame', 'König'];

const suitIcon = (suit: number, cls: string): string =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${SUITS[suit]}" fill="currentColor"/></svg>`;

export function createSolitaer(_host: HTMLElement, ctx: GameContext): GameInstance {
  let state: SolState = newDeal(ctx.level === 2 ? 3 : 1);
  const history: SolState[] = [];
  const startedAt = Date.now();
  let endedAt = 0;
  let finishing = 0;

  const table = h('div', { class: 'sol-table' });
  const undoButton = h('button', { class: 'btn sol-tool', type: 'button', onclick: () => undo() }, 'Rückgängig');
  const finishButton = h('button', { class: 'btn btn--primary sol-tool', type: 'button', hidden: true, onclick: () => autoFinish() }, 'Alles ablegen');
  const element = h('div', { class: 'sol' }, table, h('div', { class: 'sol-bar' }, undoButton, finishButton));

  const elapsed = (): string => formatTime((endedAt || Date.now()) - startedAt);

  function apply(next: SolState | null, from?: HTMLElement): void {
    if (!next) {
      from?.classList.remove('is-shake');
      void from?.offsetWidth;
      from?.classList.add('is-shake');
      return;
    }
    history.push(state);
    if (history.length > 300) history.shift();
    state = next;
    update();
  }

  function undo(): void {
    const prev = history.pop();
    if (!prev || isWon(state)) return;
    state = prev;
    update();
  }

  function autoFinish(): void {
    window.clearInterval(finishing);
    finishing = window.setInterval(() => {
      const next = stepToFoundation(state);
      if (!next) {
        window.clearInterval(finishing);
        return;
      }
      history.push(state);
      state = next;
      update();
    }, 110);
  }

  function cardEl(card: Card, x: number, y: number, w: number, hgt: number, place: Place | null, label: string): HTMLElement {
    const el = h('button', { class: 'sol-card' + (card.up ? (isRed(card) ? ' is-red' : '') : ' is-down'), type: 'button' });
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${w}px`;
    el.style.height = `${hgt}px`;
    el.style.setProperty('--cw', `${w}px`);
    if (card.up) {
      el.innerHTML =
        `<span class="sol-corner"><span class="sol-rank">${RANKS[card.rank]}</span>${suitIcon(card.suit, 'sol-suit')}</span>` +
        suitIcon(card.suit, 'sol-big');
      el.setAttribute('aria-label', `${SUIT_NAMES[card.suit]} ${RANK_NAMES[card.rank]}${label}`);
    } else {
      el.setAttribute('aria-label', 'verdeckte Karte');
    }
    if (place && card.up) el.addEventListener('click', () => apply(autoMove(state, place), el));
    else el.disabled = true;
    return el;
  }

  function slotEl(x: number, y: number, w: number, hgt: number, cls: string, label: string, onclick?: () => void): HTMLElement {
    const el = h('button', { class: `sol-slot ${cls}`, type: 'button', 'aria-label': label });
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${w}px`;
    el.style.height = `${hgt}px`;
    if (onclick) el.addEventListener('click', onclick);
    else el.disabled = true;
    return el;
  }

  function render(): void {
    const W = table.clientWidth;
    const H = table.clientHeight;
    if (!W || !H) return;
    const gap = Math.max(4, W * 0.014);
    const cw = (W - 6 * gap) / 7;
    const ch = Math.min(cw * 1.4, H * 0.2);
    const colX = (i: number): number => i * (cw + gap);
    const nodes: HTMLElement[] = [];

    // Stapel
    const drawLabel = state.stock.length ? `Stapel, ${state.stock.length} Karten, tippen zum Aufdecken` : 'Stapel leer, tippen zum Umdrehen';
    nodes.push(slotEl(colX(0), 0, cw, ch, state.stock.length ? 'is-stock' : 'is-empty', drawLabel, () => apply(drawCards(state))));
    if (state.stock.length) nodes[nodes.length - 1].classList.add('is-back');

    // Abwurf: bei drei Karten aufgefächert
    const shown = state.waste.slice(-(state.draw === 3 ? 3 : 1));
    shown.forEach((card, k) => {
      const isTop = k === shown.length - 1;
      nodes.push(cardEl(card, colX(1) + k * cw * 0.32, 0, cw, ch, isTop ? { kind: 'waste' } : null, ', Abwurf'));
    });

    // Ablagen
    state.foundations.forEach((pile, f) => {
      const x = colX(3 + f);
      nodes.push(slotEl(x, 0, cw, ch, 'is-foundation', `Ablage ${f + 1}, leer`));
      const card = pile[pile.length - 1];
      if (card) nodes.push(cardEl(card, x, 0, cw, ch, { kind: 'foundation', index: f }, `, Ablage ${f + 1}`));
    });

    // Spalten
    const top0 = ch + gap * 2;
    const avail = H - top0;
    state.tableau.forEach((pile, t) => {
      const x = colX(t);
      nodes.push(slotEl(x, top0, cw, ch, 'is-empty', `Spalte ${t + 1}, leer`));
      let down = ch * 0.12;
      let up = ch * 0.3;
      const need = pile.reduce((a, c, k) => a + (k === pile.length - 1 ? ch : c.up ? up : down), 0);
      if (need > avail) {
        const f = (avail - ch) / (need - ch);
        down *= f;
        up *= f;
      }
      let y = top0;
      pile.forEach((card, k) => {
        nodes.push(cardEl(card, x, y, cw, ch, { kind: 'tableau', index: t, from: k }, `, Spalte ${t + 1}`));
        y += card.up ? up : down;
      });
    });

    table.replaceChildren(...nodes);
    undoButton.disabled = !history.length || isWon(state);
    finishButton.hidden = !canFinish(state);
  }

  function report(): void {
    if (isWon(state)) {
      ctx.report({ current: null, finished: { winner: 0 }, message: `Alle Karten abgelegt in ${elapsed()}.` });
      return;
    }
    ctx.report({
      current: 0,
      message: `${foundationCount(state)} von 52 abgelegt · ${elapsed()}`,
      hint: 'Tippe eine Karte an, sie springt an die passende Stelle.'
    });
  }

  function update(): void {
    if (isWon(state) && !endedAt) {
      endedAt = Date.now();
      window.clearInterval(tick);
    }
    render();
    report();
  }

  const tick = window.setInterval(() => report(), 1000);
  const resize = new ResizeObserver(() => render());
  resize.observe(table);
  update();

  return {
    element,
    destroy: () => {
      window.clearInterval(tick);
      window.clearInterval(finishing);
      resize.disconnect();
    }
  };
}
