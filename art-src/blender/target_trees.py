"""Trees adapted from the owner's Refloreste project (refine-map-editor D8).

  blender -b --factory-startup -P art-src/blender/build.py -- trees

Not in the default `pnpm art` run: it reads the Refloreste models from
REFLORESTE (default C:/projetos/Refloreste) and writes
art-src/environment/trees.glb (the five trees the maps already use) and one
trees-<biome>.glb per biome, which `pnpm models` then prepares.

Refloreste draws its crowns as leaf cards that a Godot shader turns into
billboards, coloured by the species' leaf colour times a baked shade in the
vertex colour. Imported as they are, the cards are specks. So each tree here
keeps a low LOD of its trunk and rebuilds the crown as clumps: the card
centres are grouped by k-means and each group becomes a low-poly clump
(an icosahedron, a little flattened) in the leaf colour times the group's
shade. Meshes that are real geometry (palm fronds, the bush) are kept, from
the LOD that fits the budget. Every tree is scaled to its catalog height and
stands on the origin; trees come to 300-800 triangles, the bush under 300.
"""
import json
import math
import os

import bmesh
import bpy
from mathutils import Vector

from common import reset, save_and_export

SOURCE = os.environ.get("REFLORESTE", "C:/projetos/Refloreste")
VEGETATION = os.path.join(SOURCE, "assets", "vegetacao")

LEAF = (0.365, 0.659, 0.176)
# Lighter than the first pass (0.125, 0.290, 0.125), which read as dark clumps (hand check 2026-11-09).
LEAF_ARAUCARIA = (0.20, 0.40, 0.17)

# Catalog model -> source, family, trunk LOD, foliage LOD, crown clumps,
# leaf colour, clump flattening and catalog height (m).
#
# The family picks the crown method (biome-trees-and-plants D1):
#   broadleaf  k-means clumps over the leaf cards
#   tiered     clumps per whorl, at the branch tips (the araucaria's candelabra);
#              `tiers` whorls of `clumps // tiers` tufts each
#   palm       the real fronds kept (Refloreste's palms are geometry, not cards)
#   giant      as broadleaf, the trunk kept at LOD 0 for its buttresses
#   bush       as broadleaf, no trunk, spread to `width`
#   dead       the trunk alone (dead forms and stumps); `trunk="auto"` takes the
#              most detailed LOD that fits the budget
TREES = {
    "tree-broad": dict(path="mata_atlantica/peroba/mata_atlantica_peroba_adulta.glb", family="broadleaf", trunk=1, foliage=0, clumps=26, leaf=LEAF, flat=0.8, height=8.0),
    "tree-araucaria": dict(path="mata_atlantica/araucaria/mata_atlantica_araucaria_adulta.glb", family="tiered", trunk=1, foliage=0, clumps=28, tiers=4, bare=0.4, lift=0.35, cap=2.6, leaf=LEAF_ARAUCARIA, flat=0.3, height=14.0),
    "buriti": dict(path="cerrado/buriti/cerrado_buriti_adulta.glb", family="palm", trunk=0, foliage=1, clumps=0, leaf=LEAF, flat=1.0, height=12.0),
    "cerrado-tree": dict(path="cerrado/pequi/cerrado_pequi_adulta.glb", family="broadleaf", trunk=1, foliage=0, clumps=18, leaf=LEAF, flat=0.8, height=6.0),
    "bush": dict(path="cerrado/bush/cerrado_bush_adulta.glb", family="bush", trunk=None, foliage=0, clumps=8, leaf=LEAF, flat=0.75, height=1.3, width=2.6),
}

FAMILIES = ("broadleaf", "tiered", "palm", "giant", "bush", "dead")
for _spec in TREES.values():
    _spec["file"] = "trees"

