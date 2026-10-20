# PortableGames

PWA mit klassischen Spielen für 1 bis 2 Spieler an einem Smartphone. Konzept und Spieleliste: KONZEPT.md.

## Befehle

- `npm test`: Vitest für die Spiellogik
- `npm run build`: `tsc --noEmit` und Vite-Build
- `npm run dev`: Entwicklungsserver

## Konventionen

- Alle Texte in der App auf Deutsch, Du-Form. Keine geschützten Spielnamen, siehe Abschnitt „Namen“ in KONZEPT.md.
- Kein UI-Framework. DOM über den Helfer `h()` aus `src/core/dom.ts`.
- Regeln und Computergegner in `logic.ts` ohne DOM-Zugriff, immer mit Tests. Darstellung in `view.ts`.
- Spieler 1 ist Index 0 (Blau, Kreis), Spieler 2 ist Index 1 (Orange, Quadrat).
- Jedes Spiel gibt in `registry.ts` für jede Sitzordnung das Format an. Die Drehung der Bühne übernimmt `src/core/stage.ts`. Spiele drehen nur Beschriftungen auf dem Brett, die gegenüber für Spieler 2 lesbar sein müssen (`ctx.mode === 'gegenueber'`).
- Querformat-Bretter können mit `aspectMax` in die Breite wachsen.
- Tippflächen mindestens 44 px.
- Fingerpositionen immer über `clientToLocal()` aus `src/core/stage.ts` umrechnen, sonst stimmen sie bei gedrehter Bühne nicht.
