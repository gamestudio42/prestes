"""Waterside, farm and town objects (revise-buildings-and-stone 5.1, D9).

Built into props.glb by target_props.build(). Each object stands on the
origin inside its catalog footprint (catalog-objects.ts): halfWidth along
Blender X, halfDepth along Blender Y (battle y is Blender -Y), up to its
height. A boat's waterline is z = 0: afloat, the view sets it on the water's
surface; on a bank it sits on the ground. Every object is of the 1920s in
the interior of Brazil.
"""
import math

from mathutils import Matrix, Vector

from common import MeshBuilder, placed

ALONG_X = math.pi / 2  # rz turning a part built along Y to lie along X


def _p(matrix, x, y, z):
    v = Vector((x, y, z))
    return matrix @ v if matrix is not None else v


def hull(b: MeshBuilder, length: float, beam: float, depth: float, swatch: str, floor: str = "timber",
         decked: bool = False, bow: float = 0.18, z0: float = 0.0, matrix: Matrix | None = None, along_y: bool = False) -> None:
    """A boat's hull along X (or Y): pointed ends, flared sides, a floor
    inside (or a deck when `decked`); `beam` is the half beam."""
    xs = [-length / 2, -length / 2 + length * bow, length / 2 - length * bow, length / 2]
    ws = [0.03, beam, beam, 0.03]
    turn = Matrix.Rotation(math.pi / 2, 4, "Z") if along_y else Matrix.Identity(4)
    m = (matrix if matrix is not None else Matrix.Identity(4)) @ turn

    def v(x, y, z):
        return b._vert(_p(m, x, y, z0 + z), None)

    top = depth
    floor_z = depth * (0.95 if decked else 0.35)
    for i in range(3):
        x0, x1, w0, w1 = xs[i], xs[i + 1], ws[i], ws[i + 1]
        for s in (1, -1):
            outer = [v(x0, s * w0 * 0.55, 0), v(x1, s * w1 * 0.55, 0), v(x1, s * w1, top), v(x0, s * w0, top)]
            b._face(outer, swatch, None, flip=(s == 1))
            if not decked:
                inner = [v(x0, s * w0 * 0.5, floor_z), v(x1, s * w1 * 0.5, floor_z), v(x1, s * w1 * 0.9, top), v(x0, s * w0 * 0.9, top)]
                b._face(inner, swatch, None, flip=(s != 1))
                # The gunwale's top, between the outer and inner faces.
                b._face([v(x0, s * w0, top), v(x1, s * w1, top), v(x1, s * w1 * 0.9, top), v(x0, s * w0 * 0.9, top)], swatch, None, flip=(s == 1))
        bottom = [v(x0, -w0 * 0.55, 0), v(x1, -w1 * 0.55, 0), v(x1, w1 * 0.55, 0), v(x0, w0 * 0.55, 0)]
        b._face(bottom, swatch, None, flip=True)
        k = 1.0 if decked else 0.5
        deck = [v(x0, -w0 * k, floor_z), v(x1, -w1 * k, floor_z), v(x1, w1 * k, floor_z), v(x0, w0 * k, floor_z)]
        if decked:
            deck = [v(x0, -w0, top), v(x1, -w1, top), v(x1, w1, top), v(x0, w0, top)]
        b._face(deck, floor, None)


def wheel(b: MeshBuilder, x: float, y: float, r: float, swatch: str, width: float = 0.1, hub: str | None = None, axis: str = "x",
          tilt: float = 0.0) -> None:
    """A wheel on an axle along X (or Y), resting on the ground at (x, y)."""
    rz = 0.0 if axis == "y" else ALONG_X
    b.cylinder((0, 0, 0), r, width, swatch, sides=10, top=hub or swatch, matrix=placed(x, y, r, rx=math.pi / 2 + tilt, rz=rz))


def logs(b: MeshBuilder, count: int, length: float, radius: float, swatch: str = "bark", z: float = 0.0) -> None:
    """Logs side by side along X, lashed into a raft."""
    for k in range(count):
        y = (k - (count - 1) / 2) * radius * 2.05
        b.cylinder((0, 0, 0), radius, length, swatch, sides=6, matrix=placed(0, y, z + radius, rx=math.pi / 2, rz=ALONG_X))


def two_sided(b: MeshBuilder, corners, swatch: str) -> None:
    b._face([b._vert(c, None) for c in corners], swatch, None)
    b._face([b._vert(c, None) for c in corners], swatch, None, flip=True)


