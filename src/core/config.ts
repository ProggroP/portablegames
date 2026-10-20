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

export function loadConfig(def: GameDef): GameConfig {
  const names = load<{ names: [string, string] }>('names', { names: ['', ''] }).names;
  const cfg = load<Omit<GameConfig, 'names'>>('game:' + def.id, { mode: defaultMode(def), level: 1, flipped: false });
  // Eine gespeicherte Sitzordnung, die das Spiel nicht (mehr) kann, wird ersetzt.
  const mode = def.seating[cfg.mode] ? cfg.mode : defaultMode(def);
  return { ...cfg, mode, names };
}

export function saveConfig(def: GameDef, cfg: GameConfig): void {
  save('names', { names: cfg.names });
  save('game:' + def.id, { mode: cfg.mode, level: cfg.level, flipped: cfg.flipped });
}
