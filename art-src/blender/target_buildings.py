"""Training ground buildings, at the footprints of TRAINING_BUILDINGS.

Blender space: Z up, footprint centred on the origin, ground at z = 0. The
glTF export turns Blender +Y into the game's north (simulation -y), so a door
on the +Y wall faces north. Sizes match the simulation footprints in
packages/shared/src/training-ground.ts (halfWidth along X, halfDepth along Y,
height for sight), so the game places them without scaling.
"""
import math

from mathutils import Matrix

import buildings_kit as kit
from common import MeshBuilder, reset, rotation_z, save_and_export

WALL_TILE = 1.6
ROOF_TILE = 1.4


def windows(b: MeshBuilder, half_width: float, half_depth: float, xs, z: float, sides=(-1, 1)) -> None:
    for side in sides:
        for x in xs:
            b.box((x, side * (half_depth + 0.03), z), (0.9, 0.08, 0.9), "window")


def barracks():
    """A long whitewashed block, tiled roof, door on the north (parade) side."""
    b = MeshBuilder("environment")
    hw, hd = 5.5, 3.0
    b.box((0, 0, 0.2), (2 * hw + 0.2, 2 * hd + 0.2, 0.4), "stone", tile=1.0)
    b.box((0, 0, 1.5), (2 * hw, 2 * hd, 2.2), "plaster", top="plaster.shade", tile=WALL_TILE)
    b.prism((0, 0, 2.6), 2 * hw + 0.6, 2 * hd + 0.8, 1.4, "tile", end="plaster.shade", tile=ROOF_TILE)
    b.box((0, hd + 0.04, 1.25), (1.2, 0.1, 1.9), "door")
    b.box((0, hd + 0.5, 0.1), (2.0, 1.0, 0.2), "stone")
    windows(b, hw, hd, (-3.8, -1.9, 1.9, 3.8), 1.75, sides=(1,))
    windows(b, hw, hd, (-3.8, -1.3, 1.3, 3.8), 1.75, sides=(-1,))
    b.box((3.2, -0.8, 3.6), (0.5, 0.5, 1.4), "stone")
    b.to_object("barracks")


def _frame(model: str):
    """The battle's footprint of a building: half width, half depth, wall
    height and the roof's rise up to its sight height."""
    d = kit.openings(model)
    return d["halfWidth"], d["halfDepth"], d["wall"], d["height"] - d["wall"]


def _finish(b: MeshBuilder, model: str) -> None:
    b.to_object(model)
    kit.markers(model)


# --- rural buildings (revise-buildings-and-stone 3.2) ------------------------


def farmhouse():
    """Casa de sitio: whitewash worn over a stone plinth, a tiled hip roof,
    a small alpendre over the door, wooden shutters, a kitchen chimney."""
    m = "farmhouse"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall)
    kit.wear(b, hw, hd, patches=((-0.25, 0.75, 0.5), (0.45, 0.6, 0.4)))
    kit.all_openings(b, m)
    kit.roof_hip(b, hw, hd, wall, rise)
    kit.veranda(b, 1.3, hd, 1.5, 2.5, posts=2)
    kit.chimney(b, 2.4, -1.0, wall, 1.9)
    _finish(b, m)


def barn():
    """Paiol: board walls on stone piles, a tiled gable roof, a wide door,
    a board loft hatch in the gable."""
    m = "barn"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.piles(b, hw, hd, 0.5)
    b.box(tuple(kit.at(0, 0, (wall + 0.5) / 2)), (2 * hw, 2 * hd, wall - 0.5), "timber", top="timber", tile=2.0)
    kit.all_openings(b, m, shutters=False, frame="timber")
    kit.roof_gable(b, hw, hd, wall, rise, end="timber", overhang=0.3)
    b.box(tuple(kit.at(hw + 0.32, 0, wall + rise * 0.35)), (0.06, 1.0, 0.8), "door")
    _finish(b, m)


