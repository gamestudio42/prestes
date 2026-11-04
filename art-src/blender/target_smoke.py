"""Pipeline smoke test: one stone block, end to end."""
from common import MeshBuilder, reset, save_and_export


def build():
    reset()
    builder = MeshBuilder("environment")
    builder.box((0, 0, 0.5), (1, 1, 1), "stone")
    builder.to_object("smoke-block")
    return [save_and_export("smoke", "environment")]
