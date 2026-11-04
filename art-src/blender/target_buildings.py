"""Training ground buildings, at the footprints of TRAINING_BUILDINGS.

Blender space: Z up, footprint centred on the origin, ground at z = 0. The
glTF export turns Blender +Y into the game's north (simulation -y), so a door
on the +Y wall faces north. Sizes match the simulation footprints in
packages/shared/src/training-ground.ts (halfWidth along X, halfDepth along Y,
height for sight), so the game places them without scaling.
"""
import math

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


def farmhouse():
    """Adobe walls and a clay-tile roof, door to the south road."""
    b = MeshBuilder("environment")
    hw, hd = 4.35, 2.85
    b.box((0, 0, 1.5), (2 * hw, 2 * hd, 3.0), "adobe", top="adobe", tile=WALL_TILE)
    b.prism((0, 0, 3.0), 2 * hw + 0.7, 2 * hd + 0.9, 1.8, "tile", end="adobe", tile=ROOF_TILE)
    b.box((-1.2, -hd - 0.04, 1.05), (1.0, 0.1, 2.1), "door")
    windows(b, hw, hd, (1.6,), 1.7, sides=(-1,))
    windows(b, hw, hd, (-2.0, 2.0), 1.7, sides=(1,))
    b.box((2.6, 0.6, 4.4), (0.5, 0.5, 1.2), "adobe")
    # A lean-to porch over the door.
    for x in (-2.4, 0.0):
        b.box((x, -hd - 1.3, 1.1), (0.14, 0.14, 2.2), "timber")
    b.box((-1.2, -hd - 0.75, 2.3), (3.0, 1.6, 0.12), "timber")
    b.to_object("farmhouse")


def barn():
    """Board walls, a high roof and a wide door to the south."""
    b = MeshBuilder("environment")
    hw, hd = 5.65, 3.5
    b.box((0, 0, 1.9), (2 * hw, 2 * hd, 3.8), "timber", top="timber", tile=2.0)
    b.prism((0, 0, 3.8), 2 * hw + 0.6, 2 * hd + 0.8, 2.2, "tile", end="timber", tile=ROOF_TILE)
    b.box((0, -hd - 0.05, 1.6), (3.0, 0.12, 3.2), "door", tile=1.6)
    b.box((0, -hd - 0.08, 4.6), (1.0, 0.08, 0.8), "window")
    b.to_object("barn")


def chapel():
    """A whitewashed nave along Y with the bell tower at the south front."""
    b = MeshBuilder("environment")
    hw, hd = 3.2, 4.8
    b.box((0, 0.6, 1.7), (2 * hw, 2 * hd - 1.2, 3.4), "plaster", top="plaster.shade", tile=WALL_TILE)
    # Built along X, centred 0.6 m north once turned onto Y.
    b.prism((0.6, 0, 3.4), 2 * hd - 0.6, 2 * hw + 0.7, 1.8, "tile", end="plaster", matrix=rotation_z(math.pi / 2), tile=ROOF_TILE)
    # Bell tower on the front, door at its foot.
    b.box((0, -hd + 1.1, 3.1), (2.4, 2.2, 6.2), "plaster", top="plaster.shade", tile=WALL_TILE)
    b.box((0, -hd + 1.1, 5.4), (2.5, 2.3, 0.2), "plaster.shade")
    b.cone((0, -hd + 1.1, 6.2), 1.7, 1.4, "tile", sides=4)
    b.box((0, -hd + 1.1, 7.9), (0.1, 0.1, 0.8), "timber")
    b.box((0, -hd + 1.1, 8.0), (0.5, 0.1, 0.1), "timber")
    b.box((0, -hd + 0.0 - 0.04, 1.2), (1.1, 0.1, 2.2), "door")
    b.box((0, -hd - 0.05, 4.6), (0.7, 0.1, 0.9), "ink")
    for y in (-0.6, 1.6, 3.6):
        for side in (-1, 1):
            b.box((side * (hw + 0.03), y, 2.2), (0.08, 0.6, 1.3), "window")
    b.to_object("chapel")


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
    aid_tent()
    return [save_and_export("buildings", "environment")]
