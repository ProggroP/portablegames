import { h } from '../../core/dom';
import type { GameContext, GameInstance, PlayerIndex } from '../../core/types';
import {
  BAR, CHECKERS, OFF, applyStep, computerSequence, diceList, endTurn, legalSteps, pipCount, startState, winner,
  type BgState, type Step
} from './logic';

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

/** Spalten im Raster: 6 Punkte, Bar, 6 Punkte, Ablage. */
const TOP = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const BOTTOM = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
const column = (k: number): number => (k < 6 ? k + 1 : k + 2);

export function createBackgammon(_host: HTMLElement, ctx: GameContext): GameInstance {
  let state: BgState = startState(ctx.starter);
  let rolled: [number, number] | null = null;
  let dice: number[] = [];
  let selected: number | null = null;
  let message: string | undefined;
  let timer = 0;
  // Gegenüber werden Zahlen auf orangen Steinen für Orange richtig herum gedreht.
  const flipOrange = ctx.mode === 'gegenueber';
  const name = (p: PlayerIndex): string => ctx.players[p].name;

  const points = new Map<number, HTMLButtonElement>();
  const makePoint = (i: number, top: boolean, k: number): HTMLButtonElement => {
    const btn = h('button', {
      class: `bg-point ${top ? 'bg-point--top' : 'bg-point--bottom'} ${k % 2 ? 'bg-point--b' : 'bg-point--a'}`,
      type: 'button',
      onclick: () => tapPoint(i)
    });
    btn.style.gridColumn = String(column(k));
    btn.style.gridRow = top ? '1' : '3';
    points.set(i, btn);
    return btn;
  };
  const topPoints = TOP.map((i, k) => makePoint(i, true, k));
  const bottomPoints = BOTTOM.map((i, k) => makePoint(i, false, k));

  // Bar: oben Blau (setzt oben rechts ein), unten Orange (setzt unten rechts ein)
  const barHalves = [0, 1].map((p) =>
    h('button', { class: `bg-bar bg-bar--${p === 0 ? 'top' : 'bottom'}`, type: 'button', onclick: () => tapBar(p as PlayerIndex) })
  );
  // Ablage rechts: oben Orange, unten Blau, jeweils neben dem eigenen Heimfeld
  const trays = [0, 1].map((p) =>
    h('button', { class: `bg-tray bg-tray--${p === 0 ? 'bottom' : 'top'}`, type: 'button', onclick: () => tapTray() })
  );
  const diceButton = h('button', { class: 'bg-dice', type: 'button', onclick: () => tapDice() });

  const element = h('div', { class: 'bg', role: 'group', 'aria-label': 'Backgammon-Brett' },
    ...topPoints,
    ...bottomPoints,
    h('div', { class: 'bg-barcol' }, barHalves[0], barHalves[1]),
    h('div', { class: 'bg-traycol' }, trays[1], trays[0]),
    diceButton
  );

  const over = (): boolean => winner(state) !== null;
  const humanTurn = (): boolean => !over() && !ctx.players[state.turn].isComputer;
  const steps = (): Step[] => (rolled ? legalSteps(state, dice) : []);

  function checkerStack(p: PlayerIndex, n: number): HTMLElement[] {
    const shown = Math.min(n, CHECKERS);
    const out: HTMLElement[] = [];
    for (let k = 0; k < shown; k++) {
      const c = h('span', { class: `bg-checker bg-checker--p${p + 1}` });
      c.style.setProperty('--k', String(k));
      c.style.background = ctx.players[p].color;
      if (k === shown - 1 && n > 5) {
        c.append(h('span', { class: 'bg-count' + (flipOrange && p === 1 ? ' is-flipped' : '') }, n));
      }
      out.push(c);
    }
    return out;
  }

  function dieFace(value: number | null, used: boolean): HTMLElement {
    const face = h('span', { class: 'bg-die' + (used ? ' is-used' : '') + (value === null ? ' is-blank' : '') });
    for (let k = 0; k < 9; k++) {
      face.append(h('span', { class: 'bg-pip' + (value !== null && PIPS[value].includes(k) ? ' is-on' : '') }));
    }
    return face;
  }

  function render(): void {
    const legal = humanTurn() ? steps() : [];
    const sources = new Set(legal.map((s) => s.from));
    if (selected === null && sources.size === 1) selected = [...sources][0];
    const targets = new Set(legal.filter((s) => s.from === selected).map((s) => s.to));
    const turnColor = ctx.players[state.turn].color;

    for (const [i, btn] of points) {
      const n = Math.abs(state.points[i]);
      const p: PlayerIndex = state.points[i] > 0 ? 0 : 1;
      btn.replaceChildren(h('span', { class: 'bg-stack' }, ...(n ? checkerStack(p, n) : [])));
      btn.style.setProperty('--n', String(Math.max(1, Math.min(n, CHECKERS))));
      btn.style.setProperty('--pc', turnColor);
      btn.classList.toggle('is-source', sources.has(i) && selected !== i);
      btn.classList.toggle('is-selected', selected === i);
      btn.classList.toggle('is-target', targets.has(i));
      btn.disabled = !(sources.has(i) || targets.has(i));
      const what = n ? `${n} ${p === 0 ? name(0) : name(1)}` : 'leer';
      btn.setAttribute('aria-label', `Punkt ${i + 1}: ${what}${targets.has(i) ? ', Ziel' : ''}`);
    }

    barHalves.forEach((btn, p) => {
      const n = state.bar[p];
      btn.replaceChildren(h('span', { class: 'bg-stack' }, ...checkerStack(p as PlayerIndex, n)));
      btn.style.setProperty('--n', String(Math.max(1, n)));
      btn.style.setProperty('--pc', turnColor);
      const isSource = sources.has(BAR) && state.turn === p;
      btn.classList.toggle('is-source', isSource && selected !== BAR);
      btn.classList.toggle('is-selected', isSource && selected === BAR);
      btn.disabled = !isSource;
      btn.setAttribute('aria-label', `Bar ${name(p as PlayerIndex)}: ${n}`);
    });

    trays.forEach((btn, p) => {
      const n = state.off[p];
      const chips: HTMLElement[] = [];
      for (let k = 0; k < n; k++) {
        const chip = h('span', { class: 'bg-off' });
        chip.style.background = ctx.players[p].color;
        chips.push(chip);
      }
      btn.replaceChildren(...chips);
      btn.style.setProperty('--pc', turnColor);
      const isTarget = targets.has(OFF) && state.turn === p;
      btn.classList.toggle('is-target', isTarget);
      btn.disabled = !isTarget;
      btn.setAttribute('aria-label', `Abgetragen ${name(p as PlayerIndex)}: ${n}${isTarget ? ', Ziel' : ''}`);
    });

    diceButton.replaceChildren();
    diceButton.style.setProperty('--pc', turnColor);
    if (rolled) {
      const all = diceList(rolled[0], rolled[1]);
      const remaining = [...dice];
      const faces = all.map((v) => {
        const i = remaining.indexOf(v);
        if (i >= 0) remaining.splice(i, 1);
        return { v, used: i < 0 };
      });
      // Die noch offenen Würfel zuerst zeigen
      faces.sort((a, b) => Number(a.used) - Number(b.used));
      for (const f of faces) diceButton.append(dieFace(f.v, f.used));
      diceButton.disabled = true;
      diceButton.classList.remove('is-ready');
      diceButton.setAttribute('aria-label', `Gewürfelt: ${rolled[0]} und ${rolled[1]}`);
    } else {
      diceButton.append(dieFace(null, false), dieFace(null, false));
      const ready = humanTurn();
      diceButton.disabled = !ready;
      diceButton.classList.toggle('is-ready', ready);
      diceButton.setAttribute('aria-label', 'Würfeln');
    }
  }

  function report(): void {
    const scores = state.off;
    const w = winner(state);
    if (w !== null) {
      ctx.report({ current: null, scores, finished: { winner: w }, message: `${name(w)} hat alle Steine abgetragen.` });
      return;
    }
    let hint: string;
    if (!rolled) hint = 'Tippe auf die Würfel.';
    else if (state.bar[state.turn] > 0) hint = 'Setze zuerst den Stein von der Bar ein.';
    else if (selected !== null) hint = 'Tippe auf ein Ziel.';
    else hint = 'Wähle einen Stein.';
    const pips = `Augen bis zum Ziel: ${name(0)} ${pipCount(state, 0)}, ${name(1)} ${pipCount(state, 1)}.`;
    ctx.report({ current: state.turn, scores: [scores[0], scores[1]], message: message ?? (ctx.mode === 'gegenueber' ? undefined : pips), hint });
  }

  function update(): void {
    render();
    report();
  }

  function roll(): void {
    const a = 1 + Math.floor(Math.random() * 6);
    const b = 1 + Math.floor(Math.random() * 6);
    rolled = [a, b];
    dice = diceList(a, b);
    selected = null;
    message = undefined;
    if (!legalSteps(state, dice).length) {
      message = `${name(state.turn)} kann nicht ziehen.`;
      update();
      timer = window.setTimeout(nextTurn, 1600);
      return;
    }
    update();
  }

  function doStep(step: Step): void {
    state = applyStep(state, step);
    dice.splice(dice.indexOf(step.die), 1);
    selected = null;
    message = step.hit ? `${name(state.turn)} schlägt einen Stein.` : undefined;
    if (over()) {
      update();
      return;
    }
    update();
    if (!legalSteps(state, dice).length) timer = window.setTimeout(nextTurn, 700);
  }

  function nextTurn(): void {
    state = endTurn(state);
    rolled = null;
    dice = [];
    selected = null;
    message = undefined;
    update();
    scheduleComputer();
  }

  /** Bei gleichem Ziel mit verschiedenen Würfeln (Abtragen) den kleineren nehmen. */
  function stepTo(from: number, to: number): Step | undefined {
    return steps()
      .filter((s) => s.from === from && s.to === to)
      .sort((a, b) => a.die - b.die)[0];
  }

  function tapPoint(i: number): void {
    if (!humanTurn() || !rolled) return;
    const legal = steps();
    if (selected !== null) {
      const step = stepTo(selected, i);
      if (step) {
        doStep(step);
        return;
      }
    }
    if (legal.some((s) => s.from === i)) {
      selected = selected === i ? null : i;
      update();
    }
  }

  function tapBar(p: PlayerIndex): void {
    if (!humanTurn() || !rolled || state.turn !== p) return;
    if (steps().some((s) => s.from === BAR)) {
      selected = BAR;
      update();
    }
  }

  function tapTray(): void {
    if (!humanTurn() || selected === null) return;
    const step = stepTo(selected, OFF);
    if (step) doStep(step);
  }

  function tapDice(): void {
    if (humanTurn() && !rolled) roll();
  }

  function scheduleComputer(): void {
    if (over() || !ctx.players[state.turn].isComputer) return;
    timer = window.setTimeout(() => {
      roll();
      if (!rolled || !legalSteps(state, dice).length) return;
      const seq = computerSequence(state, dice, ctx.level);
      const playNext = (k: number): void => {
        if (k >= seq.length || over()) return;
        timer = window.setTimeout(() => {
          state = applyStep(state, seq[k]);
          dice.splice(dice.indexOf(seq[k].die), 1);
          message = seq[k].hit ? `${name(state.turn)} schlägt einen Stein.` : message;
          update();
          if (k === seq.length - 1 && !over()) timer = window.setTimeout(nextTurn, 800);
          else playNext(k + 1);
        }, 550);
      };
      playNext(0);
    }, 700);
  }

  update();
  scheduleComputer();

  return { element, destroy: () => window.clearTimeout(timer) };
}
