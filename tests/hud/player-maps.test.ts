import { describe, expect, it } from 'vitest';
import { createEditableMap, toMapDocument, type BattleMap } from '../../packages/shared/src';
import { playableDocuments } from '../../apps/game/src/ui/menu/playerMaps';
import { mapText } from '../../apps/game/src/ui/menu/SkirmishMaps';
import { freshMapId } from '../../apps/game/src/editor/EditorApp';
import { PRINT_SIZE, printPixels } from '../../apps/game/src/ui/menu/playerPrint';

// player-skirmish-maps: the player's own maps on the skirmish pile.

describe('player maps', () => {
  it('leaves off a kept map with an authored id', () => {
    const own = toMapDocument(createEditableMap({ id: 'meu-vale', size: 'small' }));
    const clash = toMapDocument(createEditableMap({ id: 'paiolzinho', size: 'small' }));
    expect(playableDocuments([own, clash], ['paiolzinho', 'campo-de-provas']).map((document) => document.id)).toEqual(['meu-vale']);
  });

  it('a map with its own empty description shows none, not a message key', () => {
    const map = { id: 'meu-vale', nameKey: 'map.meu-vale.name', descriptionKey: 'map.meu-vale.description', text: { name: { en: 'My vale', 'pt-BR': 'Meu vale' }, description: { en: '', 'pt-BR': '' } } } as unknown as BattleMap;
    expect(mapText(map, 'name', 'pt-BR')).toBe('Meu vale');
    expect(mapText(map, 'description', 'pt-BR')).toBe('');
  });

  it('a new map gets an id of its own from the date and time', () => {
    expect(freshMapId(new Date(2026, 10, 16, 9, 5))).toBe('mapa-20261116-0905');
  });

  it('draws a print of the map: its ground colour, low ground as water', () => {
    const map = createEditableMap({ id: 'meu-vale', size: 'small' });
    const pixels = printPixels(toMapDocument(map));
    expect(pixels.length).toBe(PRINT_SIZE * PRINT_SIZE * 4);
    const grass = [pixels[0], pixels[1], pixels[2]];
    map.heights.fill(-500);
    const flooded = printPixels(toMapDocument(map));
    expect([flooded[0], flooded[1], flooded[2]]).toEqual([62, 92, 108]);
    expect(grass).not.toEqual([62, 92, 108]);
  });
});
