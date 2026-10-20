import { describe, expect, it } from 'vitest';
import { stageGeometry } from './stage';

describe('Bühnendrehung', () => {
  it('Handy hochkant, Spiel im Hochformat: keine Drehung', () => {
    expect(stageGeometry(390, 844, 0, 'portrait', false)).toEqual({ rotation: 0, width: 390, height: 844 });
  });

  it('Handy hochkant, Spiel im Querformat: um 90 Grad gedreht', () => {
    expect(stageGeometry(390, 844, 0, 'landscape', false)).toEqual({ rotation: 90, width: 844, height: 390 });
  });

  it('System dreht auf quer, die Bühne dreht gegen', () => {
    expect(stageGeometry(844, 390, 90, 'portrait', false)).toEqual({ rotation: 270, width: 390, height: 844 });
    expect(stageGeometry(844, 390, 90, 'landscape', false)).toEqual({ rotation: 0, width: 844, height: 390 });
  });

  it('Seitenwechsel dreht um 180 Grad', () => {
    expect(stageGeometry(390, 844, 0, 'portrait', true).rotation).toBe(180);
  });

  it('Tablet mit natürlichem Querformat', () => {
    expect(stageGeometry(1280, 800, 0, 'landscape', false)).toEqual({ rotation: 0, width: 1280, height: 800 });
    expect(stageGeometry(1280, 800, 0, 'portrait', false)).toEqual({ rotation: 90, width: 800, height: 1280 });
  });

  it('Desktop ohne Touch: keine Drehung, nur Seitenwechsel', () => {
    expect(stageGeometry(1440, 900, 0, 'portrait', false, false)).toEqual({ rotation: 0, width: 1440, height: 900 });
    expect(stageGeometry(1440, 900, 0, 'portrait', true, false).rotation).toBe(180);
  });
});
