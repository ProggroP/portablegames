"""Schreibt public/lizenzen.txt mit den Lizenztexten der App und der mitgelieferten Fremdbestandteile."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PARTS = [
    ("PortableGames", ROOT / "LICENSE"),
    ("chess.js (Schachregeln)", ROOT / "node_modules/chess.js/LICENSE"),
    ("Schrift Fredoka", ROOT / "node_modules/@fontsource/fredoka/LICENSE"),
]

out = ["Lizenzen\n========\n"]
for title, path in PARTS:
    out.append(f"\n{title}\n{'-' * len(title)}\n\n{path.read_text(encoding='utf-8').strip()}\n")
(ROOT / "public/lizenzen.txt").write_text("".join(out), encoding="utf-8")
