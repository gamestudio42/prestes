"""The 1920s infantryman: one low-poly model, one rig, every clip.

Blender space: Z up, the soldier faces +Y (which the glTF export turns into
Three.js -Z, the game's forward), feet at the origin, 1.75 m tall.

Parts are boxes mapped to the soldier atlas swatches; each part follows one
bone (rigid skinning), which suits low-poly and keeps the deformation clean.
Two hats are separate meshes on the same rig: a kepi (legalists, officer) and
a slouch hat (the column); the game shows one. Clips are Blender actions.
"""
import json
import math
import os

import bpy
from mathutils import Matrix, Vector

from common import MeshBuilder, reset, save_and_export

FPS = 24
# Rifle yaw across the body and the left arm's reach toward it (degrees).
AIM_YAW = -10
READY_YAW = -14
LEFT_REACH = -40
# Walk leg swings: the passing pose is scaled by STRIDE; the contact pose
# reaches STEP_FRONT and STEP_BACK degrees (1.4: about 0.75 m a step, two
# steps a second at the walk).
STRIDE = 1.25
STEP_FRONT = 30
STEP_BACK = 27
# Slung rifle offset from its shoulder pivot (see `slung`).
SLING_OUT = -0.06
SLING_BACK = 0.12
# Prone: how far the chest rises on the elbows, and the upper arms' angle.
PRONE_RISE = 18
PRONE_ELBOW = 128

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

    def shift(self, name: str, out: float = 0.0, up: float = 0.0, back: float = 0.0) -> None:
        """Moves an upright bone (the rifle) in its rest frame: `out` along
        world X, `up` along its length, `back` behind the body."""
        self.rig.pose.bones[name].location = (out, up, back)

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


def clip(rig, poser: Poser, name: str, frames: list, loop: bool = True, period: int | None = None) -> None:
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
        poser.key(frames[0][0] + period if period else frames[-1][0] + (frames[1][0] - frames[0][0] if len(frames) > 1 else 12))
    for fcurve in getattr(action, "fcurves", []):
        for point in fcurve.keyframe_points:
            point.interpolation = "LINEAR"
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, int(frames[0][0]), action)
    rig.animation_data.action = None


# ----------------------------------------------------------------- poses
def slung(p: Poser) -> None:
    """Rifle slung on the right shoulder, muzzle up, the right hand on the
    sling: the rifle hangs behind the shoulder, butt at the back of the hip,
    clear of the arm (it sat inside the upper arm before and looked glued)."""
    p.shift("rifle", out=SLING_OUT, up=-0.32, back=SLING_BACK)
    p.swing("rifle", -10)
    p.swing("upper_arm.R", -4)
    p.swing("forearm.R", 95)


def ready(p: Poser) -> None:
    """Low ready: butt at the shoulder, muzzle forward and down across the
    body, both hands on the rifle, so the soldier can raise it and fire."""
    p.swing("chest", 6)
    # Muzzle only a little below level (the chest leans 6 degrees).
    p.swing("rifle", 92)
    p.side("rifle", READY_YAW)
    p.swing("upper_arm.R", 35)
    p.swing("forearm.R", 45)
    p.swing("upper_arm.L", 60)
    p.swing("forearm.L", 30)
    p.side("upper_arm.L", LEFT_REACH)
    p.swing("head", -4)


def stand(p: Poser) -> None:
    slung(p)


def stand_breathe(p: Poser) -> None:
    slung(p)
    p.swing("chest", 2)
    p.swing("head", -2)


def walk_a(p: Poser, arms=None) -> None:
    (arms or slung)(p)
    p.swing("thigh.L", STEP_FRONT)
    p.swing("shin.L", -4)
    p.swing("thigh.R", -STEP_BACK)
    p.swing("shin.R", -8)
    if arms is None:
        p.swing("upper_arm.L", -20)
    p.root(z=0.0)


def walk_pass(p: Poser, arms=None) -> None:
    (arms or slung)(p)
    p.swing("thigh.L", 2 * STRIDE)
    p.swing("thigh.R", -2 * STRIDE)
    p.swing("shin.R", -30 * STRIDE)
    p.root(z=0.03)


