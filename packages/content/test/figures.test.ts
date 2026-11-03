import { describe, expect, it } from 'vitest';
import {
  FIGURES,
  SOURCE_KEYS,
  validateFigures,
  validateMissionCommander,
  type HistoricalFigure,
  type MissionMetadata,
  type SourceKey,
} from '../src';

const baseFigure = FIGURES[0]!;

describe('historical figures', () => {
  it('accepts the vertical-slice roster', () => {
    expect(validateFigures(FIGURES, SOURCE_KEYS)).toEqual([]);
    expect(FIGURES.map((figure) => figure.id)).toEqual(['siqueira-campos', 'luis-carlos-prestes']);
  });

  it('rejects a figure without a source', () => {
    const bad: HistoricalFigure = { ...baseFigure, sourceRefs: [] };
    expect(validateFigures([bad], SOURCE_KEYS)).toContain(
      'figure without source: siqueira-campos',
    );
  });

  it('rejects an unknown source', () => {
    const bad: HistoricalFigure = {
      ...baseFigure,
      sourceRefs: ['nope' as SourceKey],
    };
    expect(validateFigures([bad], SOURCE_KEYS)).toContain(
      'figure siqueira-campos references unknown source: nope',
    );
  });

  it('rejects a figure without a label', () => {
    const bad: HistoricalFigure = { ...baseFigure, labels: [] };
    expect(validateFigures([bad], SOURCE_KEYS)).toContain('figure without label: siqueira-campos');
  });
});

describe('mission commanders', () => {
  const mission: MissionMetadata = {
    id: 'prologue',
    commanderId: 'siqueira-campos',
    perspective: 'Forte de Copacabana, 1922',
    historicalDate: '1922-07-05',
    sourceRefs: ['macaulay-1974', 'helio-1922'],
  };

  it('accepts a playable commander', () => {
    expect(validateMissionCommander(mission)).toEqual([]);
  });

  it('rejects an unknown commander', () => {
    expect(
      validateMissionCommander({ ...mission, commanderId: 'nobody' }),
    ).toContain('unknown commander: nobody');
  });

  it('rejects a non-playable commander', () => {
    const retired: HistoricalFigure = { ...baseFigure, id: 'retired', playable: false };
    expect(
      validateMissionCommander({ ...mission, commanderId: 'retired' }, [retired]),
    ).toContain('non-playable commander: retired');
  });

  it('rejects a mission without a perspective or sources', () => {
    expect(
      validateMissionCommander({ ...mission, perspective: '', sourceRefs: [] }),
    ).toEqual(
      expect.arrayContaining([
        'mission without perspective: prologue',
        'mission without sources: prologue',
      ]),
    );
  });
});
