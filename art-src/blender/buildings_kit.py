"""The roof and feature library of the buildings (revise-buildings-and-stone 3.1).

Every building is a function over MeshBuilder (design D2): walls from its
footprint, a roof from the library below, and features. The doors and
windows come from the battle's own data (`openings.json`, written by
`tools/export-openings.ts`, design D1), so the model has every opening the
battle has and no other; `markers()` adds the empties the model check reads
(`tools/building-model-check.ts`).

Frames. The battle's building frame has x along the width, y along the depth
and the street face toward local +y (the game's y runs south). The glTF
export turns Blender +Y into the game's -y, so a battle point (x, y, z) is
Blender (x, -y, z): the street face is Blender -Y. Every function here takes
battle coordinates and converts with `at()`.

Materials are swatches of the environment atlas (art-src/textures):
plaster, plaster.shade, plaster.worn, adobe, wash.ochre, wash.blue,
wash.rose, brick, stone, timber, tile, tile.old, thatch, zinc, trim, door,
window, shutter, iron, ink.
"""
from __future__ import annotations

import json
import math
import os

import bpy
from mathutils import Matrix, Vector

from common import MeshBuilder, rotation_z

HERE = os.path.dirname(os.path.abspath(__file__))
WALL_TILE = 1.6
ROOF_TILE = 1.4

with open(os.path.join(HERE, "openings.json"), encoding="utf-8") as handle:
    OPENINGS = {entry["model"]: entry for entry in json.load(handle)}


def at(x: float, y: float, z: float = 0.0) -> Vector:
    """Battle frame (x, y street-ward, z up) to Blender."""
    return Vector((x, -y, z))


def openings(model: str) -> dict:
    return OPENINGS[model]


# --- walls --------------------------------------------------------------------


def walls(b: MeshBuilder, hw: float, hd: float, height: float, wash: str = "plaster", plinth: str | None = "stone",
          plinth_height: float = 0.45, band: str | None = None) -> None:
    """The four walls on the footprint, a plinth proud of them and, with
    `band`, a painted dado (barrado) along the bottom."""
    b.box(tuple(at(0, 0, height / 2)), (2 * hw, 2 * hd, height), wash, top="plaster.shade", tile=WALL_TILE)
    if plinth:
        b.box(tuple(at(0, 0, plinth_height / 2)), (2 * hw + 0.12, 2 * hd + 0.12, plinth_height), plinth, tile=1.0)
    if band:
        b.box(tuple(at(0, 0, 0.5)), (2 * hw + 0.06, 2 * hd + 0.06, 0.9), band, tile=1.0)


def cornice(b: MeshBuilder, hw: float, hd: float, z: float, swatch: str = "plaster.shade", depth: float = 0.18) -> None:
    """A moulded band round the top of the walls."""
    b.box(tuple(at(0, 0, z)), (2 * hw + 2 * depth, 2 * hd + 2 * depth, 0.22), swatch)


def platband(b: MeshBuilder, hw: float, hd: float, wall: float, height: float = 0.9, swatch: str = "plaster") -> None:
    """A platibanda: the street wall carried up to hide the roof, with a cornice."""
    y = hd - 0.1
    b.box(tuple(at(0, y, wall + height / 2)), (2 * hw + 0.1, 0.25, height), swatch, tile=WALL_TILE)
    b.box(tuple(at(0, y + 0.05, wall + height)), (2 * hw + 0.3, 0.4, 0.16), "plaster.shade")
    b.box(tuple(at(0, y + 0.05, wall + 0.08)), (2 * hw + 0.3, 0.4, 0.14), "plaster.shade")


# --- roofs --------------------------------------------------------------------


def _poly(b: MeshBuilder, points, swatch: str, tile: float | None = ROOF_TILE) -> None:
    """A flat triangle or quad from battle-frame points, wound as given
    (outward), the swatch repeated about every `tile` metres."""
    corners = [at(*p) for p in points]
    if len(corners) == 3:
        corners.append(corners[2].copy())
    b.quad(corners, swatch, None, tile)


def roof_gable(b: MeshBuilder, hw: float, hd: float, z: float, rise: float, swatch: str = "tile", end: str = "plaster",
               overhang: float = 0.45, along: str | None = None) -> None:
    """Two waters, the ridge along the long side unless `along` says 'x' or 'y'."""
    along = along or ("x" if hw >= hd else "y")
    if along == "x":
        b.prism(tuple(at(0, 0, z)), 2 * hw + 2 * overhang, 2 * hd + 2 * overhang, rise, swatch, end=end, tile=ROOF_TILE)
    else:
        b.prism((0, 0, z), 2 * hd + 2 * overhang, 2 * hw + 2 * overhang, rise, swatch, end=end, matrix=rotation_z(math.pi / 2), tile=ROOF_TILE)


