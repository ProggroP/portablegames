# PortableGames

Klassische Spiele für ein Smartphone, allein gegen den Computer oder zu zweit an einem Gerät, gegenüber oder nebeneinander. Die App ist eine PWA und funktioniert nach der Installation auch offline.

Spielbar sind bisher **Tic-Tac-Toe** und **Reversi**. Weitere Spiele und die Ideen dahinter stehen in [KONZEPT.md](KONZEPT.md).

## Entwickeln

```bash
npm install
npm run dev      # Entwicklungsserver
npm test         # Tests der Spiellogik
npm run build    # Typprüfung und Produktions-Build nach dist/
npm run preview  # Build lokal ansehen
npm run icons    # App-Icons neu erzeugen (Python mit Pillow)
```

Zum Testen auf dem Handy im selben WLAN: `npm run dev -- --host` und die angezeigte Adresse öffnen.

## Aufbau

```
src/
  core/          Typen, Drehung der Spielbühne, Einstellungen, Hilfsfunktionen
  screens/       Spieleauswahl, Spielaufbau, Spielbildschirm
  games/
    registry.ts  Liste aller Spiele mit Sitzordnungen und Format
    <spiel>/
      logic.ts   Regeln und Computergegner, ohne DOM
      view.ts    Darstellung des Bretts
```

## Ein Spiel hinzufügen

1. `src/games/<spiel>/logic.ts` mit den Regeln und einem `computerMove` schreiben, dazu `logic.test.ts`.
2. `view.ts` mit einer Funktion `create<Spiel>(host, ctx)` schreiben. Sie liefert das Brett als `element` und meldet den Spielstand über `ctx.report(...)`.
3. In `src/games/registry.ts` den Eintrag ergänzen: Sitzordnungen mit Format, Seitenverhältnis des Bretts und `create`.

## Veröffentlichen

Jeder Push auf `main` baut die App und veröffentlicht sie über GitHub Pages. Einmalig nötig: unter **Settings › Pages** als Quelle „GitHub Actions“ auswählen.

## Lizenz

MIT