def chapel():
    """Capela: whitewash with a blue dado and frames, a tiled gable along the
    nave, a bell gable with a cross over the front, steps to the door."""
    m = "chapel"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, band="wash.blue")
    kit.all_openings(b, m, frame="wash.blue")
    kit.roof_gable(b, hw, hd, wall, rise, along="y", overhang=0.3)
    kit.bell_gable(b, hw, hd + 0.2, wall + rise * 0.55, height=1.7)
    kit.steps(b, 0, hd, 2.0, count=2)
    _finish(b, m)


def casa_sede():
    """Casa-sede: ochre wash and a cornice, a four-water tiled roof, a
    full-width veranda on posts with steps, the loft's vents in the sides."""
    m = "casa-sede"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, wash="wash.ochre")
    kit.cornice(b, hw, hd, wall)
    kit.all_openings(b, m)
    kit.roof_hip(b, hw, hd, wall + 0.1, rise)
    kit.veranda(b, hw, hd, 2.2, 3.6, posts=6)
    kit.steps(b, 0, hd + 2.2, 2.4, count=2)
    kit.chimney(b, -4.5, -2.5, wall, 2.4)
    _finish(b, m)


def colonist_house():
    """Casa de colono: wattle and daub, a gable of old tile, an open kitchen
    shelter on the left wall with a mud stove and its chimney."""
    m = "colonist-house"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, wash="plaster.worn", plinth=None, band="adobe")
    kit.all_openings(b, m, frame="timber")
    kit.roof_gable(b, hw, hd, wall, rise, swatch="tile.old", end="adobe", overhang=0.35)
    out = -hw - 1.9
    kit.posts(b, [(out + 0.1, -hd + 0.1), (out + 0.1, 0.2)], 2.2)
    kit.lean_to_side(b, -hw, out, -hd - 0.1, 0.4, wall - 0.3, 2.1, swatch="zinc")
    b.box(tuple(kit.at(out + 0.8, -hd + 0.7, 0.45)), (1.0, 0.8, 0.9), "adobe")
    kit.chimney(b, out + 0.6, -hd + 0.6, 0.9, 2.6, size=0.4, swatch="adobe")
    _finish(b, m)


def engenho():
    """Engenho: worn whitewash, a tiled gable, the open mill shed on the
    left with the cane press, a tall brick chimney."""
    m = "engenho"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, wash="plaster.worn")
    kit.all_openings(b, m, shutters=False, frame="timber")
    kit.roof_gable(b, hw, hd, wall, rise, overhang=0.4)
    out = -hw - 3.2
    kit.posts(b, [(out + 0.1, y) for y in (-hd + 0.4, 0.0, hd - 0.4)], 3.0, size=0.22)
    kit.lean_to_side(b, -hw, out, -hd + 0.1, hd - 0.1, 4.0, 2.9)
    # The cane press: a timber frame, three iron rollers, cane heaped by it.
    px = -hw - 1.6
    b.box(tuple(kit.at(px, 0, 0.5)), (1.4, 1.2, 1.0), "timber")
    for k in (-1, 0, 1):
        b.cylinder(tuple(kit.at(px + k * 0.35, 0, 1.25)), 0.16, 0.5, "iron", sides=6)
    b.box(tuple(kit.at(px, 1.6, 0.3)), (1.6, 1.0, 0.6), "hay", tile=1.0)
    kit.chimney(b, hw - 2.0, -hd + 1.5, 0, wall + rise + 4.0, size=1.1)
    _finish(b, m)