# --- Waterside ---------------------------------------------------------------

def dugout_canoe():
    b = MeshBuilder("environment")
    hull(b, 6.0, 0.38, 0.45, "bark", floor="earth", bow=0.25)
    b.box((0, 0, 0), (1.4, 0.1, 0.03), "timber", matrix=placed(1.2, 0.1, 0.32, rz=0.3))
    b.to_object("dugout-canoe")


def motor_launch():
    b = MeshBuilder("environment")
    hull(b, 7.0, 0.95, 0.8, "plaster", floor="timber")
    b.box((-0.8, 0, 1.15), (2.6, 1.4, 0.7), "plaster", top="canvas")
    b.box((-0.8, 0, 1.55), (2.8, 1.6, 0.08), "canvas")
    b.cylinder((0.9, 0, 1.25), 0.12, 0.9, "iron", sides=6)
    b.to_object("motor-launch")


def river_raft():
    b = MeshBuilder("environment")
    logs(b, 10, 6.0, 0.19)
    for x in (-2.4, 0, 2.4):
        b.box((x, 0, 0.4), (0.16, 3.9, 0.08), "timber")
    b.to_object("river-raft")


def river_barge():
    b = MeshBuilder("environment")
    hull(b, 14.0, 2.4, 1.0, "timber", floor="timber", decked=True, bow=0.08)
    b.box((-4.5, 0, 1.6), (3.0, 3.0, 1.2), "timber", top="thatch")
    for x in (0.0, 2.5):
        b.box((x, 0.6, 1.3), (1.2, 1.0, 0.6), "crate")
    b.box((5.0, -0.5, 1.25), (1.0, 1.4, 0.5), "sandbag")
    b.to_object("river-barge")


def horse_boat():
    b = MeshBuilder("environment")
    hull(b, 10.0, 1.9, 0.6, "timber", decked=True, bow=0.1)
    for s in (1, -1):
        b.box((0, s * 1.75, 1.15), (8.5, 0.08, 0.08), "timber")
        for x in (-4, -2, 0, 2, 4):
            b.box((x, s * 1.75, 0.9), (0.1, 0.1, 0.6), "timber")
    b.to_object("horse-boat")


def canoa_de_tolda():
    b = MeshBuilder("environment")
    hull(b, 12.0, 1.3, 0.9, "timber", floor="timber", bow=0.2)
    # The tolda: a thatched shelter over the stern half.
    b.box((-2.3, 0, 1.05), (4.2, 2.0, 0.3), "timber")
    for x in (-4.2, -0.4):
        for s in (1, -1):
            b.box((x, s * 0.95, 1.4), (0.1, 0.1, 0.9), "timber")
    b.prism((-2.3, 0, 1.85), 4.4, 2.3, 0.35, "thatch", end="timber")
    # The carranca at the bow.
    b.box((5.85, 0, 1.25), (0.35, 0.25, 0.6), "ink")
    b.to_object("canoa-de-tolda")


def jangada():
    b = MeshBuilder("environment")
    logs(b, 5, 5.6, 0.18, swatch="bark")
    b.box((0.8, 0, 0.6), (0.4, 1.6, 0.08), "timber")
    b.cylinder((0.9, 0, 2.2), 0.06, 3.6, "timber", sides=6)
    two_sided(b, [Vector((0.95, 0, 0.8)), Vector((-1.6, 0, 0.8)), Vector((0.95, 0, 3.9))], "canvas")
    b.to_object("jangada")


def boat_overturned():
    b = MeshBuilder("environment")
    hull(b, 4.6, 0.75, 0.55, "plaster.worn", floor="timber", decked=True, matrix=placed(0, 0, 0.55, rx=math.pi))
    b.to_object("boat-overturned")


def net_line():
    b = MeshBuilder("environment")
    for x in (-2.35, 2.35):
        b.box((x, 0, 0.9), (0.1, 0.1, 1.8), "timber")
    b.box((0, 0, 1.72), (4.7, 0.03, 0.03), "timber")
    # The net hung to dry: its cords, a mesh of thin strips, sagging at the foot.
    for k in range(23):
        x = -2.2 + k * 0.2
        drop = 0.5 + 0.15 * math.sin(k / 22 * math.pi)
        b.box((x, 0, (1.7 + drop) / 2), (0.025, 0.02, 1.7 - drop), "bark")
    for k in range(6):
        z = 0.65 + k * 0.2
        b.box((0, 0, z), (4.4, 0.02, 0.025), "bark")
    b.to_object("net-line")


