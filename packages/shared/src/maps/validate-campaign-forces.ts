import type { Vec2 } from '../protocol';
import { rosterMen } from '../sections';
import type { EditableMap } from './document';

/**
 * scale-forces-by-map-size 5.7 (battle-maps "Campaign forces on medium maps",
 * "São Luiz / Ramada uses its whole field"): a medium campaign map starts with
 * forces that fill its field, its enemy arrives early and by 540 s, and no
 * quarter of it is left without something to fight over.
 */
export const CAMPAIGN_COLUMN_MEN = { min: 40, max: 55 } as const;
export const CAMPAIGN_ENEMY_MEN = { min: 40, max: 60 } as const;
/** The first timed enemy arrival by this, and none later than the last (s). */
export const FIRST_ARRIVAL_BY_SECONDS = 180;
export const LAST_ARRIVAL_BY_SECONDS = 540;

type Quarter = 'north-west' | 'north-east' | 'south-west' | 'south-east';

function quarterOf(point: Vec2): Quarter {
  return `${point.y < 0 ? 'north' : 'south'}-${point.x < 0 ? 'west' : 'east'}` as Quarter;
}

function centre(points: readonly Vec2[]): Vec2 {
  return { x: points.reduce((sum, p) => sum + p.x, 0) / points.length, y: points.reduce((sum, p) => sum + p.y, 0) / points.length };
}

/** The problems of a medium campaign map's forces; none for any other map. */
export function validateCampaignForces(map: Pick<EditableMap, 'use' | 'size' | 'columnForce' | 'enemyForces' | 'noEnemy' | 'events' | 'eventPlaces' | 'objectives' | 'deployment'>): string[] {
  if (map.use !== 'campaign' || map.size !== 'medium') return [];
  const errors: string[] = [];
  const column = map.columnForce ? rosterMen(map.columnForce) : 0;
  if (column < CAMPAIGN_COLUMN_MEN.min || column > CAMPAIGN_COLUMN_MEN.max) {
    errors.push(`column force of ${column} men, outside ${CAMPAIGN_COLUMN_MEN.min}-${CAMPAIGN_COLUMN_MEN.max}`);
  }
  if (!map.noEnemy) {
    (map.enemyForces ?? []).forEach((preset, index) => {
      const men = rosterMen(preset);
      if (men < CAMPAIGN_ENEMY_MEN.min || men > CAMPAIGN_ENEMY_MEN.max) {
        errors.push(`enemy preset ${index + 1} of ${men} men, outside ${CAMPAIGN_ENEMY_MEN.min}-${CAMPAIGN_ENEMY_MEN.max}`);
      }
    });
    // Arrivals on a clock; those the player's own moves trigger are free.
    const timed = (map.events ?? [])
      .filter((event) => event.trigger?.kind === 'time' && event.actions.some((action) => action.kind === 'troops' && action.side === 'legalist'))
      .map((event) => (event.trigger as unknown as { seconds: number }).seconds + (event.delay ?? 0));
    if (timed.length > 0 && Math.min(...timed) > FIRST_ARRIVAL_BY_SECONDS) errors.push(`first enemy arrival at ${Math.min(...timed)} s, after ${FIRST_ARRIVAL_BY_SECONDS} s`);
    for (const seconds of timed) if (seconds > LAST_ARRIVAL_BY_SECONDS) errors.push(`enemy arrival at ${seconds} s, after ${LAST_ARRIVAL_BY_SECONDS} s`);
  }
  const used = new Set<Quarter>();
  for (const objective of map.objectives ?? []) used.add(quarterOf(objective.flag));
  for (const side of ['column', 'legalist'] as const) {
    const area = map.deployment[side].area;
    if (area && area.length >= 3) used.add(quarterOf(centre(area)));
  }
  for (const place of map.eventPlaces ?? []) used.add(quarterOf(place.kind === 'entry' ? place.point : centre(place.polygon)));
  for (const quarter of ['north-west', 'north-east', 'south-west', 'south-east'] as const) {
    if (!used.has(quarter)) errors.push(`the ${quarter} quarter holds no objective, deployment area, entry point or event area`);
  }
  return errors;
}