def ferry_house():
    """Casa da balsa: on short timber stilts by the bank, worn whitewash, a
    zinc meia-agua falling to the river side, a plank landing at the door."""
    m = "ferry-house"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.piles(b, hw, hd, 0.35, swatch="timber", every=1.6)
    b.box(tuple(kit.at(0, 0, (wall + 0.35) / 2)), (2 * hw, 2 * hd, wall - 0.35), "plaster.worn", top="plaster.shade",
          tile=kit.WALL_TILE)
    kit.all_openings(b, m, frame="timber")
    # The roof falls from the back wall to the front; the side walls rise to it.
    kit.roof_lean_to(b, -hw - 0.3, hw + 0.3, -hd - 0.3, hd + 0.5, wall + rise + 0.05, wall - 0.1, swatch="zinc")
    for side in (-1, 1):
        x = side * hw
        kit.face_out(b, [(x, hd, wall), (x, -hd, wall), (x, -hd, wall + rise)], "plaster.worn", (side, 0, 0), kit.WALL_TILE)
    b.box(tuple(kit.at(0, hd + 1.0, 0.15)), (2.4, 2.0, 0.12), "timber", tile=1.0)
    kit.posts(b, [(-1.1, hd + 1.9), (1.1, hd + 1.9)], 0.15, size=0.2)
    _finish(b, m)


# --- town buildings (revise-buildings-and-stone 3.3) --------------------------


def _pilasters(b: MeshBuilder, hw: float, hd: float, height: float, swatch: str = "plaster.shade") -> None:
    """Pilasters at the two street corners, up to `height`."""
    for side in (-1, 1):
        b.box(tuple(kit.at(side * (hw - 0.15), hd + 0.06, height / 2)), (0.4, 0.14, height), swatch)


def _terraced(model: str, wash: str, mouldings: bool) -> None:
    hw, hd, wall, rise = _frame(model)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, wash=wash)
    kit.all_openings(b, model)
    kit.roof_gable(b, hw, hd - 0.3, wall, rise - 0.3, along="x", overhang=0.1)
    kit.platband(b, hw, hd, wall, 1.0)
    if mouldings:
        _pilasters(b, hw, hd, wall + 0.9)
        b.box(tuple(kit.at(0, hd + 0.06, 2.9)), (2 * hw - 0.8, 0.1, 0.14), "plaster.shade")
    _finish(b, model)


def terraced_house():
    """Casa geminada: a pink platband facade with cornices over a tiled
    roof, a door and two windows on the street."""
    _terraced("terraced-house", "wash.rose", mouldings=False)


def terraced_house_wide():
    """The wide casa geminada: blue wash, pilasters and a moulded band."""
    _terraced("terraced-house-wide", "wash.blue", mouldings=True)


def sobrado():
    """Sobrado: two floors in ochre, a storey cornice, an iron balcony along
    the upper windows, a platband over a hip roof."""
    m = "sobrado"
    hw, hd, wall, rise = _frame(m)
    storey = kit.openings(m)["storey"]
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, wash="wash.ochre")
    kit.cornice(b, hw, hd, storey, depth=0.1)
    kit.all_openings(b, m)
    kit.roof_hip(b, hw, hd - 0.3, wall, rise, overhang=0.1)
    kit.platband(b, hw, hd, wall, 0.8)
    _pilasters(b, hw, hd, wall + 0.7)
    kit.balcony(b, 0, hd, storey + 0.85, 2 * hw - 1.4)
    _finish(b, m)


def casa_terrea():
    """Casa terrea: ochre wash with a rose dado, framed windows with
    shutters, a hip roof with deep eaves, plaster worn at the foot."""
    m = "casa-terrea"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, wash="wash.ochre", band="wash.rose")
    kit.cornice(b, hw, hd, wall)
    kit.all_openings(b, m)
    kit.wear(b, hw, hd, patches=((-0.3, 1.2, 0.5), (0.35, 1.0, 0.4)))
    kit.roof_hip(b, hw, hd, wall + 0.1, rise, overhang=0.6)
    _finish(b, m)


def venda():
    """Venda: blue wash, a gable to the street, wide double doors under a
    zinc awning on posts, a painted sign board."""
    m = "venda"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, wash="wash.blue")
    kit.all_openings(b, m)
    b.box(tuple(kit.at(0, hd + 0.09, 1.1)), (0.06, 0.04, 2.2), "timber")  # the two leaves' join
    kit.roof_gable(b, hw, hd, wall, rise, along="y", overhang=0.3)
    kit.awning(b, 0, hd, 2.9, 3.6)
    kit.posts(b, [(-1.7, hd + 1.1), (1.7, hd + 1.1)], 2.5)
    kit.sign_board(b, 0, hd, wall - 0.25, 3.0)
    _finish(b, m)


