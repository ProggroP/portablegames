# PortableGames: Konzept

Eine Sammlung klassischer Spiele für **ein Smartphone**, gespielt **allein gegen den Computer** oder **zu zweit an einem Gerät**. Die App ist eine Website, die sich als PWA installieren lässt und danach auch offline funktioniert.

## Sitzordnungen

| Sitzordnung | Beschreibung |
|---|---|
| **Gegenüber** | Das Handy liegt zwischen den Spielern. Die Anzeige von Spieler 2 steht auf dem Kopf, damit jeder seine Infos lesen kann. |
| **Nebeneinander** | Beide schauen von derselben Seite auf das Brett. |
| **Allein** | Gegen den Computer in drei Stufen (Leicht, Mittel, Schwer). Die Darstellung entspricht „nebeneinander“. |

Jedes Spiel soll, wenn möglich, **gegenüber und nebeneinander** spielbar sein.

## Format: Hoch oder quer

Das Format legt **das Spiel** fest, nicht die Lage des Handys. Ein Handy, das flach auf dem Tisch liegt, kippt sonst ständig zwischen Hoch- und Querformat.

- Die Spielbühne ist fest zum Gerät ausgerichtet. Dreht das System die Anzeige, dreht die Bühne gegen (`src/core/stage.ts`).
- Beim Spielen „nebeneinander“ und „allein“ lässt sich die Anzeige um 180 Grad drehen, falls das Handy andersherum liegt.
- Auf Geräten ohne Touch (Laptop, Desktop) wird nicht gedreht.

Faustregel: Quadratische Bretter im Hochformat. Bretter, bei denen jeder Spieler eine Reihe vor sich hat (Backgammon, Mancala), im Querformat. „Gegenüber im Querformat“ heißt, die Spieler sitzen an den langen Seiten des Handys.

## Auswahlkriterien

1. **Klassiker** mit höchstens zwei Spielern.
2. **Keine verdeckten Informationen.** Spiele, die zu zweit nur mit Abdeckung oder Weitergeben funktionieren (Schiffe versenken, Mastermind, Kartenspiele mit Handkarten), sind ausgeschlossen.
3. **Bedienbar auf dem Handy:** Tippflächen mindestens 44 px. Bretter mit sehr vielen Feldern brauchen ein kleineres Brett oder einen Bestätigungs-Tipp.
4. **Brett von allen Seiten lesbar**, damit „gegenüber“ funktioniert. Wo das nicht geht (Schwerkraft bei Fallreihe), gibt es nur „nebeneinander“.

## Spiele

| Spiel | Vorbild | Gegenüber | Nebeneinander | Status |
|---|---|---|---|---|
| Tic-Tac-Toe | | Hoch | Hoch | spielbar |
| Reversi | | Hoch | Hoch | spielbar |
| Mühle | | Hoch | Hoch | geplant |
| Dame | | Hoch | Hoch | geplant |
| Schach | | Hoch | Hoch | geplant, Figuren gegenüber zum jeweiligen Spieler gedreht |
| Backgammon | | Quer | Quer | geplant |
| Mancala | Kalaha | Quer | Quer | geplant |
| Gomoku | | Hoch | Hoch | geplant, 13×13 oder Bestätigungs-Tipp |
| Käsekästchen | | Hoch | Hoch | geplant |
| Air-Hockey | | Hoch | Quer | geplant, Echtzeit mit Multitouch |
| Paarweise | Memory | Hoch | Hoch | geplant, Motive ohne Oben und Unten |
| Fünf Würfel | Kniffel | Hoch | Hoch | geplant, gegenüber mit eigenem Block pro Spieler |
| Fallreihe | Vier gewinnt | nicht möglich | Hoch | geplant |
| Solitär | Klondike | | | geplant, nur allein |
| Feldräumer | Minesweeper | | | geplant, nur allein |
| Neunerfeld | Sudoku | | | geplant, nur allein |

## Namen

Allgemeine Spielnamen (Schach, Mühle, Dame, Backgammon, Reversi, Mancala, Tic-Tac-Toe, Gomoku, Käsekästchen, Solitär) bleiben. Umbenannt wird nur, wo Markenrechte bestehen oder unklar sind:

- **Vier gewinnt** (Hasbro), **Memory** (Ravensburger), **Kniffel** (Schmidt Spiele): geschützte Marken.
- **Sudoku**: in Japan eine Marke von Nikoli. Da die Website weltweit erreichbar ist, wird vorsichtshalber ein eigener Name verwendet.
- **Minesweeper**: Produktname von Microsoft, keine Eintragung gefunden, aber vorsichtshalber umbenannt.
- **Kalaha / Kalah** war in den USA bis 2002 eine Marke. „Mancala“ ist der allgemeine Name der Spielfamilie.

Auch Beschreibungstexte in der App nennen keine geschützten Namen. Das ist eine Einschätzung, keine Rechtsberatung.

## Gestaltung

- Dunkler Hintergrund, angenehm am Tisch und sparsam auf OLED-Displays.
- Spieler 1: Blau, Kreis. Spieler 2: Orange, Quadrat. Neben der Farbe gibt es immer eine Form, damit auch Menschen mit Farbsehschwäche die Spieler unterscheiden können.
- Schrift: Fredoka für Überschriften, Systemschrift für Text. Fredoka liegt in der App selbst, damit keine Daten an Google Fonts gehen (DSGVO) und die Schrift offline verfügbar ist.

## Technik

- TypeScript und Vite, ohne UI-Framework. Spiele bauen ihr Brett als normales HTML (Buttons in einem Raster).
- PWA über `vite-plugin-pwa`: Offline-Cache, installierbar.
- Die Wake-Lock-API hält das Display während eines Spiels an, wo der Browser das unterstützt.
- Spiellogik ist von der Darstellung getrennt (`logic.ts` und `view.ts`) und mit Vitest getestet.
- Veröffentlichung auf eigenem Webspace. GitHub Actions testet und baut bei jeder Änderung ein fertiges Paket.

## Reihenfolge

1. Grundgerüst mit Sitzordnungen, Drehung und PWA, dazu Tic-Tac-Toe und Reversi. **(erledigt)**
2. Mühle, Dame, Käsekästchen: weitere quadratische Bretter.
3. Mancala und Backgammon: erste Spiele im Querformat.
4. Air-Hockey: erstes Echtzeitspiel.
5. Die übrigen Spiele.

## Offene Punkte

- Auf dem iPhone kann eine Web-App die Bildschirmausrichtung nicht sperren. Bei flach liegendem Handy hilft die Ausrichtungssperre im Kontrollzentrum. Die App dreht zwar gegen, ein Hinweis beim ersten Start wäre trotzdem sinnvoll.
- Schach braucht einen guten Computergegner. Stockfish steht unter GPL und passt nicht zur MIT-Lizenz.
