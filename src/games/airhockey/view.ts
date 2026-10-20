import { h } from '../../core/dom';
import { clientToLocal } from '../../core/stage';
import type { GameContext, GameInstance, PlayerIndex } from '../../core/types';
import {
  AI_SPEED, GOAL_WIDTH, LENGTH, PADDLE_R, PUCK_R, WIN_SCORE, computerTarget, halfOf, homePosition, startState, step,
  winnerOf, type HockeyState, type Vec
} from './logic';

const GOAL_PAUSE_MS = 1100;

export function createAirHockey(_host: HTMLElement, ctx: GameContext): GameInstance {
  let state: HockeyState = startState(ctx.starter);
  const targets: [Vec, Vec] = [homePosition(0), homePosition(1)];
  /** Welcher Finger welchen Schläger führt */
  const pointers = new Map<number, PlayerIndex>();
  let pausedUntil = performance.now() + 600;
  let message: string | undefined = `Erster mit ${WIN_SCORE} Toren gewinnt.`;
  let frame = 0;
  let last = 0;
  let over = false;

  const canvas = h('canvas', { class: 'ah-canvas', 'aria-hidden': 'true' });
  const element = h('div', { class: 'ah', role: 'application', 'aria-label': 'Air-Hockey-Spielfeld. Schläger mit dem Finger in der eigenen Hälfte führen.' }, canvas);
  const g = canvas.getContext('2d')!;

  /** Liegt das Feld quer, ist es um 90 Grad im Uhrzeigersinn gedreht: Blau links, Orange rechts. */
  let view = { horizontal: false, scale: 1, ox: 0, oy: 0 };

  function layoutCanvas(): void {
    const w = element.clientWidth;
    const hgt = element.clientHeight;
    if (!w || !hgt) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(hgt * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${hgt}px`;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const horizontal = w > hgt;
    const rinkW = horizontal ? LENGTH : 1;
    const rinkH = horizontal ? 1 : LENGTH;
    const scale = Math.min(w / rinkW, hgt / rinkH);
    view = { horizontal, scale, ox: (w - rinkW * scale) / 2, oy: (hgt - rinkH * scale) / 2 };
  }

  const toScreen = (v: Vec): Vec =>
    view.horizontal
      ? { x: view.ox + (LENGTH - v.y) * view.scale, y: view.oy + v.x * view.scale }
      : { x: view.ox + v.x * view.scale, y: view.oy + v.y * view.scale };

  const toRink = (x: number, y: number): Vec =>
    view.horizontal
      ? { x: (y - view.oy) / view.scale, y: LENGTH - (x - view.ox) / view.scale }
      : { x: (x - view.ox) / view.scale, y: (y - view.oy) / view.scale };

  // Eingabe: Jeder Finger gehört zu der Hälfte, in der er aufgesetzt wurde.
  function onDown(ev: PointerEvent): void {
    if (over) return;
    const local = clientToLocal(canvas, ev.clientX, ev.clientY);
    const pos = toRink(local.x, local.y);
    const owner = halfOf(pos);
    if (ctx.players[owner].isComputer) return;
    // Pro Spieler nur ein Finger, der neueste gewinnt
    for (const [id, p] of pointers) if (p === owner) pointers.delete(id);
    pointers.set(ev.pointerId, owner);
    canvas.setPointerCapture(ev.pointerId);
    targets[owner] = pos;
    ev.preventDefault();
  }
  function onMove(ev: PointerEvent): void {
    const owner = pointers.get(ev.pointerId);
    if (owner === undefined) return;
    const local = clientToLocal(canvas, ev.clientX, ev.clientY);
    targets[owner] = toRink(local.x, local.y);
    ev.preventDefault();
  }
  function onUp(ev: PointerEvent): void {
    pointers.delete(ev.pointerId);
  }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  function report(): void {
    const w = winnerOf(state);
    if (w !== null) {
      ctx.report({ current: null, scores: state.score, finished: { winner: w } });
      return;
    }
    ctx.report({ current: null, scores: state.score, message });
  }

  function draw(now: number): void {
    const w = element.clientWidth;
    const hgt = element.clientHeight;
    g.clearRect(0, 0, w, hgt);
    const s = view.scale;
    const topLeft = toScreen({ x: 0, y: 0 });
    const bottomRight = toScreen({ x: 1, y: LENGTH });
    const rx = Math.min(topLeft.x, bottomRight.x);
    const ry = Math.min(topLeft.y, bottomRight.y);
    const rw = Math.abs(bottomRight.x - topLeft.x);
    const rh = Math.abs(bottomRight.y - topLeft.y);

    // Spielfläche, alle Markierungen bleiben innerhalb
    g.save();
    g.fillStyle = '#1c1e28';
    g.beginPath();
    g.roundRect(rx, ry, rw, rh, 0.06 * s);
    g.fill();
    g.clip();

    // Mittellinie und Mittelkreis
    g.strokeStyle = '#3a3e4f';
    g.lineWidth = Math.max(2, 0.01 * s);
    const c1 = toScreen({ x: 0, y: LENGTH / 2 });
    const c2 = toScreen({ x: 1, y: LENGTH / 2 });
    g.beginPath();
    g.moveTo(c1.x, c1.y);
    g.lineTo(c2.x, c2.y);
    g.stroke();
    const mid = toScreen({ x: 0.5, y: LENGTH / 2 });
    g.beginPath();
    g.arc(mid.x, mid.y, 0.15 * s, 0, Math.PI * 2);
    g.stroke();

    // Tore in der Farbe des Verteidigers, Torkreise
    for (const p of [0, 1] as PlayerIndex[]) {
      const y = p === 0 ? LENGTH : 0;
      const a = toScreen({ x: (1 - GOAL_WIDTH) / 2, y });
      const b = toScreen({ x: (1 + GOAL_WIDTH) / 2, y });
      g.strokeStyle = ctx.players[p].color;
      g.lineWidth = Math.max(4, 0.025 * s);
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
      const gc = toScreen({ x: 0.5, y });
      g.strokeStyle = '#2c2f3d';
      g.lineWidth = Math.max(2, 0.008 * s);
      g.beginPath();
      g.arc(gc.x, gc.y, 0.22 * s, 0, Math.PI * 2);
      g.stroke();
    }

    g.restore();

    // Schläger
    for (const p of [0, 1] as PlayerIndex[]) {
      const pos = toScreen(state.paddles[p].pos);
      g.fillStyle = ctx.players[p].color;
      g.beginPath();
      g.arc(pos.x, pos.y, PADDLE_R * s, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(18, 19, 26, 0.35)';
      g.beginPath();
      g.arc(pos.x, pos.y, PADDLE_R * s * 0.45, 0, Math.PI * 2);
      g.fill();
    }

    // Puck, während der Pause nach einem Tor blinkend
    const blink = now < pausedUntil && Math.floor(now / 160) % 2 === 0;
    if (!blink) {
      const pp = toScreen(state.puck.pos);
      g.fillStyle = '#f4f4f6';
      g.beginPath();
      g.arc(pp.x, pp.y, PUCK_R * s, 0, Math.PI * 2);
      g.fill();
    }
  }

  function tick(now: number): void {
    frame = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (!over && now >= pausedUntil) {
      const aiTargets: [Vec, Vec] = [targets[0], targets[1]];
      const speeds: [number, number] = [Infinity, Infinity];
      for (const p of [0, 1] as PlayerIndex[]) {
        if (!ctx.players[p].isComputer) continue;
        // Der Computer spielt immer oben (Orange). Für Blau würde gespiegelt.
        aiTargets[p] = computerTarget(state, ctx.level);
        speeds[p] = AI_SPEED[ctx.level];
      }
      const r = step(state, dt, aiTargets, speeds);
      state = r.state;
      const goal = r.events.find((e) => e.type === 'goal');
      if (goal && goal.type === 'goal') {
        pausedUntil = now + GOAL_PAUSE_MS;
        if (winnerOf(state) !== null) {
          over = true;
          message = undefined;
        } else {
          message = `Tor für ${ctx.players[goal.scorer].name}!`;
        }
        if ('vibrate' in navigator) navigator.vibrate?.(60);
        report();
      } else if (message && now > pausedUntil + 1200) {
        message = undefined;
        report();
      }
    }
    draw(now);
  }

  const resize = new ResizeObserver(() => {
    layoutCanvas();
    draw(performance.now());
  });
  resize.observe(element);

  report();
  frame = requestAnimationFrame(tick);

  return {
    element,
    destroy: () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
    }
  };
}
