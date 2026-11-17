"""The soldier's meshes (improve-soldier-models): the near body, the far body,
the four hats, the kit and the weapons, built from code like the rest.

Blender space: Z up, the soldier faces +Y, his right is -X, feet at the
origin, 1.75 m tall. The near body is made of closed tubes whose rings are
weighted across the two bones of a joint (elbows, knees, hips, waist, neck),
so it bends without the parts parting. Everything else is rigid on one bone.
Names carry no dots: the glTF loader drops them.
"""
from __future__ import annotations

import math

from mathutils import Matrix, Vector

from common import MeshBuilder

ATLAS = "soldier"
TEXTURE = "soldier-coluna-troop-0"

# The rifle's butt in the rest pose, in the pocket of the right shoulder.
RIFLE_X, RIFLE_Y, RIFLE_Z = -0.17, -0.07, 1.36


def builder() -> MeshBuilder:
    return MeshBuilder(ATLAS, TEXTURE)


# --------------------------------------------------------------- tubes
def tube(b: MeshBuilder, rings, swatch, sides: int = 8, cap_top=None, cap_bottom=None) -> None:
    """A closed tube along Z through `rings`: (x, y, z, rx, ry, {bone: weight}).
    `swatch(segment, angle)` names the swatch of each quad (`segment` counts
    from the bottom ring, `angle` is the side's direction, 90 the front);
    `cap_top` / `cap_bottom` name the swatch of a cap, or leave it open."""
    rows = []
    for x, y, z, rx, ry, weights in rings:
        row = []
        for k in range(sides):
            a = 2 * math.pi * (k + 0.5) / sides
            vert = b.bm.verts.new(Vector((x + math.cos(a) * rx, y + math.sin(a) * ry, z)))
            for bone, weight in weights.items():
                vert[b.deform][b._group(bone)] = weight
            row.append(vert)
        rows.append(row)
    for seg in range(len(rows) - 1):
        lo, hi = rows[seg], rows[seg + 1]
        for k in range(sides):
            angle = math.degrees(2 * math.pi * (k + 1) / sides) % 360
            b._face([lo[k], lo[(k + 1) % sides], hi[(k + 1) % sides], hi[k]], swatch(seg, angle), None)
    for row, cap, ring, flip in ((rows[-1], cap_top, rings[-1], False), (rows[0], cap_bottom, rings[0], True)):
        if not cap:
            continue
        x, y, z, _, _, weights = ring
        centre = b.bm.verts.new(Vector((x, y, z)))
        for bone, weight in weights.items():
            centre[b.deform][b._group(bone)] = weight
        for k in range(sides):
            verts = [row[k], row[(k + 1) % sides], centre]
            b._face(verts, cap, None, flip=flip)


def front(angle: float, span: float = 50) -> bool:
    return abs(angle - 90) <= span


def back(angle: float, span: float = 50) -> bool:
    return abs(angle - 270) <= span


