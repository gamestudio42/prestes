import { publicUrl } from '@prestes/shared';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { BIBLIOGRAPHY, COMPENDIUM, COMPENDIUM_IMAGE_REGISTER, compendiumText, PENDING_IMAGE_DIR, translate, type SourceKey, type ImageLicence, type Locale, type MessageKey } from '@prestes/content';
import { folio, locate, resolve, type Book, type BookPosition } from './bookPages';

/**
 * The reader's place in a book. It is kept as an anchor and an offset, so a
 * locale switch that re-paginates the book keeps the same entry or chapter open.
 */
export function useBookPosition(book: Book, initial: BookPosition = { anchor: book.pages[0]!.anchor, offset: 0 }) {
  const [position, setPosition] = useState<BookPosition>(initial);
  const [turn, setTurn] = useState<'next' | 'prev'>('next');
  const spread = resolve(book, position);
  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(book.spreadCount - 1, next));
    if (clamped === spread) return;
    setTurn(clamped > spread ? 'next' : 'prev');
    setPosition(locate(book, clamped));
  };
  const jump = (anchor: string) => {
    const target = book.anchors[anchor];
    if (target === undefined) return;
    setTurn(target >= spread ? 'next' : 'prev');
    setPosition({ anchor, offset: 0 });
  };
  return { spread, turn, goTo, jump, position };
}

export interface BookRibbon {
  id: string;
  label: string;
  /** Short mark printed on the ribbon. */
  mark: string;
}

export interface BookFrameProps {
  /** The cover leather of the narrow board around the pages (design D11). */
  cover: 'navy' | 'green';
  locale: Locale;
  book: Book;
  spread: number;
  turn: 'next' | 'prev';
  onTurn: (spread: number) => void;
  ribbons: readonly BookRibbon[];
  /** Anchor whose ribbon is active. */
  activeRibbon?: string;
  onRibbon: (anchor: string) => void;
  /** Prefix of the corner controls' test ids. */
  testPrefix: string;
  /** Anchor of the open spread, exposed for tests. */
  left: ReactNode;
  right: ReactNode;
  className?: string;
}

/**
 * An open book: one bound spread on a narrow cover board, its pages meeting at
 * the gutter over stacked leaves, and bookmark ribbons hanging from the head.
 * Pages never scroll; text continues on the next spread. The corner controls and the left and right arrow keys turn one
 * spread at a time.
 */
export function BookFrame({
  cover,
  locale,
  book,
  spread,
  turn,
  onTurn,
  ribbons,
  activeRibbon,
  onRibbon,
  testPrefix,
  left,
  right,
  className,
}: BookFrameProps) {
  const t = (key: Parameters<typeof translate>[1], values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const tag = (event.target as HTMLElement).tagName;
    if (tag === 'SELECT' || tag === 'INPUT') return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') onTurn(spread + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'PageUp') onTurn(spread - 1);
    else return;
    event.preventDefault();
  };
  const anchor = book.pages[spread * 2]!.anchor;
  const frameRef = useRef<HTMLDivElement | null>(null);
  // An opened book takes the focus, so the arrow keys turn it at once.
  useEffect(() => {
    frameRef.current?.focus({ preventScroll: true });
  }, []);
  // A link or contents row that started the turn leaves with its spread; keep
  // the focus on the book so the arrow keys still turn it.
  useEffect(() => {
    const frame = frameRef.current;
    if (frame && !frame.contains(document.activeElement)) frame.focus({ preventScroll: true });
  }, [spread]);
  return (
    <div
      ref={frameRef}
      tabIndex={-1}
      className={`desk-book-frame desk-book-cover-${cover} ${className ?? ''}`.trim()}
      onKeyDown={onKeyDown}
      data-spread={spread}
      data-anchor={anchor}
    >
      <div className="desk-book-board" aria-hidden="true" />
      <nav className="desk-book-ribbons" aria-label={t('book.ribbons')}>
        {ribbons.map((ribbon) => (
          <button
            key={ribbon.id}
            type="button"
            className={`desk-book-ribbon ${activeRibbon === ribbon.id ? 'active' : ''}`}
            title={ribbon.label}
            aria-label={ribbon.label}
            aria-current={activeRibbon === ribbon.id ? 'true' : undefined}
            data-testid={`book-ribbon-${ribbon.id}`}
            onClick={() => onRibbon(ribbon.id)}
          >
            {ribbon.mark}
          </button>
        ))}
      </nav>
      <div className={`desk-book-pages desk-object-body desk-turn-${turn}`} key={spread}>
        <section className="desk-book-page desk-book-page-left" data-testid="book-page-left">
          <div className="desk-book-page-body">{left}</div>
          <p className="desk-book-folio">{t('menu.page', { page: folio(spread * 2) })}</p>
        </section>
        <section className="desk-book-page desk-book-page-right" data-testid="book-page-right">
          <div className="desk-book-page-body">{right}</div>
          <p className="desk-book-folio">{t('menu.page', { page: folio(spread * 2 + 1) })}</p>
        </section>
      </div>
      <button
        type="button"
        className="desk-book-turn desk-book-turn-prev"
        onClick={() => onTurn(spread - 1)}
        disabled={spread === 0}
        aria-label={t('menu.pagePrev')}
        data-testid={`${testPrefix}-page-prev`}
      >
        ◀
      </button>
      <button
        type="button"
        className="desk-book-turn desk-book-turn-next"
        onClick={() => onTurn(spread + 1)}
        disabled={spread === book.spreadCount - 1}
        aria-label={t('menu.pageNext')}
        data-testid={`${testPrefix}-page-next`}
      >
        ▶
      </button>
    </div>
  );
}

