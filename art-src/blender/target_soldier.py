"""The 1920s infantryman: one low-poly model, one rig, every clip.

Blender space: Z up, the soldier faces +Y (which the glTF export turns into
Three.js -Z, the game's forward), feet at the origin, 1.75 m tall.

Parts are boxes mapped to the soldier atlas swatches; each part follows one
bone (rigid skinning), which suits low-poly and keeps the deformation clean.
Two hats are separate meshes on the same rig: a kepi (legalists, officer) and
a slouch hat (the column); the game shows one. Clips are Blender actions.
"""
import math

import bpy
from mathutils import Matrix, Vector

from common import MeshBuilder, reset, save_and_export

FPS = 24

BONES = {
    # name: (head, tail, parent)
    "root": ((0, 0, 0), (0, 0.25, 0), None),
    "hips": ((0, 0, 0.92), (0, 0, 1.02), "root"),
    "chest": ((0, 0, 1.02), (0, 0, 1.44), "hips"),
    "head": ((0, 0, 1.46), (0, 0, 1.8), "chest"),
    "upper_arm.L": ((0.24, 0, 1.42), (0.24, 0, 1.13), "chest"),
    "forearm.L": ((0.24, 0, 1.13), (0.24, 0, 0.86), "upper_arm.L"),
    "upper_arm.R": ((-0.24, 0, 1.42), (-0.24, 0, 1.13), "chest"),
    "forearm.R": ((-0.24, 0, 1.13), (-0.24, 0, 0.86), "upper_arm.R"),
    "thigh.L": ((0.1, 0, 0.92), (0.1, 0, 0.52), "hips"),
    "shin.L": ((0.1, 0, 0.52), (0.1, 0, 0.06), "thigh.L"),
    "thigh.R": ((-0.1, 0, 0.92), (-0.1, 0, 0.52), "hips"),
    "shin.R": ((-0.1, 0, 0.52), (-0.1, 0, 0.06), "thigh.R"),
    "rifle": ((-0.27, -0.07, 1.36), (-0.27, -0.07, 1.56), "chest"),
}


def body_mesh() -> bpy.types.Object:
    b = MeshBuilder("soldier", "soldier-column")
    for side, x in (("L", 0.1), ("R", -0.1)):
        b.box((x, 0.03, 0.05), (0.12, 0.26, 0.1), "boots", group=f"shin.{side}")
        b.box((x, 0, 0.31), (0.11, 0.12, 0.42), "puttees", group=f"shin.{side}")
        b.box((x, 0, 0.72), (0.15, 0.17, 0.42), "trousers", group=f"thigh.{side}")
    b.box((0, 0, 0.96), (0.36, 0.21, 0.14), "trousers", group="hips")
    b.box((0, 0, 1.2), (0.38, 0.23, 0.44), "tunic", group="chest")
    b.box((0, 0.005, 1.0), (0.4, 0.25, 0.06), "leather", group="hips")
    # Bandolier across the chest, from the left shoulder to the right hip.
    sash = Matrix.Translation((0, 0.12, 1.22)) @ Matrix.Rotation(math.radians(38), 4, "Y")
    b.box((0, 0, 0), (0.07, 0.03, 0.56), "leather", group="chest", matrix=sash)
    b.box((0, 0.01, 1.43), (0.24, 0.21, 0.06), "scarf", group="chest")
    b.box((0, 0.01, 1.57), (0.19, 0.21, 0.22), "skin", group="head")
    for side, x in (("L", 0.24), ("R", -0.24)):
        b.box((x, 0, 1.27), (0.1, 0.11, 0.3), "tunic", group=f"upper_arm.{side}")
        b.box((x, 0, 1.0), (0.09, 0.1, 0.26), "tunic", group=f"forearm.{side}")
        b.box((x, 0.01, 0.84), (0.08, 0.09, 0.08), "skin", group=f"forearm.{side}")
    # The Mauser along the rifle bone: butt at the shoulder, muzzle up.
    x, y = -0.27, -0.07
    b.box((x, y, 1.62), (0.05, 0.09, 0.52), "rifle.wood", group="rifle")
    b.box((x, y + 0.01, 1.96), (0.035, 0.05, 0.16), "rifle.metal", group="rifle")
    b.box((x, y + 0.01, 2.2), (0.03, 0.04, 0.34), "rifle.metal", group="rifle")
    b.box((x + 0.03, y + 0.02, 1.95), (0.04, 0.02, 0.02), "rifle.metal", group="rifle")
    return b.to_object("Soldier")


