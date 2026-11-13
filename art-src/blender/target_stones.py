"""The stones by rock kind (revise-buildings-and-stone 4.1, design D4).

Each kinded stone of the catalog (packages/shared/src/maps/rock-kinds.ts:
the small rock, the boulder, the matacão, the outcrop and the pile) is built
once per rock kind, inside its catalog footprint and up to its height, so a
stone of any kind covers and hides as its size does. Granite, the look the
stones always had, is named by the bare id; the others `<id>@<kind>`.

Blender space: Z up, footprint centred on the origin, ground at z = 0.
"""
import math
import random

import bmesh
from mathutils import Matrix, Vector

from common import MeshBuilder, reset, save_and_export

# The catalog's footprints (halfWidth, halfDepth, height), from catalog-objects.ts.
STONES = {
    "rock-small": (0.7, 0.6, 0.6),
    "boulder": (1.2, 1.0, 1.2),
    "matacao": (2.2, 1.9, 2.2),
    "outcrop": (4.0, 1.6, 1.8),
    "stone-pile": (1.1, 1.0, 0.9),
}
KINDS = ["granite", "basalt", "sandstone", "quartzite", "cobble", "lajedo"]


def _sphere(subdivisions: int):
    bm = bmesh.new()
    try:
        bmesh.ops.create_icosphere(bm, subdivisions=subdivisions, radius=1.0)
    except TypeError:
        bmesh.ops.create_icosphere(bm, subdivisions=subdivisions, diameter=1.0)
    faces = [[Vector(v.co) for v in face.verts] for face in bm.faces]
    bm.free()
    return faces


SPHERE = _sphere(1)
# An icosahedron: broad facets, for the angular rocks (no box edges).
FACETED = _sphere(0)


def lump(b: MeshBuilder, rng: random.Random, x: float, y: float, rx: float, ry: float, h: float, swatch: str,
         jitter: float = 0.18, top: float = 1.0, faces=None, bottom: float = 1.0, lift: float = 0.0) -> None:
    """A rounded stone of half sizes rx, ry and height h standing at (x, y),
    sunk a little into the ground; `top` < 1 flattens its crown."""
    spin = rng.uniform(0, math.tau)
    bumps = {}

    def bump(v: Vector) -> float:
        key = (round(v.x, 3), round(v.y, 3), round(v.z, 3))
        if key not in bumps:
            bumps[key] = 1 + rng.uniform(-jitter, jitter)
        return bumps[key]

    turn = Matrix.Rotation(spin, 3, "Z")
    for face in faces or SPHERE:
        verts = []
        for v in face:
            k = bump(v)
            z = v.z * (top if v.z > 0 else bottom)
            p = turn @ Vector((v.x * rx * k, v.y * ry * k, 0))
            verts.append(b._vert(Vector((x + p.x, y + p.y, lift + h * 0.42 + z * h * 0.58 * k)), None))
        b._face(verts, swatch, None)


def facet(b: MeshBuilder, rng: random.Random, x: float, y: float, rx: float, ry: float, h: float, swatch: str,
          top: float = 0.8, jitter: float = 0.22) -> None:
    """An angular rock: a jittered icosahedron, its crown cut flatter, no box edges."""
    lump(b, rng, x, y, rx, ry, h, swatch, jitter=jitter, top=top, faces=FACETED)


def granite(b, rng, hw, hd, h, stone):
    if stone == "outcrop":
        for dx, sx, sy in ((-0.55, 0.5, 1.0), (0.0, 0.6, 0.85), (0.55, 0.45, 0.65)):
            lump(b, rng, dx * hw, 0, hw * sx, hd, h * sy, "granite")
    elif stone == "stone-pile":
        _heap(b, rng, hw, hd, h, "granite", 6, 0.5)
    else:
        lump(b, rng, 0, 0, hw, hd, h, "granite")


def basalt(b, rng, hw, hd, h, stone):
    """Dark angular rock of the plateau: broad facets, a flat-topped main mass and a lower shoulder."""
    if stone == "stone-pile":
        _heap(b, rng, hw, hd, h, "basalt", 6, 0.5, faces=FACETED)
        return
    n = 3 if stone == "outcrop" else 1
    for k in range(n):
        cx = (k - (n - 1) / 2) * (2 * hw / n)
        w = hw / n
        facet(b, rng, cx, 0, w * 0.95, hd * 0.9, h * rng.uniform(0.85, 1.0), "basalt", top=0.55)
        facet(b, rng, cx + w * 0.55, hd * 0.3, w * 0.55, hd * 0.55, h * 0.5, "basalt", top=0.6)


