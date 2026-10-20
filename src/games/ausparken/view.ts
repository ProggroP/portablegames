import { h } from '../../core/dom';
import { clientToLocal } from '../../core/stage';
import { load, save } from '../../core/storage';
import type { GameContext, GameInstance } from '../../core/types';
import { EXIT_ROW, SIZE, TARGET, apply, isSolved, parse, range, type ParkMove, type Vehicle } from './logic';
import { PUZZLES } from './puzzles';

// Das eigene Auto trägt die Farbe von Spieler 1, die anderen bewusst kein Blau
const COLORS = ['#FF9F1C', '#2EC4A6', '#FF5C8A', '#FFD23F', '#A78BFA', '#84CC16', '#F97316', '#E879F9', '#94A3B8', '#14B8A6', '#FB7185', '#FACC15'];

const PATHS: Record<string, string> = {
  left: '<path d="M15 18l-6-6 6-6"/>',
  right: '<path d="M9 18l6-6-6-6"/>',
  up: '<path d="M18 15l-6-6-6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>'
};
const svg = (name: string, size = 26): SVGSVGElement => {
  const tpl = document.createElement('template');
  tpl.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`;
  return tpl.content.firstElementChild as SVGSVGElement;
};

export function createAusparken(_host: HTMLElement, ctx: GameContext): GameInstance {
  const level = ctx.level;
  const list = PUZZLES[level];
  const progressKey = `ausparken:${level}`;
  const progress = load<{ next: number }>(progressKey, { next: 0 });
  let index = progress.next % list.length;

  let vehicles: Vehicle[] = [];
  let history: ParkMove[] = [];
  let selected = TARGET;
  let done = false;
  const pieces = new Map<string, HTMLButtonElement>();

  const lot = h('div', { class: 'ap-lot', role: 'group', 'aria-label': 'Parkplatz' });
  const exit = h('div', { class: 'ap-exit', 'aria-hidden': 'true' }, svg('right', 18));
  exit.style.setProperty('--r', String(EXIT_ROW));
  const status = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });

  const backButton = h('button', { class: 'ap-btn', type: 'button', onclick: () => step(-1) });
  const fwdButton = h('button', { class: 'ap-btn', type: 'button', onclick: () => step(1) });
  const undoButton = h('button', { class: 'btn ap-tool', type: 'button', onclick: () => undo() }, 'Rückgängig');
  const skipButton = h('button', { class: 'btn ap-tool', type: 'button', onclick: () => skip() }, 'Überspringen');

  const element = h('div', { class: 'ap' },
    h('div', { class: 'ap-wrap' }, h('div', { class: 'ap-frame' }, lot, exit)),
    h('div', { class: 'ap-controls' }, backButton, fwdButton, undoButton, skipButton),
    status
  );

  function startPuzzle(i: number): void {
    index = i;
    vehicles = parse(list[index].p);
    history = [];
    selected = TARGET;
    done = false;
    pieces.clear();
    let colorIndex = 0;
    lot.replaceChildren(...vehicles.map((v) => {
      const piece = h('button', { class: 'ap-car', type: 'button' });
      piece.classList.toggle('is-target', v.id === TARGET);
      piece.classList.toggle('is-truck', v.len === 3);
      piece.classList.toggle('is-vertical', !v.horizontal);
      if (v.id !== TARGET) piece.style.setProperty('--car', COLORS[colorIndex++ % COLORS.length]);
      piece.style.setProperty('--len', String(v.len));
      piece.addEventListener('pointerdown', (ev) => startDrag(ev, v.id));
      piece.addEventListener('click', () => select(v.id));
      pieces.set(v.id, piece);
      return piece;
    }));
    update();
  }

  const moves = (n: number): string => `${n} ${n === 1 ? 'Zug' : 'Züge'}`;
  const vehicle = (id: string): Vehicle => vehicles.find((v) => v.id === id)!;
  const describe = (v: Vehicle): string =>
    `${v.id === TARGET ? 'Dein Auto' : v.len === 3 ? 'Laster' : 'Auto'}, ${v.horizontal ? 'waagerecht' : 'senkrecht'}, Reihe ${v.row + 1}, Spalte ${v.col + 1}`;

  function render(): void {
    for (const v of vehicles) {
      const piece = pieces.get(v.id)!;
      piece.style.setProperty('--r', String(v.row));
      piece.style.setProperty('--c', String(v.col));
      piece.style.transform = '';
      piece.classList.toggle('is-selected', v.id === selected && !done);
      piece.classList.toggle('is-out', done && v.id === TARGET);
      piece.disabled = done;
      piece.setAttribute('aria-label', describe(v));
      piece.setAttribute('aria-pressed', String(v.id === selected));
    }
    const sel = vehicle(selected);
    const [lo, hi] = range(vehicles, selected);
    backButton.replaceChildren(svg(sel.horizontal ? 'left' : 'up'));
    fwdButton.replaceChildren(svg(sel.horizontal ? 'right' : 'down'));
    backButton.setAttribute('aria-label', sel.horizontal ? 'Nach links' : 'Nach oben');
    fwdButton.setAttribute('aria-label', sel.horizontal ? 'Nach rechts' : 'Nach unten');
    backButton.disabled = done || lo === 0;
    fwdButton.disabled = done || hi === 0;
    undoButton.disabled = done || history.length === 0;
    skipButton.disabled = done;
  }

  function report(): void {
    const best = list[index].n;
    const title = `Rätsel ${index + 1} von ${list.length}`;
    if (done) {
      const perfect = history.length <= best;
      ctx.report({
        current: null,
        finished: { winner: 0, label: perfect ? 'Perfekt gelöst!' : 'Ausgeparkt!' },
        message: `${title} in ${history.length} ${history.length === 1 ? 'Zug' : 'Zügen'}.${perfect ? '' : ` Es geht in ${best}.`}`
      });
      return;
    }
    const hint = 'Schieb die Fahrzeuge, bis dein blaues Auto rechts aus der Lücke fahren kann.';
    ctx.report({ current: 0, message: `${title} · ${moves(history.length)} · Bestlösung ${best}`, hint });
  }

  function update(): void {
    if (!done && isSolved(vehicles)) {
      done = true;
      progress.next = (index + 1) % list.length;
      save(progressKey, progress);
      status.textContent = 'Ausgeparkt!';
    }
    render();
    report();
  }

  function select(id: string): void {
    if (done) return;
    selected = id;
    update();
  }

  /** Verschiebt ein Fahrzeug. Folgt ein Zug desselben Fahrzeugs direkt aufeinander, zählt er als einer. */
  function moveBy(id: string, delta: number): void {
    if (done || !delta) return;
    vehicles = apply(vehicles, { id, delta });
    const last = history[history.length - 1];
    if (last && last.id === id) {
      last.delta += delta;
      if (!last.delta) history.pop();
    } else {
      history.push({ id, delta });
    }
    update();
  }

  function step(dir: 1 | -1): void {
    const [lo, hi] = range(vehicles, selected);
    if ((dir < 0 && lo < 0) || (dir > 0 && hi > 0)) moveBy(selected, dir);
  }

  function undo(): void {
    const last = history.pop();
    if (!last || done) return;
    vehicles = apply(vehicles, { id: last.id, delta: -last.delta });
    selected = last.id;
    update();
  }

  function skip(): void {
    progress.next = (index + 1) % list.length;
    save(progressKey, progress);
    startPuzzle(progress.next);
  }

  // Ziehen mit dem Finger, auch bei gedrehter Bühne
  let drag: { id: string; pointer: number; start: number; lo: number; hi: number; cell: number; moved: boolean } | null = null;
  const axis = (v: Vehicle, ev: PointerEvent): number => {
    const p = clientToLocal(lot, ev.clientX, ev.clientY);
    return v.horizontal ? p.x : p.y;
  };

  function startDrag(ev: PointerEvent, id: string): void {
    if (done || drag) return;
    const v = vehicle(id);
    const [lo, hi] = range(vehicles, id);
    drag = { id, pointer: ev.pointerId, start: axis(v, ev), lo, hi, cell: lot.offsetWidth / SIZE, moved: false };
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    if (selected !== id) select(id);
  }

  function offset(ev: PointerEvent): number {
    const d = drag!;
    const px = axis(vehicle(d.id), ev) - d.start;
    return Math.max(d.lo * d.cell, Math.min(d.hi * d.cell, px));
  }

  lot.addEventListener('pointermove', (ev) => {
    if (!drag || ev.pointerId !== drag.pointer) return;
    const px = offset(ev);
    if (Math.abs(px) > 4) drag.moved = true;
    const v = vehicle(drag.id);
    pieces.get(drag.id)!.style.transform = v.horizontal ? `translateX(${px}px)` : `translateY(${px}px)`;
  });
  const endDrag = (ev: PointerEvent): void => {
    if (!drag || ev.pointerId !== drag.pointer) return;
    const d = drag;
    const cells = ev.type === 'pointercancel' ? 0 : Math.round(offset(ev) / d.cell);
    drag = null;
    if (cells) moveBy(d.id, cells);
    else render();
  };
  lot.addEventListener('pointerup', endDrag);
  lot.addEventListener('pointercancel', endDrag);

  // Tastatur: Pfeiltasten schieben das gewählte Fahrzeug
  const onKey = (ev: KeyboardEvent): void => {
    if ((ev.target as HTMLElement | null)?.closest('input, textarea, .rules-overlay')) return;
    const v = vehicle(selected);
    const dir = v.horizontal
      ? { ArrowLeft: -1, ArrowRight: 1 }[ev.key]
      : { ArrowUp: -1, ArrowDown: 1 }[ev.key];
    if (!dir) return;
    ev.preventDefault();
    step(dir as 1 | -1);
  };
  window.addEventListener('keydown', onKey);

  startPuzzle(index);

  return { element, destroy: () => window.removeEventListener('keydown', onKey) };
}
