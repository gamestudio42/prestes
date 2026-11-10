import type { BattleMap, MapLight } from '@prestes/shared';

/**
 * author-game-maps 5.1: the sun for a map's time of day and bearing. Visual
 * only: the simulation never reads it.
 *
 * - Elevation follows the hour: low at 6 h and 18 h, highest (62 degrees) at noon.
 * - Bearing is the compass direction the sun stands in, clockwise from north;
 *   north is the map's -y (three's -z), east +x.
 * - The light warms toward the ends of the day and is a little weaker there.
 */
export interface SunLook {
  position: [number, number, number];
  intensity: number;
  color: number;
}

const DISTANCE = 85;
const NOON_ELEVATION = (62 * Math.PI) / 180;
const LOW_ELEVATION = (7 * Math.PI) / 180;
const NOON_COLOR = [0xff, 0xf2, 0xd8] as const;
const DUSK_COLOR = [0xff, 0xb0, 0x6a] as const;

export function sunFromLight(light: MapLight, baseIntensity = 1.7): SunLook {
  const day = Math.max(0, Math.min(1, (light.time - 6) / 12));
  const height = Math.sin(Math.PI * day);
  const elevation = LOW_ELEVATION + (NOON_ELEVATION - LOW_ELEVATION) * height;
  const bearing = (light.bearing * Math.PI) / 180;
  const flat = Math.cos(elevation) * DISTANCE;
  const warm = (1 - height) ** 2;
  const channel = (index: 0 | 1 | 2) => Math.round(NOON_COLOR[index] + (DUSK_COLOR[index] - NOON_COLOR[index]) * warm);
  return {
    position: [Math.sin(bearing) * flat, Math.sin(elevation) * DISTANCE, -Math.cos(bearing) * flat],
    intensity: baseIntensity * (0.8 + 0.2 * height),
    color: (channel(0) << 16) | (channel(1) << 8) | channel(2),
  };
}

/** The map's own light when it has one (authored maps), else the palette's sun. */
export function sunForMap(map: BattleMap, byPalette: Readonly<Record<BattleMap['palette'], { position: [number, number, number]; intensity: number }>>, paletteColor: number): SunLook {
  const look = byPalette[map.palette];
  if (map.light) return sunFromLight(map.light, look.intensity);
  return { position: look.position, intensity: look.intensity, color: paletteColor };
}