def walk_b(p: Poser, arms=None) -> None:
    (arms or slung)(p)
    p.swing("thigh.R", STEP_FRONT)
    p.swing("shin.R", -4)
    p.swing("thigh.L", -STEP_BACK)
    p.swing("shin.L", -8)
    if arms is None:
        p.swing("upper_arm.L", 20)
    p.root(z=0.0)


def walk_pass_b(p: Poser, arms=None) -> None:
    (arms or slung)(p)
    p.swing("thigh.R", 2 * STRIDE)
    p.swing("thigh.L", -2 * STRIDE)
    p.swing("shin.L", -30 * STRIDE)
    p.root(z=0.03)


def port(p: Poser) -> None:
    """Running with the rifle held at the ready in both hands (the ready grip,
    so the hands stay on it), the body leaning into the run."""
    ready(p)
    p.swing("chest", 12)
    p.swing("head", -12)


def run_reach(p: Poser, lead: str, trail: str) -> None:
    """Contact: the lead leg reaching forward, the trailing one pushing off."""
    port(p)
    p.swing(f"thigh.{lead}", 46)
    p.swing(f"shin.{lead}", -14)
    p.swing(f"thigh.{trail}", -34)
    p.swing(f"shin.{trail}", -38)
    p.root(z=-0.02)


def run_float(p: Poser, lead: str, trail: str) -> None:
    """Flight: both feet off the ground, the trailing leg folding through."""
    port(p)
    p.swing(f"thigh.{lead}", 12)
    p.swing(f"shin.{lead}", -30)
    p.swing(f"thigh.{trail}", 20)
    p.swing(f"shin.{trail}", -95)
    p.root(z=0.07)


def crouch(p: Poser, aim: bool = False) -> None:
    p.root(z=-0.34)
    p.swing("thigh.L", 75)
    p.swing("shin.L", -95)
    p.swing("thigh.R", 20)
    p.swing("shin.R", -110)
    p.swing("chest", 14)
    if aim:
        aim_arms(p, lean=14)
    else:
        ready(p)


def aim_arms(p: Poser, recoil: float = 0.0, lean: float = 0.0) -> None:
    """Rifle forward at the right shoulder, angled a little across the body;
    the right hand at the grip, the left under the forend."""
    # Level whatever the chest lean (`lean` degrees forward).
    p.swing("rifle", 90 - recoil * 6 - lean)
    p.side("rifle", AIM_YAW)
    p.swing("upper_arm.R", 75)
    p.swing("forearm.R", 35)
    p.swing("upper_arm.L", 85)
    p.swing("forearm.L", 10)
    p.side("upper_arm.L", LEFT_REACH)
    p.swing("chest", -recoil * 3)
    p.swing("head", 6)


def prone(p: Poser, aim: bool = True) -> None:
    """Prone firing position: chest raised on the elbows, head up behind the
    sights, elbows on the ground ahead of the shoulders, legs apart."""
    p.root(pitch=-90, y=-0.95, z=0.13)
    p.swing("chest", -PRONE_RISE)
    p.swing("head", -42)
    for side in ("L", "R"):
        p.spread(f"thigh.{side}", 12)
        p.swing(f"thigh.{side}", -4)
        p.swing(f"shin.{side}", -8)
    # Level with the ground: the chest is raised by PRONE_RISE.
    p.swing("rifle", PRONE_RISE)
    p.side("rifle", AIM_YAW)
    p.swing("upper_arm.R", PRONE_ELBOW)
    p.swing("forearm.R", 55)
    p.swing("upper_arm.L", PRONE_ELBOW + 8)
    p.swing("forearm.L", 40)
    p.side("upper_arm.L", LEFT_REACH)


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


def hit(p: Poser, amount: float) -> None:
    """Struck: the body jerks back and folds, the arms fly loose, the rifle
    drops out of line. `amount` 0..1 through the stagger."""
    slung(p)
    p.swing("rifle", -10 + amount * 50)
    p.swing("chest", -14 * amount)
    p.swing("head", -18 * amount)
    p.swing("upper_arm.L", 35 * amount)
    p.spread("upper_arm.L", 20 * amount)
    p.swing("upper_arm.R", 25 * amount)
    p.swing("forearm.R", 95 - 60 * amount)
    p.swing("thigh.L", -14 * amount)
    p.swing("shin.L", -20 * amount)
    p.swing("thigh.R", 8 * amount)
    p.root(pitch=-6 * amount, y=-0.18 * amount, z=-0.06 * amount)


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


