"""Cuts the battle HUD ornaments out of the owner's reference image.

redo-battle-hud D1: the owner drew the HUD he wants in
`referencias para hud/Interface de comando da Coluna Prestes.png` and allowed
it to be rasterized for the game (2026-11-11). This script crops each
ornament, clears the map behind it (green pixels joined to the crop's edge),
halves it to the art-pixel grid and reduces the set to one shared palette.
It writes `ornaments.png` and `ornaments.txt` (name x y w h per line) for
`build-hud.lua`, which lays them into the Aseprite source with the frames.

Run once to seed the source; after that the art is edited in Aseprite.

    python tools/hud/hud_pieces.py <reference.png> <out-dir>
"""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

# name: ((x0, y0, x1, y1) in the reference's 1790 x 878 pixels, clear the map behind it).
# The flag is green itself and sits on wood: it is kept whole.
ORNAMENTS = {
    'flag': ((30, 10, 84, 64), False),
    'lantern': ((258, 10, 306, 84), True),
    'side-kit': ((398, 528, 500, 840), True),
    'bottom-strip': ((904, 790, 1790, 878), True),
}
COLOURS = 64


def greenish(rgb: np.ndarray) -> np.ndarray:
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    # Map grass and the dark green field: green leads red and blue, or the
    # field's near-black shadow (dark, not warm like the wood).
    lum = (r + g + b) // 3
    return ((g > r + 6) & (g > b + 10)) | ((lum < 48) & (g >= r - 2))


def clear_background(rgb: np.ndarray) -> np.ndarray:
    """Alpha: transparent where a greenish pixel joins the crop's border."""
    h, w, _ = rgb.shape
    green = greenish(rgb)
    gone = np.zeros((h, w), bool)
    queue = deque()
    for x in range(w):
        for y in (0, h - 1):
            if green[y, x] and not gone[y, x]:
                gone[y, x] = True
                queue.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if green[y, x] and not gone[y, x]:
                gone[y, x] = True
                queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and green[ny, nx] and not gone[ny, nx]:
                gone[ny, nx] = True
                queue.append((ny, nx))
    alpha = np.where(gone, 0, 255).astype(np.uint8)
    return drop_specks(alpha)


def drop_specks(alpha: np.ndarray, smallest: int = 40) -> np.ndarray:
    """Clears opaque islands smaller than `smallest` pixels (field noise)."""
    h, w = alpha.shape
    seen = np.zeros((h, w), bool)
    for sy in range(h):
        for sx in range(w):
            if alpha[sy, sx] == 0 or seen[sy, sx]:
                continue
            island, queue = [], deque([(sy, sx)])
            seen[sy, sx] = True
            while queue:
                y, x = queue.popleft()
                island.append((y, x))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and alpha[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        queue.append((ny, nx))
            if len(island) < smallest:
                for y, x in island:
                    alpha[y, x] = 0
    return alpha


def main() -> None:
    reference, out = Path(sys.argv[1]), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    source = np.asarray(Image.open(reference).convert('RGB'))
    pieces = []
    for name, ((x0, y0, x1, y1), clear) in ORNAMENTS.items():
        rgb = source[y0:y1, x0:x1]
        alpha = clear_background(rgb) if clear else np.full(rgb.shape[:2], 255, np.uint8)
        rgba = Image.fromarray(np.dstack([rgb, alpha]), 'RGBA')
        half = rgba.resize((rgba.width // 2, rgba.height // 2), Image.BOX)
        a = np.asarray(half)[..., 3]
        arr = np.asarray(half).copy()
        arr[..., 3] = np.where(a >= 128, 255, 0)
        pieces.append((name, Image.fromarray(arr, 'RGBA')))
    # One row per piece, 2 px apart.
    width = max(p.width for _, p in pieces)
    height = sum(p.height + 2 for _, p in pieces)
    atlas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    lines, y = [], 0
    for name, piece in pieces:
        atlas.paste(piece, (0, y))
        lines.append(f'{name} 0 {y} {piece.width} {piece.height}')
        y += piece.height + 2
    # Shared palette, no dithering: crisp pixel colours.
    alpha = atlas.getchannel('A')
    reduced = atlas.convert('RGB').quantize(COLOURS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    result = reduced.convert('RGBA')
    result.putalpha(alpha)
    result.save(out / 'ornaments.png')
    (out / 'ornaments.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'{len(pieces)} ornaments -> {out}')


if __name__ == '__main__':
    main()
