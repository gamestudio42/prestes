"""Cuts the battle HUD pieces out of the owner's reference image.

redo-battle-hud D1: the owner drew the HUD he wants in
`referencias para hud/Interface de comando da Coluna Prestes.png` and allowed
it to be rasterized for the game (2026-11-11). After his review on
2026-11-12 ("ta bem longe ainda do modelo") the frames are no longer redrawn
from a sampled palette: every frame, plate and ornament is cut from the
reference at its own size (one reference pixel is one CSS pixel at 1790 px
wide), the baked-in labels and icons are painted out, and the map behind
the ornaments is cleared.

It writes `pieces.png` (one piece per row) and `pieces.txt`
(`name x y w h [top right bottom left]`, the nine-slice insets when the
piece is a stretchable frame) for `build-hud.lua`, which lays them into the
Aseprite source as slices. Run once to seed the source; after that the art
is edited in Aseprite.

    python -I tools/hud/hud_pieces.py <reference.png> <out-dir>
"""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

# Each piece: box (x0, y0, x1, y1) in the reference's 1790 x 878 pixels,
# nine-slice insets (top, right, bottom, left) or None, what to paint out,
# and whether to clear the map behind it.
#   paint out: (rect, rule, fill) with rect in reference pixels,
#   rule 'light' (labels lighter than the plate), 'dark' (ink on a light
#   plate), 'all', or 'ink' (anything that is not parchment), and fill
#   'smooth' (blend in from the edges) or 'texture' (copy nearby texture).
PIECES = {
    'brand': ((0, 0, 270, 76), None, [((100, 8, 252, 66), 'light', 'smooth')], False),
    'rail': ((305, 0, 566, 74), (16, 16, 16, 16), [((316, 13, 556, 62), 'all', 'smooth')], False),
    'tab': ((440, 21, 547, 57), (8, 8, 8, 8), [((448, 27, 539, 51), 'light', 'smooth')], False),
    'tab-active': ((341, 21, 435, 57), (8, 8, 8, 8), [((349, 27, 427, 51), 'light', 'smooth')], False),
    'button': ((1278, 21, 1329, 53), (8, 8, 8, 8), [((1285, 26, 1322, 48), 'light', 'smooth')], False),
    'button-active': ((1413, 21, 1445, 53), (8, 8, 8, 8), [((1419, 26, 1439, 48), 'light', 'smooth')], False),
    'panel': ((30, 87, 344, 515), (38, 15, 14, 15), [((66, 91, 165, 122), 'light', 'smooth'), ((44, 124, 330, 503), 'all', 'smooth')], False),
    'panel-orders': ((1589, 160, 1788, 791), (42, 14, 16, 14), [((1612, 166, 1772, 198), 'light', 'smooth'), ((1600, 200, 1777, 778), 'all', 'smooth')], False),
    'card': ((50, 125, 310, 199), (7, 7, 7, 7), [((54, 129, 306, 195), 'all', 'smooth')], False),
    'group': ((1603, 200, 1775, 279), (9, 9, 9, 9), [((1609, 205, 1769, 273), 'all', 'smooth')], False),
    'order-button': ((1612, 229, 1647, 268), (8, 8, 8, 8), [((1617, 234, 1642, 263), 'light', 'smooth')], False),
    'order-button-active': ((1614, 484, 1651, 520), (8, 8, 8, 8), [((1619, 489, 1646, 515), 'light', 'smooth')], False),
    'summary': ((6, 528, 500, 868), None, [((112, 553, 392, 590), 'dark', 'smooth'), ((50, 595, 398, 824), 'all', ('patch', (240, 620, 360, 650)))], True),
    'lantern': ((258, 10, 306, 84), None, [], True),
    'drape-left': ((574, 0, 724, 58), None, [], True),
    'drape-right': ((962, 0, 1072, 56), None, [], True),
    'bottom-strip': ((900, 784, 1790, 878), None, [], True),
    # 2026-11-12, the owner's second review ("falta a bussola, os matinhos e
    # encaixar melhor os menus nos cantos"): the compass bezel, the grass
    # tufts at the bottom left, the post and flag beside Troops, the drape
    # beside Orders.
    'compass-bezel': ((1706, 52, 1790, 152), None, [((1723, 85, 1779, 141), 'disk', 'smooth')], 'grass+field'),
    # Cut wide enough to run under the Troops frame and overlapping each
    # other, so the dark leaves behind them leave no hole (the owner,
    # 2026-11-12: "parece que tem um buraco no hud").
    'flag-left': ((0, 60, 46, 276), None, [], 'grass'),
    'post-left': ((0, 268, 46, 535), None, [], 'grass+field'),
    'drape-orders': ((1540, 160, 1590, 445), None, [], 'grass'),
    'tuft-left': ((0, 740, 20, 878), None, [], 'field'),
    # The ground under the summary card: moss, stones and the tufts by the canteen.
    # Runs up the card's left side too, so no map shows between the card and
    # the screen's edge (the owner, 2026-11-12: "buraco na lateral e abaixo").
    'ground-left': ((0, 520, 660, 878), None, [], 'grass+field'),
}
# Edges where a piece's box cuts through grass that runs on in the
# reference (the owner, 2026-11-12: "as pontas das folhas ... corta muito
# seco"): the leaves there are thinned into ragged blade tips instead of a
# straight cut. Side ('l', 'r', 't', 'b') and depth in pixels.
FRINGE = {
    'bottom-strip': [('l', 34)],
    'summary': [('r', 22)],
    'ground-left': [('r', 40)],
    'tuft-left': [('r', 8)],
}
# The summary's title plate on its own, for the collapsed card (cut after painting out).
SOURCE_RGB = None
PLATE = ('summary-plate', (88, 18, 400, 66))


