import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { prefetchSoldier } from '@prestes/view3d';
import {
  CAMPAIGN_CHAPTERS,
  COMPENDIUM,
  FIGURES,
  chapterMapId,
  chapterText,
  compendiumText,
  isChapterPlayable,
  compendiumTitleKey,
  sourceShort,
  translate,
  type CampaignChapter,
  type Locale,
  type MessageKey,
} from '@prestes/content';
import { DIFFICULTIES, type Difficulty } from '@prestes/shared';
import { DESK_ART, deskArtData, deskArtStyle } from './deskArt';
import { BookEndOrnament, BookFrame, creditLine, InlinePlate, PlateImage, QuoteFooter, useBookPosition } from './BookFrame';
import { campaignBook, folio, sourceAnchor, type BookPage, type TextItem } from './bookPages';
import { PixelPhoto } from '../PixelPhoto';
import { EDIT_MAP_LABEL, editMapHref } from '../../campaign/dev-edit';
import { chapterState, isCompleted, needsVictory, previousChapter, type CampaignProgress, type ChapterState } from '../../campaign/progress';
import coverImage from '../../assets/menu/coluna-prestes.webp';

export interface CampaignBookProps {
  locale: Locale;
  open: boolean;
  onStartSkirmish: () => void;
  /** Opens the compendium book at an entry. */
  onOpenEntry: (entryId: string) => void;
  /** make-campaign-playable: the kept progress (which chapters are won, open or locked). */
  progress: CampaignProgress;
  /** Opens the book at this chapter's briefing ("Back to the book"). */
  initialChapter?: string;
  /** Plays a chapter from its briefing. */
  onPlayChapter: (chapterId: string) => void;
  /** Forgets every result, once the player confirmed. */
  onRestartCampaign: () => void;
  /** make-campaign-playable 5.1: the level the chapter starts at, chosen on its briefing. */
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
}

/** The seal printed beside a chapter in the contents, with its words (never colour alone). */
const SEAL: Record<ChapterState, string> = { won: '✓', played: '◐', open: '○', locked: '·' };

const CHAPTER = new Map(CAMPAIGN_CHAPTERS.map((chapter) => [chapter.id, chapter]));
const ENTRY = new Map(COMPENDIUM.map((entry) => [entry.id, entry]));
const FIGURE = new Map(FIGURES.map((figure) => [figure.id, figure]));

/**
 * The campaign book: a title spread and a contents spread, then each chapter
 * as an opening spread (plate and the chapter's facts on the left, the prose
 * beginning on the right), its prose, and a briefing spread. A chapter with
 * a map is played from its briefing once the chapter before it is won
 * (make-campaign-playable).
 */
