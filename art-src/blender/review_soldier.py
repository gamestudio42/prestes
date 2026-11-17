"""Renders the soldier's review shots (improve-soldier-models 7.1).

  blender -b art-src/characters/soldier.blend -P art-src/blender/review_soldier.py -- <out_dir> <shot> [<shot> ...]

A shot is `outfit:variant:weapon:gear+gear:clip:frame[:far][:side]`, for
example `coluna-troop:0:Mauser:GearBlanket+GearNeckerchief:aim-stand:1`.
The hat follows the outfit as in the game (`headgear` in soldier-clips.ts);
`far` draws the far body and hat; `side` looks from the soldier's right.
"""
import math
import os
import sys

import bpy
from mathutils import Euler

args = sys.argv[sys.argv.index("--") + 1:]
out_dir, shots = args[0], args[1:]
os.makedirs(out_dir, exist_ok=True)
TEXTURES = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "textures")

scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.color_type = "TEXTURE"
scene.render.resolution_x = 220
scene.render.resolution_y = 260
scene.world = scene.world or bpy.data.worlds.new("World")

camera_data = bpy.data.cameras.new("ReviewCamera")
camera_data.type = "ORTHO"
camera = bpy.data.objects.new("ReviewCamera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera

rig = next(obj for obj in scene.objects if obj.type == "ARMATURE")
for track in rig.animation_data.nla_tracks:
    track.mute = True
meshes = {obj.name: obj for obj in scene.objects if obj.type == "MESH"}
image = next(img for img in bpy.data.images if img.name.startswith("soldier-"))


def hat_of(outfit: str) -> str:
    if outfit.startswith("legalista-"):
        return "Kepi"
    if outfit.startswith("cangaceiro-"):
        return "Halfmoon"
    if outfit.startswith(("jagunco-", "patriotico-")):
        return "LeatherHat"
    return "Slouch"


for shot in shots:
    parts = shot.split(":")
    outfit, variant, weapon, gear, clip, frame = parts[:6]
    far, side = "far" in parts[6:], "side" in parts[6:]
    image.filepath = os.path.join(TEXTURES, f"soldier-{outfit}-{variant}.png")
    image.reload()
    hat = hat_of(outfit)
    shown = {"SoldierFar" if far else "Soldier", f"{hat}Far" if far else hat}
    if weapon != "-":
        shown.add(f"Weapon{weapon}")
    if not far and gear != "-":
        shown.update(gear.split("+"))
    for name, obj in meshes.items():
        obj.hide_render = name not in shown
    rig.animation_data.action = bpy.data.actions[clip]
    scene.frame_set(int(frame))
    camera_data.ortho_scale = 2.6
    if side:
        camera.location = (-6.0, 0.4, 0.95)
        camera.rotation_euler = Euler((math.radians(90), 0, math.radians(-90)), "XYZ")
    else:
        camera.location = (4.0, 5.0, 5.0)
        camera.rotation_euler = Euler((math.radians(57), 0, math.radians(141)), "XYZ")
    scene.render.filepath = os.path.join(out_dir, f"{len(os.listdir(out_dir)):03d}-{shot.replace(':', '_').replace('+', '-')}.png")
    bpy.ops.render.render(write_still=True)
    print(f"rendered {scene.render.filepath}")