# ------------------------------------------------------------ wound clips
# soldier-animation-and-textures 1.1. The hurt side is the right leg and the
# left hand presses the wound on the right flank; the view mirrors nothing.
def hold_wound(p: Poser) -> None:
    """The left hand presses the right flank, the body bent over the wound,
    the rifle still slung."""
    slung(p)
    p.swing("chest", 16)
    p.side("chest", -6)
    p.swing("head", -6)
    p.swing("upper_arm.L", 25)
    p.swing("forearm.L", 95)
    p.side("upper_arm.L", -35)


def limp_plant(p: Poser) -> None:
    """The good (left) leg steps out long; the hurt leg trails stiff."""
    hold_wound(p)
    p.swing("thigh.L", 32)
    p.swing("shin.L", -4)
    p.swing("thigh.R", -20)
    p.swing("shin.R", -4)
    p.root(z=0.0)


def limp_load(p: Poser) -> None:
    """Weight on the hurt leg: a short, stiff step, the body sags and leans
    off it."""
    hold_wound(p)
    p.swing("thigh.R", 20)
    p.swing("shin.R", -2)
    p.swing("thigh.L", -18)
    p.swing("shin.L", -10)
    p.swing("chest", 22)
    p.root(roll=-4, z=-0.05)


def lying_wounded(p: Poser, writhe: float) -> None:
    """On his side as `wounded`, hands at the wound; `writhe` 0..1 draws the
    knees up and rolls him a little, so a man down is never still."""
    wounded(p)
    p.root(roll=90 - 8 * writhe, x=-0.85, z=0.12)
    p.swing("thigh.L", 50 + 25 * writhe)
    p.swing("shin.L", -70 - 20 * writhe)
    p.swing("thigh.R", 30 + 15 * writhe)
    p.swing("upper_arm.R", 40 + 20 * writhe)
    p.swing("forearm.R", 80)
    p.swing("upper_arm.L", 60 - 15 * writhe)
    p.swing("forearm.L", 60 + 20 * writhe)
    p.swing("head", 10 + 15 * writhe)


def carry_arms(p: Poser) -> None:
    """Fireman's carry: the man over the right shoulder, the right arm
    round his legs, the left steadying him; the rifle slung."""
    slung(p)
    p.swing("chest", 18)
    p.swing("head", -10)
    p.swing("upper_arm.R", 70)
    p.swing("forearm.R", 80)
    p.swing("upper_arm.L", 55)
    p.swing("forearm.L", 70)
    p.side("upper_arm.L", LEFT_REACH)


def carried(p: Poser, bob: float) -> None:
    """Over the carrier's right shoulder, face down, the hips on the
    shoulder: legs hang in front, the body and arms behind. Placed at the
    carrier's origin by the view; `bob` follows the carrier's steps."""
    p.root(pitch=-90, x=-0.2, y=-0.95, z=1.5 + 0.03 * bob)
    p.swing("chest", 75)
    p.swing("head", 20)
    p.swing("thigh.L", 70)
    p.swing("thigh.R", 64)
    p.swing("shin.L", -30)
    p.swing("shin.R", -24)
    p.swing("upper_arm.L", 30 + 8 * bob)
    p.swing("upper_arm.R", 24 - 8 * bob)
    p.swing("rifle", -90)


def kneel_treat(p: Poser, reach: float) -> None:
    """Kneeling on the right knee beside a man on the ground, both hands down
    at his wound; `reach` 0..1 works the hands."""
    p.root(z=-0.42)
    p.swing("thigh.L", 85)
    p.swing("shin.L", -85)
    p.swing("thigh.R", -5)
    p.swing("shin.R", -100)
    p.swing("chest", 40 + 8 * reach)
    p.swing("head", 15)
    p.swing("upper_arm.L", 70 + 10 * reach)
    p.swing("forearm.L", 30)
    p.swing("upper_arm.R", 65 + 10 * (1 - reach))
    p.swing("forearm.R", 35)
    p.shift("rifle", out=SLING_OUT, up=-0.32, back=SLING_BACK)
    p.swing("rifle", -10)