export function CampaignBook({ locale, open, onStartSkirmish, onOpenEntry, progress, initialChapter, onPlayChapter, onRestartCampaign, difficulty, onDifficultyChange }: CampaignBookProps) {
  const [confirmRestart, setConfirmRestart] = useState(false);
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  // Images whose file is absent (awaiting permission, D3a).
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());
  const book = useMemo(() => campaignBook(locale), [locale]);
  const { spread, turn, goTo, jump } = useBookPosition(book, briefingPosition(book, initialChapter));
  // improve-soldier-models 6.1: a briefing open on the desk starts the soldier's download.
  const briefingOpen = open && [book.pages[spread * 2], book.pages[spread * 2 + 1]].some((page) => page?.kind === 'briefing');
  useEffect(() => {
    if (briefingOpen) prefetchSoldier();
  }, [briefingOpen]);

  if (!open) {
    return (
      <div
        className="desk-book-cover desk-art-box"
        style={deskArtStyle(DESK_ART.campaignClosed)}
        {...deskArtData(DESK_ART.campaignClosed)}
      >
        <img
          className="desk-object-art desk-object-art-closed"
          src={DESK_ART.campaignClosed.src}
          width={DESK_ART.campaignClosed.width}
          height={DESK_ART.campaignClosed.height}
          alt=""
          draggable={false}
        />
        <span className="desk-object-label">{t('menu.mark.campaign')}</span>
      </div>
    );
  }

  const anchor = book.pages[spread * 2]!.anchor;
  const chapterName = (chapter: CampaignChapter) =>
    chapter.number === 1 ? t('campaign.prologue') : t('campaign.chapter', { number: chapter.number });
  const dateOf = (chapter: CampaignChapter) =>
    chapter.dateEnd ? `${chapter.date} – ${chapter.dateEnd}` : chapter.date;
  const commander = (chapter: CampaignChapter) =>
    FIGURE.get(chapter.commanderId)?.displayName ?? chapter.commanderId;

  const ribbons = [
    { id: 'contents', label: t('book.contents'), mark: '≡' },
    ...CAMPAIGN_CHAPTERS.map((chapter) => ({
      id: chapter.id,
      label: `${chapterName(chapter)}: ${chapterText(chapter.id, locale)?.title ?? ''}`,
      mark: chapter.number === 1 ? 'P' : String(chapter.number),
    })),
  ];
  const activeRibbon = CHAPTER.has(anchor) ? anchor : anchor === 'contents' ? 'contents' : undefined;

  const skirmish = (testId: string) => (
    <button type="button" className="desk-entry primary" onClick={onStartSkirmish} data-testid={testId}>
      {t('menu.campaign.toSkirmish')}
    </button>
  );

  const renderItem = (item: TextItem, key: number): ReactNode => {
    if (item.kind === 'heading') {
      return (
        <h4 key={key} className="desk-text-heading">
          {item.text}
        </h4>
      );
    }
    if (item.kind === 'quote') {
      return (
        <blockquote key={key} className="desk-quote" data-testid="book-quote">
          <p className="desk-quote-text">{item.text}</p>
          <QuoteFooter
            attribution={item.attribution}
            cite={item.cite}
            note={item.note}
            translated={item.translated}
            translatedLabel={t('book.quoteTranslated')}
          />
        </blockquote>
      );
    }
    if (item.kind === 'plate') {
      return <InlinePlate key={key} entryId={item.entryId} slot={item.slot} locale={locale} />;
    }
    if (item.kind === 'para') {
      return (
        <p key={key} className={`desk-text ${item.continues ? 'continues' : ''}`}>
          {item.text}
        </p>
      );
    }
    return null;
  };

  const stateOf = (chapter: CampaignChapter) => chapterState(progress, chapter.id);
  const contentsRow = (chapter: CampaignChapter) => (
    <li key={chapter.id} data-state={stateOf(chapter)}>
      <button
        type="button"
        className="desk-chapter-row"
        data-testid={`campaign-chapter-${chapter.id}`}
        onClick={() => jump(chapter.id)}
      >
        <span className="desk-chapter-row-top">
          <span className="desk-contents-kicker">{chapterName(chapter)}</span>
          <span className="desk-index-dots" aria-hidden="true" />
          <span className="desk-index-folio">{folio((book.anchors[chapter.id] ?? 0) * 2)}</span>
        </span>
        <span className="desk-chapter-row-title">{chapterText(chapter.id, locale)?.title}</span>
        <span className="desk-chapter-row-meta">
          {dateOf(chapter)} · {commander(chapter)}
        </span>
        <span className={`desk-chapter-seal ${stateOf(chapter)}`} data-testid={`campaign-seal-${chapter.id}`} data-state={stateOf(chapter)}>
          <span aria-hidden="true">{SEAL[stateOf(chapter)]}</span> {t(`campaign.state.${stateOf(chapter)}` as MessageKey)}
        </span>
      </button>
    </li>
  );

  const renderPage = (page: BookPage): ReactNode => {
    switch (page.kind) {
      case 'title':
        return (
          <div className="desk-title-page">
            <header className="desk-book-title">
              <p className="desk-book-eyebrow">{t('app.subtitle')}</p>
              <h1>{t('app.title')}</h1>
            </header>
            <PixelPhoto src={coverImage} width={200} className="desk-book-plate" />
            <p className="desk-book-epigraph">{t('menu.campaign.epigraph')}</p>
          </div>
        );
      case 'foreword':
        return (
          <div className="desk-campaign-body">
            <h2 className="desk-book-heading">{t('menu.campaign.heading')}</h2>
            <p className="desk-text">{t('menu.campaign.text')}</p>
            <p className="desk-text" data-testid="campaign-how-open">
              {t('menu.campaign.howChaptersOpen')}
            </p>
            <p className="desk-text desk-text-soft">{t('start.footer')}</p>
            <div className="desk-book-actions">{skirmish('start-button')}</div>
          </div>
        );
      case 'contents': {
        const half = page.part === 0 ? CAMPAIGN_CHAPTERS.slice(0, 4) : CAMPAIGN_CHAPTERS.slice(4);
        return (
          <div className="desk-contents">
            <h2 className="desk-book-heading">
              {page.part === 0 ? t('book.contents') : ' '}
            </h2>
            <ol className="desk-chapter-list" data-testid={`campaign-contents-${page.part}`}>
              {half.map(contentsRow)}
            </ol>
            {page.part === 1 ? (
              <div className="desk-campaign-progress">
                {isCompleted(progress) ? (
                  <p className="desk-text desk-text-soft" data-testid="campaign-completed">
                    {t('campaign.completed')}
                  </p>
                ) : null}
                {confirmRestart ? (
                  <p className="desk-restart-confirm" role="group" data-testid="campaign-restart-confirm">
                    <span>{t('campaign.restartConfirm')}</span>{' '}
                    <button
                      type="button"
                      className="desk-link"
                      data-testid="campaign-restart-yes"
                      onClick={() => {
                        setConfirmRestart(false);
                        onRestartCampaign();
                      }}
                    >
                      {t('campaign.restartYes')}
                    </button>{' '}
                    <button type="button" className="desk-link" data-testid="campaign-restart-no" onClick={() => setConfirmRestart(false)}>
                      {t('campaign.restartNo')}
                    </button>
                  </p>
                ) : (
                  <button type="button" className="desk-link" data-testid="campaign-restart" onClick={() => setConfirmRestart(true)}>
                    {t('campaign.restart')}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        );
      }
      case 'chapter-plate': {
        const chapter = CHAPTER.get(page.chapterId)!;
        const text = chapterText(chapter.id, locale);
        const image = chapter.image;
        const ref = image
          ? ENTRY.get(image.entryId)?.images?.find((candidate) => candidate.slot === image.slot)
          : undefined;
        const caption = image ? compendiumText(image.entryId, locale)?.images?.[image.slot] : undefined;
        return (
          <div className="desk-chapter-plate" data-testid="chapter-plate">
            <p className="desk-contents-kicker">{chapterName(chapter)}</p>
            <h2 className="desk-chapter-title">{text?.title}</h2>
            {ref ? (
              <figure className="desk-plate desk-plate-small">
                <PlateImage
                  path={ref.path}
                  alt={caption?.caption ?? ''}
                  emblemClass="desk-emblem desk-emblem-small"
                  onMissing={() => setPending((set) => new Set(set).add(ref.path))}
                />
                <figcaption className="desk-plate-credit">
                  {caption?.caption}{' '}
                  {pending.has(ref.path) ? t('book.imagePending') : creditLine(caption?.credit, ref.path, t)}
                </figcaption>
              </figure>
            ) : (
              <div className="desk-emblem desk-emblem-small" data-testid="book-emblem" />
            )}
            <dl className="desk-facts">
              <dt>{t('campaign.date')}</dt>
              <dd>{dateOf(chapter)}</dd>
              <dt>{t('campaign.place')}</dt>
              <dd>{text?.place}</dd>
              <dt>{t('campaign.commander')}</dt>
              <dd data-testid="chapter-commander">{commander(chapter)}</dd>
              <dt>{t('campaign.perspective')}</dt>
              <dd>{text?.perspective}</dd>
            </dl>
            <p className="desk-chips">
              <span className="desk-chip" data-testid="book-label">
                {t(`book.label.${chapter.label}` as MessageKey)}
              </span>
            </p>
          </div>
        );
      }
      case 'text':
        return <div className="desk-text-page">{page.items.map(renderItem)}</div>;
      case 'briefing': {
        const chapter = CHAPTER.get(page.chapterId)!;
        const text = chapterText(chapter.id, locale);
        if (page.side === 'left') {
          return (
            <div className="desk-briefing" data-testid="chapter-briefing">
              <h2 className="desk-book-heading">{t('campaign.briefing')}</h2>
              <p className="desk-text">{text?.briefing.pitch}</p>
              <h4 className="desk-text-heading">{t('campaign.objectives')}</h4>
              <ul className="desk-text-list">
                {text?.briefing.objectives.map((objective) => <li key={objective}>{objective}</li>)}
              </ul>
            </div>
          );
        }
        return (
          <div className="desk-briefing">
            <h4 className="desk-text-heading">{t('campaign.inCompendium')}</h4>
            <ul className="desk-link-list">
              {chapter.links.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    className="desk-link"
                    data-testid={`chapter-link-${id}`}
                    onClick={() => onOpenEntry(id)}
                  >
                    {t(compendiumTitleKey(ENTRY.get(id)!))}
                  </button>
                </li>
              ))}
            </ul>
            <div className="desk-book-actions">
              {isChapterPlayable(chapter.id) ? (
                stateOf(chapter) === 'locked' ? (
                  <p className="desk-text desk-text-soft" data-testid={`chapter-locked-${chapter.id}`}>
                    {t(needsVictory(previousChapter(chapter.id)!) ? 'campaign.winFirst' : 'campaign.playFirst', {
                      chapter: chapterName(CHAPTER.get(previousChapter(chapter.id)!)!),
                    })}
                  </p>
                ) : (
                  <>
                    <div className="desk-chapter-level" data-testid={`chapter-level-${chapter.id}`} data-value={difficulty}>
                      <span className="desk-text-heading">{t('setup.difficulty')}</span>
                      <div className="desk-level-buttons" role="radiogroup" aria-label={t('setup.difficulty')}>
                        {DIFFICULTIES.map((level) => (
                          <button
                            key={level}
                            type="button"
                            className={difficulty === level ? 'desk-level active' : 'desk-level'}
                            aria-pressed={difficulty === level}
                            onClick={() => onDifficultyChange(level)}
                            data-testid={`chapter-difficulty-${level}`}
                          >
                            {t(`difficulty.${level}.name` as MessageKey)}
                          </button>
                        ))}
                      </div>
                      <p className="desk-text desk-text-soft">{t(`difficulty.${difficulty}.description` as MessageKey)}</p>
                    </div>
                    <button type="button" className="desk-entry primary" onClick={() => onPlayChapter(chapter.id)} data-testid={`chapter-play-${chapter.id}`}>
                      {t('campaign.playChapter')}
                    </button>
                  </>
                )
              ) : null}
              {skirmish(`chapter-skirmish-${chapter.id}`)}
              {import.meta.env.DEV ? (
                <a className="desk-link" href={editMapHref(chapter.id, chapterMapId(chapter.id))} data-testid={`chapter-edit-map-${chapter.id}`}>
                  {EDIT_MAP_LABEL[locale]}
                </a>
              ) : null}
            </div>
            <p className="desk-sources">
              <span className="desk-chip">{t(`book.label.${chapter.label}` as MessageKey)}</span>{' '}
              {t('codex.sources')}:{' '}
              {chapter.sourceRefs.map((key, index) => (
                <span key={key}>
                  {index > 0 && ', '}
                  <button
                    type="button"
                    className="desk-link"
                    data-testid={`chapter-source-${key}`}
                    onClick={() => onOpenEntry(sourceAnchor(key))}
                  >
                    {sourceShort(key)}
                  </button>
                </span>
              ))}
            </p>
          </div>
        );
      }
      default:
        return <BookEndOrnament />;
    }
  };

  return (
    <div className="desk-campaign" data-testid="campaign-book" data-anchor={anchor}>
      <BookFrame
        cover="navy"
        locale={locale}
        book={book}
        spread={spread}
        turn={turn}
        onTurn={goTo}
        ribbons={ribbons}
        activeRibbon={activeRibbon}
        onRibbon={(id) => jump(id)}
        testPrefix="campaign"
        left={renderPage(book.pages[spread * 2]!)}
        right={renderPage(book.pages[spread * 2 + 1]!)}
      />
    </div>
  );
}

/** make-campaign-playable D5: the book's position at a chapter's briefing spread (the title page without one). */
function briefingPosition(book: ReturnType<typeof campaignBook>, chapterId: string | undefined): { anchor: string; offset: number } | undefined {
  if (!chapterId || book.anchors[chapterId] === undefined) return undefined;
  const page = book.pages.findIndex((candidate) => candidate.kind === 'briefing' && candidate.chapterId === chapterId);
  if (page < 0) return { anchor: chapterId, offset: 0 };
  return { anchor: chapterId, offset: Math.floor(page / 2) - book.anchors[chapterId]! };
}
