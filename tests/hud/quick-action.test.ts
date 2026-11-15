import { describe, expect, it } from 'vitest';
import type { PositionDef } from '../../packages/shared/src';
import { ASSAULT_RANGE } from '../../packages/simulation/src/systems/assault';
import {
  QUICK_ASSAULT_RANGE,
  buildingOrder,
  cursorHint,
  quickAction,
  type QuickContext,
} from '../../apps/game/src/hooks/quickAction';
import { CURSOR_ICONS, CURSOR_LABELS } from '../../apps/game/src/ui/hud/orderMeta';
import { iconSliceNames } from '../../apps/game/src/ui/icons';

function position(id: number, overrides: Partial<PositionDef> = {}): PositionDef {
  return {
    id,
    kind: 'building',
    capacity: 4,
    cover: 0.6,
    entrances: [{ x: 0, y: -4 }],
    ports: [],
    coverIds: [id],
    x: 0,
    y: 0,
    ...overrides,
  };
}

const HOUSE = position(10);
const SHED = position(11, { capacity: 0 });
const TRENCH = position(12, { kind: 'trench-line' });

function context(overrides: Partial<QuickContext> = {}): QuickContext {
  return {
    side: 'column',
    from: { x: 0, y: -10 },
    positions: [HOUSE, SHED, TRENCH],
    garrisons: [],
    hurry: false,
    waterAt: () => 0,
    coverAt: () => false,
    ...overrides,
  };
}

const onHouse = { kind: 'building', buildingId: HOUSE.id, point: { x: 0, y: 0 } } as const;

describe('right-click on a building (hud-icons-and-cursors)', () => {
  it('enters an empty building', () => {
    expect(quickAction(onHouse, context())).toEqual({ action: 'enter', positionId: HOUSE.id });
  });

  it('enters a building our own men hold', () => {
    const garrisons = [{ positionId: HOUSE.id, side: 'column' }];
    expect(quickAction(onHouse, context({ garrisons }))).toEqual({ action: 'enter', positionId: HOUSE.id });
  });

  it('assaults a building the enemy holds', () => {
    const garrisons = [{ positionId: HOUSE.id, side: 'legalist' }];
    expect(quickAction(onHouse, context({ garrisons }))).toEqual({ action: 'assault', positionId: HOUSE.id });
  });

  it('marks an assault from beyond the range the simulation allows', () => {
    const garrisons = [{ positionId: HOUSE.id, side: 'legalist' }];
    const decision = quickAction(onHouse, context({ garrisons, from: { x: 0, y: -40 } }));
    expect(decision).toEqual({ action: 'assault', positionId: HOUSE.id, far: true });
    expect(cursorHint(decision)).toBe('assault-far');
  });

  it('keeps the assault range in step with the simulation', () => {
    expect(QUICK_ASSAULT_RANGE).toBe(ASSAULT_RANGE);
  });

  it('sees the legalists side the same way round', () => {
    const garrisons = [{ positionId: HOUSE.id, side: 'column' }];
    expect(quickAction(onHouse, context({ side: 'legalist', garrisons })).action).toBe('assault');
    expect(buildingOrder(HOUSE.id, 'legalist', [{ positionId: HOUSE.id, side: 'legalist' }])).toBe('enter');
  });

  it('treats a building no one can enter as ground', () => {
    const hit = { kind: 'building', buildingId: SHED.id, point: { x: 5, y: 5 } } as const;
    expect(quickAction(hit, context()).action).toBe('move');
  });

  it('never takes a trench line for a building', () => {
    const hit = { kind: 'building', buildingId: TRENCH.id, point: { x: 5, y: 5 } } as const;
    expect(quickAction(hit, context()).action).toBe('move');
  });

  it('assaults the building an enemy at a window holds', () => {
    const garrisons = [{ positionId: HOUSE.id, side: 'legalist' }];
    const hit = { kind: 'unit', faction: 'legalist', garrison: HOUSE.id } as const;
    expect(quickAction(hit, context({ garrisons }))).toEqual({ action: 'assault', positionId: HOUSE.id });
  });
});

describe('right-click on men and ground (hud-icons-and-cursors)', () => {
  it('attacks an enemy in the open', () => {
    expect(quickAction({ kind: 'unit', faction: 'legalist' }, context()).action).toBe('attack');
  });

  it('rescues a wounded comrade and selects an able one (no badge)', () => {
    expect(quickAction({ kind: 'unit', faction: 'column', incapacitated: true }, context()).action).toBe('rescue');
    const select = quickAction({ kind: 'unit', faction: 'column' }, context());
    expect(select.action).toBe('select');
    expect(cursorHint(select)).toBeNull();
  });

  it('shows a move as wading, taking cover or running where it applies', () => {
    const ground = { kind: 'ground', point: { x: 3, y: 3 } } as const;
    expect(quickAction(ground, context()).action).toBe('move');
    expect(quickAction(ground, context({ hurry: true })).action).toBe('run');
    expect(quickAction(ground, context({ coverAt: () => true, hurry: true })).action).toBe('cover');
    expect(quickAction(ground, context({ waterAt: () => 1, coverAt: () => true })).action).toBe('ford');
  });
});

describe('cursor badges', () => {
  it('draws every badge from the sheet and names it', () => {
    const slices = new Set(iconSliceNames());
    for (const [hint, icon] of Object.entries(CURSOR_ICONS)) {
      expect(slices.has(icon.slice), hint).toBe(true);
      expect(CURSOR_LABELS[hint as keyof typeof CURSOR_LABELS], hint).toBeDefined();
    }
  });

  it('tells entering from assaulting at a glance', () => {
    expect(CURSOR_ICONS.enter.slice).not.toBe(CURSOR_ICONS.assault.slice);
  });
});
