import type { MessageKey } from './locales';

export type OrderCategory = 'fire' | 'movement' | 'troop';
export type OrderActivation = 'target' | 'area' | 'immediate' | 'direction';

export interface OrderDefinition {
  id: string;
  category: OrderCategory;
  activation: OrderActivation;
  labelKey: MessageKey;
  tipKey: MessageKey;
}

export const ORDER_CATALOG: readonly OrderDefinition[] = [
  {
    id: 'attack',
    category: 'fire',
    activation: 'target',
    labelKey: 'hud.orderAttack',
    tipKey: 'hud.tip.attack',
  },
  {
    id: 'suppress',
    category: 'fire',
    activation: 'target',
    labelKey: 'hud.orderSuppress',
    tipKey: 'hud.tip.suppress',
  },
  {
    id: 'move',
    category: 'movement',
    activation: 'area',
    labelKey: 'hud.orderMove',
    tipKey: 'hud.tip.move',
  },
  {
    id: 'withdraw',
    category: 'movement',
    activation: 'immediate',
    labelKey: 'hud.orderWithdraw',
    tipKey: 'hud.tip.withdraw',
  },
  {
    id: 'hold',
    category: 'movement',
    activation: 'immediate',
    labelKey: 'hud.orderHold',
    tipKey: 'hud.tip.hold',
  },
  {
    id: 'aim',
    category: 'movement',
    activation: 'direction',
    labelKey: 'hud.orderFace',
    tipKey: 'hud.tip.face',
  },
  {
    id: 'advance',
    category: 'movement',
    activation: 'area',
    labelKey: 'hud.orderAdvance',
    tipKey: 'hud.tip.advance',
  },
  {
    id: 'flank',
    category: 'troop',
    activation: 'target',
    labelKey: 'hud.orderFlank',
    tipKey: 'hud.tip.flank',
  },
  {
    id: 'rescue',
    category: 'troop',
    activation: 'target',
    labelKey: 'hud.orderRescue',
    tipKey: 'hud.tip.rescue',
  },
  {
    id: 'recon',
    category: 'troop',
    activation: 'area',
    labelKey: 'hud.orderRecon',
    tipKey: 'hud.tip.recon',
  },



  {
    id: 'ambush',
    category: 'troop',
    activation: 'area',
    labelKey: 'hud.orderAmbush',
    tipKey: 'hud.tip.ambush',
  },
  {
    id: 'pursue',
    category: 'troop',
    activation: 'target',
    labelKey: 'hud.orderPursue',
    tipKey: 'hud.tip.pursue',
  },

  {
    id: 'defend',
    category: 'troop',
    activation: 'area',
    labelKey: 'hud.orderDefend',
    tipKey: 'hud.tip.defend',
  },
  {
    id: 'disperse',
    category: 'troop',
    activation: 'area',
    labelKey: 'hud.orderDisperse',
    tipKey: 'hud.tip.disperse',
  },
  {
    id: 'reserve',
    category: 'troop',
    activation: 'area',
    labelKey: 'hud.orderReserve',
    tipKey: 'hud.tip.reserve',
  },
  {
    id: 'regroup',
    category: 'troop',
    activation: 'immediate',
    labelKey: 'hud.orderRegroup',
    tipKey: 'hud.tip.regroup',
  },
];

export const ORDER_CATEGORY_LABELS: Record<OrderCategory, MessageKey> = {
  fire: 'hud.orderGroupFire',
  movement: 'hud.orderGroupMovement',
  troop: 'hud.orderGroupTroop',
};