# biome-trees-and-plants 2.2-2.4: Refloreste's adult trees, one file per biome
# (design D3: `trees-<biome>.glb`, loaded when a map uses one of its
# species). Heights are the ones fixed at task 1.1 (docs/status.md). The five
# rows above stay as they are, in `trees.glb`: the maps already use them, and
# the catalog shows them as the young forms. With no `clumps`, a crown gets as
# many clumps as its size class's budget allows beside the trunk.
LEAF_ATLANTIC = (0.27, 0.52, 0.17)
LEAF_CERRADO = (0.45, 0.56, 0.21)
LEAF_AMAZON = (0.17, 0.44, 0.15)


def species(biome: str, folder: str, family: str, height: float, leaf, **extra):
    """A Refloreste adult tree's row: `<biome>/<folder>/<biome>_<folder>_adulta.glb`."""
    spec = dict(
        path=f"{biome}/{folder}/{biome}_{folder}_adulta.glb",
        file=f"trees-{biome.replace('_', '-')}",
        family=family,
        trunk=0 if family == "giant" else 1,
        foliage=0,
        clumps=None,
        leaf=leaf,
        flat=0.8,
        height=height,
    )
    spec.update(extra)
    return spec


TREES.update({
    # Atlantic forest
    "araucaria": species("mata_atlantica", "araucaria", "tiered", 14.0, LEAF_ARAUCARIA, clumps=32, tiers=4, bare=0.4, lift=0.35, cap=2.6, flat=0.3),
    "mulungu": species("mata_atlantica", "erythrina", "broadleaf", 8.0, LEAF_ATLANTIC),
    "jequitiba": species("mata_atlantica", "jequitiba", "giant", 13.0, LEAF_ATLANTIC, flat=0.7),
    "manaca": species("mata_atlantica", "manaca", "broadleaf", 5.0, LEAF_ATLANTIC),
    "palmito-jucara": species("mata_atlantica", "palmito_jucara", "palm", 8.0, LEAF_ATLANTIC),
    "pau-brasil": species("mata_atlantica", "pau_brasil", "broadleaf", 10.0, LEAF_ATLANTIC),
    "peroba": species("mata_atlantica", "peroba", "broadleaf", 8.0, LEAF_ATLANTIC),
    # Cerrado
    "aroeira": species("cerrado", "aroeira", "broadleaf", 7.0, LEAF_CERRADO),
    "barbatimao": species("cerrado", "barbatimao", "broadleaf", 4.0, LEAF_CERRADO),
    "buriti-adult": species("cerrado", "buriti", "palm", 12.0, LEAF_CERRADO),
    "cagaita": species("cerrado", "cagaita", "broadleaf", 4.0, LEAF_CERRADO),
    "ipe": species("cerrado", "ipe", "broadleaf", 8.0, LEAF_CERRADO),
    "pequi": species("cerrado", "pequi", "broadleaf", 6.0, LEAF_CERRADO),
    # Amazon
    "acai": species("amazonia", "acai", "palm", 10.0, LEAF_AMAZON),
    "andiroba": species("amazonia", "andiroba", "giant", 12.0, LEAF_AMAZON),
    "castanheira": species("amazonia", "castanheira", "giant", 13.0, LEAF_AMAZON, flat=0.7),
    "seringueira": species("amazonia", "seringueira", "broadleaf", 11.0, LEAF_AMAZON),
    "sumauma": species("amazonia", "sumauma", "giant", 14.0, LEAF_AMAZON, flat=0.55),
    "tucuma": species("amazonia", "tucuma", "palm", 9.0, LEAF_AMAZON),
})

# biome-trees-and-plants 2.5: dead forms (every adult), one stump per biome and
# the four flowering forms chosen at task 1.1 (docs/status.md). A dead or
# flowering form takes its height from the adult row, so editing that row
# carries over.
FLOWERS = {
    "ipe": (0.95, 0.78, 0.15),
    "mulungu": (0.85, 0.28, 0.12),
    "manaca": (0.78, 0.45, 0.70),
    "pau-brasil": (0.93, 0.80, 0.20),
}
# Dead wood: the source's vertex colours multiplied toward grey-brown.
DEAD_WOOD = (0.45, 0.40, 0.34)


