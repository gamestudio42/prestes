"""Shared helpers for the Blender build scripts (run inside Blender).

Everything is built from code: low-poly boxes and prisms whose faces map to
swatches of the pixel atlases in art-src/textures (regions.json), materials
that sample those atlases with nearest filtering, and GLB export.
"""
from __future__ import annotations

import json
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

ART = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEXTURES = os.path.join(ART, "textures")

with open(os.path.join(TEXTURES, "regions.json"), encoding="utf-8") as handle:
    REGIONS = json.load(handle)


def reset() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def atlas_material(texture: str) -> bpy.types.Material:
    """A matte material sampling `<texture>.png` with nearest filtering."""
    name = f"{texture}-atlas"
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    shader = nodes.get("Principled BSDF")
    shader.inputs["Roughness"].default_value = 1.0
    if "Specular IOR Level" in shader.inputs:
        shader.inputs["Specular IOR Level"].default_value = 0.0
    sampler = nodes.new("ShaderNodeTexImage")
    sampler.image = bpy.data.images.load(os.path.join(TEXTURES, f"{texture}.png"))
    sampler.interpolation = "Closest"
    material.node_tree.links.new(sampler.outputs["Color"], shader.inputs["Base Color"])
    material.node_tree.links.new(sampler.outputs["Alpha"], shader.inputs["Alpha"])
    return material


def region_uv(atlas: str, swatch: str):
    """UV rectangle (u0, v0, u1, v1) of a swatch, inset half a texel."""
    data = REGIONS[atlas]
    width, height = data["size"]
    x, y, w, h = data["regions"][swatch]
    inset = 0.5
    u0 = (x + inset) / width
    u1 = (x + w - inset) / width
    # Image rows go down; UV v goes up.
    v1 = 1 - (y + inset) / height
    v0 = 1 - (y + h - inset) / height
    return u0, v0, u1, v1


