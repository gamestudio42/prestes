"""Renders a review sheet row of tree models (biome-trees-and-plants 2.x).

  blender -b --factory-startup -P art-src/blender/review_trees.py -- <out_prefix> <file.glb>:<node>[=label] ...

The models stand in a row, each with a 1.75 m soldier marker (a red post) at
its foot, and are rendered twice in their vertex colours: from the side
(`<out_prefix>-side.png`) and from the game's tactical angle, about 40
degrees down (`<out_prefix>-tactical.png`). Not part of the export.
"""
import math
import os
import sys

import bpy
from mathutils import Euler, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import reset  # noqa: E402

SOLDIER = 1.75

args = sys.argv[sys.argv.index("--") + 1:]
prefix, entries = args[0], args[1:]
os.makedirs(os.path.dirname(os.path.abspath(prefix)), exist_ok=True)

reset()
scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.color_type = "VERTEX"
scene.display.shading.show_object_outline = True
scene.render.film_transparent = False
scene.world = scene.world or bpy.data.worlds.new("World")
scene.world.color = (0.82, 0.78, 0.66)

marker_material = bpy.data.materials.new("marker")
marker_material.diffuse_color = (0.75, 0.1, 0.08, 1.0)

placed = []
cursor = 0.0
for entry in entries:
    source, _, label = entry.partition("=")
    path, node = source.rsplit(":", 1)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [obj for obj in bpy.data.objects if obj not in before]
    keep = next(obj for obj in new if obj.type == "MESH" and obj.name.split(".")[0] == node)
    for obj in new:
        if obj is not keep:
            bpy.data.objects.remove(obj, do_unlink=True)
    keep.parent = None
    xs = [(keep.matrix_world @ v.co).x for v in keep.data.vertices]
    ys = [(keep.matrix_world @ v.co).y for v in keep.data.vertices]
    zs = [(keep.matrix_world @ v.co).z for v in keep.data.vertices]
    width = max(max(xs) - min(xs), 2.0)
    keep.location.x += cursor + width / 2 - (min(xs) + max(xs)) / 2
    keep.location.y -= (min(ys) + max(ys)) / 2
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(cursor + width / 2 + width * 0.35 + 0.6, -1.0, SOLDIER / 2))
    post = bpy.context.active_object
    post.scale = (0.45, 0.3, SOLDIER)
    post.data.materials.append(marker_material)
    placed.append((label or node, max(zs) - min(zs)))
    cursor += width + 2.5

span = cursor
tallest = max(height for _, height in placed)
camera_data = bpy.data.cameras.new("ReviewCamera")
camera_data.type = "ORTHO"
camera = bpy.data.objects.new("ReviewCamera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera

for view, pitch in (("side", 88.0), ("tactical", 50.0)):
    camera_data.ortho_scale = max(span, tallest * 1.5) * 1.05
    distance = 200.0
    centre = Vector((span / 2, 0.0, tallest / 2))
    angle = math.radians(pitch)
    camera.location = centre + Vector((0.0, -distance * math.sin(angle), distance * math.cos(angle)))
    camera.rotation_euler = Euler((angle, 0.0, 0.0), "XYZ")
    camera_data.clip_end = 1000.0
    scene.render.resolution_x = 1600
    scene.render.resolution_y = int(1600 * max(0.35, min(1.0, tallest * 1.5 / max(span, 1.0))))
    scene.render.filepath = f"{prefix}-{view}.png"
    bpy.ops.render.render(write_still=True)
    print(f"rendered {scene.render.filepath}")

print("ORDER " + " | ".join(f"{label} {height:.1f} m" for label, height in placed))