def armazem():
    """Armazem: worn plaster, a zinc gable, tall double doors, a timber
    loading platform along the street wall either side of them."""
    m = "armazem"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, wash="plaster.worn")
    kit.all_openings(b, m, shutters=False, frame="timber")
    b.box(tuple(kit.at(0, hd + 0.09, 1.6)), (0.06, 0.04, 3.2), "timber")
    kit.roof_gable(b, hw, hd, wall, rise, swatch="zinc", end="plaster.worn", along="y", overhang=0.3)
    for side in (-1, 1):
        b.box(tuple(kit.at(side * (hw / 2 + 0.9), hd + 0.9, 0.45)), (hw - 1.4, 1.8, 0.9), "timber", tile=1.0)
    kit.sign_board(b, 0, hd, wall - 0.3, 3.6)
    _finish(b, m)


def coreto():
    """Coreto: an octagonal bandstand on a stone plinth, a low balustrade
    between cast-iron columns, a pointed zinc roof with a finial. Its
    openings are the spans between the columns."""
    m = "coreto"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    turn = kit.rotation_z(math.pi / 8)
    b.cylinder((0, 0, 0), hw * 1.08, 0.3, "stone", sides=8, matrix=Matrix.Translation((0, 0, 0.15)) @ turn)
    for side in (-1, 1):
        for k in (-1, 1):
            b.box(tuple(kit.at(k * 1.5, side * hd, 0.65)), (1.6, 0.14, 0.7), "plaster")
            b.box(tuple(kit.at(side * hw, k * 1.5, 0.65)), (0.14, 1.6, 0.7), "plaster")
    columns = [(sx * hw, sy * hd) for sx in (-1, 1) for sy in (-1, 1)]
    columns += [(-0.7, hd), (0.7, hd), (-0.7, -hd), (0.7, -hd), (hw, 0), (-hw, 0)]
    kit.posts(b, columns, wall, swatch="iron", size=0.14)
    b.box(tuple(kit.at(0, 0, wall + 0.1)), (2 * hw + 0.3, 2 * hd + 0.3, 0.2), "plaster.shade")
    b.cone((0, 0, 0), hw * 1.35, rise + 0.6, "zinc", sides=8, matrix=Matrix.Translation((0, 0, wall + 0.2)) @ turn)
    b.box(tuple(kit.at(0, 0, wall + rise + 1.0)), (0.08, 0.08, 0.6), "iron")
    kit.steps(b, 0, hd, 1.2, count=2)
    b.box(tuple(kit.at(0, -hd - 0.3, 0.1)), (1.2, 0.6, 0.2), "stone")
    _finish(b, m)


def church():
    """Igreja matriz: whitewash with ochre trim, a pediment front, the bell
    tower on the front over the main door, tall side windows, front steps."""
    m = "church"
    hw, hd, wall, rise = _frame(m)
    tower = kit.openings(m)["tower"]
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, band="wash.ochre")
    kit.cornice(b, hw, hd, wall, swatch="wash.ochre")
    kit.all_openings(b, m, shutters=False, frame="wash.ochre")
    kit.roof_gable(b, hw, hd, wall + 0.1, rise, along="y", overhang=0.1)
    # The pediment: the front gable carried up as a wall.
    kit.face_out(b, [(-hw - 0.1, hd + 0.05, wall + 0.1), (hw + 0.1, hd + 0.05, wall + 0.1), (0, hd + 0.05, wall + rise + 0.3)],
                 "plaster", (0, 1, 0), kit.WALL_TILE)
    # The tower stands proud of the front by a little, the main door at its foot.
    kit.tower(b, tower["x"], tower["y"], tower["side"] + 0.3, tower["top"], trim="wash.ochre")
    main = next(entry for entry in kit.openings(m)["doors"] if entry["wall"] == "front")
    face = tower["y"] + (tower["side"] + 0.3) / 2
    b.box(tuple(kit.at(main["x"], face + 0.04, main["height"] / 2)), (main["width"], 0.08, main["height"]), "door", tile=1.4)
    b.box(tuple(kit.at(main["x"], face + 0.07, main["height"] + 0.1)), (main["width"] + 0.4, 0.1, 0.2), "wash.ochre")
    _pilasters(b, hw, hd, wall, swatch="wash.ochre")
    kit.steps(b, 0, hd + 0.05, 4.4, count=3)
    _finish(b, m)