def sandstone(b, rng, hw, hd, h, stone):
    """Bedded ledges: flattened slabs stacked, each smaller and set off the one below."""
    if stone == "stone-pile":
        for _ in range(5):
            lump(b, rng, rng.uniform(-0.4, 0.4) * hw, rng.uniform(-0.4, 0.4) * hd, hw * 0.45, hd * 0.35, h * 0.45,
                 "sandstone", jitter=0.12, top=0.35, faces=FACETED)
        return
    beds = 3 if h > 1 else 2
    t = h / beds
    for k in range(beds):
        shrink = 1 - k * 0.24
        lump(b, rng, rng.uniform(-0.1, 0.1) * hw, rng.uniform(-0.1, 0.1) * hd, hw * shrink, hd * shrink, t * (k + 1.1),
             "sandstone", jitter=0.1, top=0.25 / (k + 1), bottom=0.3, faces=SPHERE)


def quartzite(b, rng, hw, hd, h, stone):
    """Pale angular quartzite, one rusty canga piece beside it."""
    n = 4 if stone in ("outcrop", "stone-pile") else 2
    for k in range(n):
        swatch = "canga" if k == n - 1 else "quartzite"
        main = k == 0
        x = (k - (n - 1) / 2) * (2 * hw / n) if n > 2 else (k - 0.35) * hw * 0.7
        r = (hw / n if n > 2 else hw * 0.75) * (1.0 if main else 0.65)
        facet(b, rng, x, rng.uniform(-0.2, 0.2) * hd, r, hd * (0.85 if main else 0.55),
              h * (0.95 if main else rng.uniform(0.4, 0.6)), swatch, top=0.7, jitter=0.25)


def _heap(b, rng, hw, hd, h, swatch, count, size, faces=None):
    for k in range(count):
        a = k / count * math.tau + rng.uniform(-0.3, 0.3)
        r = 0 if k == 0 else rng.uniform(0.35, 0.6)
        s = size * (1.2 if k == 0 else rng.uniform(0.7, 1.0))
        lump(b, rng, math.cos(a) * hw * r, math.sin(a) * hd * r, hw * s, hd * s, h * (1.0 if k == 0 else rng.uniform(0.5, 0.7)), swatch, faces=faces)


def cobble(b, rng, hw, hd, h, stone):
    """River cobbles heaped: many small rounded stones."""
    count = {"rock-small": 6, "boulder": 9, "matacao": 14, "outcrop": 18, "stone-pile": 10}[stone]
    for k in range(count):
        a = rng.uniform(0, math.tau)
        r = rng.uniform(0, 0.7)
        s = rng.uniform(0.18, 0.32)
        lump(b, rng, math.cos(a) * hw * r, math.sin(a) * hd * r, hw * s, hd * s, h * (1 - r * 0.8) * rng.uniform(0.6, 1.0), "cobble", 0.1)


def lajedo(b, rng, hw, hd, h, stone):
    """The caatinga's granite: a broad whaleback, split, its crown flat."""
    if stone == "stone-pile":
        _heap(b, rng, hw, hd, h, "granite", 5, 0.5)
        return
    lump(b, rng, -hw * 0.25, 0, hw * 0.8, hd, h, "granite", jitter=0.08, top=0.45)
    lump(b, rng, hw * 0.45, hd * 0.1, hw * 0.55, hd * 0.8, h * 0.7, "granite", jitter=0.08, top=0.45)


# Built stone (revise-buildings-and-stone 4.2, D5): each kind's swatch and how
# a laid stone of it looks: (swatch, faces, crown flattening, jitter).
LAID = {
    "granite": ("granite", "facet", 0.7, 0.18),
    "basalt": ("basalt", "facet", 0.55, 0.15),
    "sandstone": ("sandstone", "facet", 0.35, 0.08),
    "quartzite": ("quartzite", "facet", 0.6, 0.2),
    "cobble": ("cobble", "round", 0.9, 0.1),
    "lajedo": ("granite", "facet", 0.3, 0.08),
}
# How long and tall a laid stone is, against the course height, by kind.
LAID_SIZE = {"granite": (1.3, 1.0), "basalt": (1.1, 1.0), "sandstone": (2.0, 0.8), "quartzite": (1.2, 1.0),
             "cobble": (0.9, 0.9), "lajedo": (2.2, 0.6)}


