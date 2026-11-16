import { CAMPAIGN_CHAPTERS, chapterText, FIGURES, translate, type Locale } from '@prestes/content';
import type { BattleMap } from '@prestes/shared';

/** prepare-online-release D3: what the battle loading screen shows while a battle's files arrive. */
export interface BattleLoadingState {
  /** The campaign chapter being started, or null for a skirmish or playtest. */
  chapterId: string | null;
  /** The battle's map, once its document is in (null while it is fetched). */
  map: BattleMap | null;
  done: number;
  total: number;
}

const FIGURE_NAME = new Map(FIGURES.map((figure) => [figure.id, figure.displayName]));

/** The first sentence of a text (the briefing's pitch). */
export function firstSentence(text: string): string {
  const match = /^.*?[.!?…](?=\s|$)/.exec(text.trim());
  return (match ? match[0] : text).trim();
}

/** The screen's heading, kicker and line, for a chapter or a map. */
export function loadingText(state: BattleLoadingState, locale: Locale): { kicker: string; heading: string; line: string } {
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) => translate(locale, key, values);
  const chapter = CAMPAIGN_CHAPTERS.find((candidate) => candidate.id === state.chapterId);
  const text = chapter ? chapterText(chapter.id, locale) : undefined;
  if (chapter && text) {
    return {
      kicker: t('loading.chapter', { number: chapter.number, commander: FIGURE_NAME.get(chapter.commanderId) ?? chapter.commanderId }),
      heading: text.title,
      line: firstSentence(text.briefing.pitch),
    };
  }
  const map = state.map;
  if (!map) return { kicker: t('loading.skirmish'), heading: '', line: '' };
  // An authored map names and describes itself; the line falls back to its setting's label.
  const description = map.text?.description[locale];
  return {
    kicker: t('loading.skirmish'),
    heading: map.text?.name[locale] ?? t(map.nameKey as Parameters<typeof translate>[1]),
    line: description ? firstSentence(description) : t(`loading.setting.${map.setting.label}`),
  };
}

export interface BattleLoadingProps {
  state: BattleLoadingState;
  locale: Locale;
}

/**
 * prepare-online-release D3: the battle loading screen, in the book's look.
 * The app mounts it only when the wait passes 300 ms.
 */
export function BattleLoading({ state, locale }: BattleLoadingProps) {
  const { kicker, heading, line } = loadingText(state, locale);
  const share = state.total > 0 ? Math.min(1, state.done / state.total) : 0;
  return (
    <div
      className="battle-loading"
      role="status"
      aria-live="polite"
      data-testid="battle-loading"
      data-done={state.done}
      data-total={state.total}
    >
      <div className="battle-loading-sheet">
        <p className="desk-book-eyebrow battle-loading-kicker">{kicker}</p>
        <h2 className="desk-book-heading battle-loading-heading">{heading}</h2>
        {line ? <p className="desk-text battle-loading-line">{line}</p> : null}
        <div className="battle-loading-bar" aria-hidden="true">
          <div className="battle-loading-fill" style={{ width: `${Math.round(share * 100)}%` }} />
        </div>
        <p className="battle-loading-count" data-testid="battle-loading-count">
          {translate(locale, 'loading.progress', { done: state.done, total: state.total })}
        </p>
      </div>
    </div>
  );
}
