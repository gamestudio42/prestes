import { pixelIcon, type PixelIconComponent } from '../icons';
import type { MessageKey, OrderActivation, OrderCategory } from '@prestes/content';
import type { Posture, UnitOrder } from '@prestes/shared';

export type Translate = (
  key: MessageKey,
  values?: Readonly<Record<string, string | number>>,
) => string;

export function bar(value: number, max: number): string {
  if (max <= 0) {
    return '0%';
  }
  return `${Math.max(0, Math.min(100, Math.round((value / max) * 100)))}%`;
}

export function orderLetter(order: UnitOrder): string {
  switch (order) {
    case 'move':
      return 'Move';
    case 'attack':
      return 'Attack';
    case 'suppress':
      return 'Suppress';
    case 'flank':
      return 'Flank';
    case 'aim':
      return 'Face';
    case 'withdraw':
      return 'Withdraw';
    case 'hold':
      return 'Hold';
    case 'flee':
      return 'Flee';
    case 'advance':
      return 'Advance';
    case 'defend':
      return 'Defend';
    case 'ambush':
      return 'Ambush';
    case 'regroup':
      return 'Regroup';
    case 'pursue':
      return 'Pursue';
    case 'disperse':
      return 'Disperse';
    case 'protect-officer':
      return 'ProtectOfficer';
    case 'recon':
      return 'Recon';
    case 'reserve':
      return 'Reserve';
    case 'rescue':
      return 'Rescue';
  }
}

/**
 * One icon per control. Every control in this map can be on screen at the same
 * time, so no two entries may share an icon (checked by a unit test).
 */
export const ICONS = {
  attack: pixelIcon('order-attack'),
  suppress: pixelIcon('order-suppress'),
  move: pixelIcon('order-move'),
  withdraw: pixelIcon('order-withdraw'),
  hold: pixelIcon('order-hold'),
  aim: pixelIcon('order-aim'),
  advance: pixelIcon('order-advance'),
  flank: pixelIcon('order-flank'),
  rescue: pixelIcon('order-rescue'),
  recon: pixelIcon('order-recon'),
  ambush: pixelIcon('order-ambush'),
  pursue: pixelIcon('order-pursue'),
  defend: pixelIcon('order-defend'),
  disperse: pixelIcon('order-disperse'),
  reserve: pixelIcon('order-reserve'),
  regroup: pixelIcon('order-regroup'),
  'posture-balanced': pixelIcon('posture-balanced'),
  'posture-aggressive': pixelIcon('posture-aggressive'),
  'posture-defensive': pixelIcon('posture-defensive'),
  'posture-protect-officer': pixelIcon('posture-protect-officer'),
  'stance-standing': pixelIcon('stance-standing'),
  'stance-crouched': pixelIcon('stance-crouched'),
  'stance-prone': pixelIcon('stance-prone'),
  'hold-fire': pixelIcon('hold-fire'),
  bounding: pixelIcon('control-bounding'),
  clear: pixelIcon('control-clear'),
  preview: pixelIcon('control-preview'),
  codex: pixelIcon('ui-codex'),
  sandbox: pixelIcon('ui-sandbox'),
} as const satisfies Record<string, PixelIconComponent>;

export type IconId = keyof typeof ICONS;

export function orderIcon(orderId: string): PixelIconComponent | undefined {
  return (ICONS as Record<string, PixelIconComponent>)[orderId];
}

export const ACTIVATION_LABEL: Record<OrderActivation, MessageKey> = {
  target: 'hud.activationTarget',
  area: 'hud.activationArea',
  immediate: 'hud.activationImmediate',
  direction: 'hud.activationDirection',
};

/** Three postures; protecting the officer is automatic (compact-orders). */
export const POSTURES: readonly Posture[] = ['balanced', 'aggressive', 'defensive'];

export const POSTURE_ICONS: Record<Posture, PixelIconComponent> = {
  balanced: ICONS['posture-balanced'],
  aggressive: ICONS['posture-aggressive'],
  defensive: ICONS['posture-defensive'],
  'protect-officer': ICONS['posture-protect-officer'],
};

export const POSTURE_LABELS: Record<Posture, MessageKey> = {
  balanced: 'hud.postureBalanced',
  aggressive: 'hud.postureAggressive',
  defensive: 'hud.postureDefensive',
  'protect-officer': 'hud.postureProtectOfficer',
};

export const ORDER_SECTORS: readonly OrderCategory[] = ['movement', 'fire', 'position'];