def roof_hip(b: MeshBuilder, hw: float, hd: float, z: float, rise: float, swatch: str = "tile", overhang: float = 0.5,
             hip: float = 1.0) -> None:
    """Four waters. `hip` 1 is a full hip; less shortens the end slopes into
    a half-hip (the ridge longer, the ends steeper)."""
    w, d = hw + overhang, hd + overhang
    long_x = w >= d
    inset = (d if long_x else w) * hip
    if long_x:
        r0, r1 = (-w + inset, 0, z + rise), (w - inset, 0, z + rise)
        a, bb, c, dd = (-w, -d, z), (w, -d, z), (w, d, z), (-w, d, z)
        _poly(b, [dd, c, r1, r0], swatch)       # street slope (+y)
        _poly(b, [bb, a, r0, r1], swatch)       # back slope
        _poly(b, [a, dd, r0], swatch)           # left end
        _poly(b, [c, bb, r1], swatch)           # right end
    else:
        r0, r1 = (0, -d + inset, z + rise), (0, d - inset, z + rise)
        a, bb, c, dd = (-w, -d, z), (w, -d, z), (w, d, z), (-w, d, z)
        _poly(b, [a, dd, r1, r0], swatch)       # left slope
        _poly(b, [c, bb, r0, r1], swatch)       # right slope
        _poly(b, [dd, c, r1], swatch)           # street end
        _poly(b, [bb, a, r0], swatch)           # back end
    _poly(b, [(-w, -d, z), (w, -d, z), (w, d, z), (-w, d, z)], "timber", None)  # soffit, seen from below


def roof_lean_to(b: MeshBuilder, x0: float, x1: float, y_high: float, y_low: float, z_high: float, z_low: float,
                 swatch: str = "tile") -> None:
    """A single slope (meia-água) from the line y_high (at z_high) down to y_low."""
    top = [(x0, y_low, z_low), (x1, y_low, z_low), (x1, y_high, z_high), (x0, y_high, z_high)]
    if y_low < y_high:
        top = [top[1], top[0], top[3], top[2]]
    _poly(b, top, swatch)
    _poly(b, list(reversed(top)), "timber", None)


def roof_thatch(b: MeshBuilder, hw: float, hd: float, z: float, rise: float) -> None:
    """Thatch: a thick, steep hip with deep eaves."""
    roof_hip(b, hw, hd, z, rise, swatch="thatch", overhang=0.7, hip=0.8)
    roof_hip(b, hw, hd, z - 0.2, rise, swatch="thatch", overhang=0.8, hip=0.8)


def roof_zinc_shed(b: MeshBuilder, hw: float, hd: float, z: float, rise: float) -> None:
    """A low zinc gable on a shed."""
    roof_gable(b, hw, hd, z, rise, swatch="zinc", end="timber", overhang=0.3)


ROOFS = {"gable": roof_gable, "hip": roof_hip, "thatch": roof_thatch, "zinc": roof_zinc_shed}


# --- openings -----------------------------------------------------------------


def _on_wall(opening: dict, out: float):
    """The opening's centre pushed `out` metres out of its wall, and the wall's axis."""
    x = opening["x"] + opening["outX"] * out
    y = opening["y"] + opening["outY"] * out
    along_x = opening["outX"] == 0
    return x, y, along_x


def door(b: MeshBuilder, opening: dict, frame: str = "timber") -> None:
    """A door leaf in a frame, flush with its wall, with a step outside."""
    w, h = opening["width"], opening["height"]
    x, y, along_x = _on_wall(opening, 0.04)
    size = (w, 0.08, h) if along_x else (0.08, w, h)
    b.box(tuple(at(x, y, h / 2)), size, "door", tile=1.4)
    fx, fy, _ = _on_wall(opening, 0.07)
    lintel = (w + 0.3, 0.08, 0.16) if along_x else (0.08, w + 0.3, 0.16)
    b.box(tuple(at(fx, fy, h + 0.08)), lintel, frame)
    sx, sy, _ = _on_wall(opening, 0.35)
    step = (w + 0.4, 0.6, 0.18) if along_x else (0.6, w + 0.4, 0.18)
    b.box(tuple(at(sx, sy, 0.09)), step, "stone")


