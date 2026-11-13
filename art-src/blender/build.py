"""Builds the low-poly models (run by `pnpm art`).

  blender -b --factory-startup -P art-src/blender/build.py -- [targets...]

Targets: smoke, soldier, buildings, fortifications, vegetation, props
(no target: all); `trees` (reads the Refloreste project) and `caatinga`
(the caatinga plants) run only when named. Each target saves an editable .blend and a .glb in
art-src/characters or art-src/environment; `pnpm models` then prepares them
for the game.
"""
import importlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

TARGETS = ["soldier", "buildings", "fortifications", "vegetation", "props", "stones"]

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
selected = args or TARGETS

for target in selected:
    module = importlib.import_module(f"target_{target}")
    for path in module.build():
        print(f"built {path}")
