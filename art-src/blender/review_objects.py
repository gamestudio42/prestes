"""Review sheet of the waterside, farm and town objects (5.1) or, with --camp, the camp (5.2).

  blender -b art-src/environment/props.blend -P art-src/blender/review_objects.py -- <out_dir>

One picture per object, from the tactical angle, flat textured, each framed
to its size. Not part of the export.
"""
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
from camp_objects import BUILDERS as CAMP  # noqa: E402
from props_objects import BUILDERS  # noqa: E402

out_dir = sys.argv[sys.argv.index("--") + 1]
os.makedirs(out_dir, exist_ok=True)
names = [builder.__name__.replace("_", "-") for builder in (CAMP if "--camp" in sys.argv else BUILDERS)]

scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.color_type = "TEXTURE"
scene.render.resolution_x = 240
scene.render.resolution_y = 240
scene.world = scene.world or bpy.data.worlds.new("World")
scene.world.color = (0.45, 0.5, 0.35)
camera_data = bpy.data.cameras.new("ReviewCamera")
camera_data.type = "ORTHO"
camera = bpy.data.objects.new("ReviewCamera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
direction = Vector((0.7, -1.0, 0.8)).normalized()

for name in names:
    for obj in scene.objects:
        if obj.type == "MESH":
            obj.hide_render = obj.name != name
    obj = bpy.data.objects[name]
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    centre = sum(corners, Vector()) / 8
    size = max((a - b).length for a in corners for b in corners)
    camera_data.ortho_scale = max(2.0, size * 1.05)
    camera.location = centre + direction * 40
    camera.rotation_euler = (-direction).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = os.path.join(out_dir, f"{name}.png")
    bpy.ops.render.render(write_still=True)
