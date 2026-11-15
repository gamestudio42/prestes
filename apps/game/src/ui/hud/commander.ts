import { FIGURES, type MessageKey } from '@prestes/content';
import type { MapCommander, SimEvent } from '@prestes/shared';
import type { Translate } from './orderMeta';

/**
 * add-historical-commander D7: what the HUD shows of the map's field
 * commander. The simulation only flags his unit; the name and role come from
 * the figure registry through the map document.
 */
export interface CommanderView {
  /** The registry's proper name, never translated. */
  name: string;
  roleKey: MessageKey;
}

/** The field commander's name and role, or null (no commander, a voice, or an unknown figure). */
export function commanderView(commander: MapCommander | undefined): CommanderView | null {
  if (!commander || commander.presence !== 'field') return null;
  const figure = FIGURES.find((entry) => entry.id === commander.figure);
  return figure ? { name: figure.displayName, roleKey: figure.roleKey } : null;
}

/** The HUD's line when he falls, in the game's language. */
export function commanderDownText(event: Extract<SimEvent, { type: 'commander_down' }>, view: CommanderView, t: Translate): string {
  return t(event.cause === 'killed' ? 'commander.down.killed' : 'commander.down.incapacitated', { name: view.name });
}
