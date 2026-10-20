import type { Orientation } from './types';

export interface StageGeometry {
  /** Drehung der Bühne in Grad, im Uhrzeigersinn. */
  rotation: number;
  width: number;
  height: number;
}

/**
 * Berechnet, wie die Spielbühne gedreht werden muss.
 *
 * Das Spiel legt sein Format selbst fest. Die Bühne bleibt dabei fest zum Gerät
 * ausgerichtet: Dreht das System die Anzeige, weil das Handy auf dem Tisch
 * gekippt wurde, dreht die Bühne gegen.
 *
 * @param viewportW Breite des Anzeigebereichs
 * @param viewportH Höhe des Anzeigebereichs
 * @param screenAngle screen.orientation.angle (0, 90, 180 oder 270)
 * @param want gewünschtes Format des Spiels
 * @param flipped um 180 Grad gedreht, damit die Spieler die Seite wechseln können
 * @param canRotate false bei Geräten ohne Lagewechsel (Desktop): dann nur der Seitenwechsel
 */
export function stageGeometry(
  viewportW: number,
  viewportH: number,
  screenAngle: number,
  want: Orientation,
  flipped: boolean,
  canRotate = true
): StageGeometry {
  if (!canRotate) return { rotation: flipped ? 180 : 0, width: viewportW, height: viewportH };
  const angle = ((screenAngle % 360) + 360) % 360;
  // Natürliche Ausrichtung des Geräts: Hochformat bei Handys, oft Querformat bei Tablets.
  const naturalPortrait = angle % 180 === 0 ? viewportH >= viewportW : viewportW > viewportH;
  const base = (want === 'portrait') === naturalPortrait ? 0 : 90;
  const rotation = (((base + (flipped ? 180 : 0) - angle) % 360) + 360) % 360;
  const swap = rotation % 180 !== 0;
  return {
    rotation,
    width: swap ? viewportH : viewportW,
    height: swap ? viewportW : viewportH
  };
}

export function currentScreenAngle(): number {
  if (screen.orientation && typeof screen.orientation.angle === 'number') return screen.orientation.angle;
  const legacy = (window as unknown as { orientation?: number }).orientation;
  return typeof legacy === 'number' ? legacy : 0;
}