def fish_trap():
    b = MeshBuilder("environment")
    b.cylinder((0, 0, 0), 0.28, 0.75, "hay", sides=8, top="ink", radius_top=0.12, matrix=placed(0, 0, 0.3, rx=math.pi / 2, rz=0.4))
    b.to_object("fish-trap")


def landing_stage():
    b = MeshBuilder("environment")
    b.box((0, 0, 0.94), (8.0, 3.0, 0.12), "timber", tile=1.0)
    for x in (-3.8, -1.3, 1.3, 3.8):
        for s in (1, -1):
            b.cylinder((x, s * 1.35, -0.5), 0.13, 3.0, "bark", sides=6)
    b.to_object("landing-stage")


def mooring_post():
    b = MeshBuilder("environment")
    b.cylinder((0, 0, 0.5), 0.13, 1.0, "timber", sides=6)
    b.cylinder((0, 0, 0.82), 0.16, 0.08, "iron", sides=6)
    b.to_object("mooring-post")


# --- Farm --------------------------------------------------------------------

def ox_cart():
    """The carro de boi: a plank bed on two solid wheels, its long pole and yoke (no oxen)."""
    b = MeshBuilder("environment")
    b.box((0, 0.5, 1.0), (1.4, 3.2, 0.12), "timber")
    for s in (1, -1):
        for y in (-0.9, 0, 0.9, 1.8):
            b.box((s * 0.66, y, 1.45), (0.07, 0.07, 0.8), "timber")
        b.box((s * 0.66, 0.45, 1.8), (0.06, 3.0, 0.06), "timber")
    for s in (1, -1):
        b.cylinder((0, 0, 0), 0.7, 0.14, "timber", sides=10, top="crate", matrix=placed(s * 0.82, 0.3, 0.7, rx=math.pi / 2, rz=ALONG_X))
    b.box((0, 0.3, 0.7), (1.8, 0.12, 0.12), "timber")
    b.box((0, -2.1, 0.75), (0.14, 2.4, 0.14), "timber")
    b.box((0, -2.9, 0.7), (1.6, 0.14, 0.14), "timber")
    b.to_object("ox-cart")


def tractor():
    """A broken tractor of the Fordson type: iron block, big rear wheels, a front wheel gone."""
    b = MeshBuilder("environment")
    b.box((0, -0.2, 0.85), (0.6, 1.9, 0.6), "iron")
    b.box((0, -1.15, 1.0), (0.66, 0.12, 0.8), "metal")
    b.box((0, 0.7, 1.2), (0.36, 0.4, 0.08), "iron")
    b.cylinder((0, 0.25, 1.35), 0.03, 0.9, "metal", sides=6)
    b.cylinder((0, 0.05, 1.8), 0.16, 0.04, "ink", sides=8)
    for s in (1, -1):
        wheel(b, s * 0.72, 0.65, 0.62, "iron", width=0.3, hub="metal")
    wheel(b, -0.45, -0.95, 0.38, "iron", width=0.14, hub="metal")
    b.cylinder((0, 0, 0), 0.38, 0.14, "iron", sides=10, top="metal", matrix=placed(0.75, -0.9, 0.08, rx=0.0))
    b.to_object("tractor")


def plough():
    b = MeshBuilder("environment")
    b.box((0, 0.1, 0.35), (0.1, 2.2, 0.1), "timber", matrix=placed(0, 0, 0, rx=0.12))
    for s in (1, -1):
        b.box((s * 0.18, 0.95, 0.6), (0.06, 0.06, 0.9), "timber", matrix=placed(0, 0, 0, rx=-0.35))
    b.box((0, -0.85, 0.12), (0.3, 0.45, 0.04), "iron", matrix=placed(0, 0, 0, rx=0.4))
    b.to_object("plough")


def cane_press():
    """A three-roller cane press in its timber frame, the sweep beam for the ox."""
    b = MeshBuilder("environment")
    for x in (-0.55, 0.55):
        for y in (-0.4, 0.4):
            b.box((x, y, 0.6), (0.14, 0.14, 1.2), "timber")
    b.box((0, 0, 1.25), (1.4, 1.0, 0.14), "timber")
    for x in (-0.3, 0, 0.3):
        b.cylinder((x, 0, 0.7), 0.14, 0.9, "timber", sides=8, top="bark")
    b.box((0, 0, 1.38), (1.6, 0.1, 0.1), "timber", matrix=placed(0, 0, 0, rz=0.5))
    b.box((0, 0, 0.12), (1.2, 0.8, 0.24), "timber", top="earth")
    b.to_object("cane-press")


