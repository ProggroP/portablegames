import { h } from '../../core/dom';
import type { GameContext, GameInstance, PlayerIndex } from '../../core/types';
import {
  CATEGORIES, ROLLS_PER_TURN, UPPER_BONUS, UPPER_BONUS_AT, choose, computerCategory, computerHolds, isOver, roll,
  scoreFor, scores, startState, toggleHold, totals, type FwState
} from './logic';

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};
const UPPER = CATEGORIES.map((_, i) => i).filter((i) => CATEGORIES[i].face);
const LOWER = CATEGORIES.map((_, i) => i).filter((i) => !CATEGORIES[i].face);

export function createFuenfWuerfel(_host: HTMLElement, ctx: GameContext): GameInstance {
  let state: FwState = startState(ctx.starter);
  let message: string | undefined;
  let timer = 0;
  let busy = false;
  const name = (p: PlayerIndex): string => ctx.players[p].name;

  const dice = [0, 1, 2, 3, 4].map((i) => h('button', { class: 'fw-die', type: 'button', onclick: () => tapDie(i) }));
  const rollButton = h('button', { class: 'btn btn--primary fw-roll', type: 'button', onclick: () => tapRoll() });
  const rows = CATEGORIES.map((c, i) =>
    h('button', { class: 'fw-row', type: 'button', onclick: () => tapRow(i) },
      h('span', { class: 'fw-row__name' }, c.name),
      h('span', { class: 'fw-row__value' })
    )
  );
  const bonusRow = h('div', { class: 'fw-row fw-row--info' }, h('span', { class: 'fw-row__name' }, 'Bonus'), h('span', { class: 'fw-row__value' }));
  const sumRow = h('div', { class: 'fw-row fw-row--info fw-row--sum' }, h('span', { class: 'fw-row__name' }, 'Gesamt'), h('span', { class: 'fw-row__value' }));
  // Nur gegenüber nötig: Dort sind die Spieleranzeigen schmal und zeigen nicht, wer dran ist.
  const owner = h('p', { class: 'fw-owner', hidden: ctx.mode !== 'gegenueber' });

  const inner = h('div', { class: 'fw__inner' },
    owner,
    h('div', { class: 'fw-dice', role: 'group', 'aria-label': 'Würfel, antippen zum Halten' }, ...dice),
    rollButton,
    h('div', { class: 'fw-sheet' },
      h('div', { class: 'fw-col' }, ...UPPER.map((i) => rows[i]), bonusRow),
      h('div', { class: 'fw-col' }, ...LOWER.map((i) => rows[i]), sumRow)
    )
  );
  const element = h('div', { class: 'fw' }, inner);

  const humanTurn = (): boolean => !isOver(state) && !ctx.players[state.turn].isComputer && !busy;

  function dieFace(el: HTMLElement, value: number | null): void {
    el.replaceChildren();
    for (let k = 0; k < 9; k++) {
      el.append(h('span', { class: 'fw-pip' + (value !== null && PIPS[value].includes(k) ? ' is-on' : '') }));
    }
  }

  function render(): void {
    const p = state.turn;
    const sheet = state.sheets[p];
    const rolled = state.rollsLeft < ROLLS_PER_TURN;
    const canPlay = humanTurn();
    // Gegenüber dreht sich der Block zu dem, der gerade dran ist.
    inner.classList.toggle('is-flipped', ctx.mode === 'gegenueber' && p === 1);
    element.style.setProperty('--pc', ctx.players[p].color);
    owner.textContent = `Block von ${name(p)}`;

    dice.forEach((btn, i) => {
      dieFace(btn, rolled ? state.dice[i] : null);
      btn.classList.toggle('is-blank', !rolled);
      btn.classList.toggle('is-held', rolled && state.held[i]);
      btn.disabled = !canPlay || !rolled || state.rollsLeft === 0;
      btn.setAttribute('aria-pressed', String(rolled && state.held[i]));
      btn.setAttribute('aria-label', rolled ? `Würfel ${i + 1}: ${state.dice[i]}${state.held[i] ? ', gehalten' : ''}` : `Würfel ${i + 1}`);
    });

    rollButton.disabled = !canPlay || state.rollsLeft === 0;
    rollButton.textContent =
      state.rollsLeft === ROLLS_PER_TURN ? 'Würfeln' : state.rollsLeft > 0 ? `Nochmal würfeln (${state.rollsLeft})` : 'Trag dein Ergebnis ein';

    rows.forEach((row, i) => {
      const filled = sheet[i];
      const value = row.querySelector('.fw-row__value') as HTMLElement;
      const potential = rolled && filled === null ? scoreFor(state.dice, i) : null;
      value.textContent = filled !== null ? String(filled) : potential !== null ? String(potential) : '';
      row.classList.toggle('is-filled', filled !== null);
      row.classList.toggle('is-option', potential !== null);
      row.classList.toggle('is-zero', potential === 0);
      row.disabled = !canPlay || !rolled || filled !== null;
      row.setAttribute(
        'aria-label',
        `${CATEGORIES[i].name}: ${filled !== null ? `eingetragen ${filled}` : potential !== null ? `${potential} Punkte möglich` : 'frei'}`
      );
    });

    const t = totals(sheet);
    (bonusRow.querySelector('.fw-row__value') as HTMLElement).textContent = t.bonus ? String(UPPER_BONUS) : `${t.upper}/${UPPER_BONUS_AT}`;
    (sumRow.querySelector('.fw-row__value') as HTMLElement).textContent = String(t.total);
  }

  function report(): void {
    const sc = scores(state);
    if (isOver(state)) {
      const winner = sc[0] > sc[1] ? 0 : sc[1] > sc[0] ? 1 : null;
      ctx.report({ current: null, scores: sc, finished: { winner }, message: 'Alle Zeilen sind ausgefüllt.' });
      return;
    }
    const hint =
      state.rollsLeft === ROLLS_PER_TURN
        ? 'Tippe auf „Würfeln“.'
        : state.rollsLeft > 0
          ? 'Tippe Würfel an, um sie zu halten. Dann würfle nochmal oder trag ein.'
          : 'Wähle eine Zeile zum Eintragen.';
    ctx.report({ current: state.turn, scores: sc, message, hint });
  }

  function update(): void {
    render();
    report();
  }

  function doChoose(cat: number): void {
    const p = state.turn;
    const pts = scoreFor(state.dice, cat);
    state = choose(state, cat);
    message = `${name(p)} trägt ${pts} ${pts === 1 ? 'Punkt' : 'Punkte'} bei „${CATEGORIES[cat].name}“ ein.`;
    update();
    scheduleComputer();
  }

  function tapDie(i: number): void {
    if (!humanTurn()) return;
    state = toggleHold(state, i);
    update();
  }

  function tapRoll(): void {
    if (!humanTurn() || state.rollsLeft === 0) return;
    state = roll(state);
    message = undefined;
    update();
  }

  function tapRow(cat: number): void {
    if (!humanTurn() || state.rollsLeft === ROLLS_PER_TURN || state.sheets[state.turn][cat] !== null) return;
    doChoose(cat);
  }

  function scheduleComputer(): void {
    if (isOver(state) || !ctx.players[state.turn].isComputer) return;
    busy = true;
    const stepRoll = (): void => {
      state = roll(state);
      message = undefined;
      update();
      timer = window.setTimeout(decide, 900);
    };
    const decide = (): void => {
      const holds = state.rollsLeft > 0 ? computerHolds(state, ctx.level) : null;
      if (holds) {
        state = { ...state, held: holds };
        update();
        timer = window.setTimeout(stepRoll, 700);
        return;
      }
      const cat = computerCategory(state, ctx.level);
      rows[cat].classList.add('is-picked');
      timer = window.setTimeout(() => {
        rows[cat].classList.remove('is-picked');
        busy = false;
        doChoose(cat);
      }, 800);
    };
    timer = window.setTimeout(stepRoll, 700);
  }

  update();
  scheduleComputer();

  return { element, destroy: () => window.clearTimeout(timer) };
}