def treated(p: Poser, breath: float) -> None:
    """On his back, still, being treated; only the chest and head move."""
    corpse(p)
    p.side("upper_arm.L", 30)
    p.side("upper_arm.R", -25)
    p.swing("chest", 2 * breath)
    p.swing("head", 10 + 6 * breath)


# ------------------------------------------------------------ death clips
# soldier-animation-and-textures 1.2: deaths by stance and direction, each
# ending held in one of four corpse poses (`corpse` on his back is kept for
# the view of today).


def corpse_face(p: Poser) -> None:
    """Face down, head turned, arms under and beside him."""
    p.root(pitch=-90, y=-0.9, z=0.1)
    p.swing("head", -20)
    p.side("head", 30)
    p.side("upper_arm.L", 40)
    p.swing("upper_arm.R", 20)
    p.swing("forearm.R", 60)
    p.spread("thigh.L", 10)
    p.swing("thigh.R", 6)
    p.swing("shin.R", -25)
    p.swing("rifle", 110)


def corpse_side(p: Poser) -> None:
    """On his side, curled, the top arm fallen across the body."""
    p.root(roll=90, x=-0.85, z=0.12)
    p.swing("chest", 18)
    p.swing("head", 12)
    p.swing("thigh.L", 40)
    p.swing("shin.L", -60)
    p.swing("thigh.R", 20)
    p.swing("shin.R", -35)
    p.swing("upper_arm.L", 70)
    p.swing("forearm.L", 30)
    p.swing("upper_arm.R", 35)
    p.swing("rifle", -90)


def corpse_sprawl(p: Poser) -> None:
    """Where he lay prone: flat, face in the dirt, arms out ahead, the rifle
    fallen from his hands. Never higher than the prone pose."""
    p.root(pitch=-90, y=-0.95, z=0.1)
    p.swing("head", -10)
    p.side("head", -25)
    for side in ("L", "R"):
        p.spread(f"thigh.{side}", 14)
        p.swing(f"thigh.{side}", -4)
        p.swing(f"shin.{side}", -6)
    p.swing("upper_arm.R", 150)
    p.swing("forearm.R", 10)
    p.swing("upper_arm.L", 120)
    p.spread("upper_arm.L", 25)
    p.swing("rifle", 10)
    p.side("rifle", 30)


def fall_back(p: Poser, t: float) -> None:
    """Thrown back by a shot from the front: knees give, the body tips back."""
    hit(p, 1)
    p.swing("thigh.L", 25 * t)
    p.swing("shin.L", -60 * t)
    p.swing("thigh.R", 15 * t)
    p.swing("shin.R", -45 * t)
    p.swing("chest", -20)
    p.root(pitch=35 * t, y=0.25 * t, z=-0.25 * t)


def fall_forward(p: Poser, t: float) -> None:
    """Shot from behind: pitched forward, the arms going out to break the fall."""
    slung(p)
    p.swing("chest", 25 * t)
    p.swing("head", 15 * t)
    p.swing("upper_arm.L", 70 * t)
    p.swing("upper_arm.R", 60 * t)
    p.swing("forearm.R", 30)
    p.swing("thigh.L", 30 * t)
    p.swing("shin.L", -50 * t)
    p.swing("rifle", 40 * t)
    p.root(pitch=-40 * t, y=-0.3 * t, z=-0.15 * t)


def fall_spin(p: Poser, t: float) -> None:
    """Shot from the side: twisted round, the legs folding under him."""
    hit(p, 1)
    p.side("chest", 25 * t)
    p.swing("thigh.L", 40 * t)
    p.swing("shin.L", -80 * t)
    p.swing("thigh.R", 30 * t)
    p.swing("shin.R", -70 * t)
    p.root(roll=40 * t, x=-0.3 * t, z=-0.35 * t)


def crouch_slump(p: Poser, t: float) -> None:
    """Killed crouching: the rifle drops and he folds forward over his knees."""
    crouch(p)
    p.swing("chest", 14 + 30 * t)
    p.swing("head", 20 * t)
    p.swing("rifle", 92 + 30 * t)
    p.swing("upper_arm.R", 35 - 20 * t)
    p.root(pitch=-25 * t, y=-0.15 * t, z=-0.34 - 0.1 * t)


