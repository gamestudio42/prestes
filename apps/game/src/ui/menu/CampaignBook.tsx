import { useMemo, type ReactNode } from 'react';
import {
  CAMPAIGN_CHAPTERS,
  COMPENDIUM,
  FIGURES,
  chapterText,
  compendiumText,
  compendiumTitleKey,
  translate,
  type CampaignChapter,
  type Locale,
  type MessageKey,
} from '@prestes/content';
import { DESK_ART, deskArtData, deskArtStyle } from './deskArt';
import { BookEndOrnament, BookFrame, publicImage, useBookPosition } from './BookFrame';
import { campaignBook, folio, type BookPage, type TextItem } from './bookPages';
import { PixelPhoto } from '../PixelPhoto';
import { authoredMapIndex } from '@prestes/shared';
import coverImage from '../../assets/menu/coluna-prestes.webp';

export interface CampaignBookProps {
  locale: Locale;
  open: boolean;
  onStartSkirmish: () => void;
  /** Opens the compendium book at an entry. */
  onOpenEntry: (entryId: string) => void;
  /** author-game-maps 5.3: plays the map saved for a chapter's mission. */
  onPlayMap: (mapId: string) => void;
}

const CHAPTER = new Map(CAMPAIGN_CHAPTERS.map((chapter) => [chapter.id, chapter]));
const ENTRY = new Map(COMPENDIUM.map((entry) => [entry.id, entry]));
const FIGURE = new Map(FIGURES.map((figure) => [figure.id, figure]));

/**
 * The campaign book: a title spread and a contents spread, then each chapter
 * as an opening spread (plate and the chapter's facts on the left, the prose
 * beginning on the right), its prose, and a briefing spread. No chapter is
 * playable yet; the skirmish action brings the map fan forward instead.
 */
export function CampaignBook({ locale, open, onStartSkirmish, onOpenEntry, onPlayMap }: CampaignBookProps) {
  // author-game-maps 5.3: the map saved for each mission, from the index (nothing is loaded here).
  const missionMap = new Map(authoredMapIndex().filter((entry) => entry.use === 'campaign' && entry.mission).map((entry) => [entry.mission!, entry.id]));
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  const book = useMemo(() => campaignBook(locale), [locale]);
  const { spread, turn, goTo, jump } = useBookPosition(book);

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
    if (item.kind === 'para') {
      return (
        <p key={key} className={`desk-text ${item.continues ? 'continues' : ''}`}>
          {item.text}
        </p>
      );
    }
    return null;
  };

  const contentsRow = (chapter: CampaignChapter) => (
    <li key={chapter.id}>
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
            <p className="desk-text" data-testid="campaign-preparing">
              {t('menu.campaign.preparing')}
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
                <img
                  className="desk-plate-image"
                  src={publicImage(ref.path)}
                  alt={caption?.caption ?? ''}
                  draggable={false}
                  data-testid="book-plate-image"
                />
                <figcaption className="desk-plate-credit">
                  {caption?.caption} {caption?.credit} · {t('book.licence.public-domain')}
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
              {missionMap.has(chapter.id) ? (
                <button type="button" className="desk-entry primary" onClick={() => onPlayMap(missionMap.get(chapter.id)!)} data-testid={`chapter-play-map-${chapter.id}`}>
                  {t('campaign.playMap')}
                </button>
              ) : null}
              <button
                type="button"
                className="desk-entry desk-entry-disabled"
                disabled
                data-testid={`chapter-play-${chapter.id}`}
              >
                {t('campaign.play')}
              </button>
              {skirmish(`chapter-skirmish-${chapter.id}`)}
            </div>
            <p className="desk-sources">
              <span className="desk-chip">{t(`book.label.${chapter.label}` as MessageKey)}</span>{' '}
              {t('codex.sources')}: {chapter.sourceRefs.join(', ')}
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
