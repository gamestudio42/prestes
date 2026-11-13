"""Small training ground props, standing on the origin (z = 0).

Flagpole, target frame, haystack, crate, well, cart and signpost; the game
places them from TRAINING_PROPS. Target frames face the firing line to the
south (Blender -Y).
"""
import math

from common import MeshBuilder, placed, reset, save_and_export
import camp_objects
import props_objects


def flagpole():
    b = MeshBuilder("environment")
    b.box((0, 0, 0.15), (0.8, 0.8, 0.3), "stone")
    b.cylinder((0, 0, 3.6), 0.08, 6.8, "timber", sides=6)
    b.box((1.25, 0, 6.2), (2.4, 0.05, 1.4), "flag")
    b.to_object("flagpole")


def target_frame():
    b = MeshBuilder("environment")
    for x in (-0.6, 0.6):
        b.box((x, 0, 0.9), (0.1, 0.1, 1.8), "timber")
    b.box((0, -0.02, 1.35), (1.1, 0.05, 0.9), "target")
    b.to_object("target-frame")


def haystack():
    b = MeshBuilder("environment")
    b.cylinder((0, 0, 0.55), 1.15, 1.1, "hay", sides=8)
    b.cone((0, 0, 1.1), 1.3, 1.2, "hay", sides=8)
    b.to_object("haystack")


def crate():
    b = MeshBuilder("environment")
    b.box((0, 0, 0.45), (0.9, 0.9, 0.9), "crate")
    b.to_object("crate")


def well():
    b = MeshBuilder("environment")
    b.cylinder((0, 0, 0.42), 0.95, 0.85, "stone", sides=8, top="ink")
    b.cylinder((0, 0, 0.86), 1.02, 0.16, "stone", sides=8, top="stone", radius_top=1.02)
    for x in (-0.72, 0.72):
        b.box((x, 0, 1.65), (0.14, 0.14, 1.7), "timber")
    b.box((0, 0, 2.2), (1.6, 0.12, 0.12), "timber")
    b.prism((0, 0, 2.45), 2.1, 1.3, 0.35, "tile", end="timber")
    b.to_object("well")


def cart():
    b = MeshBuilder("environment")
    b.box((0, 0, 0.85), (2.4, 1.3, 0.16), "timber")
    for side in (-1, 1):
        b.box((0, side * 0.62, 1.12), (2.4, 0.08, 0.4), "timber")
    b.box((-1.18, 0, 1.12), (0.08, 1.3, 0.4), "timber")
    b.box((2.0, 0, 0.8), (1.8, 0.1, 0.1), "timber")
    for side in (-1, 1):
        b.cylinder((0, 0, 0), 0.62, 0.1, "crate", sides=10, matrix=placed(-0.2, side * 0.74, 0.62, rx=math.pi / 2))
    b.box((-0.2, 0, 0.62), (0.08, 1.6, 0.08), "metal")
    b.to_object("cart")


def signpost():
    b = MeshBuilder("environment")
    b.box((0, 0, 0.9), (0.12, 0.12, 1.8), "timber")
    b.box((0.45, 0, 1.55), (1.0, 0.06, 0.36), "plaster")
    b.to_object("signpost")


def build():
    reset()
    flagpole()
    target_frame()
    haystack()
    crate()
    well()
    cart()
    signpost()
    # revise-buildings-and-stone 5.1: the waterside, farm and town objects.
    props_objects.build_all()
    # 5.2: the Column's camp and train.
    camp_objects.build_all()
    return [save_and_export("props", "environment")]
