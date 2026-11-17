import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SECTION_TYPES, type SectionTypeId } from '@prestes/shared';
import { GEAR_PIECES, SOLDIER_OUTFITS, soldierGear, soldierOutfit, UNIFORM_VARIANTS, uniformVariant } from '../src/soldier-clips';
import { SoldierInstance, type SoldierAsset } from '../src/soldier-models';

/**
 * improve-soldier-models 4.x: the men of a section differ by variant and kit,
 * each set wears its own hat, and a soldier keeps his look for the battle.
 */
const HATS = ['Slouch', 'Kepi', 'LeatherHat', 'Halfmoon'];
const GEAR = ['GearBlanket', 'GearCanteen', 'GearHaversack', 'GearNeckerchief', 'GearBornais', 'GearCartridges'];

function asset(clips: string[] = []): SoldierAsset {
  const scene = new THREE.Group();
  for (const name of ['Soldier', 'SoldierFar', ...HATS, ...HATS.map((hat) => `${hat}Far`), ...GEAR]) {
    const mesh = new THREE.Mesh();
    mesh.name = name;
    scene.add(mesh);
  }
  const materials: Record<string, THREE.Material> = {};
  for (const outfit of SOLDIER_OUTFITS) for (let variant = 0; variant < UNIFORM_VARIANTS; variant += 1) materials[`${outfit}-${variant}`] = new THREE.MeshBasicMaterial();
  const animation = (name: string) => new THREE.AnimationClip(name, 1, []);
  return { scene, clips: new Map(clips.map((name) => [name, animation(name)])), materials, clone: (object: THREE.Object3D) => object.clone(true) } as unknown as SoldierAsset;
}

const shown = (soldier: SoldierInstance): string[] =>
  soldier.root.children.filter((child) => child.visible).map((child) => child.name).sort();