def coffee_sacks():
    b = MeshBuilder("environment")
    for layer, (count, z) in enumerate(((4, 0.2), (3, 0.55), (2, 0.88))):
        for k in range(count):
            x = (k - (count - 1) / 2) * 0.62
            for y in (-0.35, 0.35):
                b.box((x, y, z), (0.58, 0.68, 0.34), "sandbag")
    b.to_object("coffee-sacks")


def hen_house():
    b = MeshBuilder("environment")
    for x in (-0.8, 0.8):
        for y in (-0.6, 0.6):
            b.box((x, y, 0.25), (0.08, 0.08, 0.5), "timber")
    b.box((0, 0, 0.8), (1.8, 1.4, 0.6), "timber", front="door")
    b.prism((0, 0, 1.1), 2.0, 1.6, 0.3, "thatch", end="timber")
    b.box((0, -0.95, 0.3), (0.25, 0.8, 0.04), "timber", matrix=placed(0, 0, 0, rx=0.6))
    b.to_object("hen-house")


def pigsty():
    b = MeshBuilder("environment")
    for s in (1, -1):
        b.box((0, s * 1.45, 0.45), (4.0, 0.08, 0.9), "timber", tile=1.0)
        b.box((s * 1.95, 0, 0.45), (0.08, 3.0, 0.9), "timber", tile=1.0)
    b.box((-1.2, 0.8, 0.5), (1.4, 1.2, 1.0), "adobe")
    b.prism((-1.2, 0.8, 1.0), 1.6, 1.4, 0.3, "tile.old", end="adobe")
    b.box((0.3, -0.2, 0.02), (2.4, 2.4, 0.04), "earth")
    b.to_object("pigsty")


def cart_wheel():
    b = MeshBuilder("environment")
    b.cylinder((0, 0, 0), 0.6, 0.1, "timber", sides=10, top="crate", matrix=placed(0, 0.08, 0.58, rx=math.pi / 2 + 0.2, rz=ALONG_X))
    b.to_object("cart-wheel")


def millstone():
    b = MeshBuilder("environment")
    b.cylinder((0, 0, 0.15), 0.6, 0.3, "granite", sides=10, top="granite")
    b.cylinder((0, 0, 0.31), 0.1, 0.02, "ink", sides=6)
    b.to_object("millstone")


# --- Town --------------------------------------------------------------------

def motor_car():
    """A broken-down motor car of the Ford T type: black tub, folded hood, a wheel off."""
    b = MeshBuilder("environment")
    b.box((0, 0, 0.55), (1.0, 3.1, 0.12), "ink")
    b.box((0, -1.05, 0.85), (0.7, 0.9, 0.55), "ink", front="metal")
    b.box((0, 0.35, 0.95), (1.25, 1.9, 0.7), "ink", top="crate")
    b.box((0, -0.45, 1.35), (1.2, 0.06, 0.4), "window")
    b.box((0, 0.65, 1.55), (1.3, 1.2, 0.06), "canvas")
    for x, y, keep in ((0.7, -1.15, True), (-0.7, -1.15, True), (0.7, 1.05, True), (-0.7, 1.05, False)):
        if keep:
            wheel(b, x, y, 0.38, "ink", width=0.1, hub="timber")
    b.cylinder((0, 0, 0), 0.38, 0.1, "ink", sides=10, top="timber", matrix=placed(-1.0, 1.4, 0.05))
    b.to_object("motor-car")


def lorry():
    """A lorry of the Ford TT type: cab, plank bed with low sides."""
    b = MeshBuilder("environment")
    b.box((0, 0, 0.62), (1.1, 5.0, 0.14), "ink")
    b.box((0, -1.95, 0.95), (0.75, 0.9, 0.55), "ink", front="metal")
    b.box((0, -1.05, 1.3), (1.5, 0.9, 1.3), "ink", front="window")
    b.box((0, -1.05, 2.0), (1.6, 1.0, 0.08), "canvas")
    b.box((0, 1.0, 0.82), (1.9, 3.0, 0.1), "timber")
    for s in (1, -1):
        b.box((s * 0.92, 1.0, 1.1), (0.06, 3.0, 0.5), "timber")
    b.box((0, 2.48, 1.1), (1.9, 0.06, 0.5), "timber")
    b.box((0.3, 0.8, 1.15), (0.9, 0.9, 0.6), "crate")
    for s in (1, -1):
        wheel(b, s * 0.8, -1.9, 0.42, "ink", width=0.12, hub="timber")
        wheel(b, s * 0.85, 1.5, 0.46, "ink", width=0.2, hub="timber")
    b.to_object("lorry")


