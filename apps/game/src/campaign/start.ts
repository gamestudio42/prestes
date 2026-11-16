/**
 * make-campaign-playable D1: what a chapter's battle is started with. The
 * column roster is sent on purpose: with rosters sent, the map's enemy
 * presets are drawn (deterministically, by the engine RNG) and its fixed
 * column force still replaces the column. The chapter id stays in the app.
 */
import { chapterMapId } from '@prestes/content';
import { DEFAULT_ROSTER, type AuthoredMapEntry, type BattleMapId, type BattleRosters } from '@prestes/shared';

export interface CampaignStart {
  map: BattleMapId;
  rosters: BattleRosters;
}

/** The start of a chapter's battle, or null for a chapter without a map. */
export function campaignStart(chapterId: string, index?: readonly AuthoredMapEntry[]): CampaignStart | null {
  const map = chapterMapId(chapterId, index);
  if (!map) return null;
  return { map, rosters: { column: { sections: [...DEFAULT_ROSTER.sections] } } };
}
