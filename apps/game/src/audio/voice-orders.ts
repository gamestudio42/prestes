import type { VoiceOrder } from '@prestes/content';
import type { Command } from '@prestes/shared';

/**
 * ambient-sound-and-voices 5.4: the spoken order of a player's command, or
 * null for a command no one speaks (stance, formation, pace, deployment and
 * the tools of the sandbox).
 */
export function commandOrder(command: Command): VoiceOrder | null {
  switch (command.type) {
    case 'move':
    case 'move_line':
      return 'move';
    case 'withdraw':
      return 'withdraw';
    case 'hold':
      return 'hold';
    case 'attack':
      return 'attack';
    case 'suppress':
      return 'suppress';
    case 'flank':
      return 'flank';
    case 'area_fire':
      return 'area-fire';
    case 'face':
      return 'aim';
    case 'assault':
      return 'assault';
    case 'fire_control':
      return `fire-${command.mode}`;
    case 'hold_fire':
      return command.hold ? 'fire-hold' : 'fire-free';
    case 'order':
      switch (command.order) {
        case 'advance':
        case 'defend':
        case 'recon':
        case 'enter':
        case 'exit':
        case 'assault':
          return command.order;
        default:
          return null;
      }
    default:
      return null;
  }
}

/** The units a command is given to, if any. */
export function commandUnits(command: Command): readonly number[] {
  return 'unitIds' in command && Array.isArray(command.unitIds) ? command.unitIds : [];
}
