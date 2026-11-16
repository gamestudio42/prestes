/**
 * make-campaign-playable D3: the result a campaign battle records, built from
 * its first ended frame.
 */
import type { Frame } from '@prestes/shared';
import type { CampaignResult } from './progress';

/** The result of an ended frame, or null while the battle is still playing. */
export function campaignResult(frame: Pick<Frame, 'outcome' | 'events' | 'units' | 'clock' | 'tick' | 'difficulty'>): CampaignResult | null {
  if (frame.outcome === 'playing') return null;
  const end = frame.events.find((event) => event.type === 'outcome');
  const decidedBy = end?.type === 'outcome' ? end.decidedBy : undefined;
  const columnLost = frame.units.filter((unit) => unit.faction === 'column' && !unit.dummy && (!unit.alive || unit.incapacitated)).length;
  return {
    outcome: frame.outcome,
    // The battle clock runs from the end of deployment; without one, the whole battle.
    ticks: frame.clock?.tick ?? frame.tick,
    columnLost,
    ...(decidedBy === undefined ? {} : { decidedBy }),
    ...(frame.difficulty === undefined ? {} : { level: frame.difficulty }),
  };
}