def kepi() -> bpy.types.Object:
    b = MeshBuilder("soldier", "soldier-column")
    b.box((0, 0.0, 1.73), (0.2, 0.22, 0.1), "hat", group="head")
    b.box((0, 0.13, 1.685), (0.2, 0.08, 0.02), "leather", group="head")
    return b.to_object("Kepi")


def slouch() -> bpy.types.Object:
    b = MeshBuilder("soldier", "soldier-column")
    b.box((0, 0, 1.69), (0.38, 0.38, 0.03), "hat", group="head")
    b.box((0, 0, 1.75), (0.2, 0.2, 0.1), "hat", group="head")
    b.box((0, 0, 1.715), (0.21, 0.21, 0.02), "scarf", group="head")
    return b.to_object("Slouch")


def armature() -> bpy.types.Object:
    data = bpy.data.armatures.new("SoldierRig")
    rig = bpy.data.objects.new("SoldierRig", data)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for name, (head, tail, parent) in BONES.items():
        bone = data.edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        bone.roll = 0
        if parent:
            bone.parent = data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    for pose_bone in rig.pose.bones:
        pose_bone.rotation_mode = "XYZ"
    return rig


def skin(obj: bpy.types.Object, rig: bpy.types.Object) -> None:
    obj.parent = rig
    modifier = obj.modifiers.new("Rig", "ARMATURE")
    modifier.object = rig


class Poser:
    """Poses bones by meaning (swing a limb forward, pitch the body) with the
    sign of each bone's local X measured once, not assumed."""

    def __init__(self, rig: bpy.types.Object) -> None:
        self.rig = rig
        self.sign: dict[str, float] = {}
        for name in ("thigh.L", "thigh.R", "shin.L", "shin.R", "upper_arm.L", "upper_arm.R",
                     "forearm.L", "forearm.R", "chest", "head", "hips", "rifle"):
            bone = rig.pose.bones[name]
            bone.rotation_euler = (0.4, 0, 0)
            bpy.context.view_layer.update()
            tail = rig.matrix_world @ bone.tail
            rest = rig.matrix_world @ rig.data.bones[name].tail_local
            bone.rotation_euler = (0, 0, 0)
            bpy.context.view_layer.update()
            # For a bone pointing down, "forward" moves the tail to +Y; for a
            # bone pointing up (chest, head, rifle), forward tips it to +Y too.
            self.sign[name] = 1.0 if tail.y > rest.y else -1.0
        self.spread_sign: dict[str, float] = {}
        for name in ("thigh.L", "thigh.R", "shin.L", "shin.R", "upper_arm.L", "upper_arm.R"):
            bone = rig.pose.bones[name]
            bone.rotation_euler = (0, 0, 0.4)
            bpy.context.view_layer.update()
            tail = rig.matrix_world @ bone.tail
            rest = rig.matrix_world @ rig.data.bones[name].tail_local
            bone.rotation_euler = (0, 0, 0)
            bpy.context.view_layer.update()
            # Positive spread moves the tail away from the body's midline.
            self.spread_sign[name] = 1.0 if abs(tail.x) > abs(rest.x) else -1.0

    def clear(self) -> None:
        for bone in self.rig.pose.bones:
            bone.rotation_euler = (0, 0, 0)
            bone.location = (0, 0, 0)

    def swing(self, name: str, degrees: float) -> None:
        """Positive: the bone's tail moves forward (+Y)."""
        bone = self.rig.pose.bones[name]
        bone.rotation_euler.x = self.sign[name] * math.radians(degrees)

    def spread(self, name: str, degrees: float) -> None:
        """Positive: the bone's tail moves out from the midline (abduction)."""
        bone = self.rig.pose.bones[name]
        bone.rotation_euler.z = self.spread_sign[name] * math.radians(degrees)

    def side(self, name: str, degrees: float) -> None:
        self.rig.pose.bones[name].rotation_euler.y = math.radians(degrees)

    def root(self, pitch=0.0, roll=0.0, x=0.0, y=0.0, z=0.0) -> None:
        bone = self.rig.pose.bones["root"]
        bone.rotation_euler = (math.radians(pitch), math.radians(roll), 0)
        bone.location = (x, y, z)

    def key(self, frame: int) -> None:
        for bone in self.rig.pose.bones:
            bone.keyframe_insert("rotation_euler", frame=frame)
            bone.keyframe_insert("location", frame=frame)


