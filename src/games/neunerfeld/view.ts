import { formatTime } from '../../core/clock';
import { h } from '../../core/dom';
import type { GameContext, GameInstance } from '../../core/types';
import { boxOf, colOf, conflicts, isSolved, makePuzzle, rowOf, type Grid } from './logic';

export function createNeunerfeld(_host: HTMLElement, ctx: GameContext): GameInstance {
  const { puzzle } = makePuzzle(ctx.level);
  const values: Grid = puzzle.slice();
  /** Notizen je Feld als Bitmaske der Ziffern 1 bis 9 */
  const notes: number[] = new Array(81).fill(0);
  let selected = puzzle.findIndex((v) => v === 0);
  let noteMode = false;
  const startedAt = Date.now();
  let endedAt = 0;

  const cells = values.map((_, i) => {
    const cls = ['nf-cell'];
    if (colOf(i) % 3 === 2 && colOf(i) < 8) cls.push('nf-right');
    if (rowOf(i) % 3 === 2 && rowOf(i) < 8) cls.push('nf-bottom');
    return h('button', { class: cls.join(' '), type: 'button', onclick: () => select(i) });
  });
  const grid = h('div', { class: 'nf-grid', role: 'group', 'aria-label': 'Zahlenrätsel' }, ...cells);

  const digitButtons = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) =>
    h('button', { class: 'nf-digit', type: 'button', onclick: () => enter(d) }, String(d))
  );
  const noteButton = h('button', { class: 'btn nf-tool', type: 'button', onclick: () => { noteMode = !noteMode; update(); } }, 'Notizen');
  const clearButton = h('button', { class: 'btn nf-tool', type: 'button', onclick: () => clear() }, 'Löschen');

  const element = h('div', { class: 'nf' },
    h('div', { class: 'nf-gridwrap' }, grid),
    h('div', { class: 'nf-pad', role: 'group', 'aria-label': 'Zahlen' }, ...digitButtons),
    h('div', { class: 'nf-tools' }, noteButton, clearButton)
  );

  const solved = (): boolean => isSolved(values);
  const elapsed = (): string => formatTime((endedAt || Date.now()) - startedAt);

  function render(): void {
    const bad = conflicts(values);
    const sel = selected;
    const selValue = sel >= 0 ? values[sel] : 0;
    cells.forEach((cell, i) => {
      const v = values[i];
      const given = puzzle[i] !== 0;
      cell.classList.toggle('is-given', given);
      cell.classList.toggle('is-selected', i === sel);
      cell.classList.toggle('is-related', sel >= 0 && i !== sel && (rowOf(i) === rowOf(sel) || colOf(i) === colOf(sel) || boxOf(i) === boxOf(sel)));
      cell.classList.toggle('is-same', selValue > 0 && v === selValue && i !== sel);
      cell.classList.toggle('is-conflict', bad.has(i) && !given);
      cell.replaceChildren();
      if (v) {
        cell.textContent = String(v);
      } else if (notes[i]) {
        const mini = h('span', { class: 'nf-notes', 'aria-hidden': 'true' });
        for (let d = 1; d <= 9; d++) mini.append(h('span', {}, notes[i] & (1 << d) ? String(d) : ''));
        cell.append(mini);
      }
      cell.disabled = solved();
      const noteText = !v && notes[i] ? `, Notizen ${[1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => notes[i] & (1 << d)).join(' ')}` : '';
      cell.setAttribute('aria-label', `Reihe ${rowOf(i) + 1}, Spalte ${colOf(i) + 1}: ${v || 'leer'}${given ? ', vorgegeben' : ''}${noteText}`);
    });
    const counts = new Array(10).fill(0);
    for (const v of values) counts[v]++;
    digitButtons.forEach((b, k) => {
      const d = k + 1;
      b.disabled = solved() || counts[d] >= 9 || sel < 0 || puzzle[sel] !== 0;
      b.classList.toggle('is-note', noteMode);
    });
    noteButton.setAttribute('aria-pressed', String(noteMode));
    noteButton.classList.toggle('is-on', noteMode);
    clearButton.disabled = solved() || sel < 0 || puzzle[sel] !== 0 || (!values[sel] && !notes[sel]);
    noteButton.disabled = solved();
  }

  function report(): void {
    if (solved()) {
      ctx.report({ current: null, finished: { winner: 0 }, message: `Gelöst in ${elapsed()}.` });
      return;
    }
    const empty = values.filter((v) => !v).length;
    const hint = noteMode ? 'Notizen an: Zahlen werden klein vorgemerkt.' : 'Wähle ein Feld und dann eine Zahl.';
    ctx.report({ current: 0, message: `Noch ${empty} Felder · ${elapsed()}`, hint });
  }

  function update(): void {
    if (solved() && !endedAt) {
      endedAt = Date.now();
      window.clearInterval(tick);
    }
    render();
    report();
  }

  function select(i: number): void {
    selected = i;
    update();
  }

  function enter(d: number): void {
    if (selected < 0 || puzzle[selected] !== 0) return;
    if (noteMode) {
      if (!values[selected]) notes[selected] ^= 1 << d;
    } else {
      values[selected] = values[selected] === d ? 0 : d;
      // Gesetzte Zahl aus den Notizen der Nachbarn streichen
      if (values[selected]) {
        for (let j = 0; j < 81; j++) {
          if (j !== selected && (rowOf(j) === rowOf(selected) || colOf(j) === colOf(selected) || boxOf(j) === boxOf(selected))) {
            notes[j] &= ~(1 << d);
          }
        }
      }
    }
    update();
  }

  function clear(): void {
    if (selected < 0 || puzzle[selected] !== 0) return;
    values[selected] = 0;
    notes[selected] = 0;
    update();
  }

  const tick = window.setInterval(() => report(), 1000);
  update();

  return { element, destroy: () => window.clearInterval(tick) };
}
