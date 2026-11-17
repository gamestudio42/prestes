import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fromMapDocument, parseMapDocument, validateCampaignForces, type EditableMap } from '../src';

// scale-forces-by-map-size 5.7: the medium campaign maps' forces and field.
const load = (id: string): EditableMap => {
  const text = readFileSync(fileURLToPath(new URL(`../src/maps/authored/${id}.map.json`, import.meta.url)), 'utf8');
  const parsed = parseMapDocument(JSON.parse(text));
  if (!parsed.ok) throw new Error(`${id}: ${parsed.detail}`);
  return fromMapDocument(parsed.document);
};

describe('campaign forces on medium maps', () => {
  for (const id of ['catanduvas', 'porto-mendes', 'sao-luiz-ramada', 'serra-nova', 'pantanal']) {
    it(`${id} holds the bands and uses every quarter`, () => {
      expect(validateCampaignForces(load(id))).toEqual([]);
    });
  }

  it('a column cut to 30 men fails, naming the band', () => {
    const map = load('sao-luiz-ramada');
    map.columnForce = { sections: ['comando', 'veteranos-gauchos', 'esquadra-5', 'esquadra-4', 'esquadra-4', 'esquadra-5'] };
    expect(validateCampaignForces(map)).toEqual(['column force of 30 men, outside 40-55']);
  });

  it('an emptied north-east fails, naming the quarter', () => {
    const map = load('sao-luiz-ramada');
    map.eventPlaces = (map.eventPlaces ?? []).filter((place) => place.kind !== 'entry' || place.point.x < 0 || place.point.y > 0);
    map.events = (map.events ?? []).filter((event) => !event.actions.some((action) => action.kind === 'troops' && action.entry === 5));
    expect(validateCampaignForces(map)).toContain('the north-east quarter holds no objective, deployment area, entry point or event area');
  });

  it('a late first arrival and a too-late one fail', () => {
    const map = load('catanduvas');
    for (const event of map.events ?? []) if (event.trigger?.kind === 'time' && event.trigger.seconds > 1) event.trigger.seconds += 600;
    const errors = validateCampaignForces(map);
    expect(errors.some((error) => error.startsWith('first enemy arrival at'))).toBe(true);
    expect(errors.some((error) => error.includes('after 540 s'))).toBe(true);
  });

  it('the small campaign maps keep their forces and are not judged', () => {
    const copacabana = load('copacabana');
    expect(copacabana.columnForce?.sections).toEqual(['comando', 'esquadra-5', 'esquadra-5', 'esquadra-4']);
    expect(copacabana.enemyForces?.map((preset) => preset.sections)).toEqual([
      ['comando-companhia', 'infantaria-exercito', 'infantaria-exercito', 'metralhadora-legalista'],
      ['comando-companhia', 'infantaria-exercito', 'infantaria-exercito', 'fuzil-metralhador-legalista'],
    ]);
    for (const id of ['copacabana', 'ponte-de-verdinho', 'la-gaiba']) expect(validateCampaignForces(load(id))).toEqual([]);
  });
});
