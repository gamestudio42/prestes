import { describe, expect, it } from 'vitest';
import { authoredMapIndex } from '@prestes/shared';
import {
  CAMPAIGN_CHAPTERS,
  CHAPTER_PAGE_WORD_BUDGET,
  CHAPTER_TEXT,
  chapterMapId,
  isChapterPlayable,
  validateChapterMaps,
  validateChapters,
  type CampaignChapter,
} from '../src';

describe('campaign chapters', () => {
  it('lists the prologue and chapters 2 to 8 in order, with the commanders of CAMPAIGN.md', () => {
    expect(CAMPAIGN_CHAPTERS.map((chapter) => chapter.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(CAMPAIGN_CHAPTERS.map((chapter) => chapter.commanderId)).toEqual([
      'siqueira-campos',
      'luis-carlos-prestes',
      'miguel-costa',
      'isidoro-dias-lopes',
      'luis-carlos-prestes',
      'luis-carlos-prestes',
      'luis-carlos-prestes',
      'luis-carlos-prestes',
    ]);
    expect(CAMPAIGN_CHAPTERS[2]).toMatchObject({ id: 'a-divisao', commanderId: 'miguel-costa' });
  });

  it('every chapter is labelled', () => {
    for (const chapter of CAMPAIGN_CHAPTERS) {
      expect(['historical', 'dramatized', 'fictional']).toContain(chapter.label);
    }
  });

  it('validates the real registry and text', () => {
    expect(validateChapters()).toEqual([]);
  });

  it('keeps every prose page within the word budget in both languages', () => {
    for (const locale of ['en', 'pt-BR'] as const) {
      for (const chapter of CAMPAIGN_CHAPTERS) {
        const text = CHAPTER_TEXT[locale][chapter.id]!;
        expect(text.pages.length, `${locale} ${chapter.id}`).toBe(chapter.id === 'serra-nova' || chapter.id === 'la-gaiba' ? 4 : 3);
        for (const page of text.pages) {
          const words = page.paragraphs.join(' ').split(/\s+/).length;
          expect(words, `${locale} ${chapter.id} ${page.heading}`).toBeLessThanOrEqual(
            CHAPTER_PAGE_WORD_BUDGET,
          );
        }
      }
    }
  });

  it('fails on an unknown commander, source and link, and missing text', () => {
    const bad: CampaignChapter = {
      id: 'x',
      number: 9,
      date: '1927',
      commanderId: 'nobody',
      label: 'dramatized',
      sourceRefs: ['no-such-source'],
      links: ['no-such-entry'],
    };
    const errors = validateChapters([bad], { en: CHAPTER_TEXT.en, 'pt-BR': {} });
    expect(errors).toEqual(
      expect.arrayContaining([
        'chapter x has unknown commander: nobody',
        'chapter x references unknown source: no-such-source',
        'chapter x links to unknown compendium entry: no-such-entry',
        'chapter x has no en text',
        'chapter x has no pt-BR text',
      ]),
    );
  });

  describe('make-campaign-playable 1.1: playable is derived from the map index', () => {
    it('all eight chapters are playable with the maps of today', () => {
      for (const chapter of CAMPAIGN_CHAPTERS) {
        expect(isChapterPlayable(chapter.id), chapter.id).toBe(true);
      }
      expect(chapterMapId('prologue-18-do-forte')).toBe('copacabana');
      expect(validateChapterMaps({ published: true })).toEqual([]);
    });

    it('an index without La Gaiba makes only chapter 8 unplayable', () => {
      const index = authoredMapIndex().filter((entry) => entry.id !== 'la-gaiba');
      expect(CAMPAIGN_CHAPTERS.filter((chapter) => !isChapterPlayable(chapter.id, index)).map((chapter) => chapter.number)).toEqual([8]);
      expect(validateChapterMaps({}, CAMPAIGN_CHAPTERS, index)).toEqual([]);
      expect(validateChapterMaps({ published: true }, CAMPAIGN_CHAPTERS, index)).toEqual(['chapter without map: la-gaiba']);
    });

    it('a mission held by two maps fails and names both', () => {
      const index = authoredMapIndex();
      const copy = { ...index.find((entry) => entry.id === 'serra-nova')!, id: 'serra-nova-copia' };
      expect(validateChapterMaps({}, CAMPAIGN_CHAPTERS, [...index, copy])).toEqual([
        'mission serra-nova is held by more than one map: serra-nova, serra-nova-copia',
      ]);
    });

    it('a skirmish map never makes a chapter playable', () => {
      const index = authoredMapIndex().map((entry) => (entry.id === 'la-gaiba' ? { ...entry, use: 'skirmish' as const } : entry));
      expect(isChapterPlayable('la-gaiba', index)).toBe(false);
    });
  });
});
