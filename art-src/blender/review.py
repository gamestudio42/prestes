"""Renders review sheets of a built model (not part of the export).

  blender -b art-src/characters/soldier.blend -P art-src/blender/review.py -- <out_dir> [clip:frame ...]

Each clip:frame is rendered from the game's tactical angle (orthographic,
pitched about 40 degrees) with flat textured shading, nearest filtering.
"""
import math
import os
import sys

import bpy
from mathutils import Euler

args = sys.argv[sys.argv.index("--") + 1:]
out_dir = args[0]
shots = args[1:] or ["idle:1", "walk:4", "aim-crouch:1", "prone:1", "corpse:1"]
os.makedirs(out_dir, exist_ok=True)

scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.color_type = "TEXTURE"
scene.render.resolution_x = 240
scene.render.resolution_y = 240
scene.render.film_transparent = False
scene.world = scene.world or bpy.data.worlds.new("World")

camera_data = bpy.data.cameras.new("ReviewCamera")
camera_data.type = "ORTHO"
camera_data.ortho_scale = 3.2
camera = bpy.data.objects.new("ReviewCamera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
# Tactical view: from the front-right, above.
camera.location = (4.0, 5.0, 4.6)
camera.rotation_euler = Euler((math.radians(55), 0, math.radians(141)), "XYZ")

rig = next(obj for obj in scene.objects if obj.type == "ARMATURE")
rig.animation_data_create()
for track in rig.animation_data.nla_tracks:
    track.mute = True

for shot in shots:
    name, frame = shot.split(":")
    rig.animation_data.action = bpy.data.actions[name]
    scene.frame_set(int(frame))
    scene.render.filepath = os.path.join(out_dir, f"{name}-{frame}.png")
    bpy.ops.render.render(write_still=True)
    print(f"rendered {scene.render.filepath}")
