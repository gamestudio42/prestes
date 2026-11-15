import type { MessageKey } from './locales';
import { isSourceKey, type SourceKey } from './sources';

export type ContentLabel = 'historical' | 'dramatized' | 'fictional';

export interface HistoricalFigure {
  id: string;
  displayName: string;
  roleKey: MessageKey;
  playable: boolean;
  labels: readonly ContentLabel[];
  sourceRefs: readonly SourceKey[];
}

export interface MissionMetadata {
  id: string;
  commanderId: string;
  perspective: string;
  historicalDate: string;
  sourceRefs: readonly string[];
}

export const FIGURES: readonly HistoricalFigure[] = [
  {
    id: 'siqueira-campos',
    displayName: 'Antônio de Siqueira Campos',
    roleKey: 'figure.siqueira.role',
    playable: true,
    labels: ['historical'],
    sourceRefs: ['macaulay-1974', 'helio-1922', 'castro-2022'],
  },
  {
    id: 'luis-carlos-prestes',
    displayName: 'Luís Carlos Prestes',
    roleKey: 'figure.prestes.role',
    playable: true,
    labels: ['historical'],
    sourceRefs: ['macaulay-1974', 'blanc-2024', 'amado-1942', 'anita-1991'],
  },
  // add-historical-commander: chapter commanders, playable since they command a campaign map.
  {
    id: 'miguel-costa',
    displayName: 'Miguel Costa',
    roleKey: 'figure.miguel-costa.role',
    playable: true,
    labels: ['historical'],
    sourceRefs: ['macaulay-1974', 'castro-2016', 'tavora-1928'],
  },
  {
    id: 'isidoro-dias-lopes',
    displayName: 'Isidoro Dias Lopes',
    roleKey: 'figure.isidoro.role',
    playable: true,
    labels: ['historical'],
    sourceRefs: ['macaulay-1974', 'castro-2022'],
  },
];

export function validateFigures(
  figures: readonly HistoricalFigure[],
  sourceKeys: readonly string[] = [],
): string[] {
  const errors: string[] = [];
  const knownSources = new Set(sourceKeys);
  const ids = new Set<string>();

  for (const figure of figures) {
    if (!figure.id) {
      errors.push('figure without id');
    } else if (ids.has(figure.id)) {
      errors.push(`duplicate figure id: ${figure.id}`);
    } else {
      ids.add(figure.id);
    }
    if (!figure.displayName) {
      errors.push(`figure without display name: ${figure.id}`);
    }
    if (!figure.roleKey) {
      errors.push(`figure without role key: ${figure.id}`);
    }
    if (figure.labels.length === 0) {
      errors.push(`figure without label: ${figure.id}`);
    }
    if (figure.sourceRefs.length === 0) {
      errors.push(`figure without source: ${figure.id}`);
    }
    for (const source of figure.sourceRefs) {
      if (knownSources.size > 0 && !knownSources.has(source)) {
        errors.push(`figure ${figure.id} references unknown source: ${source}`);
      }
    }
  }

  return errors;
}

export function validateMissionCommander(
  mission: MissionMetadata,
  figures: readonly HistoricalFigure[] = FIGURES,
): string[] {
  const errors: string[] = [];
  const commander = figures.find((figure) => figure.id === mission.commanderId);
  if (!commander) {
    errors.push(`unknown commander: ${mission.commanderId}`);
  } else if (!commander.playable) {
    errors.push(`non-playable commander: ${mission.commanderId}`);
  }
  if (!mission.perspective) {
    errors.push(`mission without perspective: ${mission.id}`);
  }
  if (!mission.historicalDate) {
    errors.push(`mission without historical date: ${mission.id}`);
  }
  if (mission.sourceRefs.length === 0) {
    errors.push(`mission without sources: ${mission.id}`);
  }
  for (const source of mission.sourceRefs) {
    if (!isSourceKey(source)) {
      errors.push(`mission ${mission.id} references unknown source: ${source}`);
    }
  }
  return errors;
}

/** What the map commander check needs of a map document (add-historical-commander 1.3). */
export interface MapCommanderRef {
  id: string;
  use: string;
  mission?: string;
  commander?: { figure: string };
}

/**
 * add-historical-commander 1.3: a campaign map's commander is a registered,
 * playable figure and the commander of its mission's chapter.
 */
export function validateMapCommander(
  map: MapCommanderRef,
  chapters: readonly { id: string; commanderId: string }[],
  figures: readonly HistoricalFigure[] = FIGURES,
): string[] {
  if (!map.commander) return [];
  const figureId = map.commander.figure;
  const figure = figures.find((entry) => entry.id === figureId);
  if (!figure) return [`map ${map.id}: unknown commander: ${figureId}`];
  if (!figure.playable) return [`map ${map.id}: non-playable commander: ${figureId}`];
  const chapter = chapters.find((entry) => entry.id === map.mission);
  if (map.use === 'campaign' && chapter && chapter.commanderId !== figureId) {
    return [`map ${map.id}: commander ${figureId} is not the chapter's (${chapter.commanderId})`];
  }
  return [];
}
