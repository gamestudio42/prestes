## 1. Pipeline

- [x] 1.1 `art-src/blender/build.py` and `pnpm art` (Blender located like Aseprite), environment folder in `tools/prepare-models.ts`; a smoke target exports one cube end to end
- [x] 1.2 Pixel texture grids (`art-src/textures/`) and atlases: soldier 64 x 64 (column, legalist, officer), environment 128 x 128; loader with nearest filtering

## 2. Soldier

- [x] 2.1 Soldier mesh (about 400 triangles, Mauser included) with UVs into the atlas and the armature; review in Blender renders at the tactical and strategic angles
- [x] 2.2 Clips: idle, walk, crouch-idle, crouch-walk, prone, crawl, aim and fire in three stances, wounded, corpse
- [x] 2.3 Character layer: load the glTF, one skinned instance per soldier at tactical span, outfit by faction and officer, clip choice from the snapshot with cross-fade and speed-scaled walk; strategic proxies unchanged; fallback to the part rig if loading fails; view unit tests for the clip choice

## 3. Training ground

- [x] 3.1 Buildings: barracks, chapel, farmhouse, barn, aid tent; flagpole, target frames and butts
- [x] 3.2 Fortifications: trench section with sandbag parapet, stone wall, low wall, crates, barrels; cover layer tiles them along each footprint
- [x] 3.3 Vegetation and fences: three tree types, hedge, fence section, instanced
- [x] 3.4 Training and world layers place the models from `TRAINING_GROUND`

## 4. Feedback

- [ ] 4.1 Effects sheet (pixel sprites) and `effects-layer.ts`: muzzle flash, smoke, tracer, impact by surface, footstep dust, suppression spurts; pooled
- [ ] 4.2 Hit fall: a soldier hit hard plays a short stagger or fall before the wounded or corpse clip

## 5. Close

- [ ] 5.1 Performance probe in e2e (frame time at tactical span with the full section) within 1.5 times the pre-change value; remove the procedural rig and props once the models load everywhere
- [ ] 5.2 Asset register and visual-language decision updated; visual baselines re-recorded after review
- [ ] 5.3 `pnpm verify`; hand check in Chrome of a full station and the sandbox; record in `docs/status.md`
