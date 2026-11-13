"""Review sheet of the stones by rock kind (revise-buildings-and-stone 4.1).

  blender -b art-src/environment/stones.blend -P art-src/blender/review_stones.py -- <out_dir>

One picture per rock kind: the small rock, the boulder, the matacão, the
pile and the outcrop in a row, from the tactical angle, flat textured.
Not part of the export.
"""
import os
import sys

import bpy
from mathutils import Vector

out_dir = sys.argv[sys.argv.index("--") + 1]
os.makedirs(out_dir, exist_ok=True)
KINDS = ["granite", "basalt", "sandstone", "quartzite", "cobble", "lajedo"]
ROW = [("rock-small", -9.0), ("boulder", -6.5), ("matacao", -2.5), ("stone-pile", 1.8), ("outcrop", 7.5)]

scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.color_type = "TEXTURE"
scene.render.resolution_x = 900
scene.render.resolution_y = 300
scene.world = scene.world or bpy.data.worlds.new("World")
scene.world.color = (0.45, 0.5, 0.35)
camera_data = bpy.data.cameras.new("ReviewCamera")
camera_data.type = "ORTHO"
camera_data.ortho_scale = 21
camera = bpy.data.objects.new("ReviewCamera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
direction = Vector((0.6, -1.0, 0.9)).normalized()
camera.location = Vector((0, 0, 1)) + direction * 40
camera.rotation_euler = (-direction).to_track_quat("-Z", "Y").to_euler()

for kind in KINDS:
    names = {stone: (stone if kind == "granite" else f"{stone}@{kind}") for stone, _ in ROW}
    for obj in scene.objects:
        if obj.type == "MESH":
            obj.hide_render = obj.name not in names.values()
    for stone, x in ROW:
        bpy.data.objects[names[stone]].location = (x, 0, 0)
    scene.render.filepath = os.path.join(out_dir, f"{kind}.png")
    bpy.ops.render.render(write_still=True)
    print("rendered", kind)
