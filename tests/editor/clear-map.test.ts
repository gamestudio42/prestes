import { describe, expect, it } from 'vitest';
import { createEditableMap, objectiveCircle } from '../../packages/shared/src';
import { EditorStore } from '../../apps/game/src/editor/store';

// The editor's "clear map" button.

describe('clear map', () => {
  it('wipes what is drawn, keeps the properties and deployment, and undoes in one step', () => {
    const map = createEditableMap({ id: 'clear-test', size: 'small', name: { en: 'Clear', 'pt-BR': 'Limpar' }, baseMaterial: 'dry-grass', palette: 'cerrado' });
    map.heights[5] = 300;
    map.paint[7] = 0;
    map.vegetation[9] = 3;
    map.objects.push({ id: 1, type: 'cerrado-tree', x: 0, y: 0, rotation: 0, scale: 1 } as (typeof map.objects)[number]);
    map.objectives = [{ id: 1, name: { en: 'Hill', 'pt-BR': 'Morro' }, area: objectiveCircle({ x: 0, y: 0 }, 16), flag: { x: 0, y: 0 }, value: 1, owner: 'neutral' }];
    const store = new EditorStore(map);
    const deployment = JSON.stringify(store.map.deployment);

    store.clearMap();
    expect(Math.max(...store.map.heights)).toBe(0);
    expect(store.map.vegetation.every((cell) => cell === 0)).toBe(true);
    expect(new Set(store.map.paint).size).toBe(1);
    expect(store.map.objects).toHaveLength(0);
    expect(store.map.objectives).toBeUndefined();
    expect(store.map.palette).toBe('cerrado');
    expect(store.map.name.en).toBe('Clear');
    expect(JSON.stringify(store.map.deployment)).toBe(deployment);

    store.undo();
    expect(store.map.heights[5]).toBe(300);
    expect(store.map.vegetation[9]).toBe(3);
    expect(store.map.objects).toHaveLength(1);
    expect(store.map.objectives).toHaveLength(1);
  });
});