def prone_go_limp(p: Poser, t: float) -> None:
    """Killed prone: the head drops and the arms slide forward; he stays down."""
    prone(p)
    p.root(pitch=-90, y=-0.95, z=0.13 - 0.03 * t)
    p.swing("chest", -PRONE_RISE * (1 - t))
    p.swing("head", -42 + 32 * t)
    p.swing("rifle", PRONE_RISE * (1 - t))


# ------------------------------------------------- crouch, aim and reload
# soldier-animation-and-textures 1.3.
CROUCH_Z = -0.36
# The crouch-walk's head stays under this share of the standing head height.
CROUCH_HEAD_SHARE = 0.85


def crouch_step(p: Poser, lead: str, trail: str) -> None:
    """Crouch-walk contact: low, the chest over the knees, the rifle forward
    at the ready; the lead knee reaches, the trailing one is nearly down."""
    ready(p)
    p.swing("chest", 24)
    p.swing("head", -16)
    p.swing("rifle", 92 - 18)
    p.root(z=CROUCH_Z)
    p.swing(f"thigh.{lead}", 80)
    p.swing(f"shin.{lead}", -85)
    p.swing(f"thigh.{trail}", 10)
    p.swing(f"shin.{trail}", -105)


def crouch_pass(p: Poser, lead: str, trail: str) -> None:
    """Crouch-walk passing: the trailing leg swings through under the body."""
    ready(p)
    p.swing("chest", 24)
    p.swing("head", -16)
    p.swing("rifle", 92 - 18)
    p.root(z=CROUCH_Z + 0.02)
    p.swing(f"thigh.{lead}", 45)
    p.swing(f"shin.{lead}", -95)
    p.swing(f"thigh.{trail}", 55)
    p.swing(f"shin.{trail}", -120)


def lowered_prone(p: Poser) -> None:
    """Prone with the rifle down off the cheek, the head up looking."""
    prone(p)
    p.swing("rifle", PRONE_RISE - 25)
    p.swing("upper_arm.R", PRONE_ELBOW - 15)
    p.swing("head", -30)


def stance_pose(stance: str, aim: bool):
    """The held pose of a stance, at the ready or in the aim."""
    if stance == "stand":
        return aim_arms if aim else ready
    if stance == "crouch":
        return lambda p: crouch(p, aim=aim)
    return (lambda p: prone(p)) if aim else lowered_prone


def recoil_pose(stance: str):
    """The shot: the rifle kicks up and the shoulder is pushed back."""
    if stance == "stand":
        return lambda p: (aim_arms(p, 1.6), p.root(y=-0.03))
    if stance == "crouch":
        return lambda p: (crouch(p, aim=True), aim_arms(p, 1.6, lean=14), p.root(y=-0.03, z=-0.34))
    return lambda p: (prone(p), p.swing("rifle", PRONE_RISE - 8), p.swing("chest", -PRONE_RISE + 4), p.swing("head", -36))


def reload_pose(stance: str, phase: int):
    """Loading the Mauser from a stripper clip: 0 rifle down and the bolt
    back, 1 the left hand at the belt pouch, 2 the clip pressed in from
    above, 3 the bolt closed."""
    def pose(p: Poser) -> None:
        stance_pose(stance, False)(p)
        if stance == "prone":
            p.swing("rifle", PRONE_RISE - 30)
            p.side("rifle", AIM_YAW - 15)
            p.swing("head", -20)
        else:
            p.swing("rifle", 60 if stance == "stand" else 55)
            p.side("rifle", READY_YAW - 10)
            p.swing("head", 12)
        bolt = 50 if phase in (0, 1, 2) else 35
        p.swing("forearm.R", bolt + (15 if phase == 0 else 0))
        if phase == 1:
            # The left hand drops to the pouch on the belt.
            if stance == "prone":
                p.swing("upper_arm.L", PRONE_ELBOW - 50)
                p.swing("forearm.L", 70)
            else:
                p.swing("upper_arm.L", 10)
                p.swing("forearm.L", 70)
                p.side("upper_arm.L", -10)
        elif phase == 2:
            p.swing("upper_arm.L", (PRONE_ELBOW + 15) if stance == "prone" else 70)
            p.swing("forearm.L", 80)
    return pose


