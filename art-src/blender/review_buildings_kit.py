"""Review sheet of the roof and feature library (revise-buildings-and-stone 3.1).

  blender -b --factory-startup -P art-src/blender/review_buildings_kit.py -- <out_dir>

Builds one sample per roof form and feature from `buildings_kit.py`, with the
battle's openings of a real catalog building, and renders each from the
tactical angle toward its street face (orthographic, flat textured shading).
Not part of the export.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common  # noqa: E402
import buildings_kit as kit  # noqa: E402
from common import MeshBuilder  # noqa: E402

args = sys.argv[sys.argv.index("--") + 1:]
out_dir = args[0]
os.makedirs(out_dir, exist_ok=True)


def sample_hip(b):
    d = kit.openings("casa-terrea")
    kit.walls(b, d["halfWidth"], d["halfDepth"], d["wall"], wash="wash.ochre", band="wash.rose")
    kit.cornice(b, d["halfWidth"], d["halfDepth"], d["wall"])
    kit.all_openings(b, "casa-terrea")
    kit.wear(b, d["halfWidth"], d["halfDepth"])
    kit.roof_hip(b, d["halfWidth"], d["halfDepth"], d["wall"] + 0.1, 1.8)
    return "casa-terrea", "hip roof, cornice, dado band, shutters, worn plaster"


def sample_half_hip(b):
    d = kit.openings("farmhouse")
    kit.walls(b, d["halfWidth"], d["halfDepth"], d["wall"])
    kit.all_openings(b, "farmhouse")
    kit.roof_hip(b, d["halfWidth"], d["halfDepth"], d["wall"], 1.9, hip=0.55)
    kit.veranda(b, 2.0, d["halfDepth"], 1.6, 2.5, posts=3)
    kit.chimney(b, -2.6, -1.0, d["wall"], 2.0)
    return "farmhouse", "half-hip roof, alpendre on posts, brick chimney"


def sample_gable(b):
    d = kit.openings("colonist-house")
    hw, hd = d["halfWidth"], d["halfDepth"]
    kit.walls(b, hw, hd, d["wall"], wash="plaster.worn", plinth=None)
    kit.all_openings(b, "colonist-house", shutters=False, frame="timber")
    kit.roof_gable(b, hw, hd, d["wall"], 1.6, swatch="tile.old", end="adobe")
    # A lean-to kitchen on the left wall, its own chimney.
    b.box(tuple(kit.at(-hw - 1.0, -0.5, 1.1)), (2.0, 2.6, 2.2), "adobe", tile=kit.WALL_TILE)
    kit.roof_lean_to(b, -hw - 2.2, -hw, 0.9, -1.9, 2.5, 2.0, swatch="zinc")
    kit.chimney(b, -hw - 1.6, -1.2, 2.2, 1.4, size=0.5, swatch="adobe")
    return "colonist-house", "gable of old tile, wattle and daub, zinc lean-to kitchen"


def sample_thatch(b):
    hw, hd, wall = 2.6, 2.0, 2.2
    kit.walls(b, hw, hd, wall, wash="adobe", plinth=None)
    b.box(tuple(kit.at(0, hd + 0.04, 0.95)), (0.9, 0.08, 1.9), "door")
    kit.roof_thatch(b, hw, hd, wall, 2.2)
    return "thatch", "thatch hut of adobe (camp and riverside)"


def sample_zinc(b):
    d = kit.openings("venda")
    hw, hd, wall = d["halfWidth"], d["halfDepth"], d["wall"]
    kit.walls(b, hw, hd, wall, wash="wash.blue")
    kit.all_openings(b, "venda")
    kit.roof_zinc_shed(b, hw, hd, wall, 1.2)
    kit.awning(b, 0, hd, 3.0, 4.0)
    kit.sign_board(b, 0, hd, wall - 0.3, 3.2)
    return "venda", "zinc roof, awning over the doors, painted sign board"


def sample_platband(b):
    d = kit.openings("terraced-house")
    hw, hd, wall = d["halfWidth"], d["halfDepth"], d["wall"]
    kit.walls(b, hw, hd, wall, wash="wash.rose")
    kit.all_openings(b, "terraced-house")
    kit.roof_gable(b, hw, hd - 0.3, wall, 1.4, along="x", overhang=0.1)
    kit.platband(b, hw, hd, wall, 1.1)
    return "terraced-house", "platband facade with cornices hiding a tiled roof"


def sample_sobrado(b):
    d = kit.openings("sobrado")
    hw, hd, wall = d["halfWidth"], d["halfDepth"], d["wall"]
    kit.walls(b, hw, hd, wall, wash="wash.ochre")
    kit.cornice(b, hw, hd, d["storey"], depth=0.1)
    kit.all_openings(b, "sobrado")
    kit.roof_hip(b, hw, hd - 0.3, wall, 1.4, overhang=0.1)
    kit.platband(b, hw, hd, wall, 0.8)
    kit.balcony(b, 0, hd, d["storey"] + 0.05, 2 * hw - 1.2)
    return "sobrado", "two floors, iron balcony, platband and storey cornice"


def sample_bell(b):
    d = kit.openings("chapel")
    hw, hd, wall = d["halfWidth"], d["halfDepth"], d["wall"]
    kit.walls(b, hw, hd, wall, band="wash.blue")
    kit.all_openings(b, "chapel", frame="wash.blue")
    kit.roof_gable(b, hw, hd, wall, 2.0, along="y", end="plaster")
    kit.bell_gable(b, hw, hd - 0.1, wall + 1.6)
    kit.steps(b, 0, hd, 2.4, count=2)
    return "chapel", "bell gable with a cross, coloured dado and frames, steps"


def sample_tower(b):
    hw, hd, wall = 3.0, 4.0, 5.0
    kit.walls(b, hw, hd, wall)
    kit.roof_gable(b, hw, hd, wall, 2.2, along="y")
    kit.tower(b, 0, hd - 1.0, 2.4, 12.0)
    kit.steps(b, 0, hd, 3.0)
    return "tower", "square bell tower, belfry openings, pyramid cap"


def sample_piles(b):
    d = kit.openings("barn")
    hw, hd, wall = d["halfWidth"], d["halfDepth"], d["wall"]
    kit.piles(b, hw, hd, 0.6)
    b.box(tuple(kit.at(0, 0, 0.6 + (wall - 0.6) / 2)), (2 * hw, 2 * hd, wall - 0.6), "timber", tile=kit.WALL_TILE)
    kit.all_openings(b, "barn", shutters=False, frame="timber")
    kit.roof_gable(b, hw, hd, wall, 2.0, end="timber")
    return "barn", "board walls on stone piles, wide door"


SAMPLES = [sample_hip, sample_half_hip, sample_gable, sample_thatch, sample_zinc,
           sample_platband, sample_sobrado, sample_bell, sample_tower, sample_piles]

scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.color_type = "TEXTURE"
scene.render.resolution_x = 360
scene.render.resolution_y = 360
scene.world = scene.world or bpy.data.worlds.new("World")
scene.world.color = (0.55, 0.6, 0.5)

camera_data = bpy.data.cameras.new("ReviewCamera")
camera_data.type = "ORTHO"
camera = bpy.data.objects.new("ReviewCamera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
# The tactical view toward the street face (Blender -Y), from the front-right.
direction = Vector((1.0, -1.25, 1.15)).normalized()

ground = MeshBuilder("environment")
ground.box((0, 0, -0.05), (160, 160, 0.1), "earth", tile=2.0)
ground.to_object("ground")

captions = []
for index, sample in enumerate(SAMPLES):
    b = MeshBuilder("environment")
    name, caption = sample(b)
    obj = b.to_object(name)
    marks = kit.markers(name) if name in kit.OPENINGS else []
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    centre = sum(corners, Vector()) / 8
    extent = max((c - centre).length for c in corners)
    camera_data.ortho_scale = extent * 2.1
    camera.location = centre + direction * 40
    camera.rotation_euler = (-direction).to_track_quat("-Z", "Y").to_euler()
    path = os.path.join(out_dir, f"{index + 1:02d}-{sample.__name__[7:]}.png")
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    captions.append(f"{os.path.basename(path)}\t{caption}\t{len(marks)} markers")
    bpy.data.objects.remove(obj)
    for mark in marks:
        bpy.data.objects.remove(mark)

with open(os.path.join(out_dir, "captions.tsv"), "w", encoding="utf-8") as handle:
    handle.write("\n".join(captions) + "\n")
print("\n".join(captions))
