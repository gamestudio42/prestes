import { describe, expect, it } from 'vitest';
import { messages } from '../../packages/content/src';
import { CATALOG_OBJECTS, GROUND_MATERIALS, LINE_KINDS, MAP_SIZES, ROAD_TYPES } from '../../packages/shared/src';

describe('map editor strings', () => {
  const keys = [
    ...CATALOG_OBJECTS.map((entry) => entry.nameKey),
    ...GROUND_MATERIALS.map((material) => material.nameKey),
    ...LINE_KINDS.map((line) => line.nameKey),
    ...ROAD_TYPES.map((road) => road.nameKey),
    ...MAP_SIZES.map((size) => `editor.map.size.${size}`),
  ];

  it('every catalog entry, material, line, road and size has EN and PT-BR names', () => {
    for (const locale of ['en', 'pt-BR'] as const) {
      const catalog = messages[locale] as Record<string, string>;
      const missing = keys.filter((key) => !catalog[key]);
      expect(missing, locale).toEqual([]);
    }
  });
});