def add_forms():
    adults = [(name, spec) for name, spec in TREES.items() if spec["file"] != "trees"]
    stumps = {}
    for name, spec in adults:
        dead = dict(spec, path=spec["path"].replace("_adulta.glb", "_morta.glb"), family="dead", trunk="auto", foliage=None, clumps=0, tint=DEAD_WOOD, height=TREES[name]["height"])
        TREES[f"{name}-dead"] = dead
        biome = spec["path"].split("/")[0]
        stumps.setdefault(biome, spec["file"])
    for name, spec in adults:
        if name in FLOWERS:
            TREES[f"{name}-flowering"] = dict(spec, path=spec["path"].replace("_adulta.glb", "_adulta_florida.glb"), flowers=FLOWERS[name], height=TREES[name]["height"])
    for biome, file in stumps.items():
        TREES[f"stump-{biome.replace('_', '-')}"] = dict(
            path=f"{biome}/stump/{biome}_stump_adulta.glb", file=file, family="dead", trunk=0, foliage=None,
            clumps=0, leaf=LEAF, flat=1.0, height=0.6, tint=DEAD_WOOD)


add_forms()

# biome-trees-and-plants 2.4b (design D5c): the araucaria, peroba, pequi and
# buriti already in maps are those species' adults, under their legacy ids
# and heights; their rows above only give their dead forms. The adult rows
# are dropped, and the dead forms take the legacy heights.
LEGACY_ADULTS = {"araucaria": "tree-araucaria", "peroba": "tree-broad", "pequi": "cerrado-tree", "buriti-adult": "buriti"}
for _name, _legacy in LEGACY_ADULTS.items():
    del TREES[_name]
    _dead = TREES.pop(f"{_name}-dead")
    _dead["height"] = TREES[_legacy]["height"]
    TREES[f"{_name.replace('-adult', '')}-dead"] = _dead

# No tree over 14 m (owner, 2026-11-12: no giant trees on the battle maps).
MAX_TREE_HEIGHT = 14.0
for _name, _spec in TREES.items():
    assert _spec["height"] <= MAX_TREE_HEIGHT, f"{_name}: {_spec['height']} m, over {MAX_TREE_HEIGHT} m"

with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "tools", "tree-budgets.json"), encoding="utf-8") as _file:
    BUDGETS = json.load(_file)


def budget_for(height: float) -> int:
    """The size class's triangle budget (the same classes as tools/tree-budgets.ts)."""
    if height < 2:
        return BUDGETS["bush"]
    if height < 6:
        return BUDGETS["small-tree"]
    if height <= 15:
        return BUDGETS["tree"]
    return BUDGETS["giant"]