def laid(b, rng, kind, x, y, z, length, depth, height):
    """One stone laid in a wall, its bed at z."""
    swatch, faces, top, jitter = LAID[kind]
    if kind == "quartzite" and rng.random() < 0.2:
        swatch = "canga"
    lump(b, rng, x, y, length / 2, depth / 2, height, swatch, jitter=jitter, top=top, bottom=0.6,
         faces=FACETED if faces == "facet" else SPHERE, lift=z + height * 0.1)


def dry_wall(b, rng, kind, length, height, thick, batter=0.0, footing=0.3):
    """A dry stone wall along x, centred, from `footing` below the ground to
    `height`: a core, then courses of laid stones on both faces, staggered,
    and a row of cope stones on top. `batter` sets the face back per metre."""
    swatch = LAID[kind][0]
    b.box((0, 0, (height - footing) / 2 - 0.02), (length, thick * 0.8, height + footing - 0.08), swatch, tile=0.8)
    long_k, tall_k = LAID_SIZE[kind]
    course = 0.32 * tall_k
    z = -footing
    row = 0
    while z < height - course * 0.6:
        stone = course * 1.4 * long_k
        x = -length / 2 + (stone / 2 if row % 2 else stone / 4)
        inset = batter * max(0.0, z)
        while x < length / 2 - stone * 0.2:
            s = stone * rng.uniform(0.8, 1.15)
            for side in (-1, 1):
                laid(b, rng, kind, x, side * (thick / 2 - inset - 0.12), z, s, 0.3, course * rng.uniform(1.0, 1.25))
            x += s * 0.92
        z += course
        row += 1
    x = -length / 2 + 0.25
    while x < length / 2:
        s = rng.uniform(0.4, 0.6) * long_k
        laid(b, rng, kind, x, 0, height - course * 0.5, s, thick * 0.85 - batter * height, course * 1.1)
        x += s * 0.95


def steps(b, rng, kind, hw, hd, h):
    """Three treads of dressed stone up a bank, each of a few slabs, toward -y."""
    swatch = LAID[kind][0]
    treads = 3
    depth = 2 * hd / treads
    for k in range(treads):
        top = h * (k + 1) / treads
        y = hd - depth * (k + 0.5)
        x = -hw
        while x < hw - 0.1:
            w = min(rng.uniform(0.6, 1.0), hw - x)
            if kind == "quartzite" and rng.random() < 0.2:
                swatch_k = "canga"
            else:
                swatch_k = swatch
            b.box((x + w / 2, y, (top - 0.3) / 2), (w - 0.04, depth + 0.02, top + 0.3 + rng.uniform(-0.03, 0.03)), swatch_k, tile=0.8)
            x += w


# The built stone catalog footprints (halfWidth, halfDepth, height), from catalog-objects.ts.
WALL_SEGMENT = (2.0, 1.0, 0.7)  # one 2 m piece of a wall line, 1 m tall, scaled in the view
RETAINING = (3.0, 0.5, 1.4)
STEPS = (1.5, 1.2, 0.6)


BUILDERS = {"granite": granite, "basalt": basalt, "sandstone": sandstone, "quartzite": quartzite, "cobble": cobble, "lajedo": lajedo}


def build():
    reset()
    for stone, (hw, hd, h) in STONES.items():
        for kind in KINDS:
            b = MeshBuilder("environment")
            BUILDERS[kind](b, random.Random(f"{stone}:{kind}"), hw, hd, h, stone)
            b.to_object(stone if kind == "granite" else f"{stone}@{kind}")
    # 4.2: a wall line's piece, the retaining wall and the steps.
    for kind in KINDS:
        name = lambda base: base if kind == "granite" else f"{base}@{kind}"
        b = MeshBuilder("environment")
        length, height, thick = WALL_SEGMENT
        dry_wall(b, random.Random(f"wall:{kind}"), kind, length, height, thick)
        b.to_object(name("dry-wall"))
        b = MeshBuilder("environment")
        hw, hd, h = RETAINING
        dry_wall(b, random.Random(f"retaining:{kind}"), kind, 2 * hw, h, 2 * hd, batter=0.12)
        b.to_object(name("retaining-wall"))
        b = MeshBuilder("environment")
        steps(b, random.Random(f"steps:{kind}"), kind, *STEPS)
        b.to_object(name("stone-steps"))
    return [save_and_export("stones", "environment")]
