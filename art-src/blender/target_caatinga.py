"""Caatinga plants in the Prestes look (biome-trees-and-plants 2.7, design D5).

  blender -b --factory-startup -P art-src/blender/build.py -- caatinga

Refloreste has no caatinga, so every plant here is built from primitives:
columnar cacti from ribbed prisms, pads and globes from squashed solids,
rosettes from blade fans, and the trees and shrubs from tapered limbs under
crowns of low-poly clumps, the same clumps the Refloreste trees get. They are
vertex-coloured and flat-shaded like the other trees, darker low and lighter
high, so they read the same in battle (the owner's look, 2026-11-12). Each
plant stands on the origin at its catalog height (task 1.1, battle scale,
no tree over 9 m) and writes art-src/environment/trees-caatinga.glb, which
`pnpm models` prepares and checks against the triangle budgets.

Plants (species list fixed at task 1.1, docs/status.md):
  cacti and thorn plants  mandacaru, facheiro, xique-xique, coroa-de-frade,
                          palmatoria, macambira (the thorn patch)
  trees and shrubs        juazeiro, umbuzeiro, catingueira, jurema-preta
  bushes (D6)             the marmeleiro, three sizes and two shapes
"""
import math
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

from common import reset, save_and_export

CACTUS = (0.34, 0.50, 0.33)
FACHEIRO = (0.40, 0.54, 0.52)
CAP = (0.74, 0.17, 0.11)
PAD = (0.42, 0.56, 0.28)
BARK = (0.42, 0.36, 0.30)
BARK_PALE = (0.58, 0.55, 0.50)
LEAF_JUAZEIRO = (0.365, 0.659, 0.176)
LEAF_UMBU = (0.43, 0.60, 0.22)
LEAF_CATINGUEIRA = (0.50, 0.56, 0.34)
LEAF_JUREMA = (0.40, 0.50, 0.24)
MACAMBIRA = (0.46, 0.56, 0.24)
MACAMBIRA_TIP = (0.66, 0.36, 0.20)
MARMELEIRO = (0.52, 0.55, 0.37)

SIZES = {"knee": 0.5, "waist": 1.0, "head": 1.8}