def _row_of_gables(b: MeshBuilder, hw: float, hd: float, z: float, rise: float, bays: int, swatch: str, end: str) -> None:
    """A factory's row of gable roofs side by side, each ridge along the depth."""
    bay = 2 * hw / bays
    for k in range(bays):
        x = -hw + bay * (k + 0.5)
        b.prism((0, 0, 0), 2 * hd + 0.6, bay + 0.1, rise, swatch, end=end,
                matrix=Matrix.Translation(kit.at(x, 0, z)) @ kit.rotation_z(math.pi / 2), tile=kit.ROOF_TILE)


def factory():
    """Fabrica: brick walls on a stone plinth, stone cornices, framed windows
    on both floors, a row of gable roofs, a tall brick chimney."""
    m = "factory"
    hw, hd, wall, rise = _frame(m)
    storey = kit.openings(m)["storey"]
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, wash="brick")
    kit.cornice(b, hw, hd, storey, swatch="stone", depth=0.1)
    kit.cornice(b, hw, hd, wall, swatch="stone")
    kit.all_openings(b, m, shutters=False)
    _row_of_gables(b, hw, hd, wall + 0.1, rise, 4, "tile", "brick")
    kit.chimney(b, hw - 3.0, -hd + 3.0, 0, wall + rise + 9.0, size=1.6)
    kit.sign_board(b, 0, hd, wall - 0.6, 8.0)
    _finish(b, m)


def warehouse():
    """Galpao: worn plaster, a long zinc gable, sliding doors on an iron
    rail, a low timber platform along the rail side (the back)."""
    m = "warehouse"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, wash="plaster.worn")
    kit.all_openings(b, m, shutters=False, frame="timber")
    for entry in kit.openings(m)["doors"]:
        side = 1 if entry["wall"] == "front" else -1
        b.box(tuple(kit.at(entry["x"], side * (hd + 0.12), entry["height"] + 0.3)), (entry["width"] * 2 + 0.6, 0.12, 0.14), "iron")
    kit.roof_gable(b, hw, hd, wall, rise, swatch="zinc", end="plaster.worn", overhang=0.4)
    for side in (-1, 1):
        b.box(tuple(kit.at(side * (hw / 2 + 0.75), -hd - 1.0, 0.25)), (hw - 1.5, 2.0, 0.5), "timber", tile=1.0)
    _finish(b, m)


# --- new buildings (revise-buildings-and-stone 3.4) ---------------------------


def _bars(b: MeshBuilder, model: str) -> None:
    """Iron bars over every window of a building (a jail, a depot)."""
    for entry in kit.openings(model)["windows"]:
        along_x = entry["outX"] == 0
        x = entry["x"] + entry["outX"] * 0.1
        y = entry["y"] + entry["outY"] * 0.1
        mid = entry["sill"] + entry["height"] / 2
        for k in (-0.27, -0.09, 0.09, 0.27):
            bx, by = (x + k, y) if along_x else (x, y + k)
            b.box(tuple(kit.at(bx, by, mid)), (0.04, 0.04, entry["height"]), "iron")


def _flag_pole(b: MeshBuilder, x: float, y: float, base: float, height: float) -> None:
    b.box(tuple(kit.at(x, y, base + height / 2)), (0.08, 0.08, height), "timber")
    b.box(tuple(kit.at(x + 0.55, y, base + height - 0.4)), (1.0, 0.03, 0.65), "flag")


