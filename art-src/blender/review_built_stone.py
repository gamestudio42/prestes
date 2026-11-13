"""Review sheet of the built stone by rock kind (revise-buildings-and-stone 4.2).

  blender -b art-src/environment/stones.blend -P art-src/blender/review_built_stone.py -- <out_dir>

One picture per rock kind: three pieces of a dry stone wall in a row, the
retaining wall and the steps. Not part of the export.
"""
import os
import sys

import bpy
from mathutils import Vector

out_dir = sys.argv[sys.argv.index("--") + 1]
os.makedirs(out_dir, exist_ok=True)
KINDS = ["granite", "basalt", "sandstone", "quartzite", "cobble", "lajedo"]

scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.color_type = "TEXTURE"
scene.render.resolution_x = 900
scene.render.resolution_y = 300
camera_data = bpy.data.cameras.new("ReviewCamera")
camera_data.type = "ORTHO"
camera_data.ortho_scale = 21
scene.world = scene.world or bpy.data.worlds.new("World")
scene.world.color = (0.45, 0.5, 0.35)
camera = bpy.data.objects.new("ReviewCamera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
direction = Vector((0.6, -1.0, 0.8)).normalized()
camera.location = Vector((0, 0, 0.5)) + direction * 40
camera.rotation_euler = (-direction).to_track_quat("-Z", "Y").to_euler()

for kind in KINDS:
    name = lambda base: base if kind == "granite" else f"{base}@{kind}"
    for obj in list(scene.objects):
        if obj.type == "MESH":
            obj.hide_render = True
        if obj.name.startswith("review."):
            bpy.data.objects.remove(obj)
    wall = bpy.data.objects[name("dry-wall")]
    for k in range(3):
        copy = wall.copy()
        copy.name = f"review.wall.{k}"
        copy.location = (-9 + k * 2, 0, 0)
        copy.scale = (1, 1, 1.2)
        copy.hide_render = False
        scene.collection.objects.link(copy)
    for base, x in (("retaining-wall", 0.5), ("stone-steps", 6.5)):
        obj = bpy.data.objects[name(base)]
        obj.location = (x, 0, 0)
        obj.hide_render = False
    scene.render.filepath = os.path.join(out_dir, f"{kind}.png")
    bpy.ops.render.render(write_still=True)
