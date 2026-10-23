import { Chess, type Move, type Square } from 'chess.js';
import { h } from '../../core/dom';
import type { GameContext, GameInstance, PlayerIndex } from '../../core/types';
import { computerMove } from './engine';

// Schlichte Figuren, gefüllt in der Spielerfarbe. viewBox 0 0 45 45.
const BASE = '<path d="M11 39h23v-4H11z"/>';
const PIECES: Record<string, string> = {
  p: `${BASE}<path d="M16 35h13l-2-10h-9z"/><circle cx="22.5" cy="17" r="6"/>`,
  r: `${BASE}<path d="M14 35h17l-1.5-16h-14z"/><path d="M12 19h21v-9h-4v4h-3.5v-4h-6v4H16v-4h-4z"/>`,
  n: `${BASE}<path d="M14 35h18c0-9-1.5-17-7-22l-3-4-1.5 4c-4.5 1.5-8 5.5-10 10l2.5 3 4.5-2.5c1.5 3.5-1 7.5-3.5 11.5z"/><circle cx="21" cy="15.5" r="1.4" fill="#12131a" stroke="none"/>`,
  b: `${BASE}<path d="M15 35h15c1.5-7-.5-14-7.5-21-7 7-9 14-7.5 21z"/><circle cx="22.5" cy="10.5" r="3"/><path d="M20 21l5 4" stroke-width="2.2" fill="none"/>`,
  q: `${BASE}<path d="M13 35h19l4-21-7.5 9-3-12-3 11.5-3-11.5-3 12-7.5-9z"/><circle cx="9" cy="13" r="2.5"/><circle cx="16.5" cy="10" r="2.5"/><circle cx="22.5" cy="9" r="2.5"/><circle cx="28.5" cy="10" r="2.5"/><circle cx="36" cy="13" r="2.5"/>`,
  k: `${BASE}<path d="M14 35h17l-1.5-11c-1.5-4-4-6-7-6s-5.5 2-7 6z"/><path d="M21 5h3v4h4v3h-4v5h-3v-5h-4V9h4z"/>`
};
const PIECE_NAMES: Record<string, string> = { p: 'Bauer', n: 'Springer', b: 'Läufer', r: 'Turm', q: 'Dame', k: 'König' };
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const FILES = 'abcdefgh';