def square_bench():
    b = MeshBuilder("environment")
    for x in (-0.85, 0.85):
        b.box((x, 0, 0.42), (0.08, 0.5, 0.84), "iron")
    for y in (-0.15, 0, 0.15):
        b.box((0, y, 0.45), (1.9, 0.12, 0.04), "timber")
    b.box((0, 0.24, 0.72), (1.9, 0.04, 0.3), "timber")
    b.to_object("square-bench")


def fountain():
    """A town chafariz: an eight-sided stone basin, a column and its bowl."""
    b = MeshBuilder("environment")
    b.cylinder((0, 0, 0.3), 1.15, 0.6, "stone", sides=8, top="ink")
    b.cylinder((0, 0, 0.62), 1.2, 0.08, "stone", sides=8, top="stone")
    b.cylinder((0, 0, 1.05), 0.18, 1.0, "plaster", sides=8)
    b.cylinder((0, 0, 1.55), 0.5, 0.15, "stone", sides=8, top="ink", radius_top=0.55)
    b.cylinder((0, 0, 1.72), 0.08, 0.2, "metal", sides=6)
    b.to_object("fountain")


def market_stall():
    b = MeshBuilder("environment")
    b.box((0, 0, 0.8), (2.2, 1.3, 0.08), "timber")
    for x in (-1.05, 1.05):
        for y in (-0.6, 0.6):
            b.box((x, y, 0.95), (0.08, 0.08, 1.9), "timber")
    b.prism((0, 0, 1.9), 2.4, 1.8, 0.3, "canvas", end="timber")
    for x in (-0.6, 0.1, 0.7):
        b.cylinder((x, -0.1, 0.98), 0.22, 0.28, "hay", sides=8, top="leaf")
    b.box((0, 0.3, 0.3), (1.6, 0.5, 0.6), "crate")
    b.to_object("market-stall")


def fuel_tins():
    """Kerosene and petrol tins two to a wooden crate, the crates stacked."""
    b = MeshBuilder("environment")
    for x, z in ((-0.3, 0.25), (0.32, 0.25), (0.0, 0.73)):
        b.box((x, 0, z), (0.58, 0.75, 0.46), "crate")
        for y in (-0.17, 0.17):
            b.box((x, y, z + 0.27), (0.42, 0.3, 0.08), "metal")
    b.to_object("fuel-tins")


def street_sign():
    b = MeshBuilder("environment")
    b.cylinder((0, 0, 1.1), 0.05, 2.2, "iron", sides=6)
    b.box((0.32, 0, 1.95), (0.62, 0.03, 0.3), "plaster")
    b.box((0.32, -0.02, 1.95), (0.54, 0.02, 0.22), "wash.blue")
    b.to_object("street-sign")


def kiosk():
    """A small eight-sided kiosk with its counter window and pointed zinc roof."""
    b = MeshBuilder("environment")
    b.cylinder((0, 0, 1.1), 1.15, 2.2, "wash.ochre", sides=8, top="timber")
    b.box((0, -1.08, 1.3), (0.9, 0.06, 0.7), "window")
    b.box((0, -1.25, 0.95), (1.0, 0.35, 0.06), "timber")
    b.cylinder((0, 0, 2.25), 1.35, 0.1, "trim", sides=8, top="trim")
    b.cone((0, 0, 2.3), 1.3, 0.9, "zinc", sides=8)
    b.to_object("kiosk")


# --- Gates, standing open (5.3) ----------------------------------------------

def _leaf(b: MeshBuilder, hinge_x: float, length: float, height: float, swing: float, parts) -> None:
    """A gate leaf hinged at (hinge_x, 0), swung `swing` radians about its hinge;
    `parts` are (x0, x1, z0, z1, swatch) boxes in the leaf's own frame."""
    turn = placed(hinge_x, 0, 0, rz=swing)
    for x0, x1, z0, z1, swatch in parts:
        b.box(((x0 + x1) / 2, 0, (z0 + z1) / 2), (x1 - x0, 0.07, z1 - z0), swatch, matrix=turn)


