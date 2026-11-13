import { CATALOG_OBJECTS, GROUND_MATERIALS, type BattleMap } from '@prestes/shared';

/**
 * ambient-sound-and-voices 3.2: which ambient bed plays, chosen from the
 * ground around the listening point and the map's hour, and which one-shots
 * fit them (the list is `docs/audio/SOUND_LIST.md`). Pure: tested without
 * audio.
 */
export type Place = 'cerrado' | 'forest-edge' | 'caatinga' | 'pasture' | 'town';
export type Hour = 'dawn' | 'day' | 'dusk' | 'night';

export const PLACES: readonly Place[] = ['cerrado', 'forest-edge', 'caatinga', 'pasture', 'town'];
export const HOURS: readonly Hour[] = ['dawn', 'day', 'dusk', 'night'];

/** How far around the listening point the ground is read (m). */
export const PLACE_RADIUS = 60;
/** Buildings within the radius that make it a town. */
export const TOWN_BUILDINGS = 3;
/** Trees within the radius that make it a forest edge. */
export const FOREST_TREES = 14;

/** The bed and the hour layer, as sound ids (files `beds/<id>.mp3`). */
export const bedId = (place: Place): string => `bed-${place}`;
export const hourId = (hour: Hour): string => `hour-${hour}`;

/** The hour by the map's time of day (06:00 to 18:00 today). */
export function hourOf(time: number): Hour {
  if (time < 6 || time >= 18.5) return 'night';
  if (time < 8) return 'dawn';
  if (time < 16.5) return 'day';
  return 'dusk';
}

const TREE_MODELS = new Set(CATALOG_OBJECTS.filter((entry) => entry.group === 'tree' && !entry.id.startsWith('bush-') && !entry.id.startsWith('stump-')).map((entry) => entry.model));

/** The place a painted ground speaks for, or null for ground that says nothing (roads, mud, stone). */
function groundPlace(id: string): Place | null {
  if (id.startsWith('caatinga')) return 'caatinga';
  if (id.startsWith('cerrado') || id === 'red-earth' || id === 'dry-grass' || id === 'basic-red' || id === 'basic-straw') return 'cerrado';
  if (id === 'grass' || id === 'field-soil' || id === 'basic-green' || id === 'basic-olive' || id === 'basic-dark-green') return 'pasture';
  if (id === 'cobbles' || id === 'quintal-floor') return 'town';
  if (id === 'leaf-litter') return 'forest-edge';
  return null;
}

/** The map's own colour family, when nothing around says more. */
function palettePlace(map: BattleMap): Place {
  switch (map.palette) {
    case 'caatinga':
      return 'caatinga';
    case 'cerrado':
      return 'cerrado';
    case 'urban':
      return 'town';
    default:
      return 'pasture';
  }
}

const within = (x: number, y: number, px: number, py: number, radius: number): boolean => (px - x) ** 2 + (py - y) ** 2 <= radius * radius;

/**
 * The place around (x, y): a town where buildings stand close, a forest edge
 * where trees are thick, else the painted ground's majority, else the map's
 * colour family.
 */
export function placeAt(map: BattleMap, x: number, y: number, radius = PLACE_RADIUS): Place {
  const buildings = map.buildings.filter((building) => within(x, y, building.x, building.y, radius)).length;
  if (buildings >= TOWN_BUILDINGS) return 'town';
  const trees = map.props.filter((prop) => TREE_MODELS.has(prop.model) && within(x, y, prop.x, prop.y, radius)).length;
  if (trees >= FOREST_TREES) return map.palette === 'caatinga' ? 'caatinga' : 'forest-edge';
  if (map.paint) {
    const votes = new Map<Place, number>();
    const side = Math.round(map.bounds.maxX - map.bounds.minX);
    const depth = Math.round(map.bounds.maxY - map.bounds.minY);
    const step = radius / 4;
    for (let dy = -radius; dy <= radius; dy += step) {
      for (let dx = -radius; dx <= radius; dx += step) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const cx = Math.floor(x + dx - map.bounds.minX);
        const cy = Math.floor(y + dy - map.bounds.minY);
        if (cx < 0 || cy < 0 || cx >= side || cy >= depth) continue;
        const material = GROUND_MATERIALS[map.paint[cy * side + cx]!];
        const place = material ? groundPlace(material.id) : null;
        if (place) votes.set(place, (votes.get(place) ?? 0) + 1);
      }
    }
    let best: Place | null = null;
    for (const place of PLACES) if ((votes.get(place) ?? 0) > (best ? votes.get(best)! : 0)) best = place;
    if (best) return best;
  }
  return palettePlace(map);
}

/** An occasional sound and where and when it fits. */
export interface OneShot {
  id: string;
  places: readonly Place[];
  hours: readonly Hour[];
}

const ALL_HOURS: readonly Hour[] = ['dawn', 'day', 'dusk'];
const DAY: readonly Hour[] = ['day'];

/** `docs/audio/SOUND_LIST.md`, one-shots (files `oneshots/<id>.mp3`). */
export const ONE_SHOTS: readonly OneShot[] = [
  { id: 'bird-seriema', places: ['cerrado', 'pasture'], hours: ['dawn', 'day'] },
  { id: 'bird-bem-te-vi', places: PLACES, hours: DAY },
  { id: 'bird-anu', places: ['pasture', 'cerrado'], hours: DAY },
  { id: 'bird-maritaca', places: ['forest-edge', 'town'], hours: ['dawn', 'dusk'] },
  { id: 'bird-inhambu', places: ['forest-edge', 'cerrado'], hours: ['dusk'] },
  { id: 'bird-gaviao', places: PLACES, hours: DAY },
  { id: 'bird-urutau', places: ['forest-edge'], hours: ['night'] },
  { id: 'dog-far', places: ['town', 'pasture'], hours: [...ALL_HOURS, 'night'] },
  { id: 'rooster', places: ['town', 'pasture'], hours: ['dawn'] },
  { id: 'cattle', places: ['pasture'], hours: ALL_HOURS },
  { id: 'horse', places: PLACES, hours: ALL_HOURS },
  { id: 'ox-cart', places: ['pasture', 'town'], hours: ALL_HOURS },
  { id: 'church-bell', places: ['town'], hours: ALL_HOURS },
  { id: 'gust', places: PLACES, hours: [...ALL_HOURS, 'night'] },
  { id: 'branch', places: ['forest-edge', 'caatinga'], hours: [...ALL_HOURS, 'night'] },
];

/** Seconds between one-shots: a quiet country, not an aviary. */
export const ONE_SHOT_GAP = { min: 7, max: 22 } as const;

/**
 * The next one-shot for a place and hour, among those `available` (loaded),
 * never the one played last (when it is the only one that fits, nothing
 * plays this time). `random` is in [0, 1).
 */
export function nextOneShot(place: Place, hour: Hour, last: string | null, available: (id: string) => boolean, random: () => number): string | null {
  const fresh = ONE_SHOTS.filter((shot) => shot.id !== last && shot.places.includes(place) && shot.hours.includes(hour) && available(shot.id));
  if (fresh.length === 0) return null;
  return fresh[Math.min(fresh.length - 1, Math.floor(random() * fresh.length))]!.id;
}
