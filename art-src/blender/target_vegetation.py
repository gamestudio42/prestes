"""Trees, hedge and fence pieces (instanced by the world layer).

Three trees of the southern campo: a broad-leaved tree, a dark cypress-like
conifer and the araucaria, whose flat crown on a tall bare trunk marks the
Rio Grande and Parana highlands. Trees stand on the origin (z = 0); the
fence post and rail are unit pieces centred on the origin, which the game
stretches between posts.
"""
from common import MeshBuilder, reset, save_and_export


def tree_broad():
    b = MeshBuilder("environment")
    b.cylinder((0, 0, 1.2), 0.22, 2.4, "bark", sides=6)
    b.cylinder((0, 0, 2.35), 1.2, 0.7, "leaf", sides=8, radius_top=1.8)
    b.cylinder((0, 0, 3.2), 1.8, 1.0, "leaf", sides=8, radius_top=1.5)
    b.cylinder((0, 0, 4.15), 1.5, 0.9, "leaf", sides=8, radius_top=0.6)
    b.to_object("tree-broad")


def tree_pine():
    b = MeshBuilder("environment")
    b.cylinder((0, 0, 1.0), 0.2, 2.0, "bark", sides=6)
    for z, radius, height in ((0.9, 1.8, 2.6), (2.2, 1.42, 2.3), (3.4, 0.92, 1.9)):
        b.cone((0, 0, z), radius, height, "leaf.dark", sides=6)
    b.to_object("tree-pine")


def tree_araucaria():
    b = MeshBuilder("environment")
    b.cylinder((0, 0, 2.75), 0.2, 5.5, "bark", sides=6, radius_top=0.14)
    b.cylinder((0, 0, 4.55), 0.4, 0.35, "leaf.dark", sides=8, radius_top=1.8)
    b.cylinder((0, 0, 5.35), 0.6, 0.45, "leaf.dark", sides=8, radius_top=2.7)
    b.cylinder((0, 0, 5.8), 2.7, 0.35, "leaf", sides=8, radius_top=1.7)
    b.to_object("tree-araucaria")


def hedge():
    b = MeshBuilder("environment")
    b.box((0, 0, 0.6), (2.0, 0.9, 1.2), "leaf.dark", top="leaf", tile=1.0)
    b.to_object("hedge")


def fence():
    post = MeshBuilder("environment")
    post.box((0, 0, 0), (1, 1, 1), "timber")
    post.to_object("fence-post")
    rail = MeshBuilder("environment")
    rail.box((0, 0, 0), (1, 1, 1), "bark")
    rail.to_object("fence-rail")


def build():
    reset()
    tree_broad()
    tree_pine()
    tree_araucaria()
    hedge()
    fence()
    return [save_and_export("vegetation", "environment")]
