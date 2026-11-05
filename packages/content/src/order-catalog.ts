import type { MessageKey } from './locales';

export type OrderCategory = 'movement' | 'fire' | 'position';
export type OrderActivation = 'target' | 'area' | 'immediate' | 'direction';

export interface OrderDefinition {
  id: string;
  category: OrderCategory;
  activation: OrderActivation;
  labelKey: MessageKey;
  tipKey: MessageKey;
}

/**
 * The nine orders of the board (compact-orders), grouped by what the section
 * does: move, fight, hold ground. Aim, disperse, regroup, reserve, ambush,
 * pursue and protect-officer live on as the facing and spacing drag, fire
 * control, posture and automatic behaviour; rescue starts from the wounded
 * comrade (right-click).
 */
export const ORDER_CATALOG: readonly OrderDefinition[] = [
  { id: 'move', category: 'movement', activation: 'area', labelKey: 'hud.orderMove', tipKey: 'hud.tip.move' },
  { id: 'advance', category: 'movement', activation: 'area', labelKey: 'hud.orderAdvance', tipKey: 'hud.tip.advance' },
  { id: 'withdraw', category: 'movement', activation: 'immediate', labelKey: 'hud.orderWithdraw', tipKey: 'hud.tip.withdraw' },
  { id: 'hold', category: 'movement', activation: 'immediate', labelKey: 'hud.orderHold', tipKey: 'hud.tip.hold' },
  { id: 'attack', category: 'fire', activation: 'target', labelKey: 'hud.orderAttack', tipKey: 'hud.tip.attack' },
  { id: 'suppress', category: 'fire', activation: 'target', labelKey: 'hud.orderSuppress', tipKey: 'hud.tip.suppress' },
  { id: 'flank', category: 'fire', activation: 'target', labelKey: 'hud.orderFlank', tipKey: 'hud.tip.flank' },
  { id: 'defend', category: 'position', activation: 'area', labelKey: 'hud.orderDefend', tipKey: 'hud.tip.defend' },
  { id: 'recon', category: 'position', activation: 'area', labelKey: 'hud.orderRecon', tipKey: 'hud.tip.recon' },
];

export const ORDER_CATEGORY_LABELS: Record<OrderCategory, MessageKey> = {
  movement: 'hud.orderGroupMovement',
  fire: 'hud.orderGroupFire',
  position: 'hud.orderGroupPosition',
};