/** The ornament on a deliberate end page. */
export function BookEndOrnament() {
  return <div className="desk-book-end" aria-hidden="true" />;
}

/**
 * Public URL of an image registered by its repository path. An image under a
 * permission request (complete-books-and-bibliography D3a) is asked for at the
 * same place as the plates; only the dev server and the review build answer it.
 */
export function publicImage(path: string): string {
  const served = path.startsWith(PENDING_IMAGE_DIR)
    ? `assets/compendium/${path.slice(PENDING_IMAGE_DIR.length)}`
    : path.replace(/^apps\/game\/public\//, '');
  return publicUrl(`${import.meta.env.BASE_URL}${served}`);
}

const LICENCE = new Map(COMPENDIUM_IMAGE_REGISTER.map((image) => [image.path, image.licence]));

/** The licence of a registered image (D3). */
export function imageLicence(path: string): ImageLicence {
  return LICENCE.get(path) ?? 'public-domain';
}

/** The credit line under a plate: the caption's credit and the licence. */
export function creditLine(credit: string | undefined, path: string, t: (key: MessageKey) => string): string {
  const licence = t(`book.licence.${imageLicence(path)}` as MessageKey);
  return credit ? `${credit} · ${licence}` : licence;
}

/**
 * A plate's picture. When the file is absent (an image awaiting permission in a
 * public build) it falls back to the emblem and says so (D3a).
 */
export function PlateImage({
  path,
  alt,
  emblemClass,
  onMissing,
}: {
  path: string;
  alt: string;
  emblemClass: string;
  onMissing?: () => void;
}) {
  const [missing, setMissing] = useState(false);
  useEffect(() => setMissing(false), [path]);
  if (missing) return <div className={emblemClass} data-testid="book-emblem" data-image-pending={path} />;
  return (
    <img
      className="desk-plate-image"
      src={publicImage(path)}
      alt={alt}
      draggable={false}
      data-testid="book-plate-image"
      onError={() => {
        setMissing(true);
        onMissing?.();
      }}
    />
  );
}

const ENTRY_IMAGES = new Map(COMPENDIUM.map((entry) => [entry.id, entry.images ?? []]));

/** A plate inside a text page (complete-books-and-bibliography D4). */
export function InlinePlate({ entryId, slot, locale }: { entryId: string; slot: string; locale: Locale }) {
  const t = (key: MessageKey) => translate(locale, key);
  const [missing, setMissing] = useState(false);
  const ref = ENTRY_IMAGES.get(entryId)?.find((image) => image.slot === slot);
  const caption = compendiumText(entryId, locale)?.images?.[slot];
  if (!ref) return null;
  return (
    <figure className="desk-plate desk-plate-inline" data-testid="book-inline-plate">
      <PlateImage
        path={ref.path}
        alt={caption?.caption ?? ''}
        emblemClass="desk-emblem desk-emblem-small"
        onMissing={() => setMissing(true)}
      />
      <figcaption className="desk-plate-credit">
        {caption?.caption} {missing ? t('book.imagePending') : creditLine(caption?.credit, ref.path, t)}
      </figcaption>
    </figure>
  );
}

/** A bibliography row (D5). */
export function BibliographyRowView({ sourceKey }: { sourceKey: SourceKey }) {
  const row = BIBLIOGRAPHY[sourceKey];
  return (
    <p className="desk-bib" id={`source-${sourceKey}`} data-testid={`bib-${sourceKey}`}>
      <span className="desk-bib-short">{row.short}.</span> {row.reference}
    </p>
  );
}

/** The cite and note under a quotation. */
export function QuoteFooter({
  attribution,
  cite,
  note,
  translated,
  translatedLabel,
}: {
  attribution: string;
  cite?: string;
  note?: string;
  translated?: boolean;
  translatedLabel: string;
}) {
  return (
    <footer className="desk-quote-attribution">
      {attribution}
      {cite && <span className="desk-quote-cite" data-testid="book-quote-cite">{cite}</span>}
      {note ? (
        <span className="desk-quote-note">{note}</span>
      ) : (
        translated && <span className="desk-quote-note">{translatedLabel}</span>
      )}
    </footer>
  );
}
