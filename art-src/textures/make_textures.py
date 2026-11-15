"""Pixel-art texture atlases for the low-poly world (phase 4).

Draws three small atlases in the sepia palette and writes their region index:

  soldier-<outfit>-<n>.png  128 x 128  same layout per outfit (<army uniform>-troop and -officer), three variants
  environment.png  128 x 128 16 x 16 swatches: plaster, tile, timber, stone...
  effects.png      64 x 16   8 x 8 sprite frames: muzzle, smoke, dust, splinter
  regions.json     swatch name -> [x, y, w, h] in pixels, per atlas

Blender's build scripts map each face to its swatch through regions.json; the
game loads the PNGs with nearest filtering. Run with the system Python (Pillow):

  python art-src/textures/make_textures.py
"""
from __future__ import annotations

import json
import os
import random

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))

# The sepia palette shared with the interface, plus faction accents.
INK = (27, 20, 13)
DARK = (42, 31, 20)
BROWN = (68, 51, 33)
MID = (98, 76, 50)
TAN = (133, 106, 72)
SAND = (169, 140, 99)
LIGHT = (205, 180, 136)
PAPER = (239, 226, 196)
KHAKI = (150, 134, 92)
KHAKI_DARK = (112, 99, 66)
OLIVE = (96, 104, 62)
OLIVE_DARK = (70, 76, 44)
RED = (150, 58, 44)
RED_DARK = (110, 40, 32)
SKIN = (196, 146, 108)
SKIN_DARK = (160, 112, 80)
METAL = (78, 80, 74)
METAL_LIGHT = (128, 130, 120)
WOOD = (110, 78, 48)
WOOD_DARK = (80, 56, 34)
GOLD = (224, 184, 90)
LEAF = (83, 98, 53)
LEAF_DARK = (58, 72, 40)
LEAF_LIGHT = (112, 128, 70)


class Atlas:
    def __init__(self, width: int, height: int, seed: str = "") -> None:
        self.seed = seed
        self.image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        self.px = self.image.load()
        self.regions: dict[str, list[int]] = {}

    def swatch(self, name: str, x: int, y: int, w: int, h: int, paint) -> None:
        rng = random.Random(name + self.seed)
        for j in range(h):
            for i in range(w):
                self.px[x + i, y + j] = (*paint(i, j, rng), 255)
        self.regions[name] = [x, y, w, h]


def noise(base, alt, chance):
    return lambda i, j, rng: alt if rng.random() < chance else base


def cloth(base, dark, seam_every=4):
    def paint(i, j, rng):
        if j % seam_every == seam_every - 1 and rng.random() < 0.5:
            return dark
        return dark if rng.random() < 0.12 else base
    return paint


CREAM = (214, 200, 166)
CREAM_DARK = (176, 160, 124)