describe('dress by id (4.1-4.3)', () => {
  it('the same man gets the same variant and kit every time', () => {
    for (let id = 0; id < 50; id += 1) {
      expect(uniformVariant(id)).toBe(uniformVariant(id));
      expect([...soldierGear(id, 'coluna-troop')]).toEqual([...soldierGear(id, 'coluna-troop')]);
    }
  });

  it('eleven men of a section show at least four variants and three kits', () => {
    const ids = Array.from({ length: 11 }, (_, at) => 100 + at);
    expect(new Set(ids.map(uniformVariant)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(ids.map((id) => [...soldierGear(id, 'coluna-troop')].join('+'))).size).toBeGreaterThanOrEqual(3);
  });

  it('legalist troops never wear the neckerchief of the column', () => {
    for (let id = 0; id < 200; id += 1) expect(soldierGear(id, 'legalista-troop').has('neckerchief')).toBe(false);
  });

  it('every piece of gear is carried by someone', () => {
    const carried = new Set<string>();
    for (const outfit of SOLDIER_OUTFITS) for (let id = 0; id < 100; id += 1) for (const piece of soldierGear(id, outfit)) carried.add(piece);
    expect([...carried].sort()).toEqual([...GEAR_PIECES].sort());
  });

  it('each section type dresses its men in their set: the sertao in leather, the army in khaki', () => {
    const outfit = (id: SectionTypeId) => soldierOutfit({ kind: 'infantry', faction: 'legalist', army: SECTION_TYPES[id].army, sectionType: id });
    expect(outfit('jaguncos')).toBe('jagunco-troop');
    expect(outfit('jaguncos-mauser')).toBe('jagunco-troop');
    expect(outfit('cangaceiros')).toBe('cangaceiro-troop');
    expect(outfit('infantaria-exercito')).toBe('legalista-troop');
    // No officer set of their own: a cangaceiro chief dresses as his men.
    expect(soldierOutfit({ kind: 'officer', faction: 'legalist', army: SECTION_TYPES.cangaceiros.army, sectionType: 'cangaceiros' })).toBe('cangaceiro-troop');
  });
});

describe('soldier model (3.4, 4.4, 1.4)', () => {
  it('wears the hat of his set and only his kit', () => {
    const column = new SoldierInstance(asset(), 'coluna-troop', 0, new Set(['neckerchief', 'blanket']));
    expect(shown(column)).toEqual(['GearBlanket', 'GearNeckerchief', 'Slouch', 'Soldier']);
    expect(shown(new SoldierInstance(asset(), 'legalista-troop'))).toEqual(['Kepi', 'Soldier']);
    expect(shown(new SoldierInstance(asset(), 'cangaceiro-troop'))).toEqual(['Halfmoon', 'Soldier']);
    expect(shown(new SoldierInstance(asset(), 'jagunco-troop'))).toEqual(['LeatherHat', 'Soldier']);
  });

  it('far, he swaps to the far body and hat and drops his gear; near again, all comes back', () => {
    const man = new SoldierInstance(asset(['prone']), 'coluna-troop', 3, new Set(['canteen']));
    const chest = new THREE.Bone();
    chest.name = 'chest';
    man.root.add(chest);
    man.play('prone');
    man.setWound(1);
    const material = (man.root.getObjectByName('Soldier') as THREE.Mesh).material;
    man.setFar(true);
    expect(shown(man)).toEqual(['SlouchFar', 'SoldierFar', 'chest']);
    // The same rig: the clip, the variant and the wound are kept.
    expect(man.playing).toBe('prone');
    expect(man.woundSide).toBe(1);
    expect((man.root.getObjectByName('SoldierFar') as THREE.Mesh).material).toBe(material);
    man.setFar(false);
    expect(shown(man)).toEqual(['GearCanteen', 'Slouch', 'Soldier', 'chest']);
  });

  it('off screen his clip is not advanced; back in view he is drawn as he is now (2.1)', () => {
    const scene = asset();
    // Going prone, a held clip: it ends lying and stays there.
    const lying = new THREE.AnimationClip('raise-prone', 1, [new THREE.VectorKeyframeTrack('Soldier.position', [0, 1], [0, 0, 0, 0, -1, 0])]);
    scene.clips.set('raise-prone', lying);
    const man = new SoldierInstance(scene, 'coluna-troop');
    const body = man.root.getObjectByName('Soldier')!;
    man.play('raise-prone');
    let advanced = 0;
    for (let frame = 0; frame < 30; frame += 1) if (man.advance(0.05, false)) advanced += 1;
    expect(advanced).toBe(0);
    expect(body.position.y).toBe(0);
    // One catch-up with the 1.5 s kept: the held clip ends lying down.
    expect(man.advance(0.05, true)).toBe(true);
    expect(body.position.y).toBeCloseTo(-1);
  });

  it('drawn far, he is advanced every other frame with the time of both (2.2)', () => {
    const scene = asset();
    scene.clips.set('walk', new THREE.AnimationClip('walk', 10, [new THREE.NumberKeyframeTrack('Soldier.position[x]', [0, 10], [0, 10])]));
    const man = new SoldierInstance(scene, 'coluna-troop');
    const body = man.root.getObjectByName('Soldier')!;
    man.play('walk');
    const advanced = Array.from({ length: 10 }, () => man.advance(0.1, true, true)).filter(Boolean).length;
    expect(advanced).toBe(5);
    // The tenth frame was a skipped beat: its 0.1 s waits for the next.
    expect(body.position.x).toBeCloseTo(0.9);
    man.advance(0.1, true, true);
    expect(body.position.x).toBeCloseTo(1.1);
  });

  it('with a revolver he plays the pistol variant where there is one, and holds it only then', () => {
    const man = new SoldierInstance(asset(['aim-stand', 'aim-stand-pistol', 'prone']), 'coluna-officer');
    man.setPistol(true);
    man.play('aim-stand');
    expect(man.playing).toBe('aim-stand');
    expect(man.activeClips().map((active) => active.clip)).toContain('aim-stand-pistol');
    expect(man.holdsPistol).toBe(true);
    man.play('prone');
    expect(man.holdsPistol).toBe(false);
    const rifleman = new SoldierInstance(asset(['aim-stand', 'aim-stand-pistol']), 'coluna-troop');
    rifleman.play('aim-stand');
    expect(rifleman.activeClips().map((active) => active.clip)).toEqual(['aim-stand']);
    expect(rifleman.holdsPistol).toBe(false);
  });
});
