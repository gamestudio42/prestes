"""Rasterizes the camp-tent menu from the owner's reference images.

camp-tent-menu: the owner drew the new start screen as a camp table under a
tent at dusk (`referencias para hud/Acampamento Rústico ao Entardecer - menu
vazio rasterizar completo.png`) and the desk objects on a magenta sheet
(`referencias para hud/Itens do Menu em Pixel Art.png`), and asked for both
to be rasterized and cut for the game (2026-11-12).

Both references are drawn on a pseudo-pixel of two reference pixels, so
every piece is reduced to one art pixel per 2 x 2 block (the block's most
central colour, on the grid phase that fits best) and quantized to a small
palette with no dithering. The desk shows art at 2x, so the pieces come
back at their reference size, with hard pixels.

- The table is rasterized whole. The "reset" plate and the hint that are
  baked into the drawing are painted out: the live controls draw them.
- Each object is keyed off the magenta sheet, despilled and cropped.
- The map sheet is drawn here, flat and frontal, in the colours of the
  reference's map folder, so a map's print fits its window square and the
  pile can be stacked from one sprite.

    python -I tools/menu/camp_pieces.py <table.png> <items.png> <out-dir>
"""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

# Object boxes on the item sheet (reference pixels, x0 y0 x1 y1), found by
# flood-filling the non-magenta areas.
OBJECTS = {
    'compendium-book-closed': (52, 532, 352, 760),   # green book
    'references-books': (252, 380, 548, 568),        # pile of three
    'campaign-book-closed': (600, 496, 832, 716),    # navy book with its cord
    'gramophone-body': (928, 392, 1204, 680),        # portable record player
    'binoculars': (1184, 248, 1492, 432),            # map editor
    'compass-closed': (1336, 420, 1544, 628),        # options
}

# Painted out of the table (reference pixels): the reset plate, top right,
# and the hint with its two ornaments, on the table's front edge.
TABLE_PAINT_OUT = [(1628, 8, 1768, 52), (566, 826, 1210, 868)]

TABLE_COLOURS = 96
OBJECT_COLOURS = 40