def farm_gate():
    """A farm gate (porteira) of five bars and a brace, swung wide open."""
    b = MeshBuilder("environment")
    for x in (-1.8, 1.8):
        b.box((x, 0, 0.8), (0.22, 0.22, 1.9), "bark")
    length = 3.4
    parts = [(0.05, 0.15, 0.1, 1.45, "timber"), (length - 0.1, length, 0.1, 1.45, "timber")]
    parts += [(0.05, length, z, z + 0.1, "timber") for z in (0.15, 0.45, 0.75, 1.05, 1.35)]
    _leaf(b, -1.8, length, 1.5, -math.pi / 2, parts)
    # The brace in the leaf's plane, from the hinge's foot up to the far top rail.
    x0, z0, x1, z1 = 0.15, 0.2, length - 0.1, 1.4
    rise = math.atan2(z1 - z0, x1 - x0)
    brace = placed(-1.8, 0, 0, rz=-math.pi / 2) @ Matrix.Translation(((x0 + x1) / 2, 0, (z0 + z1) / 2)) @ Matrix.Rotation(-rise, 4, "Y")
    b.box((0, 0, 0), (math.hypot(x1 - x0, z1 - z0), 0.06, 0.09), "timber", matrix=brace)
    b.to_object("farm-gate")


def rail_gate():
    """A rail gate (cancela de varas): two slotted posts, the rails slid out
    and laid on the ground beside the gap."""
    b = MeshBuilder("environment")
    for x in (-1.6, 1.6):
        b.box((x, 0, 0.7), (0.2, 0.2, 1.5), "bark")
    for k, y in enumerate((-0.25, -0.4, -0.55)):
        b.cylinder((0, 0, 0), 0.06, 3.4, "bark", sides=6, matrix=placed(0.1 * k, y, 0.06, rx=math.pi / 2, rz=ALONG_X + 0.05 * k))
    b.to_object("rail-gate")


def yard_gate():
    """A yard gate of boards on two posts, standing open."""
    b = MeshBuilder("environment")
    for x in (-0.93, 0.93):
        b.box((x, 0, 0.9), (0.14, 0.14, 1.8), "timber")
    parts = [(0.05 + k * 0.18, 0.05 + k * 0.18 + 0.16, 0.08, 1.6, "timber") for k in range(10)]
    parts += [(0.05, 1.79, z, z + 0.1, "bark") for z in (0.3, 1.3)]
    _leaf(b, -0.93, 1.8, 1.6, -1.75, parts)
    b.to_object("yard-gate")


def iron_gate():
    """A town gate: two plastered pillars, the iron leaves swung in."""
    b = MeshBuilder("environment")
    for x in (-1.95, 1.95):
        b.box((x, 0, 1.2), (0.5, 0.5, 2.4), "plaster")
        b.box((x, 0, 2.45), (0.62, 0.62, 0.12), "trim")
        b.box((x, 0, 2.6), (0.3, 0.3, 0.2), "plaster")
    for hinge, sign in ((-1.7, 1), (1.7, -1)):
        parts = [(0.0, 1.6, 0.1, 0.18, "iron"), (0.0, 1.6, 1.0, 1.06, "iron"), (0.0, 1.6, 2.0, 2.06, "iron")]
        parts += [(x, x + 0.03, 0.1, 2.15, "iron") for x in [0.05 + k * 0.13 for k in range(12)]]
        turn = placed(hinge, 0, 0, rz=sign * 1.3 + (0 if sign > 0 else math.pi))
        for x0, x1, z0, z1, swatch in parts:
            b.box(((x0 + x1) / 2, 0, (z0 + z1) / 2), (x1 - x0, 0.03, z1 - z0), swatch, matrix=turn)
    b.to_object("iron-gate")


BUILDERS = [
    dugout_canoe, motor_launch, river_raft, river_barge, horse_boat, canoa_de_tolda, jangada, boat_overturned,
    net_line, fish_trap, landing_stage, mooring_post,
    ox_cart, tractor, plough, cane_press, coffee_sacks, hen_house, pigsty, cart_wheel, millstone,
    motor_car, lorry, square_bench, fountain, market_stall, fuel_tins, street_sign, kiosk,
    farm_gate, rail_gate, yard_gate, iron_gate,
]


def build_all() -> None:
    for builder in BUILDERS:
        builder()
