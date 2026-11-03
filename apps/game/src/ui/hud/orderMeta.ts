import {
  Ban,
  Binoculars,
  BookOpen,
  ChevronDown,
  ChevronsUp,
  Compass,
  CornerUpRight,
  Crosshair,
  Eraser,
  Expand,
  FlaskConical,
  Flame,
  Footprints,
  Hand,
  HeartPulse,
  Layers,
  Minus,
  Move,
  PersonStanding,
  Route,
  Scale,
  Shield,
  ShieldHalf,
  Shrink,
  Split,
  Swords,
  TreePine,
  Undo2,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
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
  attack: Crosshair,
  suppress: Flame,
  move: Move,
  withdraw: Undo2,
  hold: Hand,
  aim: Compass,
  advance: ChevronsUp,
  flank: CornerUpRight,
  rescue: HeartPulse,
  recon: Binoculars,
  ambush: TreePine,
  pursue: Footprints,
  defend: Shield,
  disperse: Expand,
  reserve: Layers,
  regroup: Shrink,
  'posture-balanced': Scale,
  'posture-aggressive': Swords,
  'posture-defensive': ShieldHalf,
  'posture-protect-officer': UserCheck,
  'stance-standing': PersonStanding,
  'stance-crouched': ChevronDown,
  'stance-prone': Minus,
  'hold-fire': Ban,
  bounding: Split,
  clear: Eraser,
  preview: Route,
  codex: BookOpen,
  sandbox: FlaskConical,
} as const satisfies Record<string, LucideIcon>;

export type IconId = keyof typeof ICONS;

export function orderIcon(orderId: string): LucideIcon | undefined {
  return (ICONS as Record<string, LucideIcon>)[orderId];
}

export const ACTIVATION_LABEL: Record<OrderActivation, MessageKey> = {
  target: 'hud.activationTarget',
  area: 'hud.activationArea',
  immediate: 'hud.activationImmediate',
  direction: 'hud.activationDirection',
};

export const POSTURES: readonly Posture[] = [
  'balanced',
  'aggressive',
  'defensive',
  'protect-officer',
];

export const POSTURE_ICONS: Record<Posture, LucideIcon> = {
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

export const ORDER_SECTORS: readonly OrderCategory[] = ['fire', 'movement', 'troop'];