def best_phase(rgb: np.ndarray) -> tuple[int, int]:
    """The grid offset (0 or 1 on each axis) whose 2 x 2 blocks vary least."""
    best, phase = None, (0, 0)
    for oy in (0, 1):
        for ox in (0, 1):
            a = rgb[oy:, ox:]
            h, w = (a.shape[0] // 2) * 2, (a.shape[1] // 2) * 2
            blocks = a[:h, :w].reshape(h // 2, 2, w // 2, 2, 3)
            score = blocks.std(axis=(1, 3)).mean()
            if best is None or score < best:
                best, phase = score, (ox, oy)
    return phase


def reduce2(rgb: np.ndarray, alpha: np.ndarray | None = None):
    """One art pixel per 2 x 2 block: the block colour nearest the block mean."""
    ox, oy = best_phase(rgb)
    a = rgb[oy:, ox:].astype(np.float32)
    h, w = (a.shape[0] // 2) * 2, (a.shape[1] // 2) * 2
    blocks = a[:h, :w].reshape(h // 2, 2, w // 2, 2, 3).transpose(0, 2, 1, 3, 4).reshape(h // 2, w // 2, 4, 3)
    mean = blocks.mean(axis=2, keepdims=True)
    pick = np.abs(blocks - mean).sum(axis=3).argmin(axis=2)
    out = np.take_along_axis(blocks, pick[..., None, None], axis=2)[:, :, 0]
    if alpha is None:
        return out.astype(np.uint8), None
    al = alpha[oy:, ox:][:h, :w].reshape(h // 2, 2, w // 2, 2).sum(axis=(1, 3)) >= 3
    return out.astype(np.uint8), al


def quantize(rgb: np.ndarray, colours: int, alpha: np.ndarray | None = None) -> Image.Image:
    img = Image.fromarray(rgb, 'RGB')
    q = img.quantize(colors=colours, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    if alpha is None:
        return q
    # One palette index is kept for the transparent pixels, so the sprite
    # stays an indexed PNG (small, and every pixel is a palette colour).
    index = np.asarray(q).copy()
    index[~alpha] = colours
    palette = q.getpalette()[: colours * 3] + [0, 0, 0]
    out = Image.fromarray(index.astype(np.uint8), 'P')
    out.putpalette(palette)
    out.info['transparency'] = colours
    return out


def paint_out(rgb: np.ndarray, rect: tuple[int, int, int, int]) -> None:
    """Fills a box from its border inwards (a slow diffusion: no tools needed)."""
    x0, y0, x1, y1 = rect
    region = rgb[y0 - 1:y1 + 1, x0 - 1:x1 + 1].astype(np.float32)
    known = np.zeros(region.shape[:2], bool)
    known[0, :] = known[-1, :] = known[:, 0] = known[:, -1] = True
    # Grow rows in from the top and bottom, blending the two edges, then
    # relax: the plates sit on sky and on a dark band, both smooth.
    hgt = region.shape[0]
    top, bottom = region[0].copy(), region[-1].copy()
    for y in range(1, hgt - 1):
        t = y / (hgt - 1)
        region[y, 1:-1] = top[1:-1] * (1 - t) + bottom[1:-1] * t
    for _ in range(60):
        inner = (region[:-2, 1:-1] + region[2:, 1:-1] + region[1:-1, :-2] + region[1:-1, 2:]) / 4
        region[1:-1, 1:-1] = inner
    rgb[y0:y1, x0:x1] = np.clip(region[1:-1, 1:-1], 0, 255).astype(np.uint8)


def table(path: Path, out: Path) -> None:
    rgb = np.asarray(Image.open(path).convert('RGB')).copy()
    for rect in TABLE_PAINT_OUT:
        paint_out(rgb, rect)
    small, _ = reduce2(rgb)
    quantize(small, TABLE_COLOURS).save(out / 'camp-table.png', optimize=True)


def magenta(rgb: np.ndarray) -> np.ndarray:
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    return (r > 150) & (b > 150) & (g < 120) & (np.abs(r - b) < 90)


def largest_component(alpha: np.ndarray) -> np.ndarray:
    """Keeps the biggest opaque island, so stray specks of the sheet go."""
    h, w = alpha.shape
    seen = np.zeros_like(alpha)
    best: list[tuple[int, int]] = []
    for y in range(h):
        for x in range(w):
            if alpha[y, x] and not seen[y, x]:
                q, pts = deque([(y, x)]), []
                seen[y, x] = True
                while q:
                    cy, cx = q.popleft()
                    pts.append((cy, cx))
                    for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                        if 0 <= ny < h and 0 <= nx < w and alpha[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            q.append((ny, nx))
                if len(pts) > len(best):
                    best = pts
    keep = np.zeros_like(alpha)
    for y, x in best:
        keep[y, x] = True
    return keep


def despill(rgb: np.ndarray, alpha: np.ndarray) -> None:
    """Drops edge pixels tinted by the magenta sheet and neutralizes the rest."""
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    tint = (r - g > 60) & (b - g > 60) & (b > 90)
    edge = alpha & ~(np.roll(alpha, 1, 0) & np.roll(alpha, -1, 0) & np.roll(alpha, 1, 1) & np.roll(alpha, -1, 1))
    alpha &= ~(tint & edge)
    # Any tint left inside loses its blue excess.
    left = alpha & tint
    rgb[..., 2] = np.where(left, np.minimum(b, g + 30), b).astype(np.uint8)


def objects(path: Path, out: Path) -> None:
    sheet = np.asarray(Image.open(path).convert('RGB'))
    for name, (x0, y0, x1, y1) in OBJECTS.items():
        rgb = sheet[y0:y1, x0:x1].copy()
        alpha = ~magenta(rgb)
        small, al = reduce2(rgb, alpha)
        al = largest_component(al)
        small = small.copy()
        despill(small, al)
        al = largest_component(al)
        ys, xs = np.nonzero(al)
        crop = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
        img = quantize(small[crop].copy(), OBJECT_COLOURS, al[crop])
        img.save(out / f'{name}.png', optimize=True, transparency=OBJECT_COLOURS)
        print(name, img.size)
        if name == 'gramophone-body':
            grooves(img.convert('RGBA'), out)


def grooves(body: Image.Image, out: Path) -> None:
    """The record's groove highlights, a layer the open and closed machine shimmer.

    The record is the dark disc on the platter: its box is printed so the CSS
    can lay the layer over it in percent of the body.
    """
    rgba = np.asarray(body).astype(int)
    luma = rgba[..., :3].mean(axis=2)
    h, w = luma.shape
    dark = (luma < 48) & (rgba[..., 3] > 0)
    # The record sits in the lower-left half of the case, below its open lid.
    dark[: int(h * 0.45)] = False
    dark[:, int(w * 0.62):] = False
    disc = largest_component(dark)
    ys, xs = np.nonzero(disc)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2
    layer = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    for y in range(y0, y1):
        for x in range(x0, x1):
            if not disc[y, x]:
                continue
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            # Two lit groove bands on the side facing the lantern (upper left).
            facing = (x + 0.5 - cx) < 0.25 * rx and (y + 0.5 - cy) < 0.2 * ry
            if facing and (0.42 < d < 0.52 or 0.72 < d < 0.82):
                layer[y - y0, x - x0] = (150, 138, 120, 255)
    Image.fromarray(layer, 'RGBA').save(out / 'gramophone-grooves.png', optimize=True)
    print('gramophone-grooves', (x1 - x0, y1 - y0), 'at', (x0, y0), 'in', (w, h),
          'css top %.1f%% left %.1f%% width %.1f%% height %.1f%%' % (100 * y0 / h, 100 * x0 / w, 100 * (x1 - x0) / w, 100 * (y1 - y0) / h))


# --- The map sheet --------------------------------------------------------
# The yellowed parchment of the table's own map (the owner, 2026-11-12:
# "na tonalidade amarelada"), on the reference's map-folder card.
CARD = (222, 176, 108)
CARD_LIGHT = (234, 194, 128)
CARD_SHADE = (190, 144, 84)
CARD_EDGE = (164, 112, 58)
CARD_OUTLINE = (92, 56, 30)
WINDOW_RIM = (120, 82, 44)
GOLD_LINE = (224, 150, 58)

SHEET_W, SHEET_H = 144, 136
WINDOW = (26, 8, 118, 100)  # x0 y0 x1 y1: a square window, so a print is never cropped
LEGEND_Y = 106             # the fold above the legend strip


def map_sheet(out: Path) -> None:
    w, h = SHEET_W, SHEET_H
    img = np.zeros((h, w, 4), np.uint8)
    rng = np.random.default_rng(1924)
    img[..., :3] = CARD
    img[..., 3] = 255
    # Paper grain: a few lighter and darker specks, in the card's colours.
    grain = rng.random((h, w))
    img[grain < 0.06, :3] = CARD_SHADE
    img[grain > 0.95, :3] = CARD_LIGHT
    # Outline, then a lit top and left edge and a shaded bottom and right.
    img[0, :, :3] = img[-1, :, :3] = CARD_OUTLINE
    img[:, 0, :3] = img[:, -1, :3] = CARD_OUTLINE
    img[1, 1:-1, :3] = CARD_LIGHT
    img[1:-1, 1, :3] = CARD_LIGHT
    img[-2, 1:-1, :3] = CARD_EDGE
    img[1:-1, -2, :3] = CARD_EDGE
    img[-3, 2:-2, :3] = CARD_SHADE
    # Stepped corners.
    for y, x in ((0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)):
        img[y, x, 3] = 0
    # The window: a dark rim, the print sits inside (left transparent).
    x0, y0, x1, y1 = WINDOW
    img[y0 - 1:y1 + 1, x0 - 1:x1 + 1, :3] = WINDOW_RIM
    img[y1 + 1, x0 - 1:x1 + 2, :3] = CARD_LIGHT
    img[y0:y1, x0:x1, 3] = 0
    # The fold above the legend and its gold rule, as on the reference.
    img[LEGEND_Y, 2:-2, :3] = CARD_SHADE
    img[LEGEND_Y + 1, 2:-2, :3] = CARD_LIGHT
    img[y1 + 3, x0 - 6:x1 + 6, :3] = GOLD_LINE
    Image.fromarray(img, 'RGBA').save(out / 'map-sheet.png', optimize=True)
    print('map-sheet', (w, h), 'window', WINDOW)


def main() -> None:
    table_path, items_path, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    out.mkdir(parents=True, exist_ok=True)
    table(table_path, out)
    objects(items_path, out)
    map_sheet(out)


if __name__ == '__main__':
    main()