def clip(rig, poser: Poser, name: str, frames: list, loop: bool = True) -> None:
    """`frames`: list of (frame, pose function). The last pose repeats the first
    for loops."""
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = action
    for frame, pose in frames:
        poser.clear()
        pose(poser)
        poser.key(frame)
    if loop:
        poser.clear()
        frames[0][1](poser)
        poser.key(frames[-1][0] + (frames[1][0] - frames[0][0] if len(frames) > 1 else 12))
    for fcurve in getattr(action, "fcurves", []):
        for point in fcurve.keyframe_points:
            point.interpolation = "LINEAR"
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, int(frames[0][0]), action)
    rig.animation_data.action = None


# ----------------------------------------------------------------- poses
def slung(p: Poser) -> None:
    """Rifle on the right shoulder, sloped back."""
    p.swing("rifle", -28)
    p.swing("upper_arm.R", 8)
    p.swing("forearm.R", 70)


def ready(p: Poser) -> None:
    """Low ready: butt at the shoulder, muzzle forward and down, both hands
    on the rifle, so the soldier can bring it up and fire at once."""
    p.swing("chest", 6)
    p.swing("rifle", 102)
    p.swing("upper_arm.R", 42)
    p.swing("forearm.R", 38)
    p.swing("upper_arm.L", 58)
    p.swing("forearm.L", 34)
    p.spread("upper_arm.L", -14)
    p.swing("head", -4)


def stand(p: Poser) -> None:
    slung(p)


def stand_breathe(p: Poser) -> None:
    slung(p)
    p.swing("chest", 2)
    p.swing("head", -2)


def walk_a(p: Poser, arms=None) -> None:
    (arms or slung)(p)
    p.swing("thigh.L", 24)
    p.swing("shin.L", -8)
    p.swing("thigh.R", -20)
    p.swing("shin.R", -22)
    if arms is None:
        p.swing("upper_arm.L", -20)
    p.root(z=0.0)


def walk_pass(p: Poser, arms=None) -> None:
    (arms or slung)(p)
    p.swing("thigh.L", 2)
    p.swing("thigh.R", -2)
    p.swing("shin.R", -30)
    p.root(z=0.03)


def walk_b(p: Poser, arms=None) -> None:
    (arms or slung)(p)
    p.swing("thigh.R", 24)
    p.swing("shin.R", -8)
    p.swing("thigh.L", -20)
    p.swing("shin.L", -22)
    if arms is None:
        p.swing("upper_arm.L", 20)
    p.root(z=0.0)


def walk_pass_b(p: Poser, arms=None) -> None:
    (arms or slung)(p)
    p.swing("thigh.R", 2)
    p.swing("thigh.L", -2)
    p.swing("shin.L", -30)
    p.root(z=0.03)


def crouch(p: Poser, aim: bool = False) -> None:
    p.root(z=-0.34)
    p.swing("thigh.L", 75)
    p.swing("shin.L", -95)
    p.swing("thigh.R", 20)
    p.swing("shin.R", -110)
    p.swing("chest", 14)
    if aim:
        aim_arms(p)
    else:
        ready(p)


def aim_arms(p: Poser, recoil: float = 0.0) -> None:
    """Rifle forward at the shoulder, both hands on it."""
    p.swing("rifle", 90 - recoil * 6)
    p.swing("upper_arm.R", 70)
    p.swing("forearm.R", 20)
    p.side("upper_arm.R", -12)
    p.swing("upper_arm.L", 80)
    p.swing("forearm.L", 15)
    p.side("upper_arm.L", 25)
    p.swing("chest", -recoil * 3)
    p.swing("head", 6)


def prone(p: Poser, aim: bool = True) -> None:
    p.root(pitch=-90, y=-0.95, z=0.13)
    p.swing("head", -60)
    p.swing("thigh.L", -6)
    p.swing("shin.L", -10)
    p.swing("thigh.R", -6)
    p.swing("shin.R", -10)
    if aim:
        p.swing("rifle", 0)
        p.swing("upper_arm.R", 160)
        p.swing("upper_arm.L", 165)
        p.side("upper_arm.L", 15)
        p.swing("forearm.R", 10)
        p.swing("forearm.L", 10)