class Plant:
    """One plant's mesh, built in bmesh with a per-corner colour layer."""

    def __init__(self, name: str):
        self.name = name
        self.bm = bmesh.new()
        self.colours = self.bm.loops.layers.float_color.new("Color")

    def paint(self, faces, colour):
        for face in faces:
            for loop in face.loops:
                loop[self.colours] = (*colour, 1.0)

    def column(self, base: Vector, top: Vector, radius: float, colour, ribs: int = 0, sides: int = 6, radius_top=None, cap=True):
        """A prism from base to top; with `ribs`, a star cross-section (a cactus's ribs)."""
        axis = top - base
        rotation = axis.normalized().to_track_quat("Z", "Y").to_matrix().to_4x4()
        count = ribs * 2 if ribs else sides
        top_radius = radius if radius_top is None else radius_top
        rings = []
        for z, r in ((0.0, radius), (axis.length, top_radius)):
            ring = []
            for index in range(count):
                angle = index / count * math.tau
                scale = (1.0 if index % 2 == 0 else 0.72) if ribs else 1.0
                local = Vector((math.cos(angle) * r * scale, math.sin(angle) * r * scale, z))
                ring.append(self.bm.verts.new(base + (rotation @ local)))
            rings.append(ring)
        faces = []
        for index in range(count):
            a, b = rings[0][index], rings[0][(index + 1) % count]
            c, d = rings[1][(index + 1) % count], rings[1][index]
            faces.append(self.bm.faces.new((a, b, c, d)))
        if cap:
            faces.append(self.bm.faces.new(list(reversed(rings[0]))))
            faces.append(self.bm.faces.new(rings[1]))
        self.paint(faces, colour)
        return faces

    def blob(self, centre: Vector, size: Vector, colour, subdivisions: int = 0, turn: float = 0.0):
        """A low-poly clump (an icosahedron) scaled to `size` and turned about Z."""
        result = bmesh.ops.create_icosphere(self.bm, subdivisions=subdivisions, radius=1.0)
        spin = Matrix.Rotation(turn, 3, "Z")
        for vertex in result["verts"]:
            vertex.co = centre + spin @ Vector((vertex.co.x * size.x, vertex.co.y * size.y, vertex.co.z * size.z))
        faces = list({face for vertex in result["verts"] for face in vertex.link_faces})
        self.paint(faces, colour)
        return faces

    def blade(self, base: Vector, tip: Vector, width: float, colour, tip_colour=None):
        """A flat leaf blade, a thin triangle standing from base to tip."""
        side = (tip - base).cross(Vector((0, 0, 1)))
        side = side.normalized() * width / 2 if side.length > 1e-6 else Vector((width / 2, 0, 0))
        # Two sides on their own vertices (bmesh keeps one face per vertex set).
        faces = []
        tips = []
        for order in ((0, 1), (1, 0)):
            corners = [self.bm.verts.new(base - side), self.bm.verts.new(base + side)]
            c = self.bm.verts.new(tip)
            faces.append(self.bm.faces.new((corners[order[0]], corners[order[1]], c)))
            tips.append(c)
        self.paint(faces, colour)
        if tip_colour:
            for face in faces:
                for loop in face.loops:
                    if loop.vert in tips:
                        loop[self.colours] = (*tip_colour, 1.0)

    def crown(self, rng: random.Random, centre: Vector, spread: Vector, clumps: int, size: float, colour, flat: float = 0.7):
        """Clumps scattered in an ellipsoid: a crown like the Refloreste trees'."""
        for _ in range(clumps):
            while True:
                offset = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1)))
                if offset.length <= 1:
                    break
            radius = size * rng.uniform(0.75, 1.15)
            self.blob(centre + Vector((offset.x * spread.x, offset.y * spread.y, offset.z * spread.z)), Vector((radius, radius, radius * flat)), colour, turn=rng.uniform(0, math.tau))

    def finish(self, height: float, width=None):
        """Shades low faces darker, stands the plant on the origin at `height`
        (and `width` across the ground, when given) and links it to the scene."""
        bmesh.ops.triangulate(self.bm, faces=self.bm.faces[:])
        zs = [v.co.z for v in self.bm.verts]
        low, high = min(zs), max(zs)
        span = max(1e-6, high - low)
        for face in self.bm.faces:
            rise = (face.calc_center_median().z - low) / span
            shade = 0.72 + 0.4 * rise
            for loop in face.loops:
                r, g, b, a = loop[self.colours]
                loop[self.colours] = (min(1.0, r * shade), min(1.0, g * shade), min(1.0, b * shade), a)
        xs = [v.co.x for v in self.bm.verts]
        ys = [v.co.y for v in self.bm.verts]
        scale = height / span
        spread = scale
        if width:
            spread = width / max(1e-6, max(max(xs) - min(xs), max(ys) - min(ys)))
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        for vertex in self.bm.verts:
            vertex.co = Vector(((vertex.co.x - cx) * spread, (vertex.co.y - cy) * spread, (vertex.co.z - low) * scale))
        mesh = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(mesh)
        self.bm.free()
        obj = bpy.data.objects.new(self.name, mesh)
        bpy.context.collection.objects.link(obj)
        print(f"{self.name}: {len(mesh.polygons)} triangles, {height} m")
        return obj


def candelabra_cactus(name: str, height: float, colour, arms, ribs: int, radius: float):
    """A columnar cactus: a ribbed trunk and arms that leave it level and turn up."""
    plant = Plant(name)
    plant.column(Vector((0, 0, 0)), Vector((0, 0, 1.0)), radius * 1.15, colour, ribs=ribs, radius_top=radius)
    for angle, rise, reach, top in arms:
        out = Vector((math.cos(angle), math.sin(angle), 0))
        root = Vector((0, 0, rise))
        elbow = root + out * reach
        plant.column(root, elbow + Vector((0, 0, radius * 0.4)), radius * 0.7, colour, ribs=ribs)
        plant.column(elbow, elbow + Vector((0, 0, top)), radius * 0.75, colour, ribs=ribs, radius_top=radius * 0.6)
    return plant


