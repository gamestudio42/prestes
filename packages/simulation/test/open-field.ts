import { compileMapDocument, createEditableMap, toMapDocument, VEGETATION_KINDS, type BattleMap, type EditableMap, type MapSize } from '@prestes/shared';

/**
 * author-game-maps 3.1: small maps built in code for tests that need a
 * particular ground and must not depend on the test map's layout.
 */
function compiled(id: string, paint?: (map: EditableMap) => void, size: MapSize = 'medium'): BattleMap {
  const map = createEditableMap({ id, size, name: { en: id, 'pt-BR': id } });
  paint?.(map);
  return compileMapDocument(toMapDocument(map));
}

/** A flat, empty map (medium unless asked): open ground (sight lines, distances). */
export function openField(size: MapSize = 'medium'): BattleMap {
  return compiled(`open-field-${size}`, undefined, size);
}

/** Flat ground with a canefield west of the centre (x −120 to −56, y −62 to 50), for search and concealment. */
export function caneField(): BattleMap {
  return compiled('cane-field', (map) => {
    const side = Math.round(Math.sqrt(map.vegetation.length));
    const cane = VEGETATION_KINDS.indexOf('cane') + 1;
    for (let y = -62; y < 50; y += 1) for (let x = -120; x < -56; x += 1) map.vegetation[(y + side / 2) * side + (x + side / 2)] = cane;
  });
}

/** Flat ground with tall grass (capim) round (32, 34), x 20 to 44, y 24 to 44. */
export function grassField(): BattleMap {
  return compiled('grass-field', (map) => {
    const side = Math.round(Math.sqrt(map.vegetation.length));
    const grass = VEGETATION_KINDS.indexOf('tall-grass') + 1;
    for (let y = 24; y < 44; y += 1) for (let x = 20; x < 44; x += 1) map.vegetation[(y + side / 2) * side + (x + side / 2)] = grass;
  });
}

/** Flat ground with a dirt road along x = 21, ditched on both sides its whole length. */
export function ditchedRoad(): BattleMap {
  return compiled('ditched-road', (map) => {
    map.roads.push({ id: 1, type: 'dirt-road', width: 5, ditches: { left: true, right: true }, points: [{ x: 21, y: 200 }, { x: 21, y: -200 }] });
  });
}
