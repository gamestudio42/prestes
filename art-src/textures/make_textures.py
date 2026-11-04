"""Pixel-art texture atlases for the low-poly world (phase 4).

Draws three small atlases in the sepia palette and writes their region index:

  soldier-<outfit>.png  64 x 64  same layout per outfit (column, legalist, officer)
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
    def __init__(self, width: int, height: int) -> None:
        self.image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        self.px = self.image.load()
        self.regions: dict[str, list[int]] = {}

    def swatch(self, name: str, x: int, y: int, w: int, h: int, paint) -> None:
        rng = random.Random(name)
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


OUTFITS = {
    # The column: worn khaki, red scarf, slouch hat, bandolier.
    "column": dict(tunic=(KHAKI, KHAKI_DARK), trousers=(KHAKI_DARK, BROWN), hat=(TAN, MID),
                   scarf=(RED, RED_DARK), puttees=(SAND, TAN)),
    # Legalists: army olive uniform and kepi.
    "legalist": dict(tunic=(OLIVE, OLIVE_DARK), trousers=(OLIVE_DARK, DARK), hat=(OLIVE_DARK, DARK),
                     scarf=(OLIVE, OLIVE_DARK), puttees=(OLIVE_DARK, DARK)),
    # The instructor: officer's tunic with a gold collar, kepi, dark boots.
    "officer": dict(tunic=(KHAKI, KHAKI_DARK), trousers=(MID, BROWN), hat=(KHAKI_DARK, BROWN),
                    scarf=(GOLD, TAN), puttees=(INK, DARK)),
}


def soldier_atlas(outfit: str) -> Atlas:
    """One atlas per outfit with the same layout, so one model wears all three."""
    atlas = Atlas(64, 64)
    colours = OUTFITS[outfit]
    atlas.swatch("tunic", 0, 0, 8, 8, cloth(*colours["tunic"]))
    atlas.swatch("trousers", 8, 0, 8, 8, cloth(*colours["trousers"], seam_every=8))
    atlas.swatch("hat", 16, 0, 8, 8, noise(colours["hat"][0], colours["hat"][1], 0.15))
    atlas.swatch("scarf", 24, 0, 8, 8, noise(colours["scarf"][0], colours["scarf"][1], 0.2))
    atlas.swatch("puttees", 32, 0, 8, 8, lambda i, j, rng, c=colours["puttees"]: c[1] if (i + j) % 3 == 0 else c[0])
    y = 24
    atlas.swatch("skin", 0, y, 8, 8, noise(SKIN, SKIN_DARK, 0.1))
    atlas.swatch("boots", 8, y, 8, 8, noise(DARK, INK, 0.2))
    atlas.swatch("leather", 16, y, 8, 8, lambda i, j, rng: GOLD if (i % 3 == 1 and j % 4 == 1) else BROWN)
    atlas.swatch("rifle.wood", 24, y, 8, 8, lambda i, j, rng: WOOD_DARK if j % 3 == 0 else WOOD)
    atlas.swatch("rifle.metal", 32, y, 8, 8, noise(METAL, METAL_LIGHT, 0.15))
    atlas.swatch("blood", 40, y, 8, 8, noise(RED_DARK, (80, 28, 22), 0.3))
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
        if j % 4 == 0:
            return RED_DARK
        return (154, 82, 56) if ((i + (j // 4) * 2) % 6) else RED_DARK

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

    def window(i, j, rng):
        if i in (0, 1, S - 2, S - 1) or j in (0, 1, S - 2, S - 1) or i in (7, 8) or j in (7, 8):
            return WOOD_DARK
        return INK

    def door(i, j, rng):
        return WOOD_DARK if i % 4 == 0 or j in (0, S - 1) else WOOD

    def grass(i, j, rng):
        r = rng.random()
        return LEAF_DARK if r < 0.35 else LEAF if r < 0.85 else LEAF_LIGHT

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
    return atlas


def main() -> None:
    out = {}
    for outfit in OUTFITS:
        atlas = soldier_atlas(outfit)
        atlas.image.save(os.path.join(HERE, f"soldier-{outfit}.png"))
        out["soldier"] = {"size": list(atlas.image.size), "regions": atlas.regions}
    for name, atlas in (("environment", environment_atlas()), ("effects", effects_atlas())):
        atlas.image.save(os.path.join(HERE, f"{name}.png"))
        out[name] = {"size": list(atlas.image.size), "regions": atlas.regions}
    with open(os.path.join(HERE, "regions.json"), "w", encoding="utf-8", newline="\n") as handle:
        json.dump(out, handle, indent=1)
    print({name: len(value["regions"]) for name, value in out.items()})


if __name__ == "__main__":
    main()
