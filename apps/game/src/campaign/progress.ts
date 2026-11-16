/**
 * make-campaign-playable D2: the campaign's progress as a pure model. Open
 * chapters are computed from the won ones, never stored, so a record cannot
 * hold an open chapter whose previous chapter is not won.
 */
import { CAMPAIGN_CHAPTERS } from '@prestes/content';
import { DIFFICULTIES, type DecidedBy, type Difficulty, type Outcome } from '@prestes/shared';

export const PROGRESS_VERSION = 1;

/** How a campaign battle ended. */
export interface CampaignResult {
  outcome: Exclude<Outcome, 'playing'>;
  decidedBy?: DecidedBy;
  /** Battle ticks after deployment ended. */
  ticks: number;
  /** The column's men dead or incapacitated. */
  columnLost: number;
  /** The level it was fought at (once a chapter can be started at one). */
  level?: Difficulty;
}

export interface ChapterProgress {
  won: boolean;
  /** Battles of this chapter played to an end. */
  plays: number;
  last?: CampaignResult;
  best?: CampaignResult;
}

export interface CampaignProgress {
  version: typeof PROGRESS_VERSION;
  chapters: Record<string, ChapterProgress>;
}

/** The chapter ids in book order. */
const ORDER: readonly string[] = CAMPAIGN_CHAPTERS.map((chapter) => chapter.id);

export function emptyProgress(): CampaignProgress {
  return { version: PROGRESS_VERSION, chapters: {} };
}

const OUTCOMES: ReadonlySet<string> = new Set<CampaignResult['outcome']>(['victory', 'defeat', 'draw']);
const DECIDED: ReadonlySet<string> = new Set<DecidedBy>(['annihilation', 'broken', 'all-objectives', 'objectives', 'draw', 'commander']);
const LEVELS: ReadonlySet<string> = new Set<Difficulty>(DIFFICULTIES);

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function parseResult(value: unknown): CampaignResult | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.outcome !== 'string' || !OUTCOMES.has(raw.outcome)) return null;
  if (!isCount(raw.ticks) || !isCount(raw.columnLost)) return null;
  if (raw.decidedBy !== undefined && (typeof raw.decidedBy !== 'string' || !DECIDED.has(raw.decidedBy))) return null;
  if (raw.level !== undefined && (typeof raw.level !== 'string' || !LEVELS.has(raw.level))) return null;
  return {
    outcome: raw.outcome as CampaignResult['outcome'],
    ticks: raw.ticks,
    columnLost: raw.columnLost,
    ...(raw.decidedBy === undefined ? {} : { decidedBy: raw.decidedBy as DecidedBy }),
    ...(raw.level === undefined ? {} : { level: raw.level as Difficulty }),
  };
}

/**
 * A stored record, or a fresh campaign for anything that does not validate
 * (missing, broken JSON, foreign shape, another version): never an error.
 */
export function parseProgress(raw: unknown): CampaignProgress {
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return emptyProgress();
    }
  }
  if (typeof value !== 'object' || value === null) return emptyProgress();
  const record = value as Record<string, unknown>;
  if (record.version !== PROGRESS_VERSION) return emptyProgress();
  if (typeof record.chapters !== 'object' || record.chapters === null || Array.isArray(record.chapters)) return emptyProgress();
  const chapters: Record<string, ChapterProgress> = {};
  for (const [id, entry] of Object.entries(record.chapters as Record<string, unknown>)) {
    if (!ORDER.includes(id)) continue;
    if (typeof entry !== 'object' || entry === null) return emptyProgress();
    const chapter = entry as Record<string, unknown>;
    if (typeof chapter.won !== 'boolean' || !isCount(chapter.plays)) return emptyProgress();
    const last = chapter.last === undefined ? undefined : parseResult(chapter.last);
    const best = chapter.best === undefined ? undefined : parseResult(chapter.best);
    if (last === null || best === null) return emptyProgress();
    chapters[id] = { won: chapter.won, plays: chapter.plays, ...(last ? { last } : {}), ...(best ? { best } : {}) };
  }
  return { version: PROGRESS_VERSION, chapters };
}

/**
 * Whether `a` is a better result than `b`: a victory first, then fewer of the
 * column lost, then a shorter battle.
 */
export function isBetterResult(a: CampaignResult, b: CampaignResult): boolean {
  const won = (result: CampaignResult) => (result.outcome === 'victory' ? 1 : 0);
  if (won(a) !== won(b)) return won(a) > won(b);
  if (a.columnLost !== b.columnLost) return a.columnLost < b.columnLost;
  return a.ticks < b.ticks;
}

/** The record after a chapter's battle ended with `result`; a won chapter stays won. */
export function recordResult(progress: CampaignProgress, chapterId: string, result: CampaignResult): CampaignProgress {
  const before = progress.chapters[chapterId] ?? { won: false, plays: 0 };
  const best = before.best && !isBetterResult(result, before.best) ? before.best : result;
  return {
    version: PROGRESS_VERSION,
    chapters: {
      ...progress.chapters,
      [chapterId]: { won: before.won || result.outcome === 'victory', plays: before.plays + 1, last: result, best },
    },
  };
}

export function isWon(progress: CampaignProgress, chapterId: string): boolean {
  return progress.chapters[chapterId]?.won === true;
}

/** The prologue is always open; a later chapter once the one before it is won. */
export function isOpen(progress: CampaignProgress, chapterId: string): boolean {
  const index = ORDER.indexOf(chapterId);
  if (index < 0) return false;
  return index === 0 || isWon(progress, ORDER[index - 1]!);
}

/** The chapter after `chapterId` in book order, or undefined after the last. */
export function nextChapter(chapterId: string): string | undefined {
  const index = ORDER.indexOf(chapterId);
  return index < 0 ? undefined : ORDER[index + 1];
}

/** The chapter that has to be won before `chapterId` opens (undefined for the prologue). */
export function previousChapter(chapterId: string): string | undefined {
  const index = ORDER.indexOf(chapterId);
  return index > 0 ? ORDER[index - 1] : undefined;
}

/** The campaign is completed once its last chapter is won. */
export function isCompleted(progress: CampaignProgress): boolean {
  return isWon(progress, ORDER[ORDER.length - 1]!);
}

export type ChapterState = 'won' | 'open' | 'locked';

export function chapterState(progress: CampaignProgress, chapterId: string): ChapterState {
  if (isWon(progress, chapterId)) return 'won';
  return isOpen(progress, chapterId) ? 'open' : 'locked';
}
