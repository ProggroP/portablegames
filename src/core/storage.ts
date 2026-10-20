// localStorage kann fehlen oder werfen (privater Modus, blockierte Daten).

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem('pg:' + key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem('pg:' + key, JSON.stringify(value));
  } catch {
    // Ohne Speicher geht es auch, die Einstellungen gelten dann nur bis zum Neuladen.
  }
}