# soldier-animation-and-textures 3.2: a uniform set per army (the army's
# `uniform` in packages/shared/src/armies.ts), for the rank and file and for
# officers. Sources in docs/history/FORCES.md; details without a source are
# listed as placeholders in docs/assets.md.
OUTFITS = {
    # The column: worn khaki, the red scarf of the 1924 rebels (Macaulay p. 44),
    # slouch hat, bandolier. Khaki and the hat are placeholders.
    "coluna-troop": dict(tunic=(KHAKI, KHAKI_DARK), trousers=(KHAKI_DARK, BROWN), hat=(TAN, MID),
                         scarf=(RED, RED_DARK), puttees=(SAND, TAN)),
    # Its officers: a better-kept tunic, the scarf, dark boots (placeholder).
    "coluna-officer": dict(tunic=(SAND, KHAKI), trousers=(MID, BROWN), hat=(KHAKI_DARK, BROWN),
                           scarf=(RED, RED_DARK), puttees=(INK, DARK)),
    # Federal army and state militias: olive uniform and kepi (placeholder:
    # the uniforms of 1924-1927 are an open question in FORCES.md).
    "legalista-troop": dict(tunic=(OLIVE, OLIVE_DARK), trousers=(OLIVE_DARK, DARK), hat=(OLIVE_DARK, DARK),
                            scarf=(OLIVE, OLIVE_DARK), puttees=(OLIVE_DARK, DARK)),
    # Legalist officers: the same olive, gold buttons and badge, dark boots.
    "legalista-officer": dict(tunic=(OLIVE, OLIVE_DARK), trousers=(OLIVE_DARK, DARK), hat=(OLIVE_DARK, DARK),
                              scarf=(GOLD, TAN), puttees=(INK, DARK)),
    # Patriotic battalions: the allied chiefs' jagunços in their own clothes
    # (Macaulay p. 189; Franklin's own men had federal uniforms). Pale cotton,
    # leather hat and leather sandals are placeholders.
    "patriotico-troop": dict(tunic=(CREAM, CREAM_DARK), trousers=(MID, BROWN), hat=(BROWN, DARK),
                             scarf=(TAN, MID), puttees=(MID, BROWN), boots=(BROWN, DARK)),
    # Their chiefs: a dark civilian jacket and the leather hat (placeholder).
    "patriotico-officer": dict(tunic=(DARK, INK), trousers=(BROWN, DARK), hat=(BROWN, DARK),
                               scarf=(CREAM, CREAM_DARK), puttees=(INK, DARK), boots=(DARK, INK)),
}


SOLDIER_SIZE = 128
SWATCH = 16


def shade(colour, by: int):
    """`colour` lighter (by > 0) or darker (by < 0), clamped."""
    return tuple(max(0, min(255, c + by)) for c in colour)


def layered(base, dark, *layers):
    """soldier-animation-and-textures 3.1: cloth painted in layers. The base
    weave and grain first, then each layer may replace the pixel: a layer is
    `fn(i, j, rng, colour) -> colour`."""
    def paint(i, j, rng):
        colour = dark if rng.random() < 0.1 else base
        for layer in layers:
            colour = layer(i, j, rng, colour)
        return colour
    return paint


