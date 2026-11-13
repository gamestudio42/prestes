"""The Column's camp and train (revise-buildings-and-stone 5.2, D11).

Built into props.glb by target_props.build(). Each object stands on the
origin inside its catalog footprint (catalog-objects.ts): halfWidth along
Blender X, halfDepth along Blender Y. The Column's looks are the models'
own: worn, patched canvas (`canvas.worn`) and requisitioned boxes
(`crate`); the government's side swaps them in the view (camp-sides.ts).
The kit's aid tent is target_buildings.aid_tent().
"""
import math

from mathutils import Matrix, Vector

from common import MeshBuilder, placed
from props_objects import ALONG_X, two_sided, wheel

ALONG_Y = math.pi / 2


def stick(b: MeshBuilder, p0: Vector, p1: Vector, width: float, swatch: str) -> None:
    """A square stick from p0 to p1."""
    direction = p1 - p0
    turn = direction.to_track_quat("Z", "Y").to_matrix().to_4x4()
    b.box((0, 0, direction.length / 2), (width, width, direction.length), swatch, matrix=Matrix.Translation(p0) @ turn)


def fly(b: MeshBuilder, length: float, width: float, eave: float, ridge: float, swatch: str, poles: int) -> None:
    """An open-sided canvas fly along X on its poles: a ridge, two slopes
    down to the eaves, no walls."""
    hl, hw = length / 2, width / 2
    for s in (1, -1):
        slope = [Vector((-hl, 0, ridge)), Vector((hl, 0, ridge)), Vector((hl, s * hw, eave)), Vector((-hl, s * hw, eave))]
        two_sided(b, slope, swatch)
    for k in range(poles):
        x = -hl + 0.1 + k * (length - 0.2) / (poles - 1)
        for s in (1, -1):
            b.box((x, s * (hw - 0.05), eave / 2), (0.08, 0.08, eave), "timber")
        b.box((x, 0, ridge / 2), (0.08, 0.08, ridge), "timber")


def ridge_tent():
    """An officer's ridge tent, its front flap open on a field cot."""
    b = MeshBuilder("environment")
    b.prism((0, 0, 0), 3.8, 2.8, 1.9, "canvas.worn", end="canvas.worn", matrix=placed(0, 0, 0, rz=ALONG_Y), tile=1.4)
    for y in (-1.95, 1.95):
        b.box((0, y, 1.0), (0.07, 0.07, 2.0), "timber")
    b.box((0, -2.05, 0.35), (0.7, 0.4, 0.06), "canvas.worn")
    b.box((0, -1.3, 0.38), (0.75, 1.9, 0.08), "canvas.worn")
    for x in (-0.33, 0.33):
        for y in (-2.1, -0.5):
            b.box((x, y if y < -1 else y, 0.18), (0.05, 0.05, 0.36), "timber")
    b.to_object("ridge-tent")


def bell_tent():
    b = MeshBuilder("environment")
    b.cylinder((0, 0, 0.25), 1.9, 0.5, "canvas.worn", sides=10)
    b.cone((0, 0, 0.5), 1.95, 2.3, "canvas.worn", sides=10)
    b.cylinder((0, 0, 2.85), 0.04, 0.3, "timber", sides=6)
    b.box((0, -1.88, 0.75), (0.7, 0.06, 1.3), "ink")
    b.to_object("bell-tent")


def poncho_lean_to():
    """A poncho stretched on two sticks over a bedroll."""
    b = MeshBuilder("environment")
    for x in (-0.85, 0.85):
        b.box((x, 0.75, 0.6), (0.05, 0.05, 1.2), "bark")
    two_sided(b, [Vector((-0.95, 0.8, 1.15)), Vector((0.95, 0.8, 1.15)), Vector((0.95, -0.9, 0.05)), Vector((-0.95, -0.9, 0.05))], "canvas.worn")
    b.cylinder((0, 0, 0), 0.16, 1.4, "canvas.worn", sides=6, matrix=placed(0, 0.2, 0.16, rx=math.pi / 2, rz=ALONG_X))
    b.to_object("poncho-lean-to")