def turn_step(stance: str, phase: int):
    """Turning in the aim: the body comes round on small steps (the view
    turns the root); `phase` 0 and 2 feet together, 1 and 3 one foot out."""
    def pose(p: Poser) -> None:
        stance_pose(stance, True)(p)
        lift = 1 if phase in (1, 3) else 0
        leg = "L" if phase == 1 else "R"
        if stance == "stand":
            p.swing(f"thigh.{leg}", 18 * lift)
            p.swing(f"shin.{leg}", -30 * lift)
            p.spread(f"thigh.{leg}", 10 * lift)
            p.root(z=0.02 * lift)
        else:
            p.spread(f"thigh.{leg}", 14 * lift)
            p.root(z=-0.34 + 0.03 * lift)
    return pose


def check_crouch_walk(rig) -> None:
    """1.3: the crouch-walk's head stays under CROUCH_HEAD_SHARE of the
    standing head height on every frame; the build fails otherwise."""
    track = next(t for t in rig.animation_data.nla_tracks if t.name == "crouch-walk")
    action = track.strips[0].action
    standing = (rig.matrix_world @ rig.data.bones["head"].tail_local).z
    for t in rig.animation_data.nla_tracks:
        t.mute = True
    rig.animation_data.action = action
    highest = 0.0
    for frame in range(int(action.frame_range[0]), int(action.frame_range[1]) + 1):
        bpy.context.scene.frame_set(frame)
        highest = max(highest, (rig.matrix_world @ rig.pose.bones["head"].tail).z)
    rig.animation_data.action = None
    for t in rig.animation_data.nla_tracks:
        t.mute = False
    print(f"crouch-walk head: highest {highest:.2f} m, standing {standing:.2f} m")
    if highest > standing * CROUCH_HEAD_SHARE:
        raise RuntimeError(f"crouch-walk head reaches {highest:.2f} m, over {CROUCH_HEAD_SHARE} of {standing:.2f} m")


# ------------------------------------------------------------ gait timing
# soldier-animation-and-textures 1.4: each moving clip's cycle is keyed so
# its stride covers the ground speed it is authored at, from
# `CLIP_GAIT_SPEED` in packages/shared/src/gait.ts (a test holds the two
# together through `soldier-gaits.json`).
GAIT_SPEED = {
    "walk": 1.5,
    "walk-ready": 1.5,
    "run": 3.5,
    "crouch-walk": 1.5 * 0.7,
    "limp": 1.5 * 0.75,
    "carry": 1.0,
}


def foot_gap(rig, poser: Poser, pose) -> float:
    """Distance along the line of march between the feet in a contact pose."""
    tracks = rig.animation_data.nla_tracks if rig.animation_data else []
    for track in tracks:
        track.mute = True
    poser.clear()
    pose(poser)
    bpy.context.view_layer.update()
    left = rig.matrix_world @ rig.pose.bones["shin.L"].tail
    right = rig.matrix_world @ rig.pose.bones["shin.R"].tail
    poser.clear()
    for track in tracks:
        track.mute = False
    return abs(left.y - right.y)


def gait_clip(rig, poser: Poser, name: str, keys: list, contacts: list, gaits: dict) -> None:
    """`keys`: (fraction of the cycle, pose); `contacts`: the contact poses,
    one per step. The cycle lasts as long as the summed steps take at the
    clip's speed, rounded to whole frames."""
    stride = sum(foot_gap(rig, poser, pose) for pose in contacts)
    period = max(8, round(stride / GAIT_SPEED[name] * FPS))
    clip(rig, poser, name, [(1 + round(at * period), pose) for at, pose in keys], period=period)
    gaits[name] = {"strideMetres": round(stride, 4), "cycleFrames": period, "fps": FPS, "speed": GAIT_SPEED[name]}


def write_gaits(gaits: dict) -> None:
    """The measured stride and cycle of each moving clip, for the view's test."""
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "characters", "soldier-gaits.json")
    with open(path, "w", encoding="utf-8", newline="\n") as out:
        json.dump(gaits, out, indent=2, sort_keys=True)
        out.write("\n")
    print(f"gaits: {gaits}")


