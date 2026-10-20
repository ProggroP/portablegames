# PortableGames

Klassische Spiele für ein Smartphone, allein gegen den Computer oder zu zweit an einem Gerät, gegenüber oder nebeneinander. Die App ist eine PWA und funktioniert nach der Installation auch offline.

Spielbar sind bisher **Tic-Tac-Toe**, **Reversi**, **Mühle**, **Dame**, **Käsekästchen**, **Mancala**, **Backgammon**, **Air-Hockey**, **Gomoku**, **Fallreihe** und **Paarweise**. Weitere Spiele und die Ideen dahinter stehen in [KONZEPT.md](KONZEPT.md).

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
  core/          Typen, Drehung der Spielbühne, Einstellungen, Suche für Computergegner
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
4. In `src/games/howto.ts` die Kurzanleitung ergänzen, zuerst das Ziel.

## Veröffentlichen

`npm run build` erzeugt den Ordner `dist/`. Sein **Inhalt** kommt auf den Webspace, wahlweise ins Hauptverzeichnis oder in einen Unterordner. Die Pfade sind relativ, die App läuft in jedem Ordner.

Ohne eigenen Build: Jeder Push auf `main` startet unter **Actions** den Ablauf „Build“. Im fertigen Lauf liegt unter **Artifacts** das Paket `portablegames-webspace` als ZIP zum Herunterladen.

Voraussetzungen und Hinweise:

- **HTTPS ist Pflicht.** Ohne HTTPS funktionieren Offline-Modus, Installation und das Wachhalten des Displays nicht.
- Die Datei `.htaccess` gehört mit hoch. Sie beginnt mit einem Punkt und wird in manchen FTP-Programmen erst angezeigt, wenn versteckte Dateien eingeblendet sind. Sie wirkt nur auf Apache-Servern und sorgt für richtige Dateitypen und dafür, dass Updates ankommen.
- Bei einem Update alle Dateien ersetzen. Alte Dateien in `assets/` dürfen gelöscht werden.

### Automatisch per FTP

Unter **Settings › Secrets and variables › Actions** eintragen:

| Art | Name | Inhalt |
|---|---|---|
| Secret | `FTP_SERVER` | Server, zum Beispiel `www123.your-server.de` |
| Secret | `FTP_USERNAME` | FTP-Benutzername |
| Secret | `FTP_PASSWORD` | FTP-Passwort |
| Variable | `FTP_DIR` | Zielordner mit `/` am Ende, zum Beispiel `/public_html/spiele/` |

Sobald alle vier gesetzt sind, lädt jeder Push auf `main` die neue Version per FTPS hoch (`scripts/deploy-ftp.sh` mit lftp). Hochgeladen werden nur geänderte Dateien. Gelöscht werden nur veraltete Dateien im Unterordner `assets/`, alles andere im Zielordner bleibt.

## Lizenz

MIT