def supply_cart():
    """A two-wheeled cart of the convoys, its load of boxes under a canvas hood."""
    b = MeshBuilder("environment")
    b.box((0, 0.2, 0.85), (1.3, 2.6, 0.12), "timber")
    for s in (1, -1):
        b.box((s * 0.62, 0.2, 1.1), (0.06, 2.6, 0.4), "timber")
    for y in (-0.5, 0.3):
        b.box((0, y, 1.2), (1.0, 0.7, 0.6), "crate")
    for y in (-0.8, 0.2, 1.2):
        b.box((0, y, 1.55), (1.25, 0.06, 0.06), "timber")
    b.prism((0, 0.2, 1.4), 2.6, 1.4, 0.55, "canvas.worn", end="canvas.worn", matrix=placed(0, 0, 0, rz=ALONG_Y))
    for s in (1, -1):
        wheel(b, s * 0.78, 0.1, 0.62, "timber", width=0.1, hub="crate")
    b.box((0, -1.8, 0.7), (0.9, 1.4, 0.08), "timber")
    b.to_object("supply-cart")


def hammock():
    b = MeshBuilder("environment")
    for x in (-1.5, 1.5):
        b.box((x, 0, 0.8), (0.1, 0.1, 1.6), "bark")
    xs = [-1.45, -0.7, 0.0, 0.7, 1.45]
    zs = [1.35, 0.85, 0.72, 0.85, 1.35]
    for i in range(4):
        two_sided(b, [Vector((xs[i], -0.3, zs[i])), Vector((xs[i + 1], -0.3, zs[i + 1])),
                      Vector((xs[i + 1], 0.3, zs[i + 1])), Vector((xs[i], 0.3, zs[i]))], "canvas.worn")
    b.to_object("hammock")


def camp_barrels():
    b = MeshBuilder("environment")
    for x, y in ((-0.4, 0.15), (0.4, 0.15), (0.0, -0.4)):
        b.cylinder((x, y, 0.45), 0.34, 0.9, "timber", sides=8, top="crate")
        for z in (0.2, 0.7):
            b.cylinder((x, y, z), 0.355, 0.05, "iron", sides=8)
    b.to_object("camp-barrels")


def ammo_boxes():
    """Ammunition boxes stacked: requisitioned (the Column) or issue (the government)."""
    b = MeshBuilder("environment")
    for x, y, z in ((-0.32, -0.2, 0.15), (0.32, -0.2, 0.15), (-0.32, 0.25, 0.15), (0.32, 0.25, 0.15), (0.0, 0.0, 0.45), (0.05, 0.05, 0.75)):
        b.box((x, y, z), (0.6, 0.4, 0.3), "crate")
        b.box((x, y - 0.21, z), (0.18, 0.02, 0.05), "iron")
    b.to_object("ammo-boxes")


def campfire():
    """A fire in a ring of stones, the pot on its tripod of sticks."""
    b = MeshBuilder("environment")
    for k in range(8):
        a = k / 8 * math.tau
        b.box((0, 0, 0), (0.18, 0.14, 0.12), "granite", matrix=placed(math.cos(a) * 0.5, math.sin(a) * 0.5, 0.06, rz=a))
    for a in (0.3, 1.9):
        b.box((0, 0, 0), (0.8, 0.09, 0.09), "bark", matrix=placed(0, 0, 0.08, rz=a))
    b.cone((0, 0, 0.08), 0.28, 0.4, "flag", sides=5)
    b.cone((0, 0, 0.08), 0.16, 0.5, "hay", sides=5)
    top = Vector((0, 0, 1.25))
    for k in range(3):
        a = k / 3 * math.tau + 0.5
        stick(b, Vector((math.cos(a) * 0.55, math.sin(a) * 0.55, 0)), top, 0.04, "bark")
    # The pot hangs from the top on its chain.
    b.box((0, 0, 1.0), (0.015, 0.015, 0.5), "iron")
    b.cylinder((0, 0, 0.63), 0.17, 0.24, "iron", sides=8, top="ink")
    b.to_object("campfire")


def rifle_stack():
    """Three rifles stacked muzzle to muzzle (ensarilhados)."""
    b = MeshBuilder("environment")
    for k in range(3):
        a = k / 3 * math.tau
        x, y = math.cos(a) * 0.32, math.sin(a) * 0.32
        tilt = math.atan2(0.32, 1.3)
        m = placed(x, y, 0, rz=a + math.pi / 2)
        b.box((0, 0, 0.3), (0.05, 0.07, 0.6), "timber", matrix=m @ placed(0, 0, 0, rx=-tilt))
        b.box((0, 0, 0.95), (0.025, 0.025, 0.75), "iron", matrix=m @ placed(0, 0, 0, rx=-tilt))
    b.to_object("rifle-stack")