# ------------------------------------------------------------- near body
def near_body(b: MeshBuilder) -> None:
    """The near body (improve-soldier-models 3.1): legs, torso with the
    tunic's skirt, arms, hands, head, belt and pouches, bandolier and collar."""
    for side, s in (("L", 1), ("R", -1)):
        x = 0.1 * s
        thigh, shin = f"thigh.{side}", f"shin.{side}"

        def leg_swatch(seg, angle):
            # Leggings or puttees below the knee, trousers above.
            if seg <= 1:
                return "puttees"
            return "trousers-front" if front(angle) else "trousers"
        tube(b, [
            (x, 0, 0.1, 0.05, 0.054, {shin: 1}),
            (x, 0, 0.3, 0.059, 0.064, {shin: 1}),
            (x, 0, 0.47, 0.063, 0.068, {shin: 1}),
            (x, 0.004, 0.505, 0.066, 0.072, {thigh: 0.25, shin: 0.75}),
            (x, 0.006, 0.535, 0.069, 0.075, {thigh: 0.5, shin: 0.5}),
            (x, 0.004, 0.565, 0.071, 0.077, {thigh: 0.75, shin: 0.25}),
            (x, 0, 0.6, 0.074, 0.08, {thigh: 1}),
            (x, 0, 0.8, 0.088, 0.096, {thigh: 1}),
            (x * 0.9, 0, 0.94, 0.096, 0.104, {"hips": 0.5, thigh: 0.5}),
        ], leg_swatch, sides=10, cap_bottom="boots")
        # The boot: sole and upper, the toe reaching forward.
        b.box((x, 0.035, 0.035), (0.11, 0.27, 0.07), "boots", group=shin)
        b.box((x, 0.0, 0.1), (0.1, 0.13, 0.06), "boots", group=shin)

    def torso_swatch(seg, angle):
        if seg <= 1:
            return "trousers-front" if front(angle) else "trousers"
        if seg >= 6:
            return "scarf"
        if front(angle):
            return "tunic-front"
        return "tunic-back" if back(angle) else "tunic"
    tube(b, [
        (0, 0, 0.86, 0.17, 0.11, {"hips": 1}),
        (0, 0, 0.95, 0.18, 0.115, {"hips": 1}),
        (0, 0, 1.03, 0.176, 0.112, {"hips": 0.5, "chest": 0.5}),
        (0, 0, 1.13, 0.182, 0.116, {"chest": 1}),
        (0, 0, 1.28, 0.196, 0.122, {"chest": 1}),
        (0, 0, 1.39, 0.2, 0.118, {"chest": 1}),
        (0, 0, 1.44, 0.13, 0.095, {"chest": 1}),
        (0, 0, 1.475, 0.07, 0.07, {"chest": 0.5, "head": 0.5}),
        (0, 0.005, 1.52, 0.062, 0.062, {"head": 1}),
    ], torso_swatch, sides=10, cap_bottom="trousers")
    # The tunic's skirt over the hips, open below.
    tube(b, [
        (0, 0, 0.84, 0.205, 0.135, {"hips": 1}),
        (0, 0, 0.97, 0.192, 0.125, {"hips": 1}),
        (0, 0, 1.04, 0.184, 0.118, {"hips": 0.5, "chest": 0.5}),
    ], lambda seg, a: "tunic-front" if front(a) and seg == 1 else "tunic", sides=10)
    # Belt with buckle and three cartridge pouches a side.
    tube(b, [
        (0, 0, 1.0, 0.196, 0.13, {"hips": 1}),
        (0, 0, 1.05, 0.192, 0.127, {"hips": 0.5, "chest": 0.5}),
    ], lambda seg, a: "belt-front" if front(a, 20) else "leather", sides=10)
    for s in (1, -1):
        for k, dx in enumerate((0.06, 0.11, 0.155)):
            b.box((s * dx, 0.128 - k * 0.012, 1.0), (0.045, 0.035, 0.055), "leather", group="hips")
    # Bandolier from the left shoulder to the right hip.
    sash = Matrix.Translation((0, 0.123, 1.22)) @ Matrix.Rotation(math.radians(38), 4, "Y")
    b.box((0, 0, 0), (0.06, 0.02, 0.6), "leather", group="chest", matrix=sash)
    sash_back = Matrix.Translation((0, -0.123, 1.22)) @ Matrix.Rotation(math.radians(38), 4, "Y")
    b.box((0, 0, 0), (0.06, 0.02, 0.6), "leather", group="chest", matrix=sash_back)
    # Shoulder boards / epaulettes.
    for s in (1, -1):
        b.box((s * 0.15, 0, 1.43), (0.11, 0.09, 0.025), "tunic", group="chest")

    for side, s in (("L", 1), ("R", -1)):
        x = 0.24 * s
        upper, fore = f"upper_arm.{side}", f"forearm.{side}"
        tube(b, [
            (x, 0, 0.885, 0.046, 0.049, {fore: 1}),
            (x, 0, 0.94, 0.044, 0.047, {fore: 1}),
            (x, 0, 1.07, 0.047, 0.051, {fore: 1}),
            (x, -0.003, 1.1, 0.049, 0.053, {upper: 0.25, fore: 0.75}),
            (x, -0.005, 1.13, 0.05, 0.054, {upper: 0.5, fore: 0.5}),
            (x, -0.003, 1.16, 0.051, 0.055, {upper: 0.75, fore: 0.25}),
            (x, 0, 1.2, 0.053, 0.057, {upper: 1}),
            (x, 0, 1.37, 0.058, 0.063, {upper: 1}),
            (x * 0.97, 0, 1.45, 0.055, 0.06, {"chest": 0.5, upper: 0.5}),
        ], lambda seg, a: "tunic", sides=10, cap_top="tunic", cap_bottom="tunic")
        # The hand: palm, fingers curled, thumb.
        b.box((x, 0.012, 0.845), (0.062, 0.08, 0.075), "skin", group=fore)
        b.box((x, 0.035, 0.8), (0.058, 0.05, 0.035), "skin", group=fore)
        b.box((x - s * 0.035, 0.03, 0.85), (0.022, 0.03, 0.045), "skin", group=fore)

    # Head: the skull, face on the front, ears, nose and the hair at the back.
    def head_swatch(seg, angle):
        if front(angle, 40):
            return "face"
        return "hair" if back(angle, 60) and seg >= 1 else "skin"
    tube(b, [
        (0, 0.01, 1.5, 0.068, 0.074, {"head": 1}),
        (0, 0.012, 1.55, 0.092, 0.104, {"head": 1}),
        (0, 0.01, 1.66, 0.098, 0.11, {"head": 1}),
        (0, 0.0, 1.735, 0.084, 0.094, {"head": 1}),
    ], head_swatch, sides=8, cap_top="hair")
    b.box((0, 0.12, 1.6), (0.026, 0.03, 0.045), "skin", group="head")
    for s in (1, -1):
        b.box((s * 0.1, 0.0, 1.61), (0.02, 0.035, 0.05), "skin", group="head")


