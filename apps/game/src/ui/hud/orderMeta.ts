import { pixelIcon, type PixelIconComponent } from '../icons';
import type { MessageKey, OrderActivation, OrderCategory } from '@prestes/content';
import type { Posture, UnitOrder } from '@prestes/shared';
import type { CursorHint } from '../../hooks/quickAction';

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
    case 'area-fire':
      return 'AreaFire';
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
    case 'enter':
      return 'Enter';
    case 'exit':
      return 'Exit';
    case 'assault':
      return 'Assault';
  }
}

/**
 * One icon per control. Every control in this map can be on screen at the same
 * time, so no two entries may share an icon (checked by a unit test).
 */
export const ICONS = {
  attack: pixelIcon('order-attack'),
  suppress: pixelIcon('order-suppress'),
  // scrub-concealment-and-area-fire: bursts inside the corners of an area (drawn 2026-11-12).
  'area-fire': pixelIcon('order-area-fire'),
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
  enter: pixelIcon('order-enter'),
  exit: pixelIcon('order-exit'),
  assault: pixelIcon('order-assault'),
  'posture-balanced': pixelIcon('posture-balanced'),
  'posture-aggressive': pixelIcon('posture-aggressive'),
  'posture-defensive': pixelIcon('posture-defensive'),
  'posture-protect-officer': pixelIcon('posture-protect-officer'),
  'stance-standing': pixelIcon('stance-standing'),
  'stance-crouched': pixelIcon('stance-crouched'),
  'stance-prone': pixelIcon('stance-prone'),
  'hold-fire': pixelIcon('hold-fire'),
  // hud-icons-and-cursors: free fire has its own rifle and flash (it showed Attack's sight).
  'fire-free': pixelIcon('fire-free'),
  'fire-contact': pixelIcon('fire-contact'),
  'formation-line': pixelIcon('formation-line'),
  'formation-column': pixelIcon('formation-column'),
  'formation-wedge': pixelIcon('formation-wedge'),
  'formation-free': pixelIcon('formation-free'),
  bounding: pixelIcon('control-bounding'),
  clear: pixelIcon('control-clear'),
  preview: pixelIcon('control-preview'),
  codex: pixelIcon('ui-codex'),
} as const satisfies Record<string, PixelIconComponent>;

export type IconId = keyof typeof ICONS;

export function orderIcon(orderId: string): PixelIconComponent | undefined {
  return (ICONS as Record<string, PixelIconComponent>)[orderId];
}

/**
 * hud-icons-and-cursors: the badge beside the pointer for what a right-click
 * will do there. Orders show their board icon; moves have their own.
 */
export const CURSOR_ICONS: Record<CursorHint, PixelIconComponent> = {
  move: pixelIcon('cursor-move'),
  run: pixelIcon('cursor-run'),
  cover: pixelIcon('cursor-cover'),
  ford: pixelIcon('cursor-ford'),
  attack: ICONS.attack,
  rescue: ICONS.rescue,
  enter: ICONS.enter,
  assault: ICONS.assault,
  'assault-far': ICONS.assault,
};

export const CURSOR_LABELS: Record<CursorHint, MessageKey> = {
  move: 'hud.cursor.move',
  run: 'hud.cursor.run',
  cover: 'hud.cursor.cover',
  ford: 'hud.cursor.ford',
  attack: 'hud.cursor.attack',
  rescue: 'hud.cursor.rescue',
  enter: 'hud.cursor.enter',
  assault: 'hud.cursor.assault',
  'assault-far': 'hud.cursor.assaultFar',
};

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