def wattle_house():
    """Casa de pau a pique: bare daub walls, a thatched hip roof, plain
    board shutters."""
    m = "wattle-house"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, wash="adobe", plinth=None)
    kit.all_openings(b, m, frame="timber")
    kit.roof_thatch(b, hw, hd, wall, rise + 0.4)
    _finish(b, m)


def rancho():
    """Rancho de sape: worn whitewash, a thatched hip roof and a thatched
    veranda on posts along the front."""
    m = "rancho"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, wash="plaster.worn", plinth=None, band="adobe")
    kit.all_openings(b, m, frame="timber")
    kit.roof_thatch(b, hw, hd, wall, rise + 0.4)
    kit.veranda(b, hw, hd, 1.8, 2.6, posts=4, swatch="thatch")
    _finish(b, m)


def flour_house():
    """Casa de farinha: worn whitewash, a gable of old tile, wide doors, the
    oven's shed on the right with its brick chimney."""
    m = "flour-house"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, wash="plaster.worn")
    kit.all_openings(b, m, shutters=False, frame="timber")
    kit.roof_gable(b, hw, hd, wall, rise, swatch="tile.old", end="plaster.worn", overhang=0.35)
    out = hw + 2.4
    kit.posts(b, [(out - 0.1, -hd + 0.4), (out - 0.1, hd - 0.4)], 2.4)
    kit.lean_to_side(b, hw, out, -hd + 0.1, hd - 0.1, wall - 0.3, 2.4, swatch="tile.old")
    b.box(tuple(kit.at(hw + 1.2, -1.0, 0.5)), (1.6, 2.2, 1.0), "brick", tile=0.8)
    kit.chimney(b, hw + 1.2, -1.8, 1.0, 3.2, size=0.5)
    _finish(b, m)


def railway_station():
    """Estacao ferroviaria: ochre wash and a cornice, a hip roof, the zinc
    platform canopy on iron posts along the track side (the back), a low
    stone platform and a blank name board on the street."""
    m = "railway-station"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, wash="wash.ochre", band="plaster.shade")
    kit.cornice(b, hw, hd, wall)
    kit.all_openings(b, m)
    kit.roof_hip(b, hw, hd, wall + 0.1, rise)
    b.box(tuple(kit.at(0, -hd - 1.7, 0.2)), (2 * hw + 6, 3.4, 0.4), "stone", tile=1.0)
    for k in range(7):
        b.box(tuple(kit.at(-hw - 2 + (2 * hw + 4) * k / 6, -hd - 3.0, 1.9)), (0.12, 0.12, 3.8), "iron")
    kit.roof_lean_to(b, -hw - 2.6, hw + 2.6, -hd, -hd - 3.6, 4.2, 3.6, swatch="zinc")
    kit.sign_board(b, 0, hd, wall - 0.4, 4.0)
    _finish(b, m)


def telegraph_office():
    """Agencia do telegrafo: blue wash, a platband with cornices, the line's
    bracket pole on the roof with its insulators."""
    m = "telegraph-office"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, wash="wash.blue")
    kit.all_openings(b, m)
    kit.roof_gable(b, hw, hd - 0.3, wall, rise - 0.3, along="x", overhang=0.1)
    kit.platband(b, hw, hd, wall, 1.0)
    _pilasters(b, hw, hd, wall + 0.9)
    pole = (hw - 1.0, -hd + 1.0)
    b.box(tuple(kit.at(*pole, wall + 1.5)), (0.14, 0.14, 3.0), "timber")
    b.box(tuple(kit.at(*pole, wall + 2.7)), (1.6, 0.1, 0.1), "timber")
    for dx in (-0.7, -0.25, 0.25, 0.7):
        b.box(tuple(kit.at(pole[0] + dx, pole[1], wall + 2.82)), (0.08, 0.08, 0.14), "plaster")
    kit.sign_board(b, 0, hd, wall + 0.45, 2.4)
    _finish(b, m)