def luminance(rgb: np.ndarray) -> np.ndarray:
    return rgb[..., 0] * 0.3 + rgb[..., 1] * 0.59 + rgb[..., 2] * 0.11


def greenish(rgb: np.ndarray) -> np.ndarray:
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    lum = (r + g + b) // 3
    return ((g > r + 6) & (g > b + 10)) | ((lum < 48) & (g >= r - 2))


def grass(rgb: np.ndarray) -> np.ndarray:
    """Lit map grass only: the dark outlines of cloth and wood stop the flood."""
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    return (g > r + 6) & (g > b + 10) & ((r + g + b) // 3 > 50)


def field(rgb: np.ndarray) -> np.ndarray:
    """The dark green field behind the tufts."""
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    return ((r + g + b) // 3 < 58) & (g >= r - 4)


def flood_from_border(mask: np.ndarray) -> np.ndarray:
    h, w = mask.shape
    gone = np.zeros((h, w), bool)
    queue = deque()
    for x in range(w):
        for y in (0, h - 1):
            if mask[y, x] and not gone[y, x]:
                gone[y, x] = True
                queue.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if mask[y, x] and not gone[y, x]:
                gone[y, x] = True
                queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not gone[ny, nx]:
                gone[ny, nx] = True
                queue.append((ny, nx))
    return gone


def drop_specks(alpha: np.ndarray, smallest: int = 60) -> np.ndarray:
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


def dilate(mask: np.ndarray, steps: int) -> np.ndarray:
    out = mask.copy()
    for _ in range(steps):
        grown = out.copy()
        grown[1:] |= out[:-1]
        grown[:-1] |= out[1:]
        grown[:, 1:] |= out[:, :-1]
        grown[:, :-1] |= out[:, 1:]
        out = grown
    return out


def rule_mask(rgb: np.ndarray, rule: str) -> np.ndarray:
    lum = luminance(rgb.astype(float))
    if rule == 'all':
        return np.ones(lum.shape, bool)
    if rule == 'disk':
        h, w = lum.shape
        yy, xx = np.mgrid[0:h, 0:w]
        return ((xx - (w - 1) / 2) / (w / 2)) ** 2 + ((yy - (h - 1) / 2) / (h / 2)) ** 2 <= 1
    if rule == 'light':
        base = np.median(lum)
        return dilate(lum > base + 45, 2)
    if rule == 'dark':
        base = np.median(lum)
        return dilate(lum < base - 45, 2)
    if rule == 'ink':
        r, g, b = (rgb[..., i].astype(int) for i in range(3))
        parchment = (r > 150) & (g > 120) & (b > 80) & (r >= g) & (g >= b) & (r - b < 110)
        return dilate(~parchment, 2)
    raise ValueError(rule)


def fill_smooth(rgb: np.ndarray, mask: np.ndarray) -> None:
    """Fills masked pixels from their unmasked neighbours, ring by ring."""
    img = rgb.astype(float)
    known = ~mask
    h, w = mask.shape
    while not known.all():
        total = np.zeros_like(img)
        count = np.zeros((h, w))
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            shifted = np.zeros_like(img)
            ok = np.zeros((h, w), bool)
            ys = slice(max(dy, 0), h + min(dy, 0))
            yd = slice(max(-dy, 0), h + min(-dy, 0))
            xs = slice(max(dx, 0), w + min(dx, 0))
            xd = slice(max(-dx, 0), w + min(-dx, 0))
            shifted[yd, xd] = img[ys, xs]
            ok[yd, xd] = known[ys, xs]
            total += shifted * ok[..., None]
            count += ok
        frontier = (~known) & (count > 0)
        if not frontier.any():
            break
        img[frontier] = total[frontier] / count[frontier][:, None]
        known = known | frontier
    rgb[...] = np.clip(img, 0, 255).astype(np.uint8)


def fill_texture(rgb: np.ndarray, mask: np.ndarray) -> None:
    """Fills masked pixels by copying nearby unmasked texture (keeps the grain)."""
    h, w = mask.shape
    todo = mask.copy()
    offsets = [(0, 14), (0, -14), (14, 0), (-14, 0), (0, 28), (0, -28), (28, 0), (-28, 0), (9, 21), (-9, -21), (21, -9), (-21, 9)]
    for _ in range(40):
        if not todo.any():
            return
        for dy, dx in offsets:
            ys, xs = np.nonzero(todo)
            sy, sx = ys + dy, xs + dx
            inside = (sy >= 0) & (sy < h) & (sx >= 0) & (sx < w)
            ys, xs, sy, sx = ys[inside], xs[inside], sy[inside], sx[inside]
            good = ~todo[sy, sx]
            rgb[ys[good], xs[good]] = rgb[sy[good], sx[good]]
            todo[ys[good], xs[good]] = False
        offsets = [(dy * 2, dx * 2) for dy, dx in offsets]
    if todo.any():
        fill_smooth(rgb, todo)


def fringe(rgb: np.ndarray, alpha: np.ndarray, side: str, depth: int, seed: int) -> None:
    """Thins the leaves along one edge into blade tips: each blade keeps a
    tapering spike towards the edge, the gaps between them clear."""
    if side in ('l', 'r'):
        along, across = rgb.shape[0], rgb.shape[1]  # 't' and 'b' run along the width
    else:
        along, across = rgb.shape[1], rgb.shape[0]
    rng = np.random.default_rng(seed)
    reach = np.full(along, depth, float)  # how far in from the edge leaves are cleared
    pos = 0
    while pos < along:
        width = int(rng.integers(3, 8))
        tip = depth * float(rng.uniform(0.05, 0.75))
        for k in range(width):
            t = abs(k - (width - 1) / 2) / max(1, width / 2)  # 0 at the blade's spine
            reach[min(along - 1, pos + k)] = min(reach[min(along - 1, pos + k)], tip + (depth - tip) * t * t)
        pos += width + int(rng.integers(0, 4))
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    leafy = (g >= r - 6) & (g > b + 4)  # grass and moss, not leather or brass
    for i in range(along):
        cut_to = int(round(reach[i] + rng.uniform(-1, 1)))
        for j in range(min(across, max(0, cut_to))):
            y, x = {'l': (i, j), 'r': (i, across - 1 - j), 'b': (across - 1 - j, i), 't': (j, i)}[side]
            if leafy[y, x]:
                alpha[y, x] = 0


def cut(source: np.ndarray, box, paint, clear, edges=()) -> Image.Image:
    x0, y0, x1, y1 = box
    rgb = source[y0:y1, x0:x1].copy()
    alpha = np.full(rgb.shape[:2], 255, np.uint8)
    if clear:
        tests = {True: greenish, 'grass': grass, 'field': field}
        background = np.zeros(rgb.shape[:2], bool)
        for name in ([clear] if clear is True else clear.split('+')):
            background |= tests[name](rgb)
        alpha = np.where(flood_from_border(background), 0, 255).astype(np.uint8)
        alpha = drop_specks(alpha)
    for index, (side, depth) in enumerate(edges):
        fringe(rgb, alpha, side, depth, seed=x0 * 31 + y0 + index)
    if edges:
        alpha = drop_specks(alpha)
    for (rx0, ry0, rx1, ry1), rule, fill in paint:
        sub = rgb[ry0 - y0:ry1 - y0, rx0 - x0:rx1 - x0]
        mask = rule_mask(sub, rule)
        mask[[0, -1], :] = mask[[0, -1], :] & (rule == 'all')
        if isinstance(fill, tuple):
            # Tile a clean patch of the same surface, mirrored so the seams meet.
            _, (px0, py0, px1, py1) = fill
            patch = source[py0:py1, px0:px1]
            tile = np.concatenate([np.concatenate([patch, patch[:, ::-1]], 1), np.concatenate([patch[::-1], patch[::-1, ::-1]], 1)], 0)
            reps = (sub.shape[0] // tile.shape[0] + 1, sub.shape[1] // tile.shape[1] + 1, 1)
            sub[...] = np.tile(tile, reps)[: sub.shape[0], : sub.shape[1]]
        elif rule == 'disk':
            # The dial painted out to its own dark face: the game's rose turns on it.
            lum = luminance(sub.astype(float))
            sub[mask] = np.median(sub[mask & (lum <= np.median(lum[mask]))], axis=0).astype(np.uint8)
        elif rule == 'all':
            # A flat fill in the region's darker tone: live content covers it.
            lum = luminance(sub.astype(float))
            sub[...] = np.median(sub[lum <= np.median(lum)], axis=0).astype(np.uint8)
        elif fill == 'smooth':
            fill_smooth(sub, mask)
        else:
            fill_texture(sub, mask)
    return Image.fromarray(np.dstack([rgb, alpha]), 'RGBA')


def hug(ground: Image.Image, box, card: Image.Image, card_box, seed: int) -> Image.Image:
    """Lays the reference's dark moss back in a ragged band around the card
    and down to the screen's left and bottom edges, so the map never shows
    between them; the rest of the ground piece keeps its own cut."""
    x0, y0, x1, y1 = box
    cx0, cy0 = card_box[0] - x0, card_box[1] - y0
    h, w = y1 - y0, x1 - x0
    near = np.zeros((h, w), bool)
    opaque = np.asarray(card)[..., 3] > 0
    near[cy0:cy0 + opaque.shape[0], cx0:cx0 + opaque.shape[1]] = opaque
    ring = near.copy()
    rng = np.random.default_rng(seed)
    for step in range(12):
        grown = ring.copy()
        grown[1:] |= ring[:-1]; grown[:-1] |= ring[1:]; grown[:, 1:] |= ring[:, :-1]; grown[:, :-1] |= ring[:, 1:]
        keep = rng.random((h, w)) < (1.0 if step < 5 else 0.55)  # solid, then breaking into tips
        ring = ring | (grown & keep)
    ys, xs = np.mgrid[0:h, 0:w]
    edge = (xs < cx0 + 4) | (ys > cy0 + opaque.shape[0] - 4)
    right = cx0 + opaque.shape[1]
    rim = ((xs < cx0 + 10) & (ys > cy0 + 30)) | ((ys > h - 12) & (xs < right - 20))  # down to the screen's edges
    band = (ring & (edge | (xs < right - 60)) & (xs < right)) | rim
    band &= ~near
    reference = np.asarray(ground.convert('RGBA')).copy()
    reference[: cy0 + opaque.shape[0] // 2, :, 3] = 0  # the old ground began at the card's middle
    source = np.asarray(SOURCE_RGB)[y0:y1, x0:x1]
    reference[band, :3] = source[band]
    reference[band, 3] = 255
    return Image.fromarray(reference, 'RGBA')


def main() -> None:
    reference, out = Path(sys.argv[1]), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    source = np.asarray(Image.open(reference).convert('RGB'))
    global SOURCE_RGB
    SOURCE_RGB = source
    pieces = []
    for name, (box, insets, paint, clear) in PIECES.items():
        piece = cut(source, box, paint, clear, FRINGE.get(name, ()))
        if name == 'ground-left':
            card = next(p for n, p, _ in pieces if n == 'summary')
            piece = hug(piece, box, card, PIECES['summary'][0], seed=7)
        pieces.append((name, piece, insets))
        if name == 'summary':
            plate_name, crop = PLATE
            pieces.append((plate_name, piece.crop(crop), None))
    width = max(p.width for _, p, _ in pieces)
    height = sum(p.height + 2 for _, p, _ in pieces)
    atlas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    lines, y = [], 0
    for name, piece, insets in pieces:
        atlas.paste(piece, (0, y))
        extra = '' if insets is None else ' ' + ' '.join(str(v) for v in insets)
        lines.append(f'{name} 0 {y} {piece.width} {piece.height}{extra}')
        y += piece.height + 2
    atlas.save(out / 'pieces.png')
    (out / 'pieces.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'{len(pieces)} pieces -> {out}')


if __name__ == '__main__':
    main()