# -------------------------------------------------------------- far body
def far_body(b: MeshBuilder) -> None:
    """The far body (3.3): the old boxes, rigid, one bone a part, no kit."""
    for side, x in (("L", 0.1), ("R", -0.1)):
        b.box((x, 0.03, 0.05), (0.12, 0.26, 0.1), "boots", group=f"shin.{side}")
        b.box((x, 0, 0.31), (0.11, 0.12, 0.42), "puttees", group=f"shin.{side}")
        b.box((x, 0, 0.72), (0.15, 0.17, 0.42), "trousers", group=f"thigh.{side}", front="trousers-front")
    b.box((0, 0, 0.96), (0.36, 0.21, 0.14), "trousers", group="hips")
    b.box((0, 0, 1.2), (0.38, 0.23, 0.44), "tunic", group="chest", front="tunic-front", back="tunic-back")
    b.box((0, 0.005, 1.0), (0.4, 0.25, 0.06), "leather", group="hips", front="belt-front")
    b.box((0, 0.01, 1.43), (0.24, 0.21, 0.06), "scarf", group="chest")
    b.box((0, 0.01, 1.6), (0.19, 0.21, 0.24), "skin", group="head", front="face")
    for side, x in (("L", 0.24), ("R", -0.24)):
        b.box((x, 0, 1.27), (0.1, 0.11, 0.3), "tunic", group=f"upper_arm.{side}")
        b.box((x, 0, 1.0), (0.09, 0.1, 0.26), "tunic", group=f"forearm.{side}")
        b.box((x, 0.01, 0.84), (0.08, 0.09, 0.08), "skin", group=f"forearm.{side}")


