"""Training ground buildings, at the footprints of TRAINING_BUILDINGS.

Blender space: Z up, footprint centred on the origin, ground at z = 0. The
glTF export turns Blender +Y into the game's north (simulation -y), so a door
on the +Y wall faces north. Sizes match the simulation footprints in
packages/shared/src/training-ground.ts (halfWidth along X, halfDepth along Y,
height for sight), so the game places them without scaling.
"""
import math

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
    aid_tent()
    return [save_and_export("buildings", "environment")]
