import { authoredMapIds, compileMapDocument, registerBattleMap, type BattleMap, type BattleMapId, type MapDocument } from '@prestes/shared';
import { listStored } from '../../editor/persistence';
import { drawPrint } from './playerPrint';

/**
 * player-skirmish-maps: the maps the player made or imported in the editor
 * (kept in this browser) lie on the skirmish pile with the game's maps and
 * play as skirmishes. A map with an authored map's id is left off, so a
 * player map never replaces one of the game's; the campaign plays only its
 * own maps.
 */

const DOCUMENTS = new Map<BattleMapId, MapDocument>();
/** Each player map's print, drawn from the map (D4). */
const PRINTS = new Map<BattleMapId, string>();

/** The kept documents that may lie on the table: not an authored id. */
export function playableDocuments(documents: readonly MapDocument[], authored: readonly BattleMapId[]): MapDocument[] {
  const taken = new Set(authored);
  return documents.filter((document) => !taken.has(document.id));
}

/**
 * Reads the editor's kept maps, compiles each (one that does not compile is
 * left off), and registers it for battle in this thread.
 */
export async function loadPlayerMaps(): Promise<BattleMap[]> {
  const maps: BattleMap[] = [];
  DOCUMENTS.clear();
  PRINTS.clear();
  for (const document of playableDocuments(await listStored(), authoredMapIds())) {
    try {
      const map = compileMapDocument(document);
      registerBattleMap(map);
      DOCUMENTS.set(document.id, document);
      const print = drawPrint(document);
      if (print) PRINTS.set(document.id, print);
      maps.push(map);
    } catch (error) {
      console.warn(`player map ${document.id} could not be compiled`, error);
    }
  }
  return maps;
}

/** The player's document for a map id, for the battle's worker. */
export function playerMapDocument(id: BattleMapId): MapDocument | undefined {
  return DOCUMENTS.get(id);
}

/** The print drawn for a player map, if any. */
export function playerPrint(id: BattleMapId): string | undefined {
  return PRINTS.get(id);
}
