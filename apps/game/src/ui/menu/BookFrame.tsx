import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { translate, type Locale } from '@prestes/content';
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
  /** The cover leather that tints the 9-slice frame (design D11). */
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
 * An open book: the 9-slice pixel-art frame tinted by the cover, ribbons on the
 * top edge, and a two-page spread laid over the parchment. Pages never scroll; text continues on the
 * next spread. The corner controls and the left and right arrow keys turn one
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

/** Public URL of an image registered by its repository path. */
export function publicImage(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^apps\/game\/public\//, '')}`;
}