def saddle_rail():
    b = MeshBuilder("environment")
    for x in (-1.4, 1.4):
        b.box((x, 0, 0.5), (0.1, 0.1, 1.0), "timber")
    b.box((0, 0, 0.95), (2.9, 0.1, 0.1), "timber")
    for x in (-0.85, 0.0, 0.85):
        b.prism((x, 0, 0.75), 0.6, 0.55, 0.25, "trim", end="trim")
        b.box((x, 0, 0.55), (0.12, 0.5, 0.3), "canvas.worn")
    b.to_object("saddle-rail")


def field_gun_75():
    """A 75 mm field gun left behind: spoked wheels, shield, barrel, its trail down."""
    b = MeshBuilder("environment")
    for s in (1, -1):
        wheel(b, s * 0.75, 0.0, 0.65, "timber", width=0.1, hub="iron")
    b.box((0, 0, 0.65), (1.6, 0.12, 0.12), "iron")
    b.box((0, -0.35, 0.95), (1.5, 0.05, 1.0), "iron")
    b.cylinder((0, 0, 0), 0.07, 2.1, "iron", sides=8, matrix=placed(0, -1.1, 0.95, rx=math.pi / 2 - 0.05))
    b.box((0, 0.15, 0.85), (0.3, 0.7, 0.3), "iron")
    b.box((0, 1.25, 0.4), (0.22, 2.0, 0.16), "iron", matrix=placed(0, 0, 0, rx=-0.28))
    b.to_object("field-gun-75")


def field_kitchen():
    """A field kitchen under an open canvas fly: a stove of bricks and clay
    with two cauldrons, a work table, firewood and the water barrel."""
    b = MeshBuilder("environment")
    fly(b, 5.0, 4.0, 1.9, 2.6, "canvas.worn", 3)
    b.box((-1.0, 0.6, 0.4), (2.0, 1.0, 0.8), "brick", top="ink")
    for x in (-1.5, -0.5):
        b.cylinder((x, 0.6, 0.98), 0.32, 0.36, "iron", sides=8, top="ink")
    b.box((-1.9, 1.0, 1.35), (0.25, 0.25, 1.1), "brick")
    b.box((1.2, -0.7, 0.8), (1.6, 0.8, 0.08), "timber")
    for x in (0.5, 1.9):
        for y in (-1.0, -0.4):
            b.box((x, y, 0.4), (0.07, 0.07, 0.8), "timber")
    for k in range(4):
        b.cylinder((0, 0, 0), 0.08, 1.1, "bark", sides=6, matrix=placed(1.6, 1.0 + k * 0.17, 0.08 + (k % 2) * 0.14, rx=math.pi / 2, rz=ALONG_X))
    b.cylinder((2.1, -1.5, 0.45), 0.32, 0.9, "timber", sides=8, top="ink")
    b.to_object("field-kitchen")


def mess_tent():
    """A mess under a long open canvas fly: two trestle tables and their benches."""
    b = MeshBuilder("environment")
    fly(b, 8.0, 5.0, 2.0, 2.8, "canvas.worn", 4)
    for y in (-1.1, 1.1):
        b.box((0, y, 0.78), (6.6, 0.8, 0.06), "timber")
        for x in (-3.0, 0.0, 3.0):
            b.box((x, y, 0.38), (0.08, 0.6, 0.76), "timber")
        for s in (1, -1):
            b.box((0, y + s * 0.65, 0.45), (6.6, 0.28, 0.05), "timber")
            for x in (-3.0, 0.0, 3.0):
                b.box((x, y + s * 0.65, 0.22), (0.06, 0.24, 0.44), "timber")
    for x in (-2.2, -0.6, 1.0, 2.4):
        b.cylinder((x, -1.0, 0.85), 0.1, 0.09, "metal", sides=6, top="ink")
    b.to_object("mess-tent")


BUILDERS = [ridge_tent, bell_tent, field_kitchen, mess_tent, poncho_lean_to, supply_cart, hammock, camp_barrels, ammo_boxes,
            campfire, rifle_stack, saddle_rail, field_gun_75]


def build_all() -> None:
    for builder in BUILDERS:
        builder()