def decimate_to(obj, target: int):
    """Collapses a mesh to about `target` triangles (palm fronds over budget)."""
    count = triangles(obj)
    if count <= target:
        return
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new("decimate", "DECIMATE")
    modifier.ratio = target / count
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    # The collapse leaves loose vertices; the export drops them, and the tree
    # would come out short of its height (the acai stood 12.8 m of 14).
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.delete(bm, geom=[vertex for vertex in bm.verts if not vertex.link_faces], context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()



def triangles(obj) -> int:
    return sum(len(polygon.vertices) - 2 for polygon in obj.data.polygons)


def import_source(path: str) -> dict:
    """Imports a Refloreste model; returns its mesh objects by node name, transforms applied."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(VEGETATION, path))
    new = [obj for obj in bpy.data.objects if obj not in before]
    meshes = {}
    for obj in new:
        if obj.type == "MESH":
            matrix = obj.matrix_world.copy()
            obj.parent = None
            obj.matrix_world = matrix
            meshes[obj.name] = obj
    for obj in new:
        if obj.type != "MESH":
            bpy.data.objects.remove(obj, do_unlink=True)
    for obj in meshes.values():
        obj.data.transform(obj.matrix_world)
        obj.matrix_world.identity()
    return meshes


def pick(meshes: dict, part: str, lod) -> object:
    if lod is None:
        return None
    for name, obj in meshes.items():
        if f"_{part}_LOD{lod}" in name:
            return obj
    return None


def colour_layer(mesh):
    """The mesh's colour attribute (the import names it after COLOR_0)."""
    if mesh.color_attributes:
        return mesh.color_attributes[0]
    return mesh.color_attributes.new("Color", "FLOAT_COLOR", "CORNER")


def card_centres(obj):
    """Each card's centre and its shade (the red of its baked vertex colour)."""
    mesh = obj.data
    colours = colour_layer(mesh)
    cards = []
    for polygon in mesh.polygons:
        centre = Vector((0, 0, 0))
        for index in polygon.vertices:
            centre += mesh.vertices[index].co
        centre /= len(polygon.vertices)
        if colours.domain == "CORNER":
            shade = sum(colours.data[loop].color[0] for loop in polygon.loop_indices) / len(polygon.loop_indices)
        else:
            shade = sum(colours.data[index].color[0] for index in polygon.vertices) / len(polygon.vertices)
        cards.append((centre, shade))
    return cards


def kmeans(cards, count: int, rounds: int = 12):
    """Deterministic k-means: farthest-point seeds from the highest card."""
    points = [centre for centre, _ in cards]
    seeds = [max(points, key=lambda p: p.z)]
    nearest = [(p - seeds[0]).length for p in points]
    while len(seeds) < min(count, len(points)):
        far = max(range(len(points)), key=lambda i: nearest[i])
        seeds.append(points[far].copy())
        nearest = [min(nearest[i], (points[i] - seeds[-1]).length) for i in range(len(points))]
    groups = []
    for _ in range(rounds):
        groups = [[] for _ in seeds]
        for card in cards:
            best = min(range(len(seeds)), key=lambda i: (card[0] - seeds[i]).length_squared)
            groups[best].append(card)
        seeds = [sum((c for c, _ in group), Vector((0, 0, 0))) / len(group) if group else seeds[i] for i, group in enumerate(groups)]
    return [(seeds[i], group) for i, group in enumerate(groups) if group]


def tint_wood(trunk, tint):
    """Multiplies the trunk's vertex colours by `tint` (dead wood reads grey-brown)."""
    layer = colour_layer(trunk.data)
    for item in layer.data:
        r, g, b, a = item.color
        item.color = (r * tint[0], g * tint[1], b * tint[2], a)


def crown(name: str, cards, clumps: int, leaf, flat: float, card_radius: float, groups=None, cap=None, shade_cap=1.4):
    """The crown as clumps, one per k-means group of leaf cards (or the groups given)."""
    mesh = bpy.data.meshes.new(f"{name}-crown")
    bm = bmesh.new()
    colours = bm.loops.layers.float_color.new("Color")
    for centre, group in groups if groups is not None else kmeans(cards, clumps):
        spread = math.sqrt(sum((c - centre).length_squared for c, _ in group) / len(group))
        radius = (min(spread, cap) if cap else spread) + card_radius * 0.6
        shade = min(shade_cap, max(0.45, 1.5 * sum(s for _, s in group) / len(group)))
        colour = (leaf[0] * shade, leaf[1] * shade, leaf[2] * shade, 1.0)
        result = bmesh.ops.create_icosphere(bm, subdivisions=0, radius=1.0)
        for vertex in result["verts"]:
            vertex.co = Vector((vertex.co.x * radius + centre.x, vertex.co.y * radius + centre.y, vertex.co.z * radius * flat + centre.z))
        faces = {face for vertex in result["verts"] for face in vertex.link_faces}
        for face in faces:
            for loop in face.loops:
                loop[colours] = colour
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(f"{name}-crown", mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def candelabra(trunk, cards, bare: float, lift: float):
    """Shapes the araucaria's branches (biome-trees-and-plants 2.1): the
    branches under the crown are cut (an adult sheds them), and every branch
    is bent upward toward its tip, by `lift` of the foliage's height at the
    farthest reach, so the whorls open into the candelabra's cup. The leaf
    cards are lifted the same way and stay on their branch tips."""
    low = min(card[0].z for card in cards)
    high = max(card[0].z for card in cards)
    base = low + (high - low) * bare
    reach = max(card[0].xy.length for card in cards)
    rise = (high - low) * lift

    def bent(co):
        return Vector((co.x, co.y, co.z + rise * (co.xy.length / reach) ** 2))

    bm = bmesh.new()
    bm.from_mesh(trunk.data)
    # A face wholly under the crown and farther from the axis than the
    # tapering trunk is a low branch.
    top = max(v.co.z for v in bm.verts)
    foot = max(v.co.xy.length for v in bm.verts if v.co.z < top * 0.02)

    def off_trunk(face):
        centre = face.calc_center_median()
        return centre.xy.length > max(0.5, foot * (1 - centre.z / top)) * 1.4

    low_branch = [face for face in bm.faces if off_trunk(face) and all(v.co.z < base for v in face.verts)]
    bmesh.ops.delete(bm, geom=low_branch, context="FACES")
    for vertex in bm.verts:
        vertex.co = bent(vertex.co)
    bm.to_mesh(trunk.data)
    bm.free()
    return [(bent(centre), shade) for centre, shade in cards]


def whorls(cards, tiers: int, per_tier: int, bare: float):
    """The tiered crown's groups (biome-trees-and-plants 2.1): the araucaria's
    candelabra. An adult sheds its low branches, so the cards in the lowest
    `bare` share of the foliage's height are dropped; the rest are cut by
    height into `tiers` whorls, and in each whorl only the outer cards (the
    branch tips, where the needles grow) are clustered into `per_tier` tufts.
    The bare branches show between the tufts and the crown opens upward like
    a cup, not one round clump."""
    low = min(card[0].z for card in cards)
    high = max(card[0].z for card in cards)
    kept = sorted((card for card in cards if card[0].z >= low + (high - low) * bare), key=lambda card: card[0].z)
    groups = []
    for tier in range(tiers):
        band = kept[tier * len(kept) // tiers:(tier + 1) * len(kept) // tiers]
        if not band:
            continue
        reach = max(card[0].xy.length for card in band)
        tips = [card for card in band if card[0].xy.length >= reach * 0.55] or band
        groups.extend(kmeans(tips, per_tier))
    return groups


def build_tree(name: str, spec: dict):
    meshes = import_source(spec["path"])
    keep = []
    if spec["trunk"] == "auto":
        # The most detailed trunk that fits the budget.
        lods = [lod for lod in (0, 1, 2) if pick(meshes, "tronco", lod)]
        fitting = [lod for lod in lods if triangles(pick(meshes, "tronco", lod)) <= budget_for(spec["height"]) * 0.92]
        spec = dict(spec, trunk=fitting[0] if fitting else lods[-1])
    trunk = pick(meshes, "tronco", spec["trunk"])
    if trunk and spec.get("tint"):
        tint_wood(trunk, spec["tint"])
    if trunk:
        keep.append(trunk)
    family = spec["family"]
    assert family in FAMILIES, f"{name}: unknown family {family}"
    budget = budget_for(spec["height"]) * 0.92
    room = budget - (triangles(trunk) if trunk else 0)
    if family == "palm" and spec["foliage"] == 0 and spec["file"] != "trees":
        # The most detailed fronds that fit beside the trunk; else the
        # coarsest, collapsed to fit.
        lods = [lod for lod in (0, 1, 2) if pick(meshes, "folhagem", lod)]
        fitting = [lod for lod in lods if triangles(pick(meshes, "folhagem", lod)) <= room]
        foliage = pick(meshes, "folhagem", fitting[0] if fitting else lods[-1])
        decimate_to(foliage, int(room))
    else:
        foliage = pick(meshes, "folhagem", spec["foliage"])
    if spec["clumps"] is None:
        spec = dict(spec, clumps=max(8, min(40, int(room // 20))))
    flowers = pick(meshes, "flores", 0) if spec.get("flowers") else None
    if flowers:
        # Flowering form: the clump budget goes to the flowers, or half and
        # half with the leaves where the file has foliage too.
        leaf_clumps = spec["clumps"] // 2 if foliage else 0
        xs = [v.co.x for v in flowers.data.vertices]
        flower_radius = max(0.4, (max(xs) - min(xs)) * 0.04)
        keep.append(crown(f"{name}-flowers", card_centres(flowers), spec["clumps"] - leaf_clumps, spec["flowers"], spec["flat"], flower_radius, shade_cap=1.0))
        spec = dict(spec, clumps=leaf_clumps)
        print(f"{name}: flower crown from {len(flowers.data.polygons)} flower-card faces")
    if foliage and family != "palm" and spec["clumps"]:
        # A card is about a twenty-fifth of the crown's width.
        xs = [v.co.x for v in foliage.data.vertices]
        card_radius = max(0.4, (max(xs) - min(xs)) * 0.04)
        cards = card_centres(foliage)
        groups = None
        if family == "tiered":
            cards = candelabra(trunk, cards, spec["bare"], spec["lift"])
            groups = whorls(cards, spec["tiers"], spec["clumps"] // spec["tiers"], spec["bare"])
        keep.append(crown(name, cards, spec["clumps"], spec["leaf"], spec["flat"], card_radius, groups, spec.get("cap")))
        print(f"{name}: {family} crown from {len(foliage.data.polygons)} leaf-card faces")
    elif foliage:
        keep.append(foliage)
    for obj in list(meshes.values()):
        if obj not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)

    bpy.ops.object.select_all(action="DESELECT")
    for obj in keep:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = keep[0]
    if len(keep) > 1:
        bpy.ops.object.join()
    tree = bpy.context.view_layer.objects.active
    triangulate = tree.modifiers.new("triangulate", "TRIANGULATE")
    bpy.ops.object.modifier_apply(modifier=triangulate.name)

    # Stand on the origin at the catalog height, the trunk's foot on the
    # origin (a leaning crown, like the buriti's fronds, would pull a
    # bounding-box centre off the trunk; hand check 2026-11-09).
    verts = tree.data.vertices
    xs = [v.co.x for v in verts]
    ys = [v.co.y for v in verts]
    zs = [v.co.z for v in verts]
    scale = spec["height"] / max(1e-6, max(zs) - min(zs))
    # A spread across the ground (the bush fills its 2.8 m footprint; hand check 2026-11-09).
    spread = scale
    if spec.get("width"):
        spread = spec["width"] / max(1e-6, max(max(xs) - min(xs), max(ys) - min(ys)))
    foot = [v.co for v in verts if v.co.z <= min(zs) + (max(zs) - min(zs)) * 0.05]
    if spec["trunk"] is not None and foot:
        centre = (sum(c.x for c in foot) / len(foot), sum(c.y for c in foot) / len(foot), min(zs))
    else:
        centre = ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(zs))
    for v in verts:
        v.co = Vector(((v.co.x - centre[0]) * spread, (v.co.y - centre[1]) * spread, (v.co.z - centre[2]) * scale))
    tree.data.update()
    tree.name = name
    tree.data.name = name
    # One plain material: the game colours trees by their vertex colours.
    tree.data.materials.clear()
    print(f"{name}: {triangles(tree)} triangles, {spec['height']} m")
    return tree


def build():
    built = []
    for file in dict.fromkeys(spec["file"] for spec in TREES.values()):
        reset()
        for name, spec in TREES.items():
            if spec["file"] == file:
                build_tree(name, spec)
        built.append(save_and_export(file, "environment"))
    return built