class MeshBuilder:
    """Collects low-poly parts into one bmesh with atlas UVs and vertex groups."""

    def __init__(self, atlas: str, texture: str | None = None) -> None:
        self.atlas = atlas
        self.texture = texture or atlas
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new("UVMap")
        self.deform = self.bm.verts.layers.deform.new()
        self.groups: list[str] = []

    def _group(self, name: str | None) -> int | None:
        if name is None:
            return None
        if name not in self.groups:
            self.groups.append(name)
        return self.groups.index(name)

    def _face(self, verts, swatch: str, group: int | None, flip: bool = False) -> None:
        if flip:
            verts = list(reversed(verts))
        face = self.bm.faces.new(verts)
        u0, v0, u1, v1 = region_uv(self.atlas, swatch)
        corners = [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]
        for loop, (u, v) in zip(face.loops, corners[: len(face.loops)] if len(face.loops) == 4 else corners):
            loop[self.uv].uv = (u, v)
        face.smooth = False

    def quad(self, corners, swatch: str, index: int | None, tile: float | None = None) -> None:
        """A quad (counter-clockwise seen from outside), split into cells of
        about `tile` metres that each show the whole swatch."""
        a, b, c, d = corners
        across = max(1, round((b - a).length / tile)) if tile else 1
        up = max(1, round((d - a).length / tile)) if tile else 1

        def point(s: float, t: float) -> Vector:
            bottom = a.lerp(b, s)
            top = d.lerp(c, s)
            return bottom.lerp(top, t)

        for i in range(across):
            for j in range(up):
                s0, s1 = i / across, (i + 1) / across
                t0, t1 = j / up, (j + 1) / up
                verts = [self._vert(point(s, t), index) for s, t in ((s0, t0), (s1, t0), (s1, t1), (s0, t1))]
                self._face(verts, swatch, None)

    def _vert(self, co: Vector, index: int | None):
        vert = self.bm.verts.new(co)
        if index is not None:
            vert[self.deform][index] = 1.0
        return vert

    def box(self, center, size, swatch, top=None, bottom=None, group=None, matrix=None, tile=None, front=None, back=None) -> None:
        """An axis-aligned box (then `matrix`), faces textured by swatch; with
        `tile` each face repeats the swatch about every `tile` metres;
        `front` and `back` texture the y+ and y- faces (a soldier faces +y)."""
        cx, cy, cz = center
        sx, sy, sz = (s / 2 for s in size)
        corners = [
            Vector((cx + dx * sx, cy + dy * sy, cz + dz * sz))
            for dz in (-1, 1)
            for dy in (-1, 1)
            for dx in (-1, 1)
        ]
        if matrix is not None:
            corners = [matrix @ c for c in corners]
        index = self._group(group)
        b = corners
        # 0..3 bottom (z-), 4..7 top (z+); order x-,x+ within y-,y+
        self.quad([b[0], b[2], b[3], b[1]], bottom or swatch, index, tile)  # bottom
        self.quad([b[4], b[5], b[7], b[6]], top or swatch, index, tile)  # top
        self.quad([b[0], b[1], b[5], b[4]], back or swatch, index, tile)  # y-
        self.quad([b[3], b[2], b[6], b[7]], front or swatch, index, tile)  # y+
        self.quad([b[2], b[0], b[4], b[6]], swatch, index, tile)  # x-
        self.quad([b[1], b[3], b[7], b[5]], swatch, index, tile)  # x+

    def cylinder(self, center, radius, height, swatch, sides=8, top=None, group=None, matrix=None, radius_top=None) -> None:
        """An upright cylinder (or frustum with `radius_top`) centred on `center`."""
        cx, cy, cz = center
        upper = radius if radius_top is None else radius_top
        index = self._group(group)
        ring = []
        for k in range(sides):
            angle = 2 * math.pi * k / sides
            ca, sa = math.cos(angle), math.sin(angle)
            ring.append((
                Vector((cx + ca * radius, cy + sa * radius, cz - height / 2)),
                Vector((cx + ca * upper, cy + sa * upper, cz + height / 2)),
            ))
        if matrix is not None:
            ring = [(matrix @ lo, matrix @ hi) for lo, hi in ring]
        for k in range(sides):
            lo0, hi0 = ring[k]
            lo1, hi1 = ring[(k + 1) % sides]
            if upper > 0:
                self.quad([lo0, lo1, hi1, hi0], swatch, index)
            else:
                self._face([self._vert(lo0, index), self._vert(lo1, index), self._vert(hi0, index)], swatch, None)
        mid_top = sum((hi for _, hi in ring), Vector()) / sides
        mid_bottom = sum((lo for lo, _ in ring), Vector()) / sides
        for k in range(sides):
            lo0, hi0 = ring[k]
            lo1, hi1 = ring[(k + 1) % sides]
            if upper > 0:
                self._face([self._vert(hi0, index), self._vert(hi1, index), self._vert(mid_top, index)], top or swatch, None)
            self._face([self._vert(lo1, index), self._vert(lo0, index), self._vert(mid_bottom, index)], top or swatch, None)

    def cone(self, center, radius, height, swatch, sides=6, group=None, matrix=None) -> None:
        """A cone standing on `center` (its base), apex `height` above."""
        cx, cy, cz = center
        self.cylinder((cx, cy, cz + height / 2), radius, height, swatch, sides=sides, group=group, matrix=matrix, radius_top=0)

    def prism(self, center, width, depth, height, swatch, end=None, group=None, matrix=None, tile=None) -> None:
        """A gable roof: a triangular prism along x."""
        cx, cy, cz = center
        hw, hd = width / 2, depth / 2
        points = [
            Vector((cx - hw, cy - hd, cz)), Vector((cx + hw, cy - hd, cz)),
            Vector((cx + hw, cy + hd, cz)), Vector((cx - hw, cy + hd, cz)),
            Vector((cx - hw, cy, cz + height)), Vector((cx + hw, cy, cz + height)),
        ]
        if matrix is not None:
            points = [matrix @ p for p in points]
        index = self._group(group)
        p = points
        self.quad([p[0], p[1], p[5], p[4]], swatch, index, tile)
        self.quad([p[2], p[3], p[4], p[5]], swatch, index, tile)
        self._face([self._vert(p[0], index), self._vert(p[4], index), self._vert(p[3], index)], end or swatch, None)
        self._face([self._vert(p[1], index), self._vert(p[2], index), self._vert(p[5], index)], end or swatch, None)
        self.quad([p[0], p[3], p[2], p[1]], end or swatch, index)

    def to_object(self, name: str) -> bpy.types.Object:
        mesh = bpy.data.meshes.new(name)
        # Every part is wound outward by construction; the faces are not
        # connected, so recalculating normals could not tell in from out.
        self.bm.to_mesh(mesh)
        self.bm.free()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        for group in self.groups:
            obj.vertex_groups.new(name=group)
        mesh.materials.append(atlas_material(self.texture))
        return obj


def save_and_export(name: str, folder: str) -> str:
    """Save `art-src/<folder>/<name>.blend` and export `<name>.glb` beside it."""
    out_dir = os.path.join(ART, folder)
    os.makedirs(out_dir, exist_ok=True)
    blend = os.path.join(out_dir, f"{name}.blend")
    glb = os.path.join(out_dir, f"{name}.glb")
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    bpy.ops.export_scene.gltf(
        filepath=glb,
        export_format="GLB",
        export_yup=True,
        export_apply=False,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_image_format="AUTO",
    )
    return glb


def rotation_z(angle: float) -> Matrix:
    return Matrix.Rotation(angle, 4, "Z")


def placed(x: float, y: float, z: float, rx: float = 0.0, rz: float = 0.0) -> Matrix:
    """Translation then rotation about X and Z (for parts built at the origin)."""
    return Matrix.Translation((x, y, z)) @ Matrix.Rotation(rz, 4, "Z") @ Matrix.Rotation(rx, 4, "X")
