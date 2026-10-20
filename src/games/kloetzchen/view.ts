import { h } from '../../core/dom';
import { load, save } from '../../core/storage';
import type { GameContext, GameInstance } from '../../core/types';
import {
  COLS, PREVIEW, ROWS, TYPES, cellsOf, dropY, hardDrop, move, rotate, shapeOf, startState, stepDown, type BlockState, type PieceType
} from './logic';

// Eigene Farbgebung, bewusst anders als beim bekannten Vorbild
const COLORS = ['', '#A78BFA', '#4C8DFF', '#FF9F1C', '#2EC4A6', '#FF5C8A', '#FFD23F', '#38BDF8'];
const colorOf = (t: PieceType): string => COLORS[TYPES.indexOf(t) + 1];

const ARROWS: Record<string, string> = {
  left: '<path d="M15 18l-6-6 6-6"/>',
  right: '<path d="M9 18l6-6-6-6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  drop: '<path d="M6 6l6 6 6-6"/><path d="M6 13l6 6 6-6"/>',
  rotate: '<path d="M20 12a8 8 0 1 1-2.6-5.9L20 8.5"/><path d="M20 3.5v5h-5"/>'
};
const arrow = (name: string): SVGSVGElement => {
  const tpl = document.createElement('template');
  tpl.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ARROWS[name]}</svg>`;
  return tpl.content.firstElementChild as SVGSVGElement;
};

export function createKloetzchen(_host: HTMLElement, ctx: GameContext): GameInstance {
  const level = ctx.level;
  const showGhost = level < 2;
  const bestKey = `kloetzchen:${level}`;
  let best = load<{ best: number }>(bestKey, { best: 0 }).best;
  const bestBefore = best;
  let state: BlockState = startState(level);
  let message: string | undefined;

  // Fallgeschwindigkeit: Aus heißt ohne Zeitdruck. Die Wahl gilt für alle Stufen und wird gemerkt.
  const TEMPI = [
    { key: 'aus', label: 'Aus', ms: 0 },
    { key: 'langsam', label: 'Langsam', ms: 1000 },
    { key: 'mittel', label: 'Mittel', ms: 550 }
  ];
  let tempo = load<{ tempo: string }>('kloetzchen:tempo', { tempo: 'aus' }).tempo;
  let paused = false;
  let fallTimer = 0;

  const cells = Array.from({ length: COLS * ROWS }, () => h('span', { class: 'kz-cell' }));
  const grid = h('div', { class: 'kz-grid', 'aria-hidden': 'true' }, ...cells);
  grid.addEventListener('click', () => act(() => rotate(state)));

  const previews = h('div', { class: 'kz-next' });
  const scoreEl = h('p', { class: 'kz-stat' });
  const linesEl = h('p', { class: 'kz-stat' });
  const bestEl = h('p', { class: 'kz-stat' });
  const status = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });

  const button = (label: string, content: Node | string, onclick: () => void, cls = ''): HTMLButtonElement =>
    h('button', { class: `kz-btn ${cls}`, type: 'button', 'aria-label': label, onclick }, content);
  const controls = h('div', { class: 'kz-controls' },
    button('Nach links', arrow('left'), () => act(() => move(state, -1))),
    button('Nach rechts', arrow('right'), () => act(() => move(state, 1))),
    button('Drehen', arrow('rotate'), () => act(() => rotate(state))),
    button('Eine Reihe tiefer', arrow('down'), () => down(false)),
    button('Ablegen', arrow('drop'), () => down(true), 'kz-btn--drop')
  );

  const tempoButtons = TEMPI.map((t) =>
    h('button', {
      class: 'kz-tempo__btn',
      type: 'button',
      onclick: () => {
        tempo = t.key;
        save('kloetzchen:tempo', { tempo });
        scheduleFall();
        update();
      }
    }, t.label)
  );
  const element = h('div', { class: 'kz' },
    h('div', { class: 'kz-main' },
      h('div', { class: 'kz-well' }, grid),
      h('div', { class: 'kz-side' },
        h('p', { class: 'kz-label' }, 'Als Nächstes'),
        previews,
        scoreEl,
        linesEl,
        bestEl,
        h('p', { class: 'kz-label' }, 'Tempo'),
        h('div', { class: 'kz-tempo', role: 'group', 'aria-label': 'Fallgeschwindigkeit' }, ...tempoButtons)
      )
    ),
    controls,
    status
  );

  function miniPiece(type: PieceType): HTMLElement {
    const shape = shapeOf(type);
    const mini = h('span', { class: 'kz-mini' });
    mini.style.setProperty('--n', String(shape.length));
    for (const row of shape) {
      for (const ch of row) {
        const c = h('span', { class: 'kz-mini__cell' });
        if (ch === 'X') c.style.background = colorOf(type);
        mini.append(c);
      }
    }
    return mini;
  }

  function render(): void {
    const ghost = new Set<number>();
    if (showGhost && !state.over) {
      const gy = dropY(state);
      for (const [x, y] of cellsOf({ ...state.piece, y: gy })) if (y >= 0) ghost.add(y * COLS + x);
    }
    const active = new Set<number>();
    if (!state.over) for (const [x, y] of cellsOf(state.piece)) if (y >= 0) active.add(y * COLS + x);
    cells.forEach((cell, i) => {
      const v = state.board[i];
      cell.className = 'kz-cell';
      cell.style.background = '';
      cell.style.borderColor = '';
      if (active.has(i)) {
        cell.classList.add('is-block');
        cell.style.background = colorOf(state.piece.type);
      } else if (v) {
        cell.classList.add('is-block');
        cell.style.background = COLORS[v];
      } else if (ghost.has(i)) {
        cell.classList.add('is-ghost');
        cell.style.borderColor = colorOf(state.piece.type);
      }
    });
    previews.replaceChildren(...state.queue.slice(0, PREVIEW[level]).map(miniPiece));
    scoreEl.textContent = `Punkte ${state.score}`;
    linesEl.textContent = `Reihen ${state.lines}`;
    bestEl.textContent = `Bestwert ${best}`;
    controls.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = state.over));
    tempoButtons.forEach((b, k) => b.setAttribute('aria-pressed', String(TEMPI[k].key === tempo)));
  }

  function report(): void {
    if (state.over) {
      const record = state.score > bestBefore;
      ctx.report({
        current: null,
        finished: { winner: 0, label: record ? 'Neuer Bestwert!' : 'Spielende' },
        message: `${state.score} Punkte, ${state.lines} Reihen.`
      });
      return;
    }
    const hint = tempoMs()
      ? 'Die Steine fallen von selbst. Schieben, drehen, ablegen.'
      : 'Schieben und drehen in Ruhe, dann ablegen. Tippen aufs Feld dreht auch.';
    ctx.report({ current: 0, message, hint });
  }

  function update(): void {
    if (state.score > best) {
      best = state.score;
      save(bestKey, { best });
    }
    render();
    report();
  }

  function act(fn: () => BlockState): void {
    if (state.over) return;
    state = fn();
    message = undefined;
    update();
  }

  function down(all: boolean): void {
    if (state.over) return;
    const r = all ? hardDrop(state) : stepDown(state);
    state = r.state;
    message = r.cleared ? (r.cleared === 4 ? 'Vier Reihen auf einmal!' : `${r.cleared} ${r.cleared === 1 ? 'Reihe' : 'Reihen'} weg.`) : undefined;
    status.textContent = message ?? '';
    update();
  }

  const tempoMs = (): number => TEMPI.find((t) => t.key === tempo)?.ms ?? 0;

  /** Lässt den Stein im gewählten Tempo fallen. Kommt er nicht weiter, wird er abgelegt. */
  function scheduleFall(): void {
    window.clearTimeout(fallTimer);
    const ms = tempoMs();
    if (!ms || state.over) return;
    fallTimer = window.setTimeout(() => {
      if (!paused && document.visibilityState === 'visible') down(false);
      scheduleFall();
    }, ms);
  }

  // Tastatur für Laptop und Desktop
  const onKey = (ev: KeyboardEvent): void => {
    const keys: Record<string, () => void> = {
      ArrowLeft: () => act(() => move(state, -1)),
      ArrowRight: () => act(() => move(state, 1)),
      ArrowUp: () => act(() => rotate(state)),
      ArrowDown: () => down(false),
      ' ': () => down(true)
    };
    const fn = keys[ev.key];
    if (!fn || (ev.target as HTMLElement | null)?.closest('input, textarea, .rules-overlay')) return;
    ev.preventDefault();
    fn();
  };
  window.addEventListener('keydown', onKey);

  update();
  scheduleFall();

  return {
    element,
    destroy: () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(fallTimer);
    },
    setPaused: (p) => {
      paused = p;
    }
  };
}
