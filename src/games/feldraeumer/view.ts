import { formatTime } from '../../core/clock';
import { h } from '../../core/dom';
import type { GameContext, GameInstance } from '../../core/types';
import { SIZES, chord, countAround, isOver, minesLeft, reveal, startState, toggleFlag, type FieldState } from './logic';

const LONG_PRESS_MS = 450;
const NUMBER_COLORS = ['', '#8FB4FF', '#4ADE80', '#F87171', '#C4B5FD', '#FDBA74', '#5EEAD4', '#F9A8D4', '#E4E5EA'];
const FLAG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 21V3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 4l11 4.5L8 13z" fill="currentColor"/></svg>';
const MINE =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6" fill="currentColor"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

export function createFeldraeumer(_host: HTMLElement, ctx: GameContext): GameInstance {
  const size = SIZES[ctx.level];
  let state: FieldState = startState(size);
  let flagMode = false;
  let startedAt = 0;
  let endedAt = 0;
  let tick = 0;
  let pressTimer = 0;
  /** Nach einem langen Druck darf der folgende Klick nichts mehr auslösen. */
  let suppressClick = -1;

  const cells = state.revealed.map((_, i) => {
    const btn = h('button', { class: 'fd-cell', type: 'button', onclick: () => tap(i) });
    btn.addEventListener('pointerdown', () => {
      window.clearTimeout(pressTimer);
      pressTimer = window.setTimeout(() => {
        suppressClick = i;
        state = toggleFlag(state, i);
        if ('vibrate' in navigator) navigator.vibrate?.(25);
        update();
      }, LONG_PRESS_MS);
    });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, () => window.clearTimeout(pressTimer));
    return btn;
  });
  const grid = h('div', { class: 'fd-grid', role: 'group', 'aria-label': 'Minenfeld' }, ...cells);
  grid.style.setProperty('--cols', String(size.cols));
  grid.style.setProperty('--rows', String(size.rows));
  grid.addEventListener('contextmenu', (e) => e.preventDefault());

  const modeButtons = [false, true].map((flag) =>
    h('button', {
      class: 'seg__btn',
      type: 'button',
      onclick: () => {
        flagMode = flag;
        update();
      }
    }, flag ? 'Markieren' : 'Aufdecken')
  );
  const element = h('div', { class: 'fd' },
    h('div', { class: 'seg fd-mode', role: 'group', 'aria-label': 'Tippen bedeutet' }, ...modeButtons),
    h('div', { class: 'fd-gridwrap' }, grid)
  );

  const elapsed = (): string => formatTime((endedAt || Date.now()) - (startedAt || Date.now()));

  function render(): void {
    const over = isOver(state);
    modeButtons.forEach((b, k) => b.setAttribute('aria-pressed', String(flagMode === (k === 1))));
    state.revealed.forEach((open, i) => {
      const cell = cells[i];
      const mine = state.mines?.[i] ?? false;
      const flagged = state.flagged[i];
      cell.className = 'fd-cell';
      cell.innerHTML = '';
      let label: string;
      if (open) {
        cell.classList.add('is-open');
        const n = countAround(state, i);
        if (n) {
          cell.textContent = String(n);
          cell.style.color = NUMBER_COLORS[n];
        }
        label = n ? `${n} Minen daneben` : 'leer';
      } else if (over && mine && !flagged) {
        cell.classList.add('is-open', 'is-mine');
        if (i === state.exploded) cell.classList.add('is-exploded');
        cell.innerHTML = MINE;
        label = 'Mine';
      } else if (flagged) {
        cell.classList.add('is-flag');
        if (over && !mine) cell.classList.add('is-wrong');
        cell.innerHTML = FLAG;
        label = 'markiert';
      } else {
        label = 'verdeckt';
      }
      cell.disabled = over || (open && countAround(state, i) === 0);
      const r = Math.floor(i / size.cols) + 1;
      const c = (i % size.cols) + 1;
      cell.setAttribute('aria-label', `Reihe ${r}, Spalte ${c}: ${label}`);
    });
  }

  function report(): void {
    if (state.won) {
      ctx.report({ current: null, finished: { winner: 0 }, message: `Alle Minen gefunden in ${elapsed()}.` });
    } else if (state.exploded >= 0) {
      ctx.report({ current: null, finished: { winner: 1 }, message: 'Auf eine Mine getippt.' });
    } else {
      const hint = flagMode ? 'Tippe auf ein Feld, um es zu markieren.' : 'Tippe zum Aufdecken, halte gedrückt zum Markieren.';
      ctx.report({ current: 0, message: `${minesLeft(state)} Minen übrig · ${elapsed()}`, hint });
    }
  }

  function update(): void {
    if (isOver(state) && !endedAt) {
      endedAt = Date.now();
      window.clearInterval(tick);
    }
    render();
    report();
  }

  function tap(i: number): void {
    if (suppressClick === i) {
      suppressClick = -1;
      return;
    }
    if (isOver(state)) return;
    if (flagMode && !state.revealed[i]) {
      state = toggleFlag(state, i);
    } else if (state.revealed[i]) {
      state = chord(state, i);
    } else {
      if (!startedAt) {
        startedAt = Date.now();
        tick = window.setInterval(() => report(), 1000);
      }
      state = reveal(state, i);
    }
    update();
  }

  update();

  return {
    element,
    destroy: () => {
      window.clearInterval(tick);
      window.clearTimeout(pressTimer);
    }
  };
}
