export type Orientation = 'portrait' | 'landscape';

/** Wie die Spieler am Handy sitzen. */
export type SeatMode = 'gegenueber' | 'nebeneinander' | 'allein';

export type PlayerIndex = 0 | 1;

export type Level = 0 | 1 | 2;

export interface Player {
  name: string;
  color: string;
  isComputer: boolean;
}

export interface GameStatus {
  /** Wer gerade am Zug ist, null wenn das Spiel vorbei ist. */
  current: PlayerIndex | null;
  scores?: [number, number];
  /** Kurzer Hinweis, zum Beispiel wenn jemand aussetzen muss. */
  message?: string;
  /** Gesetzt, sobald das Spiel vorbei ist. winner null bedeutet unentschieden. */
  finished?: { winner: PlayerIndex | null };
}

export interface GameContext {
  players: [Player, Player];
  mode: SeatMode;
  level: Level;
  starter: PlayerIndex;
  report(status: GameStatus): void;
}

export interface GameInstance {
  /** Das Spielbrett. Die Größe setzt der Spielbildschirm. */
  element: HTMLElement;
  destroy(): void;
}

export interface GameDef {
  id: string;
  name: string;
  /** Spielidee in wenigen Worten. */
  kind: string;
  /** Unterstützte Sitzordnungen und das jeweils passende Format. */
  seating: Partial<Record<SeatMode, Orientation>>;
  /** Seitenverhältnis des Bretts (Breite durch Höhe). */
  aspect: number;
  /** 9 Zeichen für das 3x3-Symbol: B, O, W oder _ */
  icon: string;
  /** Fehlt bei Spielen, die noch geplant sind. */
  create?: (host: HTMLElement, ctx: GameContext) => GameInstance;
}
