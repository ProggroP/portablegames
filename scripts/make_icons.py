"""Erzeugt die App-Icons: ein 3x3-Raster aus Spielsteinen in den Spielerfarben."""
from pathlib import Path

from PIL import Image, ImageDraw

BG = (18, 19, 26)
COLORS = {"B": (76, 141, 255), "O": (255, 159, 28)}
PATTERN = "BOBOBOBOB"
OUT = Path(__file__).resolve().parent.parent / "public"


def draw(size: int, safe: float) -> Image.Image:
    """safe: Anteil der Kantenlänge, den das Raster einnimmt (kleiner bei maskable)."""
    scale = 4
    s = size * scale
    img = Image.new("RGB", (s, s), BG)
    d = ImageDraw.Draw(img)
    grid = s * safe
    gap = grid * 0.06
    cell = (grid - 2 * gap) / 3
    start = (s - grid) / 2
    for i, ch in enumerate(PATTERN):
        x = start + (i % 3) * (cell + gap)
        y = start + (i // 3) * (cell + gap)
        d.rounded_rectangle([x, y, x + cell, y + cell], radius=cell * 0.22, fill=COLORS[ch])
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    (OUT / "icons").mkdir(parents=True, exist_ok=True)
    draw(192, 0.7).save(OUT / "icons" / "icon-192.png")
    draw(512, 0.7).save(OUT / "icons" / "icon-512.png")
    draw(512, 0.55).save(OUT / "icons" / "icon-maskable-512.png")
    draw(180, 0.66).save(OUT / "apple-touch-icon.png")


if __name__ == "__main__":
    main()
