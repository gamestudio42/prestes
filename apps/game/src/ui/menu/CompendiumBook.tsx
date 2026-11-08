import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  COMPENDIUM,
  COMPENDIUM_SECTIONS,
  compendiumText,
  compendiumTitleKey,
  translate,
  type CompendiumEntry,
  type CompendiumSection,
  type Locale,
  type MessageKey,
} from '@prestes/content';
import { DESK_ART, deskArtData, deskArtStyle } from './deskArt';
import { BookEndOrnament, BookFrame, publicImage, useBookPosition } from './BookFrame';
import {
  COMPENDIUM_ORDER,
  compendiumBook,
  folio,
  type BookPage,
  type TextItem,
} from './bookPages';

export interface CompendiumTarget {
  id: string;
  /** Changes on every request, so the same entry can be asked for twice. */
  nonce: number;
}

export interface CompendiumBookProps {
  locale: Locale;
  open: boolean;
  /** Entry the book should open at, from a campaign briefing link. */
  target?: CompendiumTarget | null;
}

const ENTRY = new Map(COMPENDIUM.map((entry) => [entry.id, entry]));

/**
 * The compendium book: a contents spread, then one spread per entry with its
 * image plate on the left and its text on the right. A long note continues on
 * the following spreads. Ribbons open the contents and each section.
 */
