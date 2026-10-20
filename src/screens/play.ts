import { loadConfig, saveConfig } from '../core/config';
import { h, icon } from '../core/dom';
import { makePlayers } from '../core/players';
import { currentScreenAngle, stageGeometry } from '../core/stage';
import type { GameDef, GameInstance, GameStatus, PlayerIndex } from '../core/types';
import { keepAwake } from '../core/wakeLock';

// Platz, der neben dem Brett mindestens für die Anzeigen bleiben muss (in px).
const HUD_MIN = { portrait: 132, landscape: 60 };
const BAR_H = 56;
const ROW_H = { portrait: 80, landscape: 64 };
const MSG_H = 64;
const PAD = 12;

interface Hud {
  el: HTMLElement;
  actions: HTMLElement;
  update(st: GameStatus): void;
}

export function playScreen(root: HTMLElement, def: GameDef): () => void {
  const create = def.create;
  if (!create) throw new Error(`${def.name} ist noch nicht spielbar`);

  const cfg = loadConfig(def);
  const mode = cfg.mode;
  const facing = mode === 'gegenueber';
  const orientation = def.seating[mode] ?? 'portrait';
  const players = makePlayers(cfg.names, mode === 'allein' ? 1 : null);

  let starter: PlayerIndex = 0;
  let game: GameInstance | null = null;
  let status: GameStatus = { current: starter };

  function resultText(st: GameStatus): string {
    const w = st.finished?.winner;
    if (w === undefined) return '';
    if (w === null) return 'Unentschieden.';
    if (mode === 'allein') return w === 0 ? 'Du hast gewonnen!' : 'Der Computer hat gewonnen.';
    return `${players[w].name} gewinnt!`;
  }

  function makeHud(i: PlayerIndex): Hud {
    const p = players[i];
    const score = h('span', { class: 'hud__score' });
    const pill = h('span', { class: 'hud__status' });
    const note = h('p', { class: 'hud__note', 'aria-live': 'polite' });
    const actions = h('div', { class: 'hud__actions' });
    const el = h('section', { class: 'hud', 'aria-label': p.name },
      h('div', { class: 'hud__top' },
        h('span', { class: 'hud__who' }, h('span', { class: `marker marker--p${i + 1}`, 'aria-hidden': 'true' }), h('span', { class: 'hud__name' }, p.name)),
        score
      ),
      h('div', { class: 'hud__bottom' }, pill, actions),
      facing ? note : null
    );
    el.style.setProperty('--pc', p.color);

    return {
      el,
      actions,
      update(st) {
        const active = st.current === i;
        el.classList.toggle('is-active', active);
        score.textContent = st.scores ? String(st.scores[i]) : '';
        let text = '';
        if (st.finished) {
          const w = st.finished.winner;
          text = w === null ? 'Unentschieden' : w === i ? 'Gewonnen!' : 'Verloren';
        } else if (active) {
          text = p.isComputer ? 'Denkt nach …' : facing ? 'Du bist am Zug' : 'Am Zug';
        } else if (facing && st.current !== null) {
          text = `${players[st.current].name} ist am Zug`;
        }
        pill.textContent = text;
        pill.hidden = !text;
        const hint = active && !p.isComputer ? st.hint : undefined;
        note.textContent = [st.message, hint].filter(Boolean).join(' ');
      }
    };
  }

  const huds = [makeHud(0), makeHud(1)] as const;
  const boardWrap = h('div', { class: 'board-wrap' });
  const stage = h('div', { class: `stage stage--${facing ? 'facing' : 'shared'}` });

  const exit = (): void => {
    if (!status.finished && !confirm('Spiel beenden?')) return;
    location.hash = '#/';
  };
  const restart = (): void => {
    if (!status.finished && !confirm('Spiel abbrechen und neu beginnen?')) return;
    again();
  };
  const againButton = (): HTMLButtonElement =>
    h('button', { class: 'btn btn--primary hud__again', type: 'button', hidden: true, onclick: () => again() }, 'Nochmal');
  const iconButton = (name: 'close' | 'restart' | 'swap', label: string, onclick: () => void): HTMLButtonElement =>
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': label, onclick }, icon(name, 20));

  const againButtons: HTMLButtonElement[] = [];
  const message = h('p', { class: 'play-message', 'aria-live': 'polite' });

  if (facing) {
    huds[1].el.classList.add('hud--flipped');
    const top = againButton();
    const bottom = againButton();
    againButtons.push(top, bottom);
    huds[1].actions.append(top);
    huds[0].actions.append(bottom, iconButton('restart', 'Neues Spiel', restart), iconButton('close', 'Spiel beenden', exit));
    stage.append(huds[1].el, boardWrap, huds[0].el);
  } else {
    const againBtn = againButton();
    againButtons.push(againBtn);
    const flip = iconButton('swap', 'Anzeige um 180 Grad drehen', () => {
      cfg.flipped = !cfg.flipped;
      saveConfig(def, cfg);
      layout();
    });
    stage.append(
      h('div', { class: 'play-bar' },
        iconButton('close', 'Spiel beenden', exit),
        h('span', { class: 'play-bar__title' }, def.name),
        h('span', { class: 'play-bar__actions' }, flip, iconButton('restart', 'Neues Spiel', restart))
      ),
      h('div', { class: 'hud-row' }, huds[0].el, huds[1].el),
      boardWrap,
      h('div', { class: 'play-foot' }, message, againBtn)
    );
  }

  function report(st: GameStatus): void {
    status = st;
    huds.forEach((hud) => hud.update(st));
    const humanTurn = st.current !== null && !players[st.current].isComputer;
    const parts = st.finished ? [resultText(st), st.message] : [st.message, humanTurn ? st.hint : undefined];
    message.textContent = parts.filter(Boolean).join(' ');
    againButtons.forEach((b) => (b.hidden = !st.finished));
  }

  function startGame(): void {
    game?.destroy();
    boardWrap.replaceChildren();
    game = create!(boardWrap, { players, mode, level: cfg.level, starter, report });
    boardWrap.append(game.element);
  }

  function again(): void {
    starter = (1 - starter) as PlayerIndex;
    startGame();
  }

  function layout(): void {
    const g = stageGeometry(window.innerWidth, window.innerHeight, currentScreenAngle(), orientation, !facing && cfg.flipped, canRotate);
    stage.style.width = `${g.width}px`;
    stage.style.height = `${g.height}px`;
    stage.style.transform = `translate(-50%, -50%) rotate(${g.rotation}deg)`;

    const shape = g.height >= g.width ? 'portrait' : 'landscape';
    stage.classList.toggle('is-landscape', shape === 'landscape');
    const reserved = facing ? 2 * HUD_MIN[shape] : BAR_H + ROW_H[shape] + MSG_H;
    const availW = g.width - 2 * PAD;
    const availH = g.height - reserved - 2 * PAD;
    const bw = Math.max(120, Math.min(availW, availH * def.aspect));
    boardWrap.style.width = `${Math.floor(bw)}px`;
    boardWrap.style.height = `${Math.floor(bw / def.aspect)}px`;
  }

  // Nur Touch-Geräte werden gedreht. Ein Laptop-Bildschirm bleibt, wie er ist.
  const canRotate = matchMedia('(pointer: coarse)').matches;
  const onChange = (): void => layout();
  window.addEventListener('resize', onChange);
  window.addEventListener('orientationchange', onChange);
  screen.orientation?.addEventListener?.('change', onChange);

  document.body.classList.add('is-playing');
  root.append(stage);
  keepAwake(true);
  layout();
  startGame();

  return () => {
    game?.destroy();
    keepAwake(false);
    document.body.classList.remove('is-playing');
    window.removeEventListener('resize', onChange);
    window.removeEventListener('orientationchange', onChange);
    screen.orientation?.removeEventListener?.('change', onChange);
  };
}
