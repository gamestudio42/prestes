import { afterEach, describe, expect, it } from 'vitest';
import {
  activeMapRuntime,
  BRIDGE_RAMP,
  compileMapDocument,
  createEditableMap,
  findPath,
  HEIGHT_SPACING,
  runtimeBridgeDeckAt,
  setActiveMap,
  terrainHeightAt,
  terrainSurfaceAt,
  waterAt,
} from '../src';
import { TEST_MAP } from './fixtures/test-map';

// refine-map-editor 4.1: a bridge rests on its abutments.
afterEach(() => setActiveMap(TEST_MAP));

describe('bridges', () => {
  it('deck over a high bank: no ground through the deck, no step at the landings, men cross bank to bank', () => {
    const map = createEditableMap({ id: 'bridge-doc', size: 'small', name: { en: 'B', 'pt-BR': 'B' } });
    // Banks 1.5 m above the water.
    map.heights.fill(Math.round((map.waterLevel + 1.5) * 100));
    map.rivers.push({ id: 1, width: 14, points: [{ x: -120, y: 0 }, { x: 120, y: 0 }], kinds: ['deep'] });
    const span = { id: 1, x: 0, y: 0, rotation: 0, halfWidth: 2.5, halfDepth: 12, deckHeight: 1.6 };
    map.bridges.push(span);
    const compiled = compileMapDocument(map);
    setActiveMap(compiled);
    const runtime = activeMapRuntime()!;
    const bridge = compiled.bridges[0]!;
    const bank = map.waterLevel + 1.5;

    // The deck meets each bank at the bank's height and clears the water in the middle.
    expect(runtimeBridgeDeckAt(runtime, bridge, 0, -12)).toBeCloseTo(bank, 1);
    expect(runtimeBridgeDeckAt(runtime, bridge, 0, 12)).toBeCloseTo(bank, 1);
    expect(runtimeBridgeDeckAt(runtime, bridge, 0, 0)).toBeGreaterThanOrEqual(map.waterLevel + 1.6 - 1e-6);

    // No ground node under the span (between the ramps, rails included) comes within 0.4 m of the deck.
    for (let row = 0; row < runtime.heightRows; row += 1) {
      for (let column = 0; column < runtime.heightColumns; column += 1) {
        const x = runtime.minX + column * HEIGHT_SPACING;
        const y = runtime.minY + row * HEIGHT_SPACING;
        if (Math.abs(x) > span.halfWidth || Math.abs(y) > span.halfDepth - BRIDGE_RAMP) continue;
        const ground = runtime.heights[row * runtime.heightColumns + column]!;
        expect(runtimeBridgeDeckAt(runtime, bridge, x, y) - ground).toBeGreaterThanOrEqual(0.39);
      }
    }

    // Walking the centreline from bank to bank: no step anywhere.
    let previous = terrainHeightAt(0, -20);
    for (let y = -20; y <= 20; y += 0.25) {
      const height = terrainHeightAt(0, y);
      expect(Math.abs(height - previous)).toBeLessThan(0.2);
      previous = height;
    }
    expect(terrainSurfaceAt(0, 0)).toBe('bridge');
    expect(waterAt(6, 0)).toBe(2);

    // Men cross it: a path between the banks 30 m off the bridge goes over the deck.
    const path = findPath({ x: -30, y: -40 }, { x: -30, y: 40 }, compiled.covers);
    expect(path.length).toBeGreaterThan(0);
    expect(path.at(-1)!.y).toBeGreaterThan(35);
    // The route lands on the far bank at the bridge's end.
    expect(path.some((point) => Math.abs(point.x) <= span.halfWidth && point.y >= span.halfDepth && point.y <= span.halfDepth + 3)).toBe(true);
  });

  it('a hand-written bridge over low banks keeps its flat deck between the ramps', () => {
    // Serra-rio's banks sit below its 2.4 m deck: the core is the water clearance.
    const map = createEditableMap({ id: 'bridge-low', size: 'small', name: { en: 'L', 'pt-BR': 'L' } });
    map.heights.fill(Math.round((map.waterLevel + 0.6) * 100));
    map.rivers.push({ id: 1, width: 14, points: [{ x: -120, y: 0 }, { x: 120, y: 0 }], kinds: ['deep'] });
    map.bridges.push({ id: 1, x: 0, y: 0, rotation: Math.PI / 6, halfWidth: 2.5, halfDepth: 12, deckHeight: 2.4 });
    const compiled = compileMapDocument(map);
    setActiveMap(compiled);
    const runtime = activeMapRuntime()!;
    const bridge = compiled.bridges[0]!;
    for (const along of [-8, -4, 0, 4, 8]) {
      const x = -along * Math.sin(bridge.rotation);
      const y = along * Math.cos(bridge.rotation);
      expect(runtimeBridgeDeckAt(runtime, bridge, x, y)).toBeCloseTo(map.waterLevel + 2.4, 5);
    }
  });
});