def crawl(p: Poser, side: float) -> None:
    """Low crawl: belly on the ground, one knee drawn up sideways along the
    ground while the opposite elbow reaches forward; the rifle lies along the
    right forearm, muzzle forward. `side` 1 draws the left knee, -1 the right."""
    p.root(pitch=-90, y=-0.95, z=0.12, roll=side * 4, x=side * 0.03)
    p.swing("head", -55)
    drawn, straight = ("L", "R") if side > 0 else ("R", "L")
    p.spread(f"thigh.{drawn}", 42)
    p.spread(f"shin.{drawn}", -85)
    p.swing(f"thigh.{drawn}", -4)
    p.spread(f"thigh.{straight}", 6)
    p.swing(f"thigh.{straight}", -8)
    p.swing(f"shin.{straight}", -6)
    p.swing("rifle", 4)
    # The arm on the straight-leg side reaches; the other pulls back.
    p.swing(f"upper_arm.{straight}", 150)
    p.swing(f"forearm.{straight}", 25)
    p.swing(f"upper_arm.{drawn}", 115)
    p.swing(f"forearm.{drawn}", 75)
    p.spread(f"upper_arm.{drawn}", 18)


def wounded(p: Poser) -> None:
    p.root(roll=90, x=-0.85, z=0.12)
    p.swing("thigh.L", 50)
    p.swing("shin.L", -70)
    p.swing("thigh.R", 30)
    p.swing("shin.R", -50)
    p.swing("upper_arm.L", 60)
    p.swing("forearm.L", 60)
    p.swing("rifle", -90)


def corpse(p: Poser) -> None:
    p.root(pitch=90, y=0.9, z=0.1)
    p.side("upper_arm.L", 55)
    p.side("upper_arm.R", -50)
    p.swing("thigh.L", 8)
    p.swing("thigh.R", -6)
    p.side("thigh.L", 10)
    p.swing("head", 20)
    p.swing("rifle", -110)


def build():
    reset()
    bpy.context.scene.render.fps = FPS
    rig = armature()
    for obj in (body_mesh(), kepi(), slouch()):
        skin(obj, rig)
    poser = Poser(rig)

    clip(rig, poser, "idle", [(1, stand), (24, stand_breathe), (48, stand)], loop=False)
    clip(rig, poser, "walk", [(1, walk_a), (7, walk_pass), (13, walk_b), (19, walk_pass_b)])
    clip(rig, poser, "idle-ready", [(1, ready), (24, lambda p: (ready(p), p.swing("head", 2))), (48, ready)], loop=False)
    clip(rig, poser, "walk-ready", [
        (1, lambda p: walk_a(p, ready)),
        (7, lambda p: walk_pass(p, ready)),
        (13, lambda p: walk_b(p, ready)),
        (19, lambda p: walk_pass_b(p, ready)),
    ])
    clip(rig, poser, "crouch-idle", [(1, lambda p: crouch(p)), (24, lambda p: crouch(p))], loop=False)
    clip(rig, poser, "crouch-walk", [
        (1, lambda p: (crouch(p), p.swing("thigh.L", 60), p.swing("thigh.R", 40))),
        (10, lambda p: (crouch(p), p.swing("thigh.L", 40), p.swing("thigh.R", 60))),
    ])
    clip(rig, poser, "prone", [(1, lambda p: prone(p)), (24, lambda p: prone(p))], loop=False)
    clip(rig, poser, "crawl", [(1, lambda p: crawl(p, 1)), (16, lambda p: crawl(p, -1))])
    clip(rig, poser, "aim-stand", [(1, lambda p: aim_arms(p)), (24, lambda p: aim_arms(p))], loop=False)
    clip(rig, poser, "fire-stand", [(1, lambda p: aim_arms(p)), (3, lambda p: aim_arms(p, 1)), (10, lambda p: aim_arms(p))], loop=False)
    clip(rig, poser, "aim-crouch", [(1, lambda p: crouch(p, aim=True)), (24, lambda p: crouch(p, aim=True))], loop=False)
    clip(rig, poser, "fire-crouch", [
        (1, lambda p: crouch(p, aim=True)),
        (3, lambda p: (crouch(p, aim=True), aim_arms(p, 1))),
        (10, lambda p: crouch(p, aim=True)),
    ], loop=False)
    clip(rig, poser, "aim-prone", [(1, lambda p: prone(p)), (24, lambda p: prone(p))], loop=False)
    clip(rig, poser, "fire-prone", [
        (1, lambda p: prone(p)),
        (3, lambda p: (prone(p), p.swing("upper_arm.R", 150))),
        (10, lambda p: prone(p)),
    ], loop=False)
    clip(rig, poser, "wounded", [(1, wounded), (24, wounded)], loop=False)
    clip(rig, poser, "corpse", [(1, corpse), (24, corpse)], loop=False)

    poser.clear()
    return [save_and_export("soldier", "characters")]
