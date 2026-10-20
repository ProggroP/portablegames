import { describe, expect, it } from 'vitest';
import { COLS, ROWS, TYPES, cellsOf, dropY, fits, hardDrop, move, rotate, startState, stepDown, type BlockState } from './logic';

function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

describe('Klötzchen', () => {
  it('jeder Stein besteht aus vier Feldern, auch gedreht', () => {
    for (const type of TYPES) {
      for (let rot = 0; rot < 4; rot++) expect(cellsOf({ type, rot, x: 3, y: 3 }).length).toBe(4);
    }
  });

  it('viermal drehen ergibt wieder die Ausgangslage', () => {
    for (const type of TYPES) {
      const a = cellsOf({ type, rot: 0, x: 3, y: 3 }).sort().join();
      expect(cellsOf({ type, rot: 4, x: 3, y: 3 }).sort().join()).toBe(a);
    }
  });

  it('der Siebenerbeutel liefert jeden Stein genau einmal', () => {
    let s = startState(1, seeded(1));
    const seen: string[] = [s.piece.type];
    const rng = seeded(2);
    for (let k = 0; k < 6; k++) {
      s = hardDrop({ ...s, board: new Array(COLS * ROWS).fill(0) }, rng).state;
      seen.push(s.piece.type);
    }
    expect([...seen].sort()).toEqual([...TYPES].sort());
  });

  it('Steine bleiben im Feld und drehen an der Wand', () => {
    let s = startState(0, seeded(3));
    for (let k = 0; k < 12; k++) s = move(s, -1);
    expect(cellsOf(s.piece).every(([x]) => x >= 0)).toBe(true);
    const turned = rotate(s);
    expect(fits(turned.board, turned.piece)).toBe(true);
  });

  it('ohne Zeitdruck: Der Stein bewegt sich nur auf Knopfdruck', () => {
    const s = startState(1, seeded(4));
    expect(stepDown(s).state.piece.y).toBe(s.piece.y + 1);
  });

  it('volle Reihen verschwinden und bringen Punkte', () => {
    const s: BlockState = startState(1, seeded(5));
    // Unterste Reihe bis auf vier Felder rechts füllen, dann ein waagerechtes I hineinfallen lassen
    for (let x = 0; x < COLS - 4; x++) s.board[(ROWS - 1) * COLS + x] = 1;
    const withI: BlockState = { ...s, piece: { type: 'I', rot: 0, x: COLS - 4, y: 0 } };
    const r = hardDrop(withI);
    expect(r.cleared).toBe(1);
    expect(r.state.score).toBe(100);
    expect(r.state.lines).toBe(1);
    expect(r.state.board.slice((ROWS - 1) * COLS).every((v) => v === 0)).toBe(true);
  });

  it('vier Reihen auf einmal geben 800 Punkte', () => {
    const s: BlockState = startState(1, seeded(6));
    for (let y = ROWS - 4; y < ROWS; y++) for (let x = 0; x < COLS - 1; x++) s.board[y * COLS + x] = 2;
    const r = hardDrop({ ...s, piece: { type: 'I', rot: 1, x: COLS - 3, y: 0 } });
    expect(r.cleared).toBe(4);
    expect(r.state.score).toBe(800);
  });

  it('ist oben kein Platz mehr, endet das Spiel', () => {
    const s: BlockState = startState(1, seeded(7));
    for (let y = 1; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (x !== 0) s.board[y * COLS + x] = 3;
    const r = hardDrop(s);
    expect(r.state.over).toBe(true);
  });

  it('der Schatten zeigt die Landehöhe', () => {
    const s = startState(1, seeded(8));
    const y = dropY(s);
    expect(fits(s.board, { ...s.piece, y })).toBe(true);
    expect(fits(s.board, { ...s.piece, y: y + 1 })).toBe(false);
  });
});