def window(b: MeshBuilder, opening: dict, shutters: bool = True, frame: str = "plaster.shade") -> None:
    """A glazed window in a moulded frame, with a pair of open shutters."""
    w, h, sill = opening["width"], opening["height"], opening["sill"]
    x, y, along_x = _on_wall(opening, 0.03)
    mid = sill + h / 2
    b.box(tuple(at(x, y, mid)), (w, 0.06, h) if along_x else (0.06, w, h), "window")
    fx, fy, _ = _on_wall(opening, 0.06)
    b.box(tuple(at(fx, fy, sill - 0.06)), (w + 0.3, 0.12, 0.1) if along_x else (0.12, w + 0.3, 0.1), frame)
    b.box(tuple(at(fx, fy, sill + h + 0.06)), (w + 0.3, 0.12, 0.12) if along_x else (0.12, w + 0.3, 0.12), frame)
    if shutters:
        for side in (-1, 1):
            if along_x:
                b.box(tuple(at(fx + side * (w / 2 + 0.25), fy, mid)), (0.42, 0.05, h), "shutter")
            else:
                b.box(tuple(at(fx, fy + side * (w / 2 + 0.25), mid)), (0.05, 0.42, h), "shutter")


def all_openings(b: MeshBuilder, model: str, shutters: bool = True, frame: str = "plaster.shade") -> dict:
    """Every door and window the battle gives this building."""
    data = openings(model)
    for entry in data["doors"]:
        door(b, entry)
    for entry in data["windows"]:
        window(b, entry, shutters=shutters, frame=frame)
    return data


# --- features -----------------------------------------------------------------


def veranda(b: MeshBuilder, hw: float, hd: float, depth: float, z: float, posts: int = 4, swatch: str = "tile",
            wall: str = "front") -> None:
    """A roofed porch on posts along the street (or back) wall."""
    sign = 1 if wall == "front" else -1
    y_wall, y_out = sign * hd, sign * (hd + depth)
    for k in range(posts):
        px = -hw + 0.2 + (2 * hw - 0.4) * k / max(1, posts - 1)
        b.box(tuple(at(px, y_out - sign * 0.1, z / 2)), (0.16, 0.16, z), "timber")
    roof_lean_to(b, -hw - 0.2, hw + 0.2, y_wall, y_out + sign * 0.2, z + 0.5, z - 0.1, swatch)
    b.box(tuple(at(0, (y_wall + y_out) / 2, 0.1)), (2 * hw, depth, 0.2), "stone", tile=1.0)


def chimney(b: MeshBuilder, x: float, y: float, base: float, height: float, size: float = 0.6, swatch: str = "brick") -> None:
    b.box(tuple(at(x, y, base + height / 2)), (size, size, height), swatch, tile=0.8)
    b.box(tuple(at(x, y, base + height + 0.06)), (size + 0.14, size + 0.14, 0.12), "stone")


def tower(b: MeshBuilder, x: float, y: float, side: float, top: float, wash: str = "plaster") -> None:
    """A square bell tower with a belfry opening on each face and a pyramid cap."""
    body = top - side * 0.9
    b.box(tuple(at(x, y, body / 2)), (side, side, body), wash, top="plaster.shade", tile=WALL_TILE)
    cornice_z = body * 0.7
    b.box(tuple(at(x, y, cornice_z)), (side + 0.2, side + 0.2, 0.18), "plaster.shade")
    for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        bx, by = x + dx * (side / 2 + 0.02), y + dy * (side / 2 + 0.02)
        b.box(tuple(at(bx, by, body - 0.9)), (0.8, 0.06, 1.2) if dx == 0 else (0.06, 0.8, 1.2), "ink")
    b.box(tuple(at(x, y, body)), (side + 0.3, side + 0.3, 0.2), "plaster.shade")
    b.cone((0, 0, 0), side * 0.75, side * 0.8, "tile", sides=4,
           matrix=Matrix.Translation(at(x, y, body + 0.1)) @ rotation_z(math.pi / 4))
    cross(b, x, y, top - 0.1)


def cross(b: MeshBuilder, x: float, y: float, z: float, size: float = 0.8) -> None:
    b.box(tuple(at(x, y, z + size / 2)), (0.1, 0.1, size), "iron")
    b.box(tuple(at(x, y, z + size * 0.7)), (size * 0.6, 0.1, 0.1), "iron")


