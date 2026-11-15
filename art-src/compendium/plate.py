"""Book plate treatment (complete-books-and-bibliography 4.1).

Turns a source image into a book plate the way the existing plates were made:
fit to 320 x 240 (landscape) or 240 x 320 (portrait), cropping the centre when the
image is taller or wider than that, auto-contrast on the luminance, then the
20-colour sepia palette of revolt-1922-palette.pal with Bayer 4 x 4 dithering.

    python -I art-src/compendium/plate.py SOURCE OUT.png [--portrait] [--crop L,T,R,B]

The source stays outside the repository (it is gitignored); only the plate is kept.
"""

import sys
from pathlib import Path

from PIL import Image, ImageOps

HERE = Path(__file__).resolve().parent
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def palette() -> list[tuple[int, int, int]]:
    lines = (HERE / "revolt-1922-palette.pal").read_text().split()
    count = int(lines[2])
    values = [int(v) for v in lines[3 : 3 + count * 3]]
    colours = sorted({tuple(values[i : i + 3]) for i in range(0, len(values), 3)}, key=sum)
    return colours  # dark to light


def fit(image: Image.Image, portrait: bool) -> Image.Image:
    width, height = (240, 320) if portrait else (320, 240)
    w, h = image.size
    scale = width / w
    if h * scale > height:
        # Taller than the plate: keep the width and crop the centre.
        image = image.resize((width, max(1, round(h * scale))), Image.LANCZOS)
        top = (image.height - height) // 2
        return image.crop((0, top, width, top + height))
    if portrait and h * scale < height:
        scale = height / h
        image = image.resize((max(1, round(w * scale)), height), Image.LANCZOS)
        left = (image.width - width) // 2
        return image.crop((left, 0, left + width, height))
    return image.resize((width, max(1, round(h * scale))), Image.LANCZOS)


def treat(source: Path, out: Path, portrait: bool, crop: tuple[int, int, int, int] | None) -> None:
    image = Image.open(source).convert("RGB")
    if crop:
        image = image.crop(crop)
    image = fit(image, portrait)
    grey = ImageOps.autocontrast(image.convert("L"), cutoff=1)
    colours = palette()
    levels = len(colours) - 1
    result = Image.new("P", grey.size)
    flat = [c for colour in colours for c in colour]
    result.putpalette(flat + [0] * (768 - len(flat)))
    px = grey.load()
    rp = result.load()
    for y in range(grey.height):
        for x in range(grey.width):
            value = px[x, y] / 255 * levels
            base = int(value)
            frac = value - base
            threshold = (BAYER[y % 4][x % 4] + 0.5) / 16
            rp[x, y] = min(levels, base + (1 if frac > threshold else 0))
    out.parent.mkdir(parents=True, exist_ok=True)
    result.save(out, optimize=True)


def main(argv: list[str]) -> int:
    args = [a for a in argv if not a.startswith("--")]
    portrait = "--portrait" in argv
    crop = None
    if "--crop" in argv:
        crop = tuple(int(v) for v in argv[argv.index("--crop") + 1].split(","))  # type: ignore[assignment]
        args = [a for a in args if a != argv[argv.index("--crop") + 1]]
    if len(args) != 2:
        print(__doc__)
        return 2
    treat(Path(args[0]), Path(args[1]), portrait, crop)  # type: ignore[arg-type]
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