def jail():
    """Cadeia: thick whitewashed walls on a tall stone plinth, barred
    windows in stone frames, a tiled hip roof, pilasters."""
    m = "jail"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, plinth_height=0.9)
    kit.cornice(b, hw, hd, wall)
    kit.all_openings(b, m, shutters=False, frame="stone")
    _bars(b, m)
    _pilasters(b, hw, hd, wall)
    kit.roof_hip(b, hw, hd, wall + 0.1, rise)
    _finish(b, m)


def town_hall():
    """Prefeitura: two floors in whitewash with ochre trim, a storey
    cornice, a balcony over the door, a platband with a pediment and the
    flag, steps to the street."""
    m = "town-hall"
    hw, hd, wall, rise = _frame(m)
    storey = kit.openings(m)["storey"]
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, band="wash.ochre")
    kit.cornice(b, hw, hd, storey, swatch="wash.ochre", depth=0.1)
    kit.all_openings(b, m, frame="wash.ochre")
    kit.roof_hip(b, hw, hd - 0.3, wall, rise, overhang=0.1)
    kit.platband(b, hw, hd, wall, 0.9)
    kit.face_out(b, [(-2.6, hd + 0.05, wall + 0.9), (2.6, hd + 0.05, wall + 0.9), (0, hd + 0.05, wall + 2.0)], "plaster", (0, 1, 0), kit.WALL_TILE)
    _pilasters(b, hw, hd, wall + 0.8, swatch="wash.ochre")
    kit.balcony(b, 0, hd, storey + 0.85, 3.0)
    _flag_pole(b, 0, hd - 0.2, wall + 2.0, 2.4)
    kit.steps(b, 0, hd, 3.0, count=3)
    _finish(b, m)


def school():
    """Grupo escolar: a long symmetric front in rose wash, pilasters and a
    platband with its name board, steps to the door."""
    m = "school"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, wash="wash.rose", band="plaster.shade")
    kit.all_openings(b, m)
    kit.roof_hip(b, hw, hd - 0.3, wall, rise, overhang=0.1)
    kit.platband(b, hw, hd, wall, 1.0)
    _pilasters(b, hw, hd, wall + 0.9)
    for x in (-1.4, 1.4):
        b.box(tuple(kit.at(x, hd + 0.06, (wall + 0.9) / 2)), (0.36, 0.14, wall + 0.9), "plaster.shade")
    kit.sign_board(b, 0, hd, wall + 0.45, 3.6)
    kit.steps(b, 0, hd, 2.4, count=2)
    _finish(b, m)


def market_shed():
    """Mercado: an open shed on timber posts, a tiled gable, a stone floor
    and the stalls' counters under it. Its openings are the open bays."""
    m = "market-shed"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    b.box(tuple(kit.at(0, 0, 0.1)), (2 * hw, 2 * hd, 0.2), "stone", tile=1.0)
    columns = [(x, y) for x in (-hw + 0.1, -hw / 2, 0.0, hw / 2, hw - 0.1) for y in (-hd + 0.1, hd - 0.1)]
    columns += [(x, 0.0) for x in (-hw + 0.1, hw - 0.1)]
    kit.posts(b, [(x, y) for x, y in columns if not (abs(x) < 1.5 and abs(y) > 1)], wall, size=0.24)
    b.box(tuple(kit.at(0, hd - 0.1, wall - 0.15)), (2 * hw, 0.2, 0.3), "timber")
    b.box(tuple(kit.at(0, -hd + 0.1, wall - 0.15)), (2 * hw, 0.2, 0.3), "timber")
    kit.roof_gable(b, hw, hd, wall, rise, end="timber", overhang=0.5)
    for x in (-hw / 2 - 1.2, hw / 2 + 1.2):
        for y in (-1.6, 1.6):
            b.box(tuple(kit.at(x, y, 0.55)), (2.4, 0.8, 0.9), "crate", tile=1.0)
    _finish(b, m)


