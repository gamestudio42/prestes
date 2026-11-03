import {
  Box,
  Compass,
  Crosshair,
  Eye,
  Hand,
  Heart,
  Move,
  Shield,
  Undo2,
  User,
  Users,
  Zap,
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

export const ORDER_ICONS: Record<string, typeof Crosshair> = {
  attack: Crosshair,
  suppress: Shield,
  move: Move,
  withdraw: Undo2,
  hold: Hand,
  aim: Compass,
  flank: Users,
  rescue: Heart,
  recon: Eye,
  regroup: Users,
  disperse: Users,
  reserve: Box,
  ambush: Eye,
  pursue: Crosshair,
  advance: Move,
  defend: Shield,
};

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

export const POSTURE_ICONS: Record<Posture, typeof Shield> = {
  balanced: Shield,
  aggressive: Zap,
  defensive: Eye,
  'protect-officer': User,
};

export const POSTURE_LABELS: Record<Posture, MessageKey> = {
  balanced: 'hud.postureBalanced',
  aggressive: 'hud.postureAggressive',
  defensive: 'hud.postureDefensive',
  'protect-officer': 'hud.postureProtectOfficer',
};

export const ORDER_SECTORS: readonly OrderCategory[] = ['fire', 'movement', 'troop'];
