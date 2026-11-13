/**
 * revise-buildings-and-stone 4.1 (D4): kinds of rock, a second axis on the
 * stones. A stone's catalog id is its size and shape (a small rock, a
 * boulder, a matacão, an outcrop, a pile); its kind is the rock it is made
 * of, which picks the model's shape and colour and nothing else. Cover and
 * sight stay a function of size (`solidQuality`, `solidBlocksSight`). A
 * stone with no kind is granite, the look the stones always had.
 *
 * - granite: rounded boulders of the southern and eastern ranges;
 * - basalt: dark blocky rock of the southern plateau (Rio Grande, Paraná);
 * - sandstone: bedded ledges of Mato Grosso and the Paraná basin;
 * - quartzite: pale blocky quartzite and rusty canga of the Goiás and Minas plateaus;
 * - cobble: rounded river cobbles, heaped;
 * - lajedo: the caatinga's flat granite, low and split.
 */
export type RockKind = 'granite' | 'basalt' | 'sandstone' | 'quartzite' | 'cobble' | 'lajedo';

export const ROCK_KINDS: readonly RockKind[] = ['granite', 'basalt', 'sandstone', 'quartzite', 'cobble', 'lajedo'];

/**
 * The stone models that come in every rock kind: the three sizes, the outcrop
 * and the pile (4.1), and the built stone objects, the retaining wall and the
 * steps (4.2).
 */
export const KINDED_STONES: readonly string[] = ['rock-small', 'boulder', 'matacao', 'outcrop', 'stone-pile', 'retaining-wall', 'stone-steps'];

/** 4.2 (D5): built stone drawn as dry stone walls, by rock kind: the wall line and the corral. */
export const KINDED_WALLS: readonly string[] = ['stone-wall', 'stone-corral'];

/** 4.3: a catalog object or line kind the editor offers rock kinds for. */
export function takesRockKind(type: string): boolean {
  return KINDED_STONES.includes(type) || KINDED_WALLS.includes(type);
}

/** A rock kind other than granite on a kinded stone, wall line or corral (`type` is its catalog id or line kind). */
export function isRockKind(type: string, value: unknown): value is RockKind {
  return (
    (KINDED_STONES.includes(type) || KINDED_WALLS.includes(type)) &&
    typeof value === 'string' &&
    ROCK_KINDS.includes(value as RockKind) &&
    value !== 'granite'
  );
}

/** 4.2: the gate a corral leaves in its front wall (m). */
export const CORRAL_GATE = 3;

/**
 * 4.2: a corral's walls, a ring round its footprint with the gate in the
 * middle of its front (+y) side: three open polylines in the battle frame.
 */
export function corralWalls(x: number, y: number, halfWidth: number, halfDepth: number, rotation: number): { x: number; y: number }[][] {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const at = (u: number, v: number) => ({ x: x + u * cos - v * sin, y: y + u * sin + v * cos });
  const gate = Math.min(CORRAL_GATE / 2, halfWidth * 0.4);
  return [
    [at(-gate, halfDepth), at(-halfWidth, halfDepth), at(-halfWidth, -halfDepth), at(halfWidth, -halfDepth), at(halfWidth, halfDepth), at(gate, halfDepth)],
  ];
}
