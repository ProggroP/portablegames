import { load, save } from './storage';
import type { GameDef, Level, SeatMode } from './types';

export interface GameConfig {
  mode: SeatMode;
  level: Level;
  names: [string, string];
  /** Darstellung um 180 Grad gedreht (nur nebeneinander und allein). */
  flipped: boolean;
}

export function defaultMode(def: GameDef): SeatMode {
  if (def.seating.gegenueber) return 'gegenueber';
  if (def.seating.nebeneinander) return 'nebeneinander';
  return 'allein';
}

export const DEFAULT_LEVELS = ['Leicht', 'Mittel', 'Schwer'];

export function levelNames(def: GameDef): string[] {
  return def.levels ?? DEFAULT_LEVELS;
}

export function loadConfig(def: GameDef): GameConfig {
  const names = load<{ names: [string, string] }>('names', { names: ['', ''] }).names;
  const count = levelNames(def).length;
  const middle = Math.floor(count / 2);
  const cfg = load<Omit<GameConfig, 'names'>>('game:' + def.id, { mode: defaultMode(def), level: middle, flipped: false });
  // Eine gespeicherte Sitzordnung oder Stufe, die das Spiel nicht (mehr) kann, wird ersetzt.
  const mode = def.seating[cfg.mode] ? cfg.mode : defaultMode(def);
  const level = Number.isInteger(cfg.level) && cfg.level >= 0 && cfg.level < count ? cfg.level : middle;
  return { ...cfg, mode, level, names };
}

export function saveConfig(def: GameDef, cfg: GameConfig): void {
  save('names', { names: cfg.names });
  save('game:' + def.id, { mode: cfg.mode, level: cfg.level, flipped: cfg.flipped });
}