def water_tank():
    """Caixa d'agua: a square brick base with its door and two small windows,
    a timber tank bound in iron on top, a zinc cap and the spout."""
    m = "water-tank"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, wash="brick")
    kit.cornice(b, hw, hd, wall, swatch="stone", depth=0.25)
    kit.all_openings(b, m, shutters=False, frame="stone")
    b.cylinder(tuple(kit.at(0, 0, wall + 1.2)), 2.1, 2.2, "timber", sides=10)
    for z in (wall + 0.5, wall + 1.2, wall + 1.9):
        b.cylinder(tuple(kit.at(0, 0, z)), 2.14, 0.1, "iron", sides=10)
    b.cone(tuple(kit.at(0, 0, wall + 2.3)), 2.3, 0.8, "zinc", sides=10)
    b.box(tuple(kit.at(1.9, 1.2, wall + 0.3)), (1.4, 0.18, 0.18), "iron")
    _finish(b, m)


def barracks_block():
    """Quartel: a long whitewashed block with an ochre dado, a tiled gable
    with loft vents in its ends, a cornice, the flag on the street front and
    steps to the guard door."""
    m = "barracks-block"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, band="wash.ochre")
    kit.cornice(b, hw, hd, wall)
    kit.all_openings(b, m)
    kit.roof_gable(b, hw, hd, wall + 0.1, rise, overhang=0.4)
    for x in (-hw + 0.2, -hw / 3, hw / 3, hw - 0.2):
        b.box(tuple(kit.at(x, hd + 0.06, wall / 2)), (0.4, 0.14, wall), "plaster.shade")
    _flag_pole(b, -2.4, hd + 1.4, 0, 7.0)
    kit.steps(b, 0, hd, 2.4, count=2)
    _finish(b, m)


def guardhouse():
    """Corpo da guarda: a small whitewashed post, a tiled hip roof, a porch
    on two posts over the door."""
    m = "guardhouse"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, band="wash.ochre")
    kit.all_openings(b, m)
    kit.roof_hip(b, hw, hd, wall, rise)
    kit.veranda(b, 1.1, hd, 1.3, 2.4, posts=2)
    _finish(b, m)


def depot():
    """Deposito: brick walls on a stone plinth, barred windows, a zinc gable,
    wide doors under an iron lintel."""
    m = "depot"
    hw, hd, wall, rise = _frame(m)
    b = MeshBuilder("environment")
    kit.walls(b, hw, hd, wall, wash="brick")
    kit.cornice(b, hw, hd, wall, swatch="stone", depth=0.1)
    kit.all_openings(b, m, shutters=False, frame="stone")
    _bars(b, m)
    kit.roof_gable(b, hw, hd, wall + 0.1, rise, swatch="zinc", end="brick", overhang=0.3)
    _finish(b, m)


def aid_tent():
    """A ridge tent of canvas with red crosses on the gable ends."""
    b = MeshBuilder("environment")
    b.prism((0, 0, 0), 5.6, 4.6, 2.8, "canvas", end="canvas.cross", tile=1.4)
    b.box((-2.9, 0, 1.4), (0.1, 0.1, 2.8), "timber")
    b.box((2.9, 0, 1.4), (0.1, 0.1, 2.8), "timber")
    b.to_object("aid-tent")


def build():
    reset()
    barracks()
    farmhouse()
    barn()
    chapel()
    casa_sede()
    colonist_house()
    engenho()
    ferry_house()
    terraced_house()
    terraced_house_wide()
    sobrado()
    casa_terrea()
    venda()
    armazem()
    coreto()
    church()
    factory()
    warehouse()
    wattle_house()
    rancho()
    flour_house()
    railway_station()
    telegraph_office()
    jail()
    town_hall()
    school()
    market_shed()
    water_tank()
    barracks_block()
    guardhouse()
    depot()
    aid_tent()
    return [save_and_export("buildings", "environment")]
