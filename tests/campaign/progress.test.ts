import { describe, expect, it } from 'vitest';
import { CAMPAIGN_CHAPTERS } from '../../packages/content/src';
import {
  chapterState,
  emptyProgress,
  isBetterResult,
  isCompleted,
  isOpen,
  nextChapter,
  parseProgress,
  passesChapter,
  previousChapter,
  recordResult,
  type CampaignResult,
} from '../../apps/game/src/campaign/progress';
import { CAMPAIGN_STORAGE_KEY, CampaignStore, type ProgressStorage } from '../../apps/game/src/campaign/storage';

const ids = CAMPAIGN_CHAPTERS.map((chapter) => chapter.id);
const [prologue, second, third] = ids as [string, string, string];
const victory: CampaignResult = { outcome: 'victory', decidedBy: 'objectives', ticks: 3000, columnLost: 4 };
const defeat: CampaignResult = { outcome: 'defeat', decidedBy: 'broken', ticks: 2000, columnLost: 12 };

describe('make-campaign-playable 1.2: the progress model', () => {
  it('opens only the prologue on an empty record', () => {
    const progress = emptyProgress();
    expect(ids.filter((id) => isOpen(progress, id))).toEqual([prologue]);
    expect(chapterState(progress, second)).toBe('locked');
  });

  it('a victory opens the next chapter', () => {
    const progress = recordResult(emptyProgress(), prologue, victory);
    expect(chapterState(progress, prologue)).toBe('won');
    expect(chapterState(progress, second)).toBe('open');
    expect(chapterState(progress, third)).toBe('locked');
  });

  it('a defeat, a draw and a commander falling do not', () => {
    // The prologue opens chapter 2 on any end (4.3), so this is checked from chapter 2.
    const opened = recordResult(emptyProgress(), prologue, victory);
    for (const result of [
      defeat,
      { outcome: 'draw', decidedBy: 'draw', ticks: 9000, columnLost: 3 },
      { outcome: 'defeat', decidedBy: 'commander', ticks: 800, columnLost: 1 },
    ] satisfies CampaignResult[]) {
      const progress = recordResult(opened, second, result);
      expect(isOpen(progress, third), result.decidedBy).toBe(false);
      expect(chapterState(progress, second)).toBe('open');
      expect(progress.chapters[second]).toMatchObject({ won: false, plays: 1, last: result });
      expect(passesChapter(second, result.outcome)).toBe(false);
    }
  });

  it('4.3: any end of the prologue opens chapter 2, shown as played, not won', () => {
    for (const result of [defeat, { outcome: 'draw', decidedBy: 'draw', ticks: 9000, columnLost: 3 }] satisfies CampaignResult[]) {
      const progress = recordResult(emptyProgress(), prologue, result);
      expect(isOpen(progress, second), result.outcome).toBe(true);
      expect(chapterState(progress, prologue)).toBe('played');
      expect(progress.chapters[prologue]).toMatchObject({ won: false, plays: 1 });
      expect(isOpen(progress, third)).toBe(false);
      expect(passesChapter(prologue, result.outcome)).toBe(true);
    }
    expect(passesChapter(prologue, 'playing')).toBe(false);
    expect(chapterState(recordResult(emptyProgress(), prologue, victory), prologue)).toBe('won');
  });

  it('a later defeat keeps a chapter won and its next open', () => {
    let progress = recordResult(emptyProgress(), prologue, victory);
    progress = recordResult(progress, prologue, defeat);
    expect(progress.chapters[prologue]).toMatchObject({ won: true, plays: 2, last: defeat, best: victory });
    expect(isOpen(progress, second)).toBe(true);
  });

  it('a broken, foreign or wrong-version record parses to empty', () => {
    for (const raw of [
      null,
      '{not json',
      '[]',
      JSON.stringify({ version: 2, chapters: {} }),
      JSON.stringify({ version: 1, chapters: [] }),
      JSON.stringify({ version: 1, chapters: { [prologue]: { won: 'yes', plays: 1 } } }),
      JSON.stringify({ version: 1, chapters: { [prologue]: { won: true, plays: 1, last: { outcome: 'glory', ticks: 1, columnLost: 0 } } } }),
    ]) {
      expect(parseProgress(raw), String(raw)).toEqual(emptyProgress());
    }
  });

  it('round-trips a record, dropping chapters it does not know', () => {
    const progress = recordResult(emptyProgress(), prologue, { ...victory, level: 'historia' });
    const stored = JSON.parse(JSON.stringify(progress));
    stored.chapters['no-such-chapter'] = { won: true, plays: 1 };
    expect(parseProgress(JSON.stringify(stored))).toEqual(progress);
  });

  it('prefers a victory, then fewer losses, then a shorter time', () => {
    expect(isBetterResult(victory, defeat)).toBe(true);
    expect(isBetterResult({ ...victory, columnLost: 2 }, victory)).toBe(true);
    expect(isBetterResult({ ...victory, ticks: 2500 }, victory)).toBe(true);
    expect(isBetterResult({ ...victory, ticks: 3500 }, victory)).toBe(false);
    let progress = recordResult(emptyProgress(), prologue, victory);
    progress = recordResult(progress, prologue, { ...victory, columnLost: 9 });
    expect(progress.chapters[prologue]!.best).toEqual(victory);
  });

  it('knows the order and the end of the campaign', () => {
    expect(nextChapter(prologue)).toBe(second);
    expect(nextChapter(ids[ids.length - 1]!)).toBeUndefined();
    expect(previousChapter(prologue)).toBeUndefined();
    expect(previousChapter(second)).toBe(prologue);
    let progress = emptyProgress();
    for (const id of ids) {
      expect(isCompleted(progress)).toBe(false);
      progress = recordResult(progress, id, victory);
    }
    expect(isCompleted(progress)).toBe(true);
  });
});

function memoryStorage(): ProgressStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe('make-campaign-playable 1.3: the storage adapter', () => {
  it('a write followed by a read gives the same record', () => {
    const storage = memoryStorage();
    const progress = recordResult(emptyProgress(), prologue, victory);
    new CampaignStore(storage).save(progress);
    expect(storage.data.has(CAMPAIGN_STORAGE_KEY)).toBe(true);
    expect(new CampaignStore(storage).load()).toEqual(progress);
  });

  it('storage that throws leaves the campaign playable in memory', () => {
    const broken: ProgressStorage = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    const store = new CampaignStore(broken);
    expect(store.load()).toEqual(emptyProgress());
    const progress = recordResult(store.load(), prologue, victory);
    store.save(progress);
    expect(isOpen(store.load(), second)).toBe(true);
    store.clear();
    expect(store.load()).toEqual(emptyProgress());
  });

  it('restart clears the stored record', () => {
    const storage = memoryStorage();
    const store = new CampaignStore(storage);
    store.save(recordResult(emptyProgress(), prologue, victory));
    store.clear();
    expect(storage.data.has(CAMPAIGN_STORAGE_KEY)).toBe(false);
    expect(new CampaignStore(storage).load()).toEqual(emptyProgress());
  });
});
