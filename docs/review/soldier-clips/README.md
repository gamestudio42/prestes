# Soldier animation and textures: review sheets

For the owner's review of `soldier-animation-and-textures` (task 4.1). Each
sheet is rendered from `art-src/characters/soldier.blend` after `pnpm art
soldier`, from the game's tactical angle, with `art-src/blender/review.py`
or a render of the uniform sets.

| Sheet | What it shows | Task |
| --- | --- | --- |
| `wound-clips-2026-11-11.png` | limp, hold-wound, lying-wounded, carry, carried, kneel-treat, treated | 1.1 |
| `carry-and-treat-pairs-2026-11-11.png` | the carrier and the carried man together; the rescuer over the treated man | 1.1 |
| `death-clips-2026-11-11.png` | the five deaths mid-fall and in the corpse pose each ends in | 1.2 |
| `crouch-aim-reload-2026-11-11.png` | crouch-walk, raise, recoil, the three reloads, the aim turn | 1.3 |
| `textures-128-2026-11-11.png` | the soldier in the 128 px layered atlas, and the atlases | 3.1 |
| `uniform-sets-2026-11-11.png` | the six uniform sets in colour and in greyscale | 3.2 |
| `uniform-variants-section-2026-11-11.png` | a section of eleven (ids 1-11) in each troop set, in its variants | 3.3 |

Known rough points for the review: the standing reload hides the rifle
behind the arm; the uniform variants are subtle; the carried man's arms and
rifle hang loose.

## improve-soldier-models (2026-11-16)

For the owner's review of `improve-soldier-models` (task 7.1). Rendered with
`art-src/blender/review_soldier.py` from `soldier.blend` after `pnpm art
soldier`, from the game's tactical angle (one shot from the side).

| Sheet | What it shows | Task |
| --- | --- | --- |
| `dress-2026-11-16.png` | the eight sets: column, legalists in khaki, patriotic battalions, the chefe with his revolver, cangaceiros and jagunços in leather with their hats | 4.1, 4.4 |
| `variants-2026-11-16.png` | the six column variants (shade, skin, moustache) with different kits | 4.1-4.3 |
| `weapons-2026-11-16.png` | Mauser, Winchester and automatic rifle in the aim, hands on the weapon; the revolver arm out, from the side, holstered and on the walk; the gun on its tripod | 1.0, 1.4 |
| `dress-grey-2026-11-16.png` | the same sets with colour removed: told apart by hat and kit (the column and the jagunços are the closest pair) | 3.2, 4.4 |
| `joints-2026-11-16.png` | crouch, kneel, prone, crouched aim and crawl, front and side: the weighted knee, hip and elbow rings | 3.1 |
| `nearfar-2026-11-16.png` | the near mesh with its gear beside the far mesh (264 triangles) | 3.2, 3.4 |

Known rough points: the holster barely shows at this angle; the revolver
man's left arm hangs straight, with no clip of its own for the free hand.
