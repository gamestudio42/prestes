import { describe, expect, it } from 'vitest';
import {
  buildingVariants,
  compileMapDocument,
  createEditableMap,
  MAP_DOCUMENT_VERSION,
  parseMapDocument,
  toMapDocument,
  VARIANT_SWATCHES,
} from '../src';

// revise-buildings-and-stone 3.5: building variants in the map document.
function street(variant?: string) {
  const map = createEditableMap({ id: 'rua', size: 'small', name: { en: 'S', 'pt-BR': 'S' } });
  map.objects.push(
    { id: 1, type: 'casa-terrea', x: -20, y: 0, rotation: 0, ...(variant ? { variant } : {}) },
    { id: 2, type: 'barn', x: 20, y: 0, rotation: 0 },
  );
  return map;
}

describe('building variants (revise-buildings-and-stone 3.5)', () => {
  it('a variant is kept through save and load and reaches the compiled building', () => {
    const parsed = parseMapDocument(JSON.parse(JSON.stringify(toMapDocument(street('adobe')))));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document.version).toBe(MAP_DOCUMENT_VERSION);
    expect(parsed.document.objects[0]!.variant).toBe('adobe');
    expect(compileMapDocument(parsed.document).buildings.map((building) => building.variant)).toEqual(['adobe', undefined]);
  });

  it('a version 7 map, from before variants, loads with every building in its default look', () => {
    const document = { ...toMapDocument(street()), version: 7 };
    const parsed = parseMapDocument(JSON.parse(JSON.stringify(document)));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document.version).toBe(MAP_DOCUMENT_VERSION);
    expect(compileMapDocument(parsed.document).buildings.every((building) => building.variant === undefined)).toBe(true);
  });

  it('a look the building does not have is dropped; a variant that is not text is refused', () => {
    expect(compileMapDocument(toMapDocument(street('purple'))).buildings[0]!.variant).toBeUndefined();
    const map = street();
    map.objects.push({ id: 3, type: 'barn', x: 0, y: 30, rotation: 0, variant: 'ochre' });
    expect(compileMapDocument(toMapDocument(map)).buildings[2]!.variant).toBeUndefined();
    const bad = toMapDocument(street()) as unknown as { objects: Record<string, unknown>[] };
    bad.objects[0]!.variant = 7;
    expect(parseMapDocument(bad)).toMatchObject({ ok: false, error: 'invalid', detail: 'objects' });
  });

  it('only what a building is made of can change: a barn has no wash, a rancho no tiles', () => {
    expect(buildingVariants('barn')).toEqual(['zinc']);
    expect(buildingVariants('rancho')).not.toContain('zinc');
    expect(buildingVariants('casa-terrea')).toEqual(['whitewash', 'ochre', 'blue', 'rose', 'adobe', 'zinc']);
    for (const swaps of Object.values(VARIANT_SWATCHES)) for (const [from, to] of Object.entries(swaps)) expect(from).not.toBe(to);
  });
});