def mandacaru():
    # The sertao's icon: a thick trunk, four arms turning up, the tallest near the top.
    arms = [(0.3, 0.38, 0.32, 0.45), (2.0, 0.5, 0.28, 0.38), (3.6, 0.3, 0.3, 0.5), (5.1, 0.58, 0.24, 0.3)]
    return candelabra_cactus("mandacaru", 4.0, CACTUS, arms, ribs=5, radius=0.09).finish(4.0)


def facheiro():
    # Slimmer and blue-grey, the arms rising from low down like a sheaf.
    arms = [(0.8, 0.14, 0.18, 0.72), (2.9, 0.1, 0.16, 0.66), (4.7, 0.18, 0.15, 0.6)]
    return candelabra_cactus("facheiro", 4.0, FACHEIRO, arms, ribs=4, radius=0.065).finish(4.0)


def xique_xique():
    # A low sprawling clump: stems that lie along the ground and turn up at the ends.
    plant = Plant("xique-xique")
    rng = random.Random(7)
    for index in range(7):
        angle = index / 7 * math.tau + rng.uniform(-0.2, 0.2)
        out = Vector((math.cos(angle), math.sin(angle), 0))
        reach = rng.uniform(0.35, 0.6)
        knee = out * reach + Vector((0, 0, 0.12))
        plant.column(Vector((0, 0, 0.1)), knee, 0.07, CACTUS, ribs=3, cap=False)
        plant.column(knee, knee + out * 0.1 + Vector((0, 0, rng.uniform(0.35, 0.7))), 0.065, CACTUS, ribs=3, radius_top=0.05)
    return plant.finish(1.0, width=1.8)


def coroa_de_frade():
    # A ribbed ground globe with its red woolly cap.
    plant = Plant("coroa-de-frade")
    plant.column(Vector((0, 0, 0)), Vector((0, 0, 0.6)), 0.5, CACTUS, ribs=7, radius_top=0.42)
    plant.blob(Vector((0, 0, 0.62)), Vector((0.43, 0.43, 0.18)), CACTUS)
    plant.column(Vector((0, 0, 0.66)), Vector((0, 0, 0.95)), 0.22, CAP, sides=7, radius_top=0.2)
    return plant.finish(0.4)


def palmatoria():
    # A pad cactus: flat oval pads stacked on pads, each turned its own way.
    plant = Plant("palmatoria")
    rng = random.Random(11)
    pads = [(Vector((0, 0, 0.35)), 0.0, 0.0)]
    for depth in range(1, 4):
        for parent, turn, _ in list(pads):
            if parent.z < depth * 0.55 - 0.3:
                continue
            for side in (-1, 1):
                if rng.random() < 0.35 * depth:
                    continue
                spin = turn + rng.uniform(0.5, 1.2) * side
                pads.append((parent + Vector((math.cos(turn) * 0.22 * side, math.sin(turn) * 0.22 * side, 0.5)), spin, depth))
    for centre, turn, _ in pads[:9]:
        plant.blob(centre, Vector((0.24, 0.06, 0.34)), PAD, turn=turn)
    plant.column(Vector((0, 0, 0)), Vector((0, 0, 0.2)), 0.08, BARK, sides=5)
    return plant.finish(2.0)


def macambira():
    # The thorn patch: a fan of stiff blades, green going red at the tips.
    plant = Plant("macambira")
    rng = random.Random(5)
    for index in range(16):
        angle = index / 16 * math.tau + rng.uniform(-0.1, 0.1)
        lean = rng.uniform(0.45, 0.9)
        length = rng.uniform(0.7, 1.0)
        tip = Vector((math.cos(angle) * lean * length, math.sin(angle) * lean * length, length * (1.1 - lean * 0.6)))
        plant.blade(Vector((math.cos(angle) * 0.08, math.sin(angle) * 0.08, 0)), tip, 0.12, MACAMBIRA, MACAMBIRA_TIP)
    return plant.finish(0.8, width=1.4)