def folds(dark, rows=(5, 11), slope=1):
    """Creases: short diagonal dark runs across the given rows."""
    def layer(i, j, rng, colour):
        for row in rows:
            if j == row + ((i * slope) // 5) % 2 and rng.random() < 0.7:
                return dark
        return colour
    return layer


def wear(light, chance=0.05, low_rows=0, grime=None):
    """Worn cloth: pale scuffs everywhere, grime on the bottom `low_rows`."""
    def layer(i, j, rng, colour):
        if grime is not None and j >= SWATCH - low_rows and rng.random() < 0.35:
            return grime
        if rng.random() < chance:
            return light
        return colour
    return layer


def pockets(dark, button):
    """Two breast pockets with flaps and a button line down the front."""
    def layer(i, j, rng, colour):
        if i in (7, 8) and j % 3 == 1:
            return button
        for x0 in (2, 10):
            if x0 <= i <= x0 + 3 and j in (3, 7):
                return dark
            if i in (x0, x0 + 3) and 3 <= j <= 7:
                return dark
            if i == x0 + 1 and j == 4:
                return button
        return colour
    return layer


def back_seam(dark):
    def layer(i, j, rng, colour):
        return dark if i == 8 and rng.random() < 0.8 else colour
    return layer


def knees(light, grime):
    """Trouser fronts: knees rubbed pale, dust at the hems."""
    def layer(i, j, rng, colour):
        if 6 <= j <= 9 and 3 <= i <= 12 and rng.random() < 0.45:
            return light
        if j >= 13 and rng.random() < 0.4:
            return grime
        return colour
    return layer


def puttee_wrap(base, dark):
    """Puttees wound in diagonal turns."""
    return lambda i, j, rng: dark if (i + 2 * j) % 6 in (0, 1) else (shade(base, 12) if rng.random() < 0.05 else base)


def belt(leather, buckle, edge):
    def paint(i, j, rng):
        if j in (0, SWATCH - 1):
            return edge
        if 5 <= i <= 10 and 4 <= j <= 11:
            return buckle if (i in (5, 10) or j in (4, 11)) else leather
        return shade(leather, 10) if rng.random() < 0.08 else leather
    return paint


def face(skin, dark, ink, moustache):
    """The front of the head: brows, eyes, nose shadow and, for some, a moustache."""
    def paint(i, j, rng):
        if j == 5 and i in (3, 4, 5, 10, 11, 12):
            return dark
        if j == 7 and i in (4, 11):
            return ink
        if 8 <= j <= 10 and i in (7, 8):
            return dark
        if moustache and j == 11 and 4 <= i <= 11:
            return ink
        if j == 13 and 6 <= i <= 9:
            return dark
        return dark if rng.random() < 0.06 else skin
    return paint


def hat_band(base, dark, band, badge=None):
    """Headgear sides: a band at the bottom, sweat stains, and a badge on the front."""
    def paint(i, j, rng):
        if badge is not None and 6 <= i <= 9 and 4 <= j <= 7:
            return badge
        if j >= 11:
            return band
        if j == 10 and rng.random() < 0.5:
            return dark
        return dark if rng.random() < 0.12 else base
    return paint


def crown(base, dark):
    """The top of the hat: the crease of the crown down the middle."""
    return lambda i, j, rng: dark if i == 8 or (j in (4, 11) and 5 <= i <= 11) else (dark if rng.random() < 0.1 else base)


OUTFIT_DETAIL = {
    "coluna-troop": dict(button=MID, band=RED_DARK, badge=None, moustache=True, buckle=GOLD),
    "coluna-officer": dict(button=GOLD, band=RED_DARK, badge=None, moustache=True, buckle=GOLD),
    "legalista-troop": dict(button=METAL_LIGHT, band=DARK, badge=METAL_LIGHT, moustache=False, buckle=METAL_LIGHT),
    "legalista-officer": dict(button=GOLD, band=RED_DARK, badge=GOLD, moustache=True, buckle=GOLD),
    "patriotico-troop": dict(button=CREAM_DARK, band=DARK, badge=None, moustache=True, buckle=METAL),
    "patriotico-officer": dict(button=METAL_LIGHT, band=INK, badge=None, moustache=True, buckle=METAL_LIGHT),
}


# 3.3: three variants per uniform set, chosen in the view by soldier id: the
# cloth a shade darker or lighter (washed, worn), a fresh weave, and the
# moustache on some faces and not others.
UNIFORM_VARIANTS = 3
VARIANT_SHADE = (0, -12, 10)


def soldier_atlas(outfit: str, variant: int = 0) -> Atlas:
    """One atlas per outfit with the same layout, so one model wears all three.
    3.1: 128 x 128, 16 x 16 swatches, each face painted in layers."""
    atlas = Atlas(SOLDIER_SIZE, SOLDIER_SIZE, seed=f"#{variant}" if variant else "")
    by = VARIANT_SHADE[variant]
    colours = {key: tuple(shade(c, by) for c in pair) if key in ("tunic", "trousers", "hat") else pair
               for key, pair in OUTFITS[outfit].items()}
    detail = dict(OUTFIT_DETAIL[outfit])
    if variant == 1:
        detail["moustache"] = not detail["moustache"]
    tunic, tunic_dark = colours["tunic"]
    trousers, trousers_dark = colours["trousers"]
    hat, hat_dark = colours["hat"]
    dust = shade(SAND, -10)
    n = SWATCH
    # Row 0: the uniform.
    atlas.swatch("tunic", 0, 0, n, n, layered(tunic, tunic_dark, folds(tunic_dark, (6, 12)), wear(shade(tunic, 18))))
    atlas.swatch("tunic-front", n, 0, n, n, layered(tunic, tunic_dark, folds(tunic_dark, (12,)), pockets(tunic_dark, detail["button"]), wear(shade(tunic, 18))))
    atlas.swatch("tunic-back", 2 * n, 0, n, n, layered(tunic, tunic_dark, back_seam(tunic_dark), folds(tunic_dark, (10, 13)), wear(shade(tunic, 18))))
    atlas.swatch("trousers", 3 * n, 0, n, n, layered(trousers, trousers_dark, folds(trousers_dark, (4, 9), slope=2), wear(shade(trousers, 16), 0.04, 3, dust)))
    atlas.swatch("trousers-front", 4 * n, 0, n, n, layered(trousers, trousers_dark, knees(shade(trousers, 22), dust), folds(trousers_dark, (3,), slope=2)))
    atlas.swatch("hat", 5 * n, 0, n, n, hat_band(hat, hat_dark, detail["band"]))
    atlas.swatch("hat-front", 6 * n, 0, n, n, hat_band(hat, hat_dark, detail["band"], detail["badge"]))
    atlas.swatch("hat-top", 7 * n, 0, n, n, crown(hat, hat_dark))
    # Row 1: neck, legs.
    atlas.swatch("scarf", 0, n, n, n, layered(colours["scarf"][0], colours["scarf"][1], folds(colours["scarf"][1], (4, 9, 13))))
    atlas.swatch("puttees", n, n, n, n, puttee_wrap(*colours["puttees"]))
    # Row 3: skin, kit and rifle.
    y = 3 * n
    atlas.swatch("skin", 0, y, n, n, noise(SKIN, SKIN_DARK, 0.1))
    atlas.swatch("face", n, y, n, n, face(SKIN, SKIN_DARK, INK, detail["moustache"]))
    boots, boots_dark = colours.get("boots", (DARK, INK))
    atlas.swatch("boots", 2 * n, y, n, n, layered(boots, boots_dark, wear(dust, 0.0, 4, dust)))
    atlas.swatch("leather", 3 * n, y, n, n, lambda i, j, rng: GOLD if (i % 5 == 2 and j % 6 == 2) else (shade(BROWN, 12) if rng.random() < 0.08 else BROWN))
    atlas.swatch("belt-front", 4 * n, y, n, n, belt(BROWN, detail["buckle"], DARK))
    atlas.swatch("rifle.wood", 5 * n, y, n, n, lambda i, j, rng: WOOD_DARK if j % 5 == 0 else WOOD)
    atlas.swatch("rifle.metal", 6 * n, y, n, n, noise(METAL, METAL_LIGHT, 0.15))
    atlas.swatch("blood", 7 * n, y, n, n, noise(RED_DARK, (80, 28, 22), 0.3))
    return atlas


def environment_atlas() -> Atlas:
    atlas = Atlas(128, 128)
    S = 16

    def cell(index):
        return (index % 8) * S, (index // 8) * S

    def plaster(base, dark):
        def paint(i, j, rng):
            if rng.random() < 0.06:
                return dark
            if j == S - 1:
                return dark
            return base
        return paint

    def tile(i, j, rng):
        # Clay canal tiles, two across a cell: a lit capa, a shaded canal and
        # a soft crease between them; a course shadow every 8 rows.
        if j % 8 == 7:
            return (128, 66, 46)
        k = i % 8
        if k == 7:
            return (124, 64, 44)
        if k in (1, 2):
            return (184, 104, 70)
        if k in (0, 3):
            return (166, 92, 62)
        return (146, 78, 54) if rng.random() > 0.08 else (138, 74, 52)

    def timber(i, j, rng):
        if i % 5 == 0:
            return WOOD_DARK
        return WOOD if rng.random() > 0.1 else WOOD_DARK

    def stone(i, j, rng):
        row = j // 5
        offset = 4 if row % 2 else 0
        if j % 5 == 4 or (i + offset) % 8 == 7:
            return MID
        return SAND if rng.random() > 0.15 else TAN

    def sandbag(i, j, rng):
        row = j // 4
        offset = 3 if row % 2 else 0
        if j % 4 == 3 or (i + offset) % 6 == 5:
            return TAN
        return LIGHT if rng.random() > 0.2 else SAND

    def earth(i, j, rng):
        return BROWN if rng.random() > 0.25 else MID

    def canvas(i, j, rng):
        return PAPER if (i + j) % 7 else LIGHT

    def cross(i, j, rng):
        if 6 <= i <= 9 or 6 <= j <= 9:
            if 3 <= i <= 12 and 3 <= j <= 12:
                return RED
        return PAPER

    def bark(i, j, rng):
        return WOOD_DARK if i % 3 == 0 or rng.random() < 0.2 else BROWN

    def leaves(base, dark, light):
        def paint(i, j, rng):
            r = rng.random()
            return dark if r < 0.3 else light if r > 0.85 else base
        return paint

    def target(i, j, rng):
        d = max(abs(i - 7.5), abs(j - 7.5))
        return INK if 2 < d < 3.5 or d < 1.2 else PAPER

    def metal(i, j, rng):
        return METAL_LIGHT if j % 5 == 0 else METAL

    def crate(i, j, rng):
        if i in (0, S - 1) or j in (0, S - 1) or i == j:
            return WOOD_DARK
        return WOOD

    def canvas_worn(i, j, rng):
        if 2 <= i <= 6 and 9 <= j <= 13:
            return (150, 136, 108) if i not in (2, 6) and j not in (9, 13) else (116, 104, 82)
        if rng.random() < 0.08:
            return (148, 140, 120)
        return (186, 176, 150) if (i + j) % 7 else (166, 156, 132)

    def canvas_army(i, j, rng):
        if j % 8 == 7:
            return (104, 108, 70)
        return (132, 136, 92) if (i + j) % 7 else (118, 122, 80)

    def crate_army(i, j, rng):
        if i in (0, S - 1) or j in (0, S - 1):
            return (60, 66, 44)
        if 5 <= j <= 9 and 3 <= i <= 12 and (i + j) % 3 == 0:
            return (220, 214, 190)
        return (90, 98, 64) if rng.random() > 0.06 else (74, 82, 52)

    def window(i, j, rng):
        if i in (0, 1, S - 2, S - 1) or j in (0, 1, S - 2, S - 1) or i in (7, 8) or j in (7, 8):
            return WOOD_DARK
        return INK

    def door(i, j, rng):
        return WOOD_DARK if i % 4 == 0 or j in (0, S - 1) else WOOD

    def hay(i, j, rng):
        if (i + j * 2) % 7 == 0:
            return TAN
        return GOLD if rng.random() > 0.35 else SAND

    def grass(i, j, rng):
        r = rng.random()
        return LEAF_DARK if r < 0.35 else LEAF if r < 0.85 else LEAF_LIGHT

    def thatch(i, j, rng):
        if j % 3 == 0 and rng.random() < 0.6:
            return TAN
        return GOLD if rng.random() > 0.45 else SAND if rng.random() > 0.3 else (150, 120, 70)

    def zinc(i, j, rng):
        # Corrugated sheet: a light and a shaded rib in turn, a few rust specks.
        if rng.random() < 0.05:
            return (150, 120, 96)
        return METAL_LIGHT if i % 2 == 0 else (164, 166, 158)

    def brick(i, j, rng):
        row = j // 4
        offset = 3 if row % 2 else 0
        if j % 4 == 3 or (i + offset) % 6 == 5:
            return LIGHT
        return (150, 72, 50) if rng.random() > 0.2 else RED_DARK

    def worn(i, j, rng):
        # Whitewash flaking off the adobe under it, worst near the ground.
        patch = (i * 7 + j * 3) % 11 < 2 or (j > 10 and rng.random() < 0.3)
        return SAND if patch else (PAPER if rng.random() > 0.06 else LIGHT)

    def shutter(i, j, rng):
        if i in (0, S - 1) or j in (0, S - 1):
            return (40, 64, 48)
        return (66, 104, 76) if j % 3 else (52, 84, 60)

    def tile_old(i, j, rng):
        # Weathered tiles: the same shape, browner, with moss and soot.
        if rng.random() < 0.1:
            return (104, 92, 62)
        if j % 8 == 7:
            return (102, 58, 42)
        k = i % 8
        if k == 7:
            return (98, 56, 40)
        if k in (1, 2):
            return (150, 88, 60)
        if k in (0, 3):
            return (136, 78, 54)
        return (120, 68, 48)

    # revise-buildings-and-stone 4.1: the rock kinds.
    def granite(i, j, rng):
        r = rng.random()
        return (92, 92, 90) if r < 0.18 else (176, 160, 150) if r < 0.3 else (140, 138, 132)

    def concrete(i, j, rng):
        # Cast concrete of a 1920s street works: a smooth pale grey, speckled.
        r = rng.random()
        return (138, 136, 130) if r < 0.1 else (184, 182, 174) if r < 0.2 else (164, 162, 155)

    def basalt(i, j, rng):
        if j % 5 == 4 and rng.random() < 0.7:
            return (40, 42, 44)
        return (70, 72, 74) if rng.random() > 0.15 else (56, 58, 60)

    def sandstone(i, j, rng):
        band = (j // 3) % 3
        base = ((178, 120, 78), (196, 142, 96), (160, 104, 66))[band]
        return base if rng.random() > 0.1 else (140, 92, 60)

    def quartzite(i, j, rng):
        r = rng.random()
        if (i * 5 + j * 3) % 13 < 2:
            return (150, 84, 50)
        return (214, 206, 190) if r > 0.2 else (186, 178, 164)

    def canga(i, j, rng):
        r = rng.random()
        return (96, 50, 32) if r < 0.25 else (150, 82, 46) if r < 0.75 else (122, 66, 40)

    def cobble(i, j, rng):
        r = rng.random()
        return (130, 118, 100) if r < 0.4 else (108, 100, 88) if r < 0.8 else (152, 140, 120)

    swatches = [
        ("plaster", plaster(PAPER, LIGHT)),
        ("plaster.shade", plaster(LIGHT, SAND)),
        ("adobe", plaster(SAND, TAN)),
        ("tile", tile),
        ("timber", timber),
        ("stone", stone),
        ("sandbag", sandbag),
        ("earth", earth),
        ("canvas", canvas),
        ("canvas.cross", cross),
        ("bark", bark),
        ("leaf", leaves(LEAF, LEAF_DARK, LEAF_LIGHT)),
        ("leaf.dark", leaves(LEAF_DARK, (44, 54, 30), LEAF)),
        ("target", target),
        ("metal", metal),
        ("crate", crate),
        ("window", window),
        ("door", door),
        ("grass", grass),
        ("flag", noise(RED, RED_DARK, 0.15)),
        ("ink", noise(INK, DARK, 0.1)),
        ("hay", hay),
        # revise-buildings-and-stone 3.1: roofs, washes and fittings of the
        # 1920s interior (appended: the swatches above keep their cells).
        ("thatch", thatch),
        ("zinc", zinc),
        ("brick", brick),
        ("wash.ochre", plaster((214, 170, 92), (182, 138, 70))),
        ("wash.blue", plaster((170, 190, 196), (136, 158, 166))),
        ("wash.rose", plaster((214, 168, 150), (180, 134, 118))),
        ("plaster.worn", worn),
        ("trim", noise((128, 70, 46), (104, 54, 36), 0.12)),
        ("shutter", shutter),
        ("iron", noise((46, 44, 40), (70, 68, 62), 0.15)),
        ("tile.old", tile_old),
        ("granite", granite),
        ("basalt", basalt),
        ("sandstone", sandstone),
        ("quartzite", quartzite),
        ("canga", canga),
        ("cobble", cobble),
        # revise-buildings-and-stone 5.2 (D11): the camp by side. The Column's
        # canvas worn, stained and patched; the government's issue canvas and
        # its painted ammunition boxes.
        ("canvas.worn", canvas_worn),
        ("canvas.army", canvas_army),
        ("crate.army", crate_army),
        # The concrete pipes of the Avenida Atlantica works (Copacabana, 1922).
        ("concrete", concrete),
    ]
    for index, (name, paint) in enumerate(swatches):
        x, y = cell(index)
        atlas.swatch(name, x, y, S, S, paint)
    return atlas


def effects_atlas() -> Atlas:
    """8 x 8 sprite frames; alpha matters (unpainted pixels stay clear)."""
    atlas = Atlas(64, 16)

    def sprite(name, x, y, rows, colours):
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch != ".":
                    atlas.px[x + i, y + j] = (*colours[ch], 255)
        atlas.regions[name] = [x, y, 8, 8]

    flash = {"#": PAPER, "o": GOLD, "r": RED}
    sprite("muzzle.0", 0, 0, [
        "........",
        "...o....",
        "..o#o...",
        ".o###oo.",
        "..o#o...",
        "...o....",
        "........",
        "........",
    ], flash)
    sprite("muzzle.1", 8, 0, [
        "........",
        "........",
        "...o....",
        "..o#oo..",
        "...o....",
        "........",
        "........",
        "........",
    ], flash)
    smoke = {"#": LIGHT, "o": SAND}
    sprite("smoke.0", 16, 0, [
        "........",
        "...##...",
        "..####..",
        "..#oo#..",
        "...##...",
        "........",
        "........",
        "........",
    ], smoke)
    sprite("smoke.1", 24, 0, [
        "..#..#..",
        ".##.###.",
        ".#o##o#.",
        "..####..",
        ".##..##.",
        "........",
        "........",
        "........",
    ], smoke)
    dust = {"#": SAND, "o": TAN}
    sprite("dust.0", 32, 0, [
        "........",
        "........",
        "........",
        "...##...",
        "..#oo#..",
        ".##oo##.",
        "........",
        "........",
    ], dust)
    sprite("dust.1", 40, 0, [
        "........",
        "........",
        ".#....#.",
        "..#..#..",
        ".#.oo.#.",
        "#.o..o.#",
        "........",
        "........",
    ], dust)
    splinter = {"#": WOOD, "o": LIGHT}
    sprite("splinter", 48, 0, [
        "........",
        ".#...o..",
        "..#.#...",
        "...o....",
        "..#.#...",
        ".o...#..",
        "........",
        "........",
    ], splinter)
    spurt = {"#": BROWN, "o": TAN}
    sprite("spurt", 56, 0, [
        "...#....",
        "..#o#...",
        "..#o#...",
        ".##o##..",
        "........",
        "........",
        "........",
        "........",
    ], spurt)
    outline(atlas, INK)
    return atlas


def outline(atlas: Atlas, colour) -> None:
    """A one-pixel dark outline around every sprite, inside its own cell, so
    the light effects read against any ground."""
    width, height = atlas.image.size
    painted = {(x, y) for x in range(width) for y in range(height) if atlas.px[x, y][3] > 0}
    for x, y in [(x, y) for x in range(width) for y in range(height) if (x, y) not in painted]:
        cell_x, cell_y = x // 8, y // 8
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if (nx, ny) in painted and nx // 8 == cell_x and ny // 8 == cell_y:
                atlas.px[x, y] = (*colour, 255)
                break


def main() -> None:
    out = {}
    for outfit in OUTFITS:
        for variant in range(UNIFORM_VARIANTS):
            atlas = soldier_atlas(outfit, variant)
            atlas.image.save(os.path.join(HERE, f"soldier-{outfit}-{variant}.png"))
        out["soldier"] = {"size": list(atlas.image.size), "regions": atlas.regions}
    for name, atlas in (("environment", environment_atlas()), ("effects", effects_atlas())):
        atlas.image.save(os.path.join(HERE, f"{name}.png"))
        out[name] = {"size": list(atlas.image.size), "regions": atlas.regions}
    with open(os.path.join(HERE, "regions.json"), "w", encoding="utf-8", newline="\n") as handle:
        json.dump(out, handle, indent=1)
    print({name: len(value["regions"]) for name, value in out.items()})


if __name__ == "__main__":
    main()