# ------------------------------------------------------------------ hats
def slouch(b: MeshBuilder, far: bool = False) -> None:
    """The column's slouch hat: a wide brim, a creased crown, the band."""
    sides = 8 if far else 12
    b.cylinder((0, 0, 1.712), 0.19, 0.018, "hat", sides=sides, group="head")
    b.cylinder((0, 0, 1.775), 0.102, 0.11, "hat", sides=sides // 2 + 2, top="hat-top", group="head", radius_top=0.086)
    if not far:
        b.cylinder((0, 0, 1.738), 0.104, 0.026, "scarf", sides=10, group="head")


def kepi(b: MeshBuilder, far: bool = False) -> None:
    """The army's kepi: a stiff crown leaning forward and a leather peak."""
    lean = Matrix.Translation((0, 0.0, 1.765)) @ Matrix.Rotation(math.radians(-8), 4, "X")
    b.cylinder((0, 0, 0), 0.095, 0.115, "hat", sides=6 if far else 10, top="hat-top", group="head", matrix=lean, radius_top=0.104)
    peak = Matrix.Translation((0, 0.115, 1.708)) @ Matrix.Rotation(math.radians(-14), 4, "X")
    b.box((0, 0, 0), (0.17, 0.075, 0.014), "leather", group="head", matrix=peak)
    if not far:
        b.box((0, 0.098, 1.73), (0.19, 0.02, 0.025), "hat-front", group="head")


def leather_hat(b: MeshBuilder, far: bool = False) -> None:
    """The sertão's leather hat: a low round crown, a short brim turned up."""
    sides = 8 if far else 12
    b.cylinder((0, 0, 1.718), 0.15, 0.02, "hat", sides=sides, group="head", radius_top=0.165)
    b.cylinder((0, 0, 1.77), 0.1, 0.09, "hat", sides=sides // 2 + 2, top="hat-top", group="head", radius_top=0.092)
    if not far:
        # The upturned rim.
        b.cylinder((0, 0, 1.738), 0.168, 0.025, "hat", sides=12, group="head", radius_top=0.178)


def halfmoon(b: MeshBuilder, far: bool = False) -> None:
    """The cangaceiro's half-moon: the brim turned up front and back into a
    crescent across the head, the star on the front flap."""
    b.cylinder((0, 0, 1.765), 0.098, 0.1, "hat", sides=6 if far else 10, top="hat-top", group="head", radius_top=0.088)
    for s in (1, -1):
        # Front and back flaps: tall, leaning out, wider at the top.
        flap = Matrix.Translation((0, s * 0.1, 1.79)) @ Matrix.Rotation(math.radians(s * 18), 4, "X")
        b.box((0, 0, 0), (0.3, 0.018, 0.17), "hat-front" if s > 0 else "hat", group="head", matrix=flap)
        if not far:
            tip = Matrix.Translation((0, s * 0.125, 1.89)) @ Matrix.Rotation(math.radians(s * 25), 4, "X")
            b.box((0, 0, 0), (0.18, 0.016, 0.05), "hat", group="head", matrix=tip)
    b.box((0, 0, 1.72), (0.3, 0.2, 0.016), "hat", group="head")
    if not far:
        b.box((0, 0.118, 1.8), (0.04, 0.01, 0.04), "brass", group="head")


HATS = {"Slouch": slouch, "Kepi": kepi, "LeatherHat": leather_hat, "Halfmoon": halfmoon}


# ------------------------------------------------------------------- kit
def gear_blanket(b: MeshBuilder) -> None:
    """A rolled blanket across the top of the back."""
    roll = Matrix.Translation((0, -0.165, 1.33)) @ Matrix.Rotation(math.radians(90), 4, "Y")
    b.cylinder((0, 0, 0), 0.048, 0.36, "blanket", sides=8, group="chest", matrix=roll)


def gear_canteen(b: MeshBuilder) -> None:
    """A cloth-covered canteen on the right hip, cup on top."""
    b.cylinder((-0.2, -0.03, 0.93), 0.046, 0.15, "canteen", sides=8, group="hips")
    b.cylinder((-0.2, -0.03, 1.02), 0.02, 0.025, "gun.dark", sides=6, group="hips")


def gear_haversack(b: MeshBuilder) -> None:
    """A canvas haversack on the left hip, its strap over the right shoulder."""
    b.box((0.19, -0.06, 0.93), (0.07, 0.2, 0.17), "canvas", group="hips")
    b.box((0.19, -0.06, 1.015), (0.075, 0.21, 0.02), "canvas", group="hips")


def gear_neckerchief(b: MeshBuilder) -> None:
    """The neckerchief knotted at the throat, its ends on the chest."""
    b.box((0, 0.085, 1.44), (0.06, 0.04, 0.05), "scarf", group="chest")
    tail = Matrix.Translation((0.0, 0.12, 1.37)) @ Matrix.Rotation(math.radians(8), 4, "Y")
    b.box((0, 0, 0), (0.07, 0.015, 0.11), "scarf", group="chest", matrix=tail)


def gear_bornais(b: MeshBuilder) -> None:
    """The cangaceiro's two worked bags, slung crosswise to either hip."""
    for s in (1, -1):
        b.box((s * 0.2, 0.02, 0.93), (0.06, 0.18, 0.2), "bornal", group="hips")
        strap = Matrix.Translation((0, 0.124, 1.2)) @ Matrix.Rotation(math.radians(s * 40), 4, "Y")
        b.box((0, 0, 0), (0.04, 0.015, 0.62), "bornal", group="chest", matrix=strap)


def gear_cartridges(b: MeshBuilder) -> None:
    """A cartridge belt worn across the chest, brass showing."""
    belt = Matrix.Translation((0, 0.126, 1.23)) @ Matrix.Rotation(math.radians(-38), 4, "Y")
    b.box((0, 0, 0), (0.07, 0.025, 0.62), "leather", group="chest", matrix=belt)
    for k in range(5):
        at = Matrix.Translation((0, 0.142, 1.23)) @ Matrix.Rotation(math.radians(-38), 4, "Y") @ Matrix.Translation((0, 0, -0.22 + k * 0.11))
        b.box((0, 0, 0), (0.05, 0.012, 0.03), "brass", group="chest", matrix=at)


GEAR = {
    "GearBlanket": gear_blanket,
    "GearCanteen": gear_canteen,
    "GearHaversack": gear_haversack,
    "GearNeckerchief": gear_neckerchief,
    "GearBornais": gear_bornais,
    "GearCartridges": gear_cartridges,
}


# --------------------------------------------------------------- weapons
def _rifle_part(b, d0, d1, sx, sy, swatch, dx=0.0, dy=0.0):
    """A box along the rifle bone: from `d0` to `d1` metres from the butt,
    `sx` across, `sy` deep (+Y is the underside when the rifle is level)."""
    b.box((RIFLE_X + dx, RIFLE_Y + dy, RIFLE_Z + (d0 + d1) / 2), (sx, sy, d1 - d0), swatch, group="rifle")


def _rifle_tube(b, d0, d1, radius, swatch, dy=0.0, sides=6):
    b.cylinder((RIFLE_X, RIFLE_Y + dy, RIFLE_Z + (d0 + d1) / 2), radius, d1 - d0, swatch, sides=sides, group="rifle")


def weapon_mauser(b: MeshBuilder) -> None:
    """The 7 mm Mauser: stock, wrist, receiver with the bolt handle on the
    right, forend with two bands, barrel, sights and sling."""
    p = lambda *a, **k: _rifle_part(b, *a, **k)
    p(0.0, 0.02, 0.05, 0.125, "rifle.metal", dy=0.02)
    p(0.02, 0.27, 0.045, 0.115, "rifle.wood", dy=0.02)
    p(0.27, 0.37, 0.038, 0.06, "rifle.wood", dy=0.01)
    p(0.37, 0.6, 0.044, 0.045, "rifle.metal", dy=-0.012)
    p(0.37, 0.6, 0.048, 0.05, "rifle.wood", dy=0.035)
    p(0.42, 0.5, 0.034, 0.04, "rifle.metal", dy=0.07)
    p(0.33, 0.41, 0.012, 0.03, "rifle.metal", dy=0.075)
    p(0.5, 0.52, 0.06, 0.016, "rifle.metal", dx=-0.04, dy=-0.01)
    p(0.495, 0.525, 0.024, 0.026, "rifle.metal", dx=-0.075)
    p(0.6, 0.93, 0.042, 0.048, "rifle.wood", dy=0.012)
    p(0.6, 1.14, 0.022, 0.022, "rifle.metal", dy=-0.016)
    p(0.74, 0.76, 0.05, 0.062, "rifle.metal", dy=0.004)
    p(0.9, 0.92, 0.048, 0.06, "rifle.metal", dy=0.002)
    p(0.6, 0.64, 0.03, 0.022, "rifle.metal", dy=-0.036)
    p(1.11, 1.13, 0.008, 0.03, "rifle.metal", dy=-0.03)
    p(0.12, 0.88, 0.012, 0.006, "leather", dy=0.085)


def weapon_winchester(b: MeshBuilder) -> None:
    """A lever-action carbine (generic period type): straight stock, the
    receiver with its loading gate, the lever loop under it, a short forend,
    the barrel and the tube magazine beneath, one band."""
    p = lambda *a, **k: _rifle_part(b, *a, **k)
    p(0.0, 0.02, 0.046, 0.11, "rifle.metal", dy=0.025)
    p(0.02, 0.25, 0.042, 0.1, "rifle.wood", dy=0.025)
    p(0.25, 0.33, 0.036, 0.055, "rifle.wood", dy=0.01)
    p(0.33, 0.49, 0.046, 0.075, "gun.dark", dy=0.008)
    p(0.38, 0.44, 0.048, 0.03, "brass", dx=-0.002, dy=0.0)
    # The lever loop below the receiver.
    p(0.31, 0.47, 0.014, 0.012, "gun.dark", dy=0.075)
    p(0.31, 0.33, 0.014, 0.05, "gun.dark", dy=0.055)
    p(0.45, 0.47, 0.014, 0.03, "gun.dark", dy=0.06)
    p(0.49, 0.7, 0.04, 0.04, "rifle.wood", dy=0.018)
    p(0.49, 0.98, 0.02, 0.02, "gun.dark", dy=-0.012)
    p(0.49, 0.93, 0.016, 0.016, "gun.dark", dy=0.014)
    p(0.88, 0.9, 0.04, 0.05, "gun.dark", dy=0.0)
    p(0.96, 0.975, 0.008, 0.026, "gun.dark", dy=-0.026)
    p(0.53, 0.56, 0.024, 0.02, "gun.dark", dy=-0.03)


def weapon_automatic(b: MeshBuilder) -> None:
    """An automatic rifle (generic period type): stock and pistol grip, a
    deep receiver, the magazine on top, the finned barrel jacket and a bipod
    folded under the muzzle."""
    p = lambda *a, **k: _rifle_part(b, *a, **k)
    p(0.0, 0.02, 0.05, 0.12, "rifle.metal", dy=0.025)
    p(0.02, 0.26, 0.046, 0.11, "rifle.wood", dy=0.025)
    p(0.26, 0.34, 0.04, 0.06, "rifle.wood", dy=0.012)
    p(0.3, 0.36, 0.035, 0.07, "rifle.wood", dy=0.07)
    p(0.34, 0.66, 0.06, 0.085, "gun.dark", dy=0.004)
    p(0.42, 0.56, 0.02, 0.1, "gun.dark", dy=-0.085)
    p(0.56, 0.6, 0.02, 0.06, "gun.dark", dy=-0.11)
    _rifle_tube(b, 0.66, 1.0, 0.034, "gun.dark", sides=8)
    for d in (0.7, 0.78, 0.86, 0.94):
        _rifle_tube(b, d, d + 0.02, 0.04, "rifle.metal", sides=8)
    p(1.0, 1.2, 0.02, 0.02, "gun.dark")
    p(1.17, 1.2, 0.03, 0.03, "rifle.metal")
    for s in (1, -1):
        p(0.78, 1.08, 0.016, 0.016, "rifle.metal", dx=s * 0.03, dy=0.05)
    p(1.04, 1.07, 0.07, 0.024, "rifle.metal", dy=0.035)


def weapon_revolver(b: MeshBuilder) -> None:
    """A revolver in the right hand (generic period type), on the right
    forearm: the grip in the fist, the barrel along the forearm (down with
    the arm at rest, forward when the arm is out)."""
    x = -0.24
    g = "forearm.R"
    b.box((x, 0.02, 0.84), (0.028, 0.034, 0.075), "rifle.wood", group=g)
    b.box((x, 0.045, 0.795), (0.03, 0.05, 0.05), "gun.dark", group=g)
    b.cylinder((x, 0.05, 0.765), 0.021, 0.04, "gun.dark", sides=6, group=g)
    b.box((x, 0.055, 0.69), (0.015, 0.015, 0.12), "gun.dark", group=g)
    b.box((x, 0.03, 0.805), (0.01, 0.025, 0.03), "gun.dark", group=g)


def weapon_holster(b: MeshBuilder) -> None:
    """The revolver holstered on the right hip, while the hands are free."""
    b.box((-0.2, 0.04, 0.9), (0.045, 0.07, 0.17), "leather", group="hips")
    b.box((-0.2, 0.04, 1.0), (0.04, 0.08, 0.05), "rifle.wood", group="hips")


def weapon_gun(b: MeshBuilder) -> None:
    """A water-cooled machine gun on a three-legged tripod (generic period
    type), on the ground before the gunner, the muzzle forward (+Y)."""
    b.box((0, 0.5, 0.42), (0.13, 0.32, 0.15), "gun.dark", group="root")
    b.cylinder((0, 0.86, 0.44), 0.055, 0.42, "canteen", sides=8, group="root",
               matrix=Matrix.Translation((0, 0.86, 0.44)) @ Matrix.Rotation(math.radians(90), 4, "X") @ Matrix.Translation((0, -0.86, -0.44)))
    b.box((0, 1.12, 0.44), (0.03, 0.12, 0.03), "gun.dark", group="root")
    b.box((0, 1.17, 0.44), (0.05, 0.04, 0.05), "gun.dark", group="root")
    b.box((0.085, 0.52, 0.43), (0.04, 0.1, 0.06), "brass", group="root")
    for s in (1, -1):
        b.box((s * 0.045, 0.32, 0.44), (0.02, 0.06, 0.07), "rifle.wood", group="root")
    b.box((0, 0.6, 0.33), (0.08, 0.1, 0.06), "gun.dark", group="root")
    # Three legs from the cradle to the ground: one forward, two splayed back.
    top = Vector((0, 0.6, 0.32))
    for foot in (Vector((0, 1.05, 0.0)), Vector((0.3, 0.3, 0.0)), Vector((-0.3, 0.3, 0.0))):
        along = foot - top
        leg = (Matrix.Translation((top + foot) / 2)
               @ Vector((0, 0, 1)).rotation_difference(along.normalized()).to_matrix().to_4x4())
        b.box((0, 0, 0), (0.03, 0.03, along.length), "gun.dark", group="root", matrix=leg)
    b.box((-0.2, 0.62, 0.07), (0.12, 0.24, 0.14), "rifle.wood", group="root")


WEAPONS = {
    "WeaponMauser": weapon_mauser,
    "WeaponWinchester": weapon_winchester,
    "WeaponAutomatic": weapon_automatic,
    "WeaponRevolver": weapon_revolver,
    "WeaponHolster": weapon_holster,
    "WeaponGun": weapon_gun,
}


def triangles(obj) -> int:
    return sum(len(poly.vertices) - 2 for poly in obj.data.polygons)