export function createSchach(_host: HTMLElement, ctx: GameContext): GameInstance {
  const game = new Chess();
  // Wer beginnt, spielt Weiß. Spieler 1 sitzt immer unten.
  const whitePlayer: PlayerIndex = ctx.starter;
  const playerOf = (color: 'w' | 'b'): PlayerIndex => (color === 'w' ? whitePlayer : ((1 - whitePlayer) as PlayerIndex));
  const whiteBottom = whitePlayer === 0;
  const facing = ctx.mode === 'gegenueber';

  let selected: Square | null = null;
  let targets: Move[] = [];
  let pendingPromotion: Move[] | null = null;
  let timer = 0;
  // Zurücknehmen nur allein gegen den Computer, zum Lernen
  const canTakeBack = ctx.mode === 'allein';

  /** Feld an Position k der Anzeige (0 = oben links) */
  const squareAt = (k: number): Square => {
    const row = Math.floor(k / 8);
    const col = k % 8;
    const rank = whiteBottom ? 8 - row : row + 1;
    const file = whiteBottom ? col : 7 - col;
    return `${FILES[file]}${rank}` as Square;
  };

  const cells = Array.from({ length: 64 }, (_, k) => {
    const sq = squareAt(k);
    // a1 ist ein dunkles Feld
    const dark = (FILES.indexOf(sq[0]) + Number(sq[1])) % 2 === 1;
    return h('button', { class: `ch-cell ${dark ? 'ch-dark' : 'ch-light'}`, type: 'button', onclick: () => tap(sq) });
  });
  const promoBox = h('div', { class: 'ch-promo', hidden: true, role: 'dialog', 'aria-label': 'Umwandeln in' });
  const element = h('div', { class: 'ch' }, h('div', { class: 'ch-board', role: 'group', 'aria-label': 'Schachbrett' }, ...cells), promoBox);

  const turnPlayer = (): PlayerIndex => playerOf(game.turn());
  const humanTurn = (): boolean => !game.isGameOver() && !ctx.players[turnPlayer()].isComputer;

  function pieceSvg(type: string, color: 'w' | 'b'): HTMLElement {
    const owner = playerOf(color);
    const tpl = document.createElement('template');
    tpl.innerHTML =
      `<svg viewBox="0 0 45 45" aria-hidden="true" fill="${ctx.players[owner].color}" stroke="#12131a" stroke-width="1.5" stroke-linejoin="round">` +
      `${PIECES[type]}</svg>`;
    // Gegenüber stehen die Figuren des oberen Spielers für ihn richtig herum
    const wrap = h('span', { class: 'ch-piece' + (facing && owner === 1 ? ' is-flipped' : '') });
    wrap.append(tpl.content.firstElementChild!);
    return wrap;
  }

  function render(): void {
    const canPlay = humanTurn();
    const last = game.history({ verbose: true }).at(-1);
    const checkSquare = game.inCheck()
      ? (game.board().flat().find((p) => p && p.type === 'k' && p.color === game.turn())?.square ?? null)
      : null;
    const targetSet = new Map(targets.map((m) => [m.to, m]));
    cells.forEach((cell, k) => {
      const sq = squareAt(k);
      const piece = game.get(sq);
      cell.replaceChildren();
      if (piece) cell.append(pieceSvg(piece.type, piece.color));
      const t = targetSet.get(sq);
      if (t) cell.append(h('span', { class: t.captured ? 'ch-ring' : 'ch-dot' }));
      cell.classList.toggle('is-selected', sq === selected);
      cell.classList.toggle('is-last', !!last && (last.from === sq || last.to === sq));
      cell.classList.toggle('is-check', sq === checkSquare);
      const own = !!piece && piece.color === game.turn();
      cell.disabled = !canPlay || !!pendingPromotion || !(own || t);
      const what = piece ? `${ctx.players[playerOf(piece.color)].name} ${PIECE_NAMES[piece.type]}` : t ? 'Ziel' : 'leer';
      cell.setAttribute('aria-label', `${sq}: ${what}`);
    });
    cells.forEach((c) => c.style.setProperty('--pc', ctx.players[turnPlayer()].color));
  }

  /** Wert der geschlagenen Figuren je Spieler */
  function capturedValues(): [number, number] {
    const scores: [number, number] = [0, 0];
    for (const m of game.history({ verbose: true })) if (m.captured) scores[playerOf(m.color)] += VALUE[m.captured];
    return scores;
  }

  const humanMoved = (): boolean => game.history({ verbose: true }).some((m) => !ctx.players[playerOf(m.color)].isComputer);

  function report(): void {
    const scores = capturedValues();
    const canUndo = canTakeBack && humanMoved();
    if (game.isCheckmate()) {
      const winner = (1 - turnPlayer()) as PlayerIndex;
      ctx.report({ current: null, scores, finished: { winner }, message: 'Schachmatt.', canUndo });
      return;
    }
    if (game.isDraw() || game.isStalemate()) {
      const why = game.isStalemate()
        ? 'Patt.'
        : game.isThreefoldRepetition()
          ? 'Dreimal dieselbe Stellung.'
          : game.isInsufficientMaterial()
            ? 'Zu wenig Material zum Mattsetzen.'
            : '50 Züge ohne Bauernzug oder Schlagen.';
      ctx.report({ current: null, scores, finished: { winner: null }, message: why, canUndo });
      return;
    }
    const hint = pendingPromotion ? 'Wähle die neue Figur.' : selected ? 'Tippe auf ein Zielfeld.' : 'Wähle eine Figur.';
    ctx.report({ current: turnPlayer(), scores, message: game.inCheck() ? 'Schach!' : undefined, hint, canUndo });
  }

  function update(): void {
    render();
    report();
  }

  function play(move: { from: string; to: string; promotion?: string }): void {
    game.move(move);
    selected = null;
    targets = [];
    pendingPromotion = null;
    promoBox.hidden = true;
    update();
    scheduleComputer();
  }

  function showPromotion(options: Move[]): void {
    pendingPromotion = options;
    const owner = turnPlayer();
    promoBox.classList.toggle('is-flipped', facing && owner === 1);
    promoBox.replaceChildren(
      ...['q', 'r', 'b', 'n'].map((t) => {
        const btn = h('button', { class: 'ch-promo__btn', type: 'button', 'aria-label': PIECE_NAMES[t], onclick: () => play(options.find((m) => m.promotion === t)!) });
        btn.append(pieceSvg(t, game.turn()));
        return btn;
      })
    );
    promoBox.hidden = false;
    update();
  }

  function tap(sq: Square): void {
    if (!humanTurn() || pendingPromotion) return;
    const piece = game.get(sq);
    if (piece && piece.color === game.turn()) {
      selected = selected === sq ? null : sq;
      targets = selected ? game.moves({ square: sq, verbose: true }) : [];
      update();
      return;
    }
    const options = targets.filter((m) => m.to === sq);
    if (!options.length) return;
    if (options.some((m) => m.promotion)) showPromotion(options);
    else play(options[0]);
  }

  /** Nimmt Züge zurück, bis der letzte eigene Zug weg ist. Die Antwort des Computers verschwindet dabei mit. */
  function undo(): void {
    if (!canTakeBack || !humanMoved()) return;
    window.clearTimeout(timer);
    for (let m = game.undo(); m; m = game.undo()) {
      if (!ctx.players[playerOf(m.color)].isComputer) break;
    }
    selected = null;
    targets = [];
    pendingPromotion = null;
    promoBox.hidden = true;
    update();
    scheduleComputer();
  }

  function scheduleComputer(): void {
    if (game.isGameOver() || !ctx.players[turnPlayer()].isComputer) return;
    // Kurz warten, damit „Denkt nach …“ angezeigt wird, bevor die Suche den Rechner beschäftigt
    timer = window.setTimeout(() => {
      const m = computerMove(game.fen(), ctx.level);
      if (m) play(m);
    }, 350);
  }

  update();
  scheduleComputer();

  return { element, destroy: () => window.clearTimeout(timer), undo: canTakeBack ? undo : undefined };
}
