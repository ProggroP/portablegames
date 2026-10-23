export type Orientation = 'portrait' | 'landscape';

/** Wie die Spieler am Handy sitzen. */
export type SeatMode = 'gegenueber' | 'nebeneinander' | 'allein';

export type PlayerIndex = 0 | 1;

/** Schwierigkeit, 0 ist die leichteste. Die meisten Spiele haben drei Stufen, siehe GameDef.levels. */
export type Level = number;

export interface Player {
  name: string;
  color: string;
  isComputer: boolean;
}

export interface GameStatus {
  /** Wer gerade am Zug ist, null wenn das Spiel vorbei ist. */
  current: PlayerIndex | null;
  scores?: [number, number];
  /** Kurze Meldung für beide, zum Beispiel wenn jemand aussetzen muss. */
  message?: string;
  /** Anleitung nur für den Spieler am Zug, zum Beispiel „Setze einen Stein“. */
  hint?: string;
  /**
   * Gesetzt, sobald das Spiel vorbei ist. winner null bedeutet unentschieden.
   * label ersetzt bei Spielen für eine Person „Geschafft!“ oder „Verloren“, etwa „Spielende“.
   */
  finished?: { winner: PlayerIndex | null; label?: string };
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
  /** Nur für Echtzeitspiele: anhalten, solange zum Beispiel die Anleitung offen ist. */
  setPaused?(paused: boolean): void;
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
  /** Optional: Bis zu diesem Verhältnis darf das Brett in die Breite wachsen. */
  aspectMax?: number;
  /** Gegenüber schmale Spieleranzeigen in einer Zeile, wenn das Brett viel Höhe braucht. */
  compactHud?: boolean;
  /** Namen der Schwierigkeitsstufen, falls es nicht Leicht, Mittel und Schwer sind. */
  levels?: string[];
  /** 9 Zeichen für das 3x3-Symbol: B, O, W oder _ */
  icon: string;
  /** Kurzanleitung: zuerst das Ziel, dann die wichtigsten Regeln, je ein Satz oder zwei. */
  howTo?: string[];
  /** Fehlt bei Spielen, die noch geplant sind. */
  create?: (host: HTMLElement, ctx: GameContext) => GameInstance;
}
