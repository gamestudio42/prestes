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

/** The stones that come in every rock kind: the three sizes, the outcrop and the pile. */
export const KINDED_STONES: readonly string[] = ['rock-small', 'boulder', 'matacao', 'outcrop', 'stone-pile'];

export function isRockKind(type: string, value: unknown): value is RockKind {
  return KINDED_STONES.includes(type) && typeof value === 'string' && ROCK_KINDS.includes(value as RockKind) && value !== 'granite';
}