def limb_tree(name: str, height: float, seed: int, limbs: int, fork: float, spread: float, crown: Vector, clumps: int, size: float, leaf, bark=BARK, flat: float = 0.7, crown_rise: float = 0.0):
    """A tree from a trunk forking into limbs, each carrying part of the crown."""
    plant = Plant(name)
    rng = random.Random(seed)
    trunk_top = Vector((0, 0, fork))
    plant.column(Vector((0, 0, 0)), trunk_top, 0.11, bark, sides=6, radius_top=0.08)
    tips = []
    for index in range(limbs):
        angle = index / limbs * math.tau + rng.uniform(-0.3, 0.3)
        tip = trunk_top + Vector((math.cos(angle) * spread, math.sin(angle) * spread, rng.uniform(0.35, 0.6)))
        plant.column(trunk_top, tip, 0.06, bark, sides=5, radius_top=0.035)
        tips.append(tip)
    centre = Vector((0, 0, fork + 0.45 + crown_rise))
    plant.crown(rng, centre, crown, clumps, size, leaf, flat)
    return plant.finish(height)


def juazeiro():
    # Evergreen in the drought, a dense round crown: the shade of the sertao.
    return limb_tree("juazeiro", 5.0, 3, limbs=4, fork=0.55, spread=0.35, crown=Vector((0.55, 0.5, 0.35)), clumps=14, size=0.32, leaf=LEAF_JUAZEIRO)


def umbuzeiro():
    # Short trunk, a wide low dome of a crown, wider than tall.
    return limb_tree("umbuzeiro", 4.5, 9, limbs=5, fork=0.35, spread=0.55, crown=Vector((0.85, 0.8, 0.22)), clumps=16, size=0.3, leaf=LEAF_UMBU, flat=0.55)


def catingueira():
    # A grey-barked scrub tree with a thin, grey-green crown.
    return limb_tree("catingueira", 4.5, 21, limbs=4, fork=0.6, spread=0.4, crown=Vector((0.6, 0.55, 0.3)), clumps=11, size=0.24, leaf=LEAF_CATINGUEIRA, bark=BARK_PALE, crown_rise=0.1)


def jurema_preta():
    # Thorny scrub: several dark stems from the ground and a sparse, airy crown.
    plant = Plant("jurema-preta")
    rng = random.Random(17)
    for index in range(4):
        angle = index / 4 * math.tau + rng.uniform(-0.3, 0.3)
        top = Vector((math.cos(angle) * 0.45, math.sin(angle) * 0.45, rng.uniform(0.85, 1.05)))
        plant.column(Vector((math.cos(angle) * 0.05, math.sin(angle) * 0.05, 0)), top, 0.05, BARK, sides=5, radius_top=0.025)
        plant.crown(rng, top + Vector((0, 0, 0.1)), Vector((0.3, 0.3, 0.14)), 4, 0.22, LEAF_JUREMA, flat=0.5)
    return plant.finish(3.5)


def marmeleiro(size: str, shape: str):
    """The caatinga bush family (D6): a dense dry-olive shrub, round (a) or wide (b)."""
    height = SIZES[size]
    wide = shape == "b"
    clumps = {"knee": 5, "waist": 7, "head": 9}[size] + (1 if wide else 0)
    plant = Plant(f"bush-caatinga-{size}-{shape}")
    rng = random.Random(len(size) * 31 + (2 if wide else 1))
    plant.crown(rng, Vector((0, 0, 0.5)), Vector((0.55 if wide else 0.4, 0.5 if wide else 0.4, 0.3)), clumps, 0.32, MARMELEIRO, flat=0.5 if wide else 0.75)
    width = {"knee": (1.2, 1.6), "waist": (1.8, 2.4), "head": (2.4, 3.0)}[size][1 if wide else 0]
    return plant.finish(height, width=width)


def build():
    reset()
    for make in (mandacaru, facheiro, xique_xique, coroa_de_frade, palmatoria, macambira, juazeiro, umbuzeiro, catingueira, jurema_preta):
        make()
    for size in SIZES:
        for shape in ("a", "b"):
            marmeleiro(size, shape)
    return [save_and_export("trees-caatinga", "environment")]
