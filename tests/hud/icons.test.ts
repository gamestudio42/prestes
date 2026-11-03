import { describe, expect, it } from 'vitest';
import { ORDER_CATALOG } from '../../packages/content/src';
import { ICONS, POSTURES, POSTURE_ICONS, orderIcon } from '../../apps/game/src/ui/hud/orderMeta';

describe('HUD icon map', () => {
  it('gives every catalogue order its own icon', () => {
    const missing = ORDER_CATALOG.filter((entry) => !orderIcon(entry.id)).map((entry) => entry.id);
    expect(missing).toEqual([]);
  });

  it('gives every posture an icon', () => {
    expect(POSTURES.every((posture) => POSTURE_ICONS[posture] !== undefined)).toBe(true);
  });

  it('never shows the same icon for two controls', () => {
    const owners = new Map<unknown, string[]>();
    for (const [id, icon] of Object.entries(ICONS)) {
      owners.set(icon, [...(owners.get(icon) ?? []), id]);
    }
    const shared = [...owners.values()].filter((ids) => ids.length > 1);
    expect(shared).toEqual([]);
  });

  it('lists all sixteen orders on the board', () => {
    expect(ORDER_CATALOG.map((entry) => entry.id).sort()).toEqual(
      [
        'advance', 'aim', 'ambush', 'attack', 'defend', 'disperse', 'flank', 'hold',
        'move', 'pursue', 'recon', 'regroup', 'rescue', 'reserve', 'suppress', 'withdraw',
      ].sort(),
    );
  });
});
