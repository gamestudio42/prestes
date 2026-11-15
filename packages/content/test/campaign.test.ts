import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_CHAPTERS,
  CHAPTER_PAGE_WORD_BUDGET,
  CHAPTER_TEXT,
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

  it('has no playable chapter yet, and every chapter is labelled', () => {
    for (const chapter of CAMPAIGN_CHAPTERS) {
      expect(chapter.playable, chapter.id).toBe(false);
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
        expect(text.pages.length, `${locale} ${chapter.id}`).toBe(chapter.id === 'serra-nova' ? 4 : 3);
        for (const page of text.pages) {
          const words = page.paragraphs.join(' ').split(/\s+/).length;
          expect(words, `${locale} ${chapter.id} ${page.heading}`).toBeLessThanOrEqual(
            CHAPTER_PAGE_WORD_BUDGET,
          );
        }
      }
    }
  });

  it('fails on an unknown commander, source and link, missing text and a playable chapter without a mission', () => {
    const bad: CampaignChapter = {
      id: 'x',
      number: 9,
      date: '1927',
      commanderId: 'nobody',
      label: 'dramatized',
      sourceRefs: ['no-such-source'],
      links: ['no-such-entry'],
      playable: true,
    };
    const errors = validateChapters([bad], { en: CHAPTER_TEXT.en, 'pt-BR': {} });
    expect(errors).toEqual(
      expect.arrayContaining([
        'chapter x has unknown commander: nobody',
        'chapter x references unknown source: no-such-source',
        'chapter x links to unknown compendium entry: no-such-entry',
        'playable chapter without mission: x',
        'chapter x has no en text',
        'chapter x has no pt-BR text',
      ]),
    );
  });
});
