"""Fortification pieces the cover layer tiles along each cover footprint.

Each piece is unit sized (1 x 1 x 1 m, centred on the origin) so the game
scales it per course and per block, as it did the plain boxes before:
sandbag, stone block, low-wall block, trench floor and barrel.
"""
from common import MeshBuilder, reset, save_and_export


def sandbag():
    b = MeshBuilder("environment")
    b.box((0, 0, -0.15), (1.0, 1.0, 0.7), "sandbag")
    b.box((0, 0, 0.35), (0.86, 0.86, 0.3), "sandbag")
    b.to_object("sandbag")


def stone_block():
    b = MeshBuilder("environment")
    b.box((0, 0, 0), (1.0, 1.0, 1.0), "stone")
    b.to_object("stone-block")


def wall_block():
    b = MeshBuilder("environment")
    b.box((0, 0, -0.075), (1.0, 1.0, 0.85), "adobe")
    b.box((0, 0, 0.425), (1.04, 1.06, 0.15), "plaster.shade")
    b.to_object("wall-block")


def trench_floor():
    b = MeshBuilder("environment")
    b.box((0, 0, 0), (1.0, 1.0, 1.0), "earth")
    b.to_object("trench-floor")


def barrel():
    b = MeshBuilder("environment")
    b.cylinder((0, 0, 0), 1.0, 1.0, "timber", sides=10, top="crate")
    for z in (-0.28, 0.22):
        b.cylinder((0, 0, z), 1.04, 0.07, "metal", sides=10)
    b.to_object("barrel")


def build():
    reset()
    sandbag()
    stone_block()
    wall_block()
    trench_floor()
    barrel()
    return [save_and_export("fortifications", "environment")]
