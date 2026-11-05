import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  COMPENDIUM,
  COMPENDIUM_SECTIONS,
  compendiumTitleKey,
  translate,
  type CompendiumEntry,
  type Locale,
  type MessageKey,
} from '@prestes/content';
import { Book, Languages, Restart, SoundOff, SoundOn, Troop as Users } from './icons';
import { CodexEntryArticle } from './CodexPanel';
import { MarchingScene } from './MarchingScene';
import { PixelPhoto } from './PixelPhoto';
import { PixelVideo } from './PixelVideo';
import coverImage from '../assets/menu/coluna-prestes.webp';

export interface StartScreenProps {
  locale: Locale;
  /** Station to resume (1-based) when unfinished bootcamp progress exists. */
  resumeStation: number | null;
  totalStations: number;
  audioMuted: boolean;
  onLocaleChange: (locale: Locale) => void;
  onStart: () => void;
  onRestart: () => void;
  /** Starts the 3 vs 3 battle (battle-feel-3v3). */
  onStartBattle3v3: () => void;
  onToggleAudio: () => void;
}

/** The book's bookmarks, in the order they hang from its edge. */
const MARKS = ['campaign', 'skirmish', 'compendium', 'options'] as const;
type Mark = (typeof MARKS)[number];

const MARK_TESTID: Record<Mark, string> = {
  campaign: 'menu-mark-campaign',
  skirmish: 'menu-mark-skirmish',
  compendium: 'start-codex',
  options: 'menu-mark-options',
};

/** The compendium read as one run of pages, section after section. */
const PAGES: readonly CompendiumEntry[] = COMPENDIUM_SECTIONS.flatMap((section) =>
  COMPENDIUM.filter((entry) => entry.section === section),
);

const VIDEO_SRC = `${import.meta.env.BASE_URL}video/menu-book.mp4`;

/**
 * The main menu as an open pixel-art book over the menu video. Bookmarks on
 * the book's edge open its spreads: play the campaign, play a skirmish, read
 * the compendium (one entry per page, turned with the page corners or the
 * arrow keys) and the options. The arrow keys move between entries on a page
 * (the ▶ cursor follows focus and hover) and Enter chooses.
 */
