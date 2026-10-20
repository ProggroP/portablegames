import type { Player, PlayerIndex } from './types';

export const PLAYER_COLORS: [string, string] = ['#4C8DFF', '#FF9F1C'];
export const PLAYER_COLOR_NAMES: [string, string] = ['Blau', 'Orange'];

export function makePlayers(names: [string, string], computerIndex: PlayerIndex | null): [Player, Player] {
  return [0, 1].map((i) => ({
    name: computerIndex === i ? 'Computer' : names[i].trim() || PLAYER_COLOR_NAMES[i],
    color: PLAYER_COLORS[i],
    isComputer: computerIndex === i
  })) as [Player, Player];
}