def bell_gable(b: MeshBuilder, hw: float, y: float, base: float, height: float = 1.6, wash: str = "plaster") -> None:
    """A sineira: the street gable carried up into an arch for a bell."""
    b.box(tuple(at(0, y, base + height / 2)), (1.6, 0.35, height), wash, tile=WALL_TILE)
    b.box(tuple(at(0, y + 0.18, base + height * 0.55)), (0.6, 0.04, 0.7), "ink")
    b.box(tuple(at(0, y, base + height + 0.08)), (1.8, 0.45, 0.16), "plaster.shade")
    cross(b, 0, y, base + height + 0.16, 0.6)


def balcony(b: MeshBuilder, x: float, y: float, z: float, width: float, depth: float = 0.6) -> None:
    """An iron balcony on the street wall: slab, rail and balusters."""
    b.box(tuple(at(x, y + depth / 2, z)), (width, depth, 0.12), "stone")
    b.box(tuple(at(x, y + depth, z + 0.9)), (width, 0.05, 0.05), "iron")
    for k in range(int(width / 0.25) + 1):
        bx = x - width / 2 + k * width / int(width / 0.25)
        b.box(tuple(at(bx, y + depth, z + 0.45)), (0.03, 0.03, 0.9), "iron")


def steps(b: MeshBuilder, x: float, y: float, width: float, count: int = 3, rise: float = 0.16, tread: float = 0.32) -> None:
    """Steps rising toward the building from the street (+y side)."""
    for k in range(count):
        b.box(tuple(at(x, y + tread * (count - k - 0.5), rise * (k + 0.5))), (width, tread * (count - k), rise), "stone")


def piles(b: MeshBuilder, hw: float, hd: float, height: float, swatch: str = "stone", every: float = 2.0) -> None:
    """Stone piles (or stilts) carrying a floor `height` above the ground."""
    for x in [-hw + 0.2 + k * every for k in range(int((2 * hw - 0.4) / every) + 1)]:
        for y in (-hd + 0.2, hd - 0.2):
            b.box(tuple(at(x, y, height / 2)), (0.35, 0.35, height), swatch)


def awning(b: MeshBuilder, x: float, y: float, z: float, width: float, depth: float = 1.2, swatch: str = "zinc") -> None:
    """A shop's sloping awning over the street door."""
    roof_lean_to(b, x - width / 2, x + width / 2, y, y + depth, z, z - 0.35, swatch)


def sign_board(b: MeshBuilder, x: float, y: float, z: float, width: float = 2.0) -> None:
    b.box(tuple(at(x, y + 0.05, z)), (width, 0.06, 0.5), "trim")


def wear(b: MeshBuilder, hw: float, hd: float, patches=((-0.6, 1.0, 0.5), (0.7, 0.4, 0.4))) -> None:
    """Patches where the plaster has fallen off the adobe, on the street wall."""
    for fx, z, size in patches:
        b.box(tuple(at(fx * hw, hd + 0.015, z)), (size * 1.4, 0.02, size), "adobe")


# --- markers ------------------------------------------------------------------


def markers(model: str, collection=None) -> list:
    """Empties at every opening and at the ends of every wall, named as the
    model check reads them (`<model>.door.<wall>.<n>`, `<model>.window.<wall>.<level>.<n>`,
    `<model>.wall.<wall>.a|b`)."""
    data = openings(model)
    hw, hd = data["halfWidth"], data["halfDepth"]
    scene = collection or bpy.context.scene.collection
    made = []

    def empty(name: str, point: Vector) -> None:
        obj = bpy.data.objects.new(name, None)
        obj.empty_display_size = 0.2
        obj.location = point
        scene.objects.link(obj)
        made.append(obj)

    counts: dict[str, int] = {}
    for entry in data["doors"]:
        key = f"door.{entry['wall']}"
        empty(f"{model}.{key}.{counts.get(key, 0)}", at(entry["x"], entry["y"], entry["height"] / 2))
        counts[key] = counts.get(key, 0) + 1
    for entry in data["windows"]:
        key = f"window.{entry['wall']}.{entry['level']}"
        empty(f"{model}.{key}.{counts.get(key, 0)}", at(entry["x"], entry["y"], entry["sill"] + entry["height"] / 2))
        counts[key] = counts.get(key, 0) + 1
    ends = {
        "front": ((-hw, hd), (hw, hd)),
        "back": ((-hw, -hd), (hw, -hd)),
        "left": ((-hw, -hd), (-hw, hd)),
        "right": ((hw, -hd), (hw, hd)),
    }
    for wall, (a, bb) in ends.items():
        empty(f"{model}.wall.{wall}.a", at(*a))
        empty(f"{model}.wall.{wall}.b", at(*bb))
    return made