export function StartScreen({
  locale,
  resumeStation,
  totalStations,
  audioMuted,
  onLocaleChange,
  onStart,
  onRestart,
  onStartBattle3v3,
  onToggleAudio,
}: StartScreenProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  const [mark, setMark] = useState<Mark>('campaign');
  const [videoFailed, setVideoFailed] = useState(false);
  const marksRef = useRef<HTMLDivElement | null>(null);
  // Only the book's first spread takes focus on open; turning to another
  // bookmark leaves focus on the bookmark.
  const firstSpread = useRef(true);
  useEffect(() => {
    if (mark !== 'campaign') firstSpread.current = false;
  }, [mark]);

  const moveEntryFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('.menu-entry')];
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
    items[(next + items.length) % items.length]?.focus();
    event.preventDefault();
  };

  const moveMarkFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const index = MARKS.indexOf(mark);
    const next = MARKS[(index + (event.key === 'ArrowDown' ? 1 : -1) + MARKS.length) % MARKS.length]!;
    setMark(next);
    marksRef.current?.querySelector<HTMLElement>(`[data-mark="${next}"]`)?.focus();
    event.preventDefault();
  };

  let spread: ReactNode;
  if (mark === 'campaign') {
    spread = (
      <>
        <BookPage side="left" folio={1} locale={locale}>
          <header className="book-title">
            <p className="eyebrow">{t('app.subtitle')}</p>
            <h1>{t('app.title')}</h1>
          </header>
          <PixelPhoto src={coverImage} width={200} className="book-plate" />
          <p className="book-epigraph">{t('menu.campaign.epigraph')}</p>
        </BookPage>
        <BookPage side="right" folio={2} locale={locale} onKeyDown={moveEntryFocus}>
          <h2 className="book-heading">{t('menu.campaign.heading')}</h2>
          <p className="book-text">{t('menu.campaign.text')}</p>
          <ul className="menu-list">
            {resumeStation === null ? (
              <li>
                <button type="button" className="menu-entry primary" onClick={onStart} data-testid="start-button" autoFocus={firstSpread.current}>
                  {t('start.bootcamp')}
                </button>
              </li>
            ) : (
              <>
                <li>
                  <button type="button" className="menu-entry primary" onClick={onStart} data-testid="start-continue" autoFocus={firstSpread.current}>
                    {t('start.continue', { station: resumeStation, total: totalStations })}
                  </button>
                </li>
                <li>
                  <button type="button" className="menu-entry" onClick={onRestart} data-testid="start-restart">
                    <Restart aria-hidden="true" size={16} />
                    {t('start.restart')}
                  </button>
                </li>
              </>
            )}
          </ul>
        </BookPage>
      </>
    );
  } else if (mark === 'skirmish') {
    spread = (
      <>
        <BookPage side="left" folio={3} locale={locale}>
          <h2 className="book-heading">{t('menu.skirmish.heading')}</h2>
          <p className="book-text">{t('menu.skirmish.text')}</p>
          <p className="book-epigraph">{t('menu.skirmish.epigraph')}</p>
        </BookPage>
        <BookPage side="right" folio={4} locale={locale} onKeyDown={moveEntryFocus}>
          <div className="book-versus" aria-hidden="true">
            <span className="book-pips column">
              <i />
              <i />
              <i />
            </span>
            <strong>×</strong>
            <span className="book-pips legalist">
              <i />
              <i />
              <i />
            </span>
          </div>
          <ul className="menu-list">
            <li>
              <button
                type="button"
                className="menu-entry primary"
                onClick={onStartBattle3v3}
                data-testid="start-battle-3v3"
              >
                <Users aria-hidden="true" size={16} />
                {t('start.battle3v3')}
              </button>
            </li>
          </ul>
        </BookPage>
      </>
    );
  } else if (mark === 'compendium') {
    spread = <CompendiumSpread locale={locale} />;
  } else {
    spread = (
      <>
        <BookPage side="left" folio={PAGES.length * 2 + 5} locale={locale} onKeyDown={moveEntryFocus}>
          <h2 className="book-heading">{t('menu.options.heading')}</h2>
          <ul className="menu-list">
            <li>
              <button
                type="button"
                className="menu-entry"
                onClick={onToggleAudio}
                aria-pressed={!audioMuted}
                data-testid="start-audio"
              >
                {audioMuted ? <SoundOff aria-hidden="true" size={16} /> : <SoundOn aria-hidden="true" size={16} />}
                {audioMuted ? t('start.audioOff') : t('start.audioOn')}
              </button>
            </li>
            <li>
              <label className="menu-entry menu-language">
                <Languages aria-hidden="true" size={16} />
                <span>{t('start.language')}</span>
                <select
                  value={locale}
                  onChange={(event) => onLocaleChange(event.target.value as Locale)}
                  data-testid="language-select"
                >
                  <option value="en">{t('language.en')}</option>
                  <option value="pt-BR">{t('language.ptBR')}</option>
                </select>
              </label>
            </li>
          </ul>
        </BookPage>
        <BookPage side="right" folio={PAGES.length * 2 + 6} locale={locale}>
          <p className="book-colophon">{t('start.footer')}</p>
        </BookPage>
      </>
    );
  }

  return (
    <main className="start-screen menu-screen book-screen" data-testid="start-screen">
      {videoFailed ? (
        <MarchingScene className="menu-scene" />
      ) : (
        <PixelVideo src={VIDEO_SRC} width={320} className="menu-scene" onError={() => setVideoFailed(true)} />
      )}
      <div className="menu-vignette" aria-hidden="true" />

      <div className="menu-book" data-mark={mark}>
        <div className="book-cover">
          <div className="book-spread" key={mark} aria-label={t(`menu.mark.${mark}` as MessageKey)}>
            {spread}
          </div>
          <span className="book-spine" aria-hidden="true" />
        </div>

        <div className="book-marks" role="tablist" aria-orientation="vertical" ref={marksRef} onKeyDown={moveMarkFocus}>
          {MARKS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mark === id}
              tabIndex={mark === id ? 0 : -1}
              className={`book-mark book-mark-${id} ${mark === id ? 'active' : ''}`}
              data-mark={id}
              data-testid={MARK_TESTID[id]}
              onClick={() => setMark(id)}
            >
              {id === 'compendium' ? <Book aria-hidden="true" size={14} /> : null}
              <span>{t(`menu.mark.${id}` as MessageKey)}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

function BookPage({
  side,
  folio,
  locale,
  children,
  onKeyDown,
}: {
  side: 'left' | 'right';
  folio: number;
  locale: Locale;
  children: ReactNode;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
}) {
  return (
    <section className={`book-page book-page-${side}`} onKeyDown={onKeyDown}>
      <div className="book-page-body">{children}</div>
      <p className="book-folio">{translate(locale, 'menu.page', { page: folio })}</p>
    </section>
  );
}

/**
 * The compendium inside the book: section tabs and the section's index on the
 * left page, one entry per page on the right, turned with the corner buttons
 * or the left and right arrow keys.
 */
function CompendiumSpread({ locale }: { locale: Locale }) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  const [page, setPage] = useState(0);
  const [turn, setTurn] = useState<'next' | 'prev'>('next');
  const open = PAGES[page]!;
  const entries = PAGES.filter((entry) => entry.section === open.section);

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(PAGES.length - 1, next));
    if (clamped === page) return;
    setTurn(clamped > page ? 'next' : 'prev');
    setPage(clamped);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).tagName === 'SELECT') return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') goTo(page + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'PageUp') goTo(page - 1);
    else return;
    event.preventDefault();
  };

  return (
    <div className="book-compendium" data-testid="codex" aria-label={t('compendium.title')} onKeyDown={onKeyDown}>
      <section className="book-page book-page-left">
        <div className="book-page-body">
          <h2 className="book-heading">{t('compendium.title')}</h2>
          <nav className="book-section-tabs" role="tablist" aria-label={t('compendium.title')}>
            {COMPENDIUM_SECTIONS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={open.section === id}
                className={`book-section-tab ${open.section === id ? 'active' : ''}`}
                data-testid={`codex-tab-${id}`}
                onClick={() => goTo(PAGES.findIndex((entry) => entry.section === id))}
              >
                {t(`compendium.section.${id}` as MessageKey)}
              </button>
            ))}
          </nav>
          <ol className="book-index" data-testid="codex-index" aria-label={t('compendium.count', { count: entries.length })}>
            {entries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className={`book-index-entry ${open.id === entry.id ? 'active' : ''}`}
                  data-testid={`codex-entry-${entry.id}`}
                  aria-current={open.id === entry.id ? 'true' : undefined}
                  onClick={() => goTo(PAGES.indexOf(entry))}
                >
                  <span className="book-index-title">{t(compendiumTitleKey(entry))}</span>
                  <span className="book-index-dots" aria-hidden="true" />
                  <span className="book-index-folio">{PAGES.indexOf(entry) * 2 + 5}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
        <div className="book-folio book-turns">
          <button
            type="button"
            className="book-turn book-turn-prev"
            onClick={() => goTo(page - 1)}
            disabled={page === 0}
            aria-label={t('menu.pagePrev')}
            data-testid="book-page-prev"
          >
            ◀
          </button>
          <span>{t('menu.page', { page: page * 2 + 5 })}</span>
        </div>
      </section>

      <section className="book-page book-page-right">
        <div className={`book-page-body book-turn-in-${turn}`} key={open.id}>
          <CodexEntryArticle locale={locale} entry={open} className="book-entry" />
        </div>
        <div className="book-folio book-turns">
          <span>{t('menu.page', { page: page * 2 + 6 })}</span>
          <button
            type="button"
            className="book-turn book-turn-next"
            onClick={() => goTo(page + 1)}
            disabled={page === PAGES.length - 1}
            aria-label={t('menu.pageNext')}
            data-testid="book-page-next"
          >
            ▶
          </button>
        </div>
      </section>
    </div>
  );
}
