// Kurzanleitungen. Der erste Punkt nennt immer das Ziel.

export const HOW_TO: Record<string, string[]> = {
  tictactoe: [
    'Ziel: drei eigene Zeichen in einer Reihe, waagerecht, senkrecht oder diagonal.',
    'Ihr setzt abwechselnd ein Zeichen in ein freies Feld.',
    'Sind alle Felder voll und keiner hat eine Reihe, ist es unentschieden.'
  ],
  reversi: [
    'Ziel: Am Ende liegen die meisten Steine in deiner Farbe auf dem Brett.',
    'Setze so, dass gegnerische Steine zwischen deinem neuen und einem deiner vorhandenen Steine eingeschlossen sind, waagerecht, senkrecht oder diagonal.',
    'Alle eingeschlossenen Steine wechseln die Farbe.',
    'Die kleinen Punkte zeigen, wo du setzen kannst. Geht nirgends, musst du aussetzen.',
    'Das Spiel endet, wenn keiner mehr setzen kann.'
  ],
  muehle: [
    'Ziel: Der Gegner hat nur noch zwei Steine oder kann nicht mehr ziehen.',
    'Zuerst setzt ihr abwechselnd je neun Steine auf freie Punkte. Danach zieht ihr sie entlang der Linien zu einem freien Nachbarpunkt.',
    'Drei eigene Steine auf einer Linie sind eine Mühle. Dann nimmst du einen gegnerischen Stein, aber keinen aus einer Mühle, außer es gibt nur solche.',
    'Wer nur noch drei Steine hat, darf springen, also auf jeden freien Punkt ziehen.'
  ],
  dame: [
    'Ziel: Der Gegner hat keine Steine mehr oder kann nicht mehr ziehen.',
    'Steine ziehen diagonal ein Feld nach vorn, nur auf den dunklen Feldern.',
    'Geschlagen wird, indem du einen gegnerischen Stein überspringst, wenn dahinter frei ist. Schlagen ist Pflicht, auch mehrmals hintereinander.',
    'Wer die letzte Reihe erreicht, bekommt eine Dame (Stein mit Ring). Sie zieht und schlägt beliebig weit, auch rückwärts.'
  ],
  kaesekaestchen: [
    'Ziel: mehr Kästchen schließen als dein Gegner.',
    'Ihr zieht abwechselnd eine Linie zwischen zwei benachbarten Punkten.',
    'Wer die vierte Seite eines Kästchens zieht, bekommt es und ist noch einmal dran.',
    'Tipp: Zieh möglichst nie die dritte Seite eines Kästchens, sonst schließt es dein Gegner.'
  ],
  mancala: [
    'Ziel: Am Ende liegen die meisten Bohnen in deinem Speicher.',
    'Deine Mulden sind die Reihe vor dir, dein Speicher liegt rechts von dir.',
    'Nimm alle Bohnen aus einer deiner Mulden und verteile sie einzeln gegen den Uhrzeigersinn, auch in deinen Speicher. Den Speicher des Gegners überspringst du.',
    'Landet die letzte Bohne in deinem Speicher, bist du noch einmal dran.',
    'Landet sie in einer leeren Mulde auf deiner Seite, bekommst du sie und alle Bohnen gegenüber.',
    'Ist eine Seite leer, endet das Spiel. Jeder bekommt die Bohnen auf seiner Seite.'
  ],
  backgammon: [
    'Ziel: als Erster alle 15 Steine ins eigene Heimfeld bringen und abtragen.',
    'Blau zieht gegen den Uhrzeigersinn in sein Heimfeld unten rechts, Orange im Uhrzeigersinn in sein Heimfeld oben rechts.',
    'Tippe auf die Würfel. Jeder Würfel ist ein Zug um so viele Punkte. Ein Pasch zählt doppelt.',
    'Auf Punkte mit zwei oder mehr gegnerischen Steinen darfst du nicht. Einen einzelnen gegnerischen Stein schlägst du, er muss von der Bar in der Mitte neu einsetzen.',
    'Sind alle deine Steine im Heimfeld, trägst du sie über die Ablage am rechten Rand ab.'
  ],
  airhockey: [
    'Ziel: als Erster 7 Tore schießen.',
    'Leg einen Finger in deine Hälfte, der Schläger folgt ihm. Ihr spielt gleichzeitig.',
    'Schieß den Puck ins gegnerische Tor und schütze dein eigenes.',
    'Nach einem Tor hat der Gegner Anstoß.'
  ],
  gomoku: [
    'Ziel: fünf eigene Steine in einer Reihe, waagerecht, senkrecht oder diagonal.',
    'Ihr setzt abwechselnd einen Stein auf einen freien Kreuzungspunkt.',
    'Tippe einmal, um den Stein vorzumerken, und noch einmal, um ihn zu setzen. So vertippst du dich nicht.',
    'Tipp: Drei gegnerische Steine in einer Reihe mit freien Enden solltest du sofort blockieren.'
  ],
  fallreihe: [
    'Ziel: vier eigene Steine in einer Reihe, waagerecht, senkrecht oder diagonal.',
    'Tippe auf eine Spalte. Dein Stein fällt nach unten auf den untersten freien Platz.',
    'Ist das Brett voll und keiner hat eine Viererreihe, ist es unentschieden.'
  ],
  paarweise: [
    'Ziel: mehr Paare finden als dein Gegner.',
    'Deck nacheinander zwei Karten auf. Zeigen sie dasselbe Motiv, gehört das Paar dir und du bist noch einmal dran.',
    'Sonst werden beide wieder umgedreht, und der andere ist dran.',
    'Merk dir, wo welche Motive liegen.'
  ]
};