def build():
    reset()
    bpy.context.scene.render.fps = FPS
    rig = armature()
    for obj in (body_mesh(), kepi(), slouch()):
        skin(obj, rig)
    poser = Poser(rig)

    clip(rig, poser, "idle", [(1, stand), (24, stand_breathe), (48, stand)], loop=False)
    gaits: dict = {}
    quarter = lambda a, b, c, d: [(0, a), (0.25, b), (0.5, c), (0.75, d)]
    gait_clip(rig, poser, "walk", quarter(walk_a, walk_pass, walk_b, walk_pass_b), [walk_a, walk_b], gaits)
    clip(rig, poser, "idle-ready", [(1, ready), (24, lambda p: (ready(p), p.swing("head", 2))), (48, ready)], loop=False)
    gait_clip(rig, poser, "walk-ready", quarter(
        lambda p: walk_a(p, ready), lambda p: walk_pass(p, ready), lambda p: walk_b(p, ready), lambda p: walk_pass_b(p, ready),
    ), [lambda p: walk_a(p, ready), lambda p: walk_b(p, ready)], gaits)
    # Run: 16 frames a cycle (three steps a second), about 3.5 m/s.
    gait_clip(rig, poser, "run", quarter(
        lambda p: run_reach(p, "L", "R"), lambda p: run_float(p, "L", "R"), lambda p: run_reach(p, "R", "L"), lambda p: run_float(p, "R", "L"),
    ), [lambda p: run_reach(p, "L", "R"), lambda p: run_reach(p, "R", "L")], gaits)
    clip(rig, poser, "crouch-idle", [(1, lambda p: crouch(p)), (24, lambda p: crouch(p))], loop=False)
    # Crouch-walk (1.3): low, rifle forward, a full four-key cycle.
    gait_clip(rig, poser, "crouch-walk", quarter(
        lambda p: crouch_step(p, "L", "R"), lambda p: crouch_pass(p, "L", "R"), lambda p: crouch_step(p, "R", "L"), lambda p: crouch_pass(p, "R", "L"),
    ), [lambda p: crouch_step(p, "L", "R"), lambda p: crouch_step(p, "R", "L")], gaits)
    clip(rig, poser, "prone", [(1, lambda p: prone(p)), (24, lambda p: prone(p))], loop=False)
    clip(rig, poser, "crawl", [(1, lambda p: crawl(p, 1)), (16, lambda p: crawl(p, -1))])
    clip(rig, poser, "aim-stand", [(1, lambda p: aim_arms(p)), (24, lambda p: aim_arms(p))], loop=False)
    clip(rig, poser, "fire-stand", [(1, lambda p: aim_arms(p)), (3, recoil_pose("stand")), (10, lambda p: aim_arms(p))], loop=False)
    clip(rig, poser, "aim-crouch", [(1, lambda p: crouch(p, aim=True)), (24, lambda p: crouch(p, aim=True))], loop=False)
    clip(rig, poser, "fire-crouch", [
        (1, lambda p: crouch(p, aim=True)),
        (3, recoil_pose("crouch")),
        (10, lambda p: crouch(p, aim=True)),
    ], loop=False)
    clip(rig, poser, "aim-prone", [(1, lambda p: prone(p)), (24, lambda p: prone(p))], loop=False)
    clip(rig, poser, "fire-prone", [
        (1, lambda p: prone(p)),
        (3, recoil_pose("prone")),
        (10, lambda p: prone(p)),
    ], loop=False)
    clip(rig, poser, "hit", [(1, lambda p: hit(p, 0)), (4, lambda p: hit(p, 1)), (8, lambda p: hit(p, 0.85))], loop=False)
    clip(rig, poser, "wounded", [(1, wounded), (24, wounded)], loop=False)
    clip(rig, poser, "corpse", [(1, corpse), (24, corpse)], loop=False)
    # Wound clips (1.1). The limp's cycle is longer than the walk's: the
    # simulation moves a lightly or moderately wounded man slower.
    gait_clip(rig, poser, "limp", [
        (0, limp_plant),
        (0.3, lambda p: (hold_wound(p), p.swing("thigh.R", 0), p.root(z=0.02))),
        (0.55, limp_load),
        (0.8, lambda p: (hold_wound(p), p.swing("shin.L", -30), p.root(z=-0.02))),
    ], [limp_plant, limp_load], gaits)
    clip(rig, poser, "hold-wound", [(1, hold_wound), (24, lambda p: (hold_wound(p), p.swing("chest", 20))), (48, hold_wound)], loop=False)
    clip(rig, poser, "lying-wounded", [
        (1, lambda p: lying_wounded(p, 0)),
        (18, lambda p: lying_wounded(p, 1)),
        (30, lambda p: lying_wounded(p, 0.4)),
    ])
    gait_clip(rig, poser, "carry", quarter(
        lambda p: walk_a(p, carry_arms), lambda p: walk_pass(p, carry_arms), lambda p: walk_b(p, carry_arms), lambda p: walk_pass_b(p, carry_arms),
    ), [lambda p: walk_a(p, carry_arms), lambda p: walk_b(p, carry_arms)], gaits)
    carry_period = gaits["carry"]["cycleFrames"]
    clip(rig, poser, "carried", [(1 + round(at * carry_period), lambda p, b=b: carried(p, b)) for at, b in ((0, 0), (0.25, 1), (0.5, 0), (0.75, 1))], period=carry_period)
    clip(rig, poser, "kneel-treat", [(1, lambda p: kneel_treat(p, 0)), (16, lambda p: kneel_treat(p, 1))])
    clip(rig, poser, "treated", [(1, lambda p: treated(p, 0)), (36, lambda p: treated(p, 1))])
    # Death clips (1.2), held on their last frame, and the corpse poses they end in.
    clip(rig, poser, "corpse-face", [(1, corpse_face), (24, corpse_face)], loop=False)
    clip(rig, poser, "corpse-side", [(1, corpse_side), (24, corpse_side)], loop=False)
    clip(rig, poser, "corpse-sprawl", [(1, corpse_sprawl), (24, corpse_sprawl)], loop=False)
    clip(rig, poser, "death-stand-front", [
        (1, lambda p: hit(p, 0)), (4, lambda p: hit(p, 1)), (10, lambda p: fall_back(p, 1)), (18, corpse),
    ], loop=False)
    clip(rig, poser, "death-stand-back", [
        (1, slung), (4, lambda p: fall_forward(p, 0.4)), (10, lambda p: fall_forward(p, 1)), (17, corpse_face),
    ], loop=False)
    clip(rig, poser, "death-stand-flank", [
        (1, lambda p: hit(p, 0)), (4, lambda p: hit(p, 1)), (11, lambda p: fall_spin(p, 1)), (19, corpse_side),
    ], loop=False)
    clip(rig, poser, "death-crouch", [
        (1, lambda p: crouch_slump(p, 0)), (6, lambda p: crouch_slump(p, 1)), (14, corpse_face),
    ], loop=False)
    # Raise into the aim, lower out of it, reload and turn, per stance (1.3).
    for stance in ("stand", "crouch", "prone"):
        clip(rig, poser, f"raise-{stance}", [(1, stance_pose(stance, False)), (8, stance_pose(stance, True))], loop=False)
        clip(rig, poser, f"lower-{stance}", [(1, stance_pose(stance, True)), (10, stance_pose(stance, False))], loop=False)
        clip(rig, poser, f"reload-{stance}", [
            (1, stance_pose(stance, False)),
            (6, reload_pose(stance, 0)),
            (16, reload_pose(stance, 1)),
            (28, reload_pose(stance, 2)),
            (40, reload_pose(stance, 3)),
            (48, stance_pose(stance, False)),
        ], loop=False)
    for stance in ("stand", "crouch"):
        clip(rig, poser, f"aim-turn-{stance}", [(1, turn_step(stance, 0)), (5, turn_step(stance, 1)), (9, turn_step(stance, 2)), (13, turn_step(stance, 3))])
    clip(rig, poser, "death-prone", [
        (1, lambda p: prone_go_limp(p, 0)), (6, lambda p: prone_go_limp(p, 0.6)), (14, corpse_sprawl),
    ], loop=False)

    check_crouch_walk(rig)
    write_gaits(gaits)
    poser.clear()
    return [save_and_export("soldier", "characters")]
