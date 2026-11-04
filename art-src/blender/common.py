"""Shared helpers for the Blender build scripts (run inside Blender).

Everything is built from code: low-poly boxes and prisms whose faces map to
swatches of the pixel atlases in art-src/textures (regions.json), materials
that sample those atlases with nearest filtering, and GLB export.
"""
from __future__ import annotations

import json
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

    def box(self, center, size, swatch, top=None, bottom=None, group=None, matrix=None) -> None:
        """An axis-aligned box (then `matrix`), faces textured by swatch."""
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
        verts = [self.bm.verts.new(c) for c in corners]
        if index is not None:
            for vert in verts:
                vert[self.deform][index] = 1.0
        b = verts
        # 0..3 bottom (z-), 4..7 top (z+); order x-,x+ within y-,y+
        self._face([b[0], b[2], b[3], b[1]], bottom or swatch, index)  # bottom
        self._face([b[4], b[5], b[7], b[6]], top or swatch, index)  # top
        self._face([b[0], b[1], b[5], b[4]], swatch, index)  # y-
        self._face([b[3], b[2], b[6], b[7]], swatch, index)  # y+
        self._face([b[2], b[0], b[4], b[6]], swatch, index)  # x-
        self._face([b[1], b[3], b[7], b[5]], swatch, index)  # x+

    def prism(self, center, width, depth, height, swatch, end=None, group=None, matrix=None) -> None:
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
        v = [self.bm.verts.new(p) for p in points]
        if index is not None:
            for vert in v:
                vert[self.deform][index] = 1.0
        self._face([v[0], v[1], v[5], v[4]], swatch, index)
        self._face([v[2], v[3], v[4], v[5]], swatch, index)
        self._face([v[0], v[4], v[3]], end or swatch, index)
        self._face([v[1], v[2], v[5]], end or swatch, index)
        self._face([v[0], v[3], v[2], v[1]], end or swatch, index)

    def to_object(self, name: str) -> bpy.types.Object:
        mesh = bpy.data.meshes.new(name)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
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