export function CompendiumBook({ locale, open, target }: CompendiumBookProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  const book = useMemo(() => compendiumBook(locale), [locale]);
  const { spread, turn, goTo, jump } = useBookPosition(
    book,
    target ? { anchor: target.id, offset: 0 } : undefined,
  );
  const [section, setSection] = useState<CompendiumSection>('figures');

  useEffect(() => {
    if (target) jump(target.id);
    // Only a new request moves the book.
  }, [target?.nonce]);

  if (!open) {
    return (
      <div
        className="desk-book-cover desk-art-box"
        style={deskArtStyle(DESK_ART.compendiumClosed)}
        {...deskArtData(DESK_ART.compendiumClosed)}
      >
        <img
          className="desk-object-art desk-object-art-closed"
          src={DESK_ART.compendiumClosed.src}
          width={DESK_ART.compendiumClosed.width}
          height={DESK_ART.compendiumClosed.height}
          alt=""
          draggable={false}
        />
        <span className="desk-object-label">{t('menu.cover.campaign')}</span>
      </div>
    );
  }

  const anchor = book.pages[spread * 2]!.anchor;
  const current = ENTRY.get(anchor);
  const firstPage = (id: string) => folio((book.anchors[id] ?? 0) * 2);
  const entryTitle = (entry: CompendiumEntry) => t(compendiumTitleKey(entry));

  const sectionLabel = (id: CompendiumSection) => t(`compendium.section.${id}` as MessageKey);
  const ribbons = [
    { id: 'contents', label: t('book.contents'), mark: '≡' },
    ...COMPENDIUM_SECTIONS.map((id) => ({ id, label: sectionLabel(id), mark: sectionLabel(id)[0]! })),
  ];
  const activeRibbon = current ? current.section : 'contents';
  const onRibbon = (id: string) => {
    const ribbon = book.ribbons.find((candidate) => candidate.id === id);
    if (ribbon) jump(ribbon.anchor);
  };

  const renderItem = (item: TextItem, key: number): ReactNode => {
    switch (item.kind) {
      case 'entry-head': {
        const entry = ENTRY.get(item.entryId)!;
        const long = compendiumText(entry.id, locale);
        const meta = [entry.date, long?.place].filter(Boolean).join(' · ');
        return (
          <header key={key} className="desk-entry-head">
            <h3 className="desk-entry-title">{entryTitle(entry)}</h3>
            <p className="desk-chips">
              {entry.label && (
                <span className="desk-chip" data-testid="book-label">
                  {t(`book.label.${entry.label}` as MessageKey)}
                </span>
              )}
              <span className="desk-chip desk-chip-soft" data-testid="book-confidence">
                {t('compendium.confidence')}: {t(`compendium.confidence.${entry.confidence}` as MessageKey)}
              </span>
            </p>
            {meta && <p className="desk-entry-meta">{meta}</p>}
          </header>
        );
      }
      case 'heading':
        return (
          <h4 key={key} className="desk-text-heading">
            {item.text}
          </h4>
        );
      case 'para':
        return (
          <p key={key} className={`desk-text ${item.continues ? 'continues' : ''}`}>
            {item.text}
          </p>
        );
      case 'list':
        return (
          <ul key={key} className="desk-text-list">
            {item.items.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        );
      case 'related':
        return (
          <p key={key} className="desk-related">
            <span>{t('book.seeAlso')}: </span>
            {item.ids.map((id, index) => (
              <span key={id}>
                {index > 0 && ', '}
                <button
                  type="button"
                  className="desk-link"
                  data-testid={`book-link-${id}`}
                  onClick={() => jump(id)}
                >
                  {entryTitle(ENTRY.get(id)!)}
                </button>
              </span>
            ))}
          </p>
        );
      case 'sources': {
        const entry = ENTRY.get(item.entryId)!;
        return (
          <p key={key} className="desk-sources" data-testid="book-sources">
            {t('compendium.source')}: {entry.cite} · {entry.sourceRefs.join(', ')}
          </p>
        );
      }
    }
  };

  const renderPage = (page: BookPage): ReactNode => {
    switch (page.kind) {
      case 'contents':
        if (page.part === 0) {
          return (
            <div className="desk-contents">
              <h2 className="desk-book-heading">{t('compendium.title')}</h2>
              <p className="desk-contents-kicker">{t('book.sections')}</p>
              <ol className="desk-contents-list" role="tablist" aria-label={t('book.sections')}>
                {COMPENDIUM_SECTIONS.map((id) => (
                  <li key={id}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={section === id}
                      className={`desk-contents-row ${section === id ? 'active' : ''}`}
                      data-testid={`codex-tab-${id}`}
                      onClick={() => setSection(id)}
                    >
                      <span className="desk-contents-title">{sectionLabel(id)}</span>
                      <span className="desk-index-dots" aria-hidden="true" />
                      <span className="desk-contents-count">
                        {t('compendium.count', {
                          count: COMPENDIUM.filter((entry) => entry.section === id).length,
                        })}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          );
        }
        return (
          <div className="desk-contents">
            <h2 className="desk-book-heading">{sectionLabel(section)}</h2>
            <ol className="desk-index" data-testid="codex-index">
              {COMPENDIUM_ORDER.filter((entry) => entry.section === section).map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className="desk-index-entry"
                    data-testid={`codex-entry-${entry.id}`}
                    onClick={() => jump(entry.id)}
                  >
                    <span className="desk-index-title">{entryTitle(entry)}</span>
                    <span className="desk-index-dots" aria-hidden="true" />
                    <span className="desk-index-folio">{firstPage(entry.id)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        );
      case 'plate': {
        const entry = ENTRY.get(page.entryId)!;
        const caption = page.image
          ? compendiumText(entry.id, locale)?.images?.[page.image.slot]
          : undefined;
        return (
          <figure className="desk-plate" data-testid="book-plate">
            <p className="desk-contents-kicker">{sectionLabel(entry.section)}</p>
            {page.image ? (
              <img
                className="desk-plate-image"
                src={publicImage(page.image.path)}
                alt={caption?.caption ?? ''}
                draggable={false}
                data-testid="book-plate-image"
              />
            ) : (
              <div className={`desk-emblem desk-emblem-${entry.section}`} data-testid="book-emblem" />
            )}
            <figcaption className="desk-plate-caption">
              {page.image ? (
                <>
                  <span>{caption?.caption}</span>
                  <span className="desk-plate-credit" data-testid="book-plate-credit">
                    {caption?.credit} · {t('book.licence.public-domain')}
                  </span>
                </>
              ) : (
                <span className="desk-plate-credit">{t('book.emblem')}</span>
              )}
            </figcaption>
          </figure>
        );
      }
      case 'text':
        return <div className="desk-text-page">{page.items.map(renderItem)}</div>;
      default:
        return <BookEndOrnament />;
    }
  };

  return (
    <div className="desk-compendium" data-testid="codex" aria-label={t('compendium.title')}>
      <div data-testid="codex-page" data-entry={anchor} className="desk-book-anchor">
        <BookFrame
          cover="green"
          locale={locale}
          book={book}
          spread={spread}
          turn={turn}
          onTurn={goTo}
          ribbons={ribbons}
          activeRibbon={activeRibbon}
          onRibbon={onRibbon}
          testPrefix="book"
          left={renderPage(book.pages[spread * 2]!)}
          right={renderPage(book.pages[spread * 2 + 1]!)}
        />
      </div>
    </div>
  );
}
