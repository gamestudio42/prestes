import { translate, type Locale, type MessageKey } from '@prestes/content';
import { DESK_ART, deskArtData, deskArtStyle } from './deskArt';

export interface ReferencesShelfProps {
  locale: Locale;
  open: boolean;
}

interface Reference {
  id: string;
  author: string;
  title: string;
  year: string;
  href: string;
  noteKey: MessageKey;
}

/**
 * The reference pile: a rasterized stack of books that opens into a small
 * dossier of the works consulted for the game. The preface states why the
 * books are here; every entry links to a catalogue record, and no protected
 * text is reproduced.
 */
const REFERENCES: readonly Reference[] = [
  {
    id: 'macaulay',
    author: 'Neill Macaulay',
    title: 'The Prestes Column: Revolution in Brazil',
    year: '1974',
    href: 'https://openlibrary.org/search?q=The+Prestes+Column+Neill+Macaulay',
    noteKey: 'menu.references.note.macaulay',
  },
  {
    id: 'amado',
    author: 'Jorge Amado',
    title: 'O Cavaleiro da Esperança: Vida de Luís Carlos Prestes',
    year: '1942',
    href: 'https://openlibrary.org/search?q=O+Cavaleiro+da+Esperan%C3%A7a+Jorge+Amado',
    noteKey: 'menu.references.note.amado',
  },
  {
    id: 'verissimo',
    author: 'Erico Verissimo',
    title: 'O Tempo e o Vento — O Continente, O Retrato, O Arquipélago',
    year: '1949–1962',
    href: 'https://pt.wikipedia.org/wiki/O_Tempo_e_o_Vento',
    noteKey: 'menu.references.note.verissimo',
  },
  {
    id: 'blanc',
    author: 'Jacob Blanc',
    title: 'Before the Flood: The Itaipu Dam and the Visibility of Rural Brazil',
    year: '2019',
    href: 'https://openlibrary.org/search?q=Before+the+Flood+Jacob+Blanc',
    noteKey: 'menu.references.note.blanc',
  },
];

export function ReferencesShelf({ locale, open }: ReferencesShelfProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);

  if (!open) {
    return (
      <div
        className="desk-references-cover desk-art-box"
        style={deskArtStyle(DESK_ART.referencesPile)}
        {...deskArtData(DESK_ART.referencesPile)}
      >
        <img
          className="desk-object-art desk-object-art-closed"
          src={DESK_ART.referencesPile.src}
          width={DESK_ART.referencesPile.width}
          height={DESK_ART.referencesPile.height}
          alt=""
          draggable={false}
        />
        <span className="desk-object-label">{t('menu.references.title')}</span>
      </div>
    );
  }

  return (
    <section
      className="desk-references-screen"
      data-testid="references-screen"
      aria-label={t('menu.references.title')}
    >
      <header className="desk-references-header">
        <p className="desk-book-eyebrow">{t('menu.references.kicker')}</p>
        <h2 className="desk-book-heading">{t('menu.references.heading')}</h2>
      </header>
      <blockquote className="desk-references-preface">{t('menu.references.preface')}</blockquote>
      <p className="desk-references-note">{t('menu.references.note')}</p>
      <ul className="desk-references-list">
        {REFERENCES.map((reference) => (
          <li key={reference.id}>
            <a
              className="desk-reference-link"
              href={reference.href}
              target="_blank"
              rel="noreferrer"
              data-testid={`reference-link-${reference.id}`}
            >
              <span className="desk-reference-author">{reference.author}</span>
              <span className="desk-reference-title">{reference.title}</span>
              <span className="desk-reference-year">{reference.year}</span>
            </a>
            <p className="desk-reference-note">{t(reference.noteKey)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
